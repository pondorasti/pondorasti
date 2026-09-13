import { createServerFn } from "@tanstack/react-start"
import { setResponseHeader } from "@tanstack/react-start/server"
import { env } from "cloudflare:workers"
import { getCatalog, getProduct } from "./server/catalog"

export const readCatalog = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store")
  return getCatalog(env.DB)
})

export const readProduct = createServerFn({ method: "GET" })
  .inputValidator((slug: unknown) => {
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,150}$/.test(slug)) {
      throw new Error("Invalid product URL")
    }
    return slug
  })
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store")
    return getProduct(env.DB, data)
  })
