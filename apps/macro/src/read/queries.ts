import { queryOptions } from "@tanstack/react-query"
import { readDashboard, readDay, readSite } from "./functions"

// Deploy-time configuration: fetched once during SSR and hydrated, never refetched.
export const siteQuery = queryOptions({
  queryKey: ["site"],
  queryFn: () => readSite(),
  staleTime: Infinity,
  gcTime: Infinity
})

// "Today" moves with the clock, so the dashboard is refetched when revisited.
export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => readDashboard(),
  staleTime: 60_000
})

export const dayQuery = (date: string) =>
  queryOptions({ queryKey: ["day", date], queryFn: () => readDay({ data: date }) })
