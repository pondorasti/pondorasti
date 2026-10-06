import { queryOptions } from "@tanstack/react-query"
import { readCatalog, readProduct, readSite } from "./functions"

// Deploy-time configuration: fetched once during SSR and hydrated, never refetched.
export const siteQuery = queryOptions({
  queryKey: ["site"],
  queryFn: () => readSite(),
  staleTime: Infinity,
  gcTime: Infinity
})

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => readCatalog()
})

export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => readProduct({ data: slug }) })
