import { createServerFn } from "@tanstack/react-start"
import { setResponseHeader } from "@tanstack/react-start/server"
import { env } from "cloudflare:workers"
import { Slug } from "../lib/product"
import { views } from "virtual:supply-content"
import { getCatalog, getProduct } from "./catalog"

export const readSite = createServerFn({ method: "GET" }).handler(async () => ({
  origin: env.PUBLIC_ORIGIN,
  /** Open Graph card URL for each view. */
  cards: views
}))

export const readCatalog = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store")
  return getCatalog()
})

export const readProduct = createServerFn({ method: "GET" })
  .validator(Slug)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store")
    return getProduct(data)
  })
