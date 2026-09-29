import type { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { googleApi } from "./google"
import { call } from "./result"

const API = "https://www.googleapis.com/calendar/v3"
const readOnly = { readOnlyHint: true, openWorldHint: true } as const

const calendarId = z
  .string()
  .default("primary")
  .describe("Calendar id from calendar_list_calendars; 'primary' is the main calendar")
const dateTime = z.iso.datetime({ offset: true })

type EventTime = { dateTime?: string; date?: string; timeZone?: string }
type Event = {
  id: string
  status: string
  summary?: string
  description?: string
  location?: string
  start: EventTime
  end: EventTime
  htmlLink: string
  hangoutLink?: string
  organizer?: { email: string; self?: boolean }
  attendees?: { email: string; responseStatus: string; self?: boolean; optional?: boolean }[]
  recurringEventId?: string
}

/** Google Calendar for the signed-in Google account. */
export function registerCalendar(server: McpServer, env: Env) {
  const calendar = <T>(path: string, init?: { method?: string; body?: unknown }) =>
    googleApi<T>(env, `${API}${path}`, init)

  server.registerTool(
    "calendar_list_calendars",
    {
      title: "List calendars",
      description: "Calendars the account can see, with ids for the other calendar_* tools.",
      inputSchema: z.object({}),
      annotations: readOnly
    },
    call(async () => {
      const { items } = await calendar<{
        items: {
          id: string
          summary: string
          primary?: boolean
          accessRole: string
          timeZone: string
        }[]
      }>("/users/me/calendarList")
      return {
        calendars: items.map(({ id, summary, primary, accessRole, timeZone }) => ({
          id,
          summary,
          primary,
          accessRole,
          timeZone
        }))
      }
    })
  )

  server.registerTool(
    "calendar_list_events",
    {
      title: "List calendar events",
      description:
        "Events in a time window (default: the next 7 days), recurring events expanded, " +
        "ordered by start time. Optional free-text query matches title, description, " +
        "location and attendees.",
      inputSchema: z.object({
        calendarId,
        timeMin: dateTime.optional().describe("ISO 8601 with offset; default now"),
        timeMax: dateTime.optional().describe("ISO 8601 with offset; default timeMin + 7 days"),
        query: z.string().optional(),
        maxResults: z.number().int().min(1).max(100).default(25)
      }),
      annotations: readOnly
    },
    call(async ({ calendarId, timeMin, timeMax, query, maxResults }) => {
      const start = timeMin ? new Date(timeMin) : new Date()
      const end = timeMax ? new Date(timeMax) : new Date(start.getTime() + 7 * 86_400_000)
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: String(maxResults)
      })
      if (query) params.set("q", query)
      const result = await calendar<{ items: Event[]; timeZone: string }>(
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
      )
      return {
        timeZone: result.timeZone,
        events: result.items.filter((e) => e.status !== "cancelled").map(summarize)
      }
    })
  )

  server.registerTool(
    "calendar_free_busy",
    {
      title: "Check free/busy",
      description: "Busy intervals across one or more calendars, for finding open slots.",
      inputSchema: z.object({
        timeMin: dateTime,
        timeMax: dateTime,
        calendarIds: z.array(z.string()).min(1).default(["primary"])
      }),
      annotations: readOnly
    },
    call(async ({ timeMin, timeMax, calendarIds }) => {
      const result = await calendar<{
        calendars: Record<string, { busy: { start: string; end: string }[]; errors?: unknown[] }>
      }>("/freeBusy", {
        method: "POST",
        body: { timeMin, timeMax, items: calendarIds.map((id) => ({ id })) }
      })
      return result.calendars
    })
  )

  server.registerTool(
    "calendar_create_event",
    {
      title: "Create calendar event",
      description:
        "Add an event. Pass start/end as ISO 8601 date-times with offset, or as YYYY-MM-DD " +
        "dates for an all-day event (end date is exclusive). Attendees are only emailed " +
        "when notifyAttendees is true.",
      inputSchema: z.object({
        calendarId,
        summary: z.string().min(1),
        start: z.string().describe("ISO 8601 date-time with offset, or YYYY-MM-DD"),
        end: z.string().describe("ISO 8601 date-time with offset, or YYYY-MM-DD"),
        description: z.string().optional(),
        location: z.string().optional(),
        attendees: z.array(z.email()).optional(),
        notifyAttendees: z.boolean().default(false)
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
    },
    call(async ({ calendarId, summary, start, end, description, location, attendees, ...rest }) => {
      const time = (value: string): EventTime =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? { date: value } : { dateTime: value }
      const params = new URLSearchParams({ sendUpdates: rest.notifyAttendees ? "all" : "none" })
      const event = await calendar<Event>(
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        {
          method: "POST",
          body: {
            summary,
            description,
            location,
            start: time(start),
            end: time(end),
            attendees: attendees?.map((email) => ({ email }))
          }
        }
      )
      return summarize(event)
    })
  )
}

function summarize(event: Event) {
  return {
    id: event.id,
    summary: event.summary ?? "(no title)",
    start: event.start.dateTime ?? event.start.date,
    end: event.end.dateTime ?? event.end.date,
    allDay: event.start.date !== undefined,
    location: event.location,
    description: event.description?.slice(0, 500),
    meetLink: event.hangoutLink,
    organizer: event.organizer?.self ? "me" : event.organizer?.email,
    attendees: event.attendees?.map((a) => ({
      email: a.self ? "me" : a.email,
      response: a.responseStatus,
      optional: a.optional
    })),
    recurring: event.recurringEventId !== undefined,
    link: event.htmlLink
  }
}
