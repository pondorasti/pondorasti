declare module "virtual:supply-content" {
  export const items: import("../lib/product").ProductDetail[]
  export const views: Record<import("../lib/product").View, string>
}
