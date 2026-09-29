import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { googleApi } from "./google"
import { call } from "./result"

const API = "https://gmail.googleapis.com/gmail/v1/users/me"
const BODY_LIMIT = 15_000
const readOnly = { readOnlyHint: true, openWorldHint: true } as const

type Header = { name: string; value: string }
type Part = {
  mimeType: string
  filename?: string
  headers?: Header[]
  body: { data?: string; size: number; attachmentId?: string }
  parts?: Part[]
}
type Message = {
  id: string
  threadId: string
  labelIds?: string[]
  snippet: string
  internalDate: string
  payload: Part
}
type Thread = { id: string; messages: Message[] }

/** Gmail for the signed-in Google account. Drafts only: nothing here sends mail. */
export function registerGmail(server: McpServer, env: Env) {
  const gmail = <T>(path: string, init?: { method?: string; body?: unknown }) =>
    googleApi<T>(env, `${API}${path}`, init)

  server.registerTool(
    "gmail_search_threads",
    {
      title: "Search Gmail",
      description:
        "Search email threads with Gmail search syntax, e.g. 'from:alice newer_than:7d', " +
        "'is:unread in:inbox', 'subject:invoice has:attachment'. Returns one summary per " +
        "thread; read a thread with gmail_get_thread.",
      inputSchema: z.object({
        query: z.string().describe("Gmail search query; empty string lists recent threads"),
        maxResults: z.number().int().min(1).max(25).default(10),
        pageToken: z.string().optional().describe("nextPageToken from a previous call")
      }),
      annotations: readOnly
    },
    call(async ({ query, maxResults, pageToken }) => {
      const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
      if (pageToken) params.set("pageToken", pageToken)
      const list = await gmail<{ threads?: { id: string }[]; nextPageToken?: string }>(
        `/threads?${params.toString()}`
      )
      const threads = await Promise.all(
        (list.threads ?? []).map(({ id }) =>
          gmail<Thread>(
            `/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
          )
        )
      )
      return {
        threads: threads.map((thread) => {
          const first = thread.messages[0]
          const last = thread.messages.at(-1)!
          return {
            threadId: thread.id,
            subject: header(first.payload, "Subject"),
            participants: [...new Set(thread.messages.map((m) => header(m.payload, "From")))],
            lastMessageAt: new Date(Number(last.internalDate)).toISOString(),
            messageCount: thread.messages.length,
            labels: [...new Set(thread.messages.flatMap((m) => m.labelIds ?? []))],
            snippet: decodeEntities(last.snippet)
          }
        }),
        nextPageToken: list.nextPageToken
      }
    })
  )

  server.registerTool(
    "gmail_get_thread",
    {
      title: "Read Gmail thread",
      description:
        "Every message in a thread with headers and the body as plain text (HTML-only " +
        "emails are converted). Attachments are listed, not downloaded.",
      inputSchema: z.object({ threadId: z.string().min(1) }),
      annotations: readOnly
    },
    call(async ({ threadId }) => {
      const thread = await gmail<Thread>(`/threads/${encodeURIComponent(threadId)}?format=full`)
      return {
        threadId: thread.id,
        messages: thread.messages.map((message) => {
          const { text, attachments } = readBody(message.payload)
          return {
            messageId: message.id,
            from: header(message.payload, "From"),
            to: header(message.payload, "To"),
            cc: header(message.payload, "Cc") || undefined,
            date: header(message.payload, "Date"),
            subject: header(message.payload, "Subject"),
            labels: message.labelIds,
            body:
              text.length > BODY_LIMIT
                ? `${text.slice(0, BODY_LIMIT)}\n[… truncated, ${text.length} chars]`
                : text,
            attachments: attachments.length ? attachments : undefined
          }
        })
      }
    })
  )

  server.registerTool(
    "gmail_list_labels",
    {
      title: "List Gmail labels",
      description: "System and user labels, for use in searches like 'label:receipts'.",
      inputSchema: z.object({}),
      annotations: readOnly
    },
    call(async () => {
      const { labels } = await gmail<{ labels: { id: string; name: string; type: string }[] }>(
        "/labels"
      )
      return { labels: labels.map(({ id, name, type }) => ({ id, name, type })) }
    })
  )

  server.registerTool(
    "gmail_create_draft",
    {
      title: "Create Gmail draft",
      description:
        "Save a plain-text draft for the user to review and send from Gmail. Never sends. " +
        "With threadId it becomes a reply to the thread's last message: `to` and `subject` " +
        "default to that message's sender and 'Re: <subject>'.",
      inputSchema: z.object({
        to: z.string().optional().describe("Comma-separated addresses; required unless replying"),
        cc: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().describe("Plain-text body"),
        threadId: z.string().optional().describe("Reply within this thread")
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
    },
    call(async ({ to, cc, subject, body, threadId }) => {
      const headers: Record<string, string> = {}
      if (threadId) {
        const thread = await gmail<Thread>(
          `/threads/${encodeURIComponent(threadId)}?format=metadata` +
            "&metadataHeaders=From&metadataHeaders=Reply-To&metadataHeaders=Subject" +
            "&metadataHeaders=Message-ID&metadataHeaders=References"
        )
        const last = thread.messages.at(-1)!.payload
        const messageId = header(last, "Message-ID")
        to ??= header(last, "Reply-To") || header(last, "From")
        const original = header(last, "Subject")
        subject ??= /^re:/i.test(original) ? original : `Re: ${original}`
        if (messageId) {
          headers["In-Reply-To"] = messageId
          headers.References = [header(last, "References"), messageId].filter(Boolean).join(" ")
        }
      }
      if (!to) throw new Error("`to` is required when not replying to a thread.")

      const raw = buildMessage({ To: to, Cc: cc, Subject: subject ?? "", ...headers }, body)
      const draft = await gmail<{ id: string; message: { id: string; threadId: string } }>(
        "/drafts",
        { method: "POST", body: { message: { raw, threadId } } }
      )
      return {
        draftId: draft.id,
        threadId: draft.message.threadId,
        to,
        subject,
        openInGmail: "https://mail.google.com/mail/u/0/#drafts"
      }
    })
  )
}

function header(part: Part, name: string) {
  const lower = name.toLowerCase()
  return part.headers?.find((h) => h.name.toLowerCase() === lower)?.value ?? ""
}

/** Prefers text/plain, falls back to converted text/html; collects attachment names. */
function readBody(root: Part) {
  let plain: string | undefined
  let html: string | undefined
  const attachments: { filename: string; mimeType: string; size: number }[] = []
  const walk = (part: Part) => {
    if (part.filename && part.body.attachmentId) {
      attachments.push({ filename: part.filename, mimeType: part.mimeType, size: part.body.size })
    } else if (part.mimeType === "text/plain" && part.body.data && plain === undefined) {
      plain = decodeBase64Url(part.body.data)
    } else if (part.mimeType === "text/html" && part.body.data && html === undefined) {
      html = decodeBase64Url(part.body.data)
    }
    part.parts?.forEach(walk)
  }
  walk(root)
  const text = plain ?? (html === undefined ? "" : htmlToText(html))
  return { text: text.replace(/\r\n/g, "\n").trim(), attachments }
}

function decodeBase64Url(data: string) {
  const binary = atob(data.replace(/-/g, "+").replace(/_/g, "/"))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/(p|div|tr|li|h[1-6]|table|blockquote)>/gi, "\n")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
}

function decodeEntities(text: string) {
  const named: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'"
  }
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity
    const value =
      code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1))
    return Number.isFinite(value) ? String.fromCodePoint(value) : entity
  })
}

/** RFC 2822 message, UTF-8 throughout, returned base64url-encoded for the Gmail API. */
function buildMessage(headers: Record<string, string | undefined>, body: string) {
  const encodeHeader = (value: string) =>
    /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${bytesToBase64(utf8(value))}?=`
  const lines = Object.entries(headers)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}: ${name === "Subject" ? encodeHeader(value) : value}`)
  lines.push(
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    bytesToBase64(utf8(body)).replace(/.{76}/g, "$&\r\n")
  )
  return bytesToBase64(utf8(lines.join("\r\n")))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

const utf8 = (text: string) => new TextEncoder().encode(text)

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
