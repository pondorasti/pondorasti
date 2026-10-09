import { createServerFn } from "@tanstack/react-start"
import { setResponseHeader } from "@tanstack/react-start/server"
import { env } from "cloudflare:workers"
import { isSlug } from "../lib/product"
import { getCatalog, getProduct } from "./catalog"

export const readSite = createServerFn({ method: "GET" }).handler(async () => ({
  origin: env.PUBLIC_ORIGIN
}))

export const readCatalog = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store")
  return getCatalog()
})

export const readProduct = createServerFn({ method: "GET" })
  .validator((slug: unknown) => {
    if (!isSlug(slug)) throw new Error("Invalid product URL")
    return slug
  })
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store")
    return getProduct(data)
  })
