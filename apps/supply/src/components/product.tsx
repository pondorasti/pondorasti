import { Link } from "@tanstack/react-router"
import { ImageOff } from "lucide-react"
import { type ReactNode, useState } from "react"
import type { CatalogFilters } from "../lib/filters"
import { label, type ProductSummary } from "../lib/product"

export function ProductImage({
  src,
  name,
  priority = false
}: {
  src: string
  name: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return failed !== src ? (
    <img
      src={src}
      alt={name}
      width={720}
      height={720}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
    />
  ) : (
    <span
      role="img"
      aria-label={`No image for ${name}`}
      className="flex flex-col items-center gap-3 text-xs text-muted"
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
        className="flex h-full flex-col rounded-2xl bg-surface p-2"
      >
        <div className="product-stage aspect-[7/6] [&_img]:transition-transform [&_img]:duration-300 group-hover:[&_img]:scale-[1.03]">
          <ProductImage src={product.image} name={product.name} priority={priority} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-end px-2 pt-4 pb-2 text-sm leading-5">
          <p className="truncate text-muted">
            {(product.tags.length ? product.tags : [product.status]).map(label).join(" · ")}
          </p>
          <h2 className="truncate">{product.name}</h2>
        </div>
      </Link>
    </article>
  )
}

export function CatalogGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
      {children}
    </div>
  )
}

export function CatalogPending() {
  return (
    <main id="main" className="page-width pt-40" aria-label="Loading collection" aria-busy="true">
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-line" />
        ))}
      </div>
      <CatalogGrid>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="rounded-2xl bg-surface p-2">
            <div className="aspect-[7/6] rounded-xl bg-page motion-safe:animate-pulse" />
            <div className="mx-2 mt-4 mb-2 h-4 w-3/4 rounded-full bg-line" />
          </div>
        ))}
      </CatalogGrid>
    </main>
  )
}
