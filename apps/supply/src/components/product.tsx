import { Link } from "@tanstack/react-router"
import { ImageOff } from "lucide-react"
import { type ReactNode, useState } from "react"
import type { CatalogFilters } from "../lib/filters"
import { label, type ProductSummary } from "../lib/product"

export function ProductImage({
  src,
  name,
  priority = false,
  morph = false
}: {
  src: string
  name: string
  priority?: boolean
  /** Carries ITEM_IMAGE, so the image zooms between the grid and the item's page. */
  morph?: boolean
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
      data-item-image
      style={morph ? { viewTransitionName: ITEM_IMAGE } : undefined}
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

/** The view-transition name shared by an item's image in the grid and on its page. */
export const ITEM_IMAGE = "item-image"

// The item that last opened or was last viewed. Its card carries ITEM_IMAGE, so returning to the
// grid zooms the image back into it; only one element per page may hold the name.
let current: string | undefined
export const setCurrentItem = (slug: string) => {
  current = slug
}

export function ProductCard({
  product,
  filters,
  priority = false,
  caption = label(product.tag)
}: {
  product: ProductSummary
  filters?: CatalogFilters
  priority?: boolean
  /** Muted line above the name; null hides it. */
  caption?: string | null
}) {
  return (
    <article className="group min-w-0">
      <Link
        to="/items/$slug"
        params={{ slug: product.slug }}
        search={filters ?? {}}
        onClick={(event) => {
          // Hand the name to this card before the router snapshots the page.
          current = product.slug
          for (const image of document.querySelectorAll<HTMLElement>("[data-item-image]")) {
            image.style.viewTransitionName = ""
          }
          const image = event.currentTarget.querySelector<HTMLElement>("[data-item-image]")
          if (image) image.style.viewTransitionName = ITEM_IMAGE
        }}
        className="flex h-full flex-col rounded-2xl bg-surface p-2"
      >
        <div className="product-stage aspect-[7/6] [&_img]:transition-transform [&_img]:duration-300 group-hover:[&_img]:scale-[1.03]">
          <ProductImage
            src={product.image}
            name={product.name}
            priority={priority}
            morph={product.slug === current}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-end px-2 pt-4 pb-2 text-sm leading-5">
          {caption && <p className="truncate text-muted">{caption}</p>}
          <h2 className="truncate">{product.name}</h2>
        </div>
      </Link>
    </article>
  )
}

export function CatalogGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
