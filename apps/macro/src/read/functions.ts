import { createServerFn } from "@tanstack/react-start"
import { setResponseHeader } from "@tanstack/react-start/server"
import { env } from "cloudflare:workers"
import { IsoDate } from "../lib/nutrition"
import { getDashboard, getDay } from "./log"

export const readSite = createServerFn({ method: "GET" }).handler(async () => ({
  origin: env.PUBLIC_ORIGIN
}))

export const readDashboard = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store")
  return getDashboard()
})

export const readDay = createServerFn({ method: "GET" })
  .validator(IsoDate)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store")
    return getDay(data)
  })
