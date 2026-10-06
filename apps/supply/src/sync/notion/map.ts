import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse
} from "@notionhq/client"
import { safeLink } from "../../lib/links"
import type { ContentBlock, TextRun } from "../../lib/product"
import { SyncError } from "../runtime"

export interface RemoteImage {
  url: string
  ownerId: string
  ownerType: "page" | "block"
}

export interface SourceBlock extends Omit<ContentBlock, "children"> {
  children: SourceBlock[]
  file?: RemoteImage
}

export interface SourceProduct {
  id: string
  name: string
  link: string | null
  ownership: string
  tags: string[]
  revision: string
  properties: string
  thumbnail?: RemoteImage
}

type NotionFile = { type?: string; file?: { url: string }; external?: { url: string } }

export function fileReference(
  file: NotionFile | undefined,
  ownerId: string,
  ownerType: "page" | "block"
) {
  if (!file) return undefined
  const url = file.file?.url ?? file.external?.url
  if (!url) throw new SyncError("unsupported_notion_file")
  return { url, ownerId, ownerType }
}

export function mapProduct(page: PageObjectResponse): SourceProduct {
  const {
    Name: name,
    Link: link,
    "Ownership status": status,
    Tags: tags,
    Thumbnail: thumbnail
  } = page.properties
  if (
    name?.type !== "title" ||
    link?.type !== "url" ||
    status?.type !== "select" ||
    tags?.type !== "multi_select" ||
    thumbnail?.type !== "files"
  ) {
    throw new SyncError("notion_schema_changed")
  }
  return {
    id: page.id,
    name: name.title.map((run) => run.plain_text).join(""),
    link: safeLink(link.url) ?? null,
    ownership: status.select?.name ?? "",
    tags: tags.multi_select.map((tag) => tag.name),
    revision: page.last_edited_time,
    properties: JSON.stringify(page.properties),
    thumbnail: fileReference(thumbnail.files[0], page.id, "page")
  }
}

function textRuns(runs: RichTextItemResponse[]): TextRun[] {
  return runs.map((run) => ({
    text: run.plain_text,
    ...(run.annotations.bold && { bold: true }),
    ...(run.annotations.italic && { italic: true }),
    ...(run.annotations.code && { code: true }),
    ...(run.annotations.strikethrough && { strike: true }),
    ...(safeLink(run.href) && { href: safeLink(run.href) })
  }))
}

export function mapBlock(block: BlockObjectResponse): SourceBlock {
  let runs: RichTextItemResponse[] = []
  let file: RemoteImage | undefined
  let checked: boolean | undefined
  switch (block.type) {
    case "paragraph":
      runs = block.paragraph.rich_text
      break
    case "heading_1":
      runs = block.heading_1.rich_text
      break
    case "heading_2":
      runs = block.heading_2.rich_text
      break
    case "heading_3":
      runs = block.heading_3.rich_text
      break
    case "bulleted_list_item":
      runs = block.bulleted_list_item.rich_text
      break
    case "numbered_list_item":
      runs = block.numbered_list_item.rich_text
      break
    case "quote":
      runs = block.quote.rich_text
      break
    case "callout":
      runs = block.callout.rich_text
      break
    case "code":
      runs = block.code.rich_text
      break
    case "toggle":
      runs = block.toggle.rich_text
      break
    case "to_do":
      runs = block.to_do.rich_text
      checked = block.to_do.checked
      break
    case "image":
      runs = block.image.caption
      file = fileReference(block.image, block.id, "block")
      break
  }
  return {
    id: block.id,
    type: block.type,
    text: textRuns(runs),
    children: [],
    ...(file && { file }),
    ...(checked !== undefined && { checked })
  }
}
