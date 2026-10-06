import { queryOptions } from "@tanstack/react-query"
import { readCatalog, readProduct } from "./functions"

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => readCatalog()
})

export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => readProduct({ data: slug }) })
