import { Link } from "@tanstack/react-router"
import { ArrowUpRight, ImageOff } from "lucide-react"
import { useState } from "react"
import { imagePath, type ProductSummary } from "../catalog"
import type { CatalogFilters } from "../filters"

export function ProductImage({
  hash,
  name,
  priority = false
}: {
  hash: string | null
  name: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return hash && failed !== hash ? (
    <img
      src={imagePath(hash)}
      alt={name}
      width={720}
      height={720}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(hash)}
    />
  ) : (
    <span
      role="img"
      aria-label={`No image for ${name}`}
      className="flex flex-col items-center gap-3 text-xs text-[#646a66]"
    >
      <ImageOff size={28} strokeWidth={1.25} />
      No image
    </span>
  )
}

export function ProductCard({
  product,
  filters,
  priority = false
}: {
  product: ProductSummary
  filters?: CatalogFilters
  priority?: boolean
}) {
  return (
    <article className="group min-w-0">
      <Link
        to="/items/$slug"
        params={{ slug: product.slug }}
        search={filters ?? {}}
        className="block rounded-lg"
      >
        <div className="product-stage relative">
          <ProductImage hash={product.thumbnail} name={product.name} priority={priority} />
          <span
            aria-hidden="true"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-[#f4f5f3] text-[#737b74] transition-colors group-hover:bg-[#e3e9e2] group-hover:text-[#202321]"
          >
            <ArrowUpRight size={17} strokeWidth={1.5} />
          </span>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-sm font-medium leading-5 break-words group-hover:text-accent sm:text-[15px]">
            {product.name || "Untitled"}
          </h2>
          {product.ownership === "Wishlist" && (
            <span className="shrink-0 pt-0.5 text-[11px] text-wishlist">Wishlist</span>
          )}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted">
          {product.tags.join(" / ") || product.ownership || "Uncategorized"}
        </p>
      </Link>
    </article>
  )
}

export function CatalogPending() {
  return (
    <main id="main" className="page-width py-10" aria-label="Loading collection" aria-busy="true">
      <div className="mb-8 h-10 w-40 rounded bg-line" />
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-square rounded-lg bg-surface motion-safe:animate-pulse" />
            <div className="mt-4 h-4 w-3/4 rounded bg-line" />
          </div>
        ))}
      </div>
    </main>
  )
}
