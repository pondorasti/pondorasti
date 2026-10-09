import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { type RefObject, useEffect, useRef } from "react"
import { Input } from "@base-ui/react/input"
import { Button } from "@base-ui/react/button"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { LayoutGrid, Search, X } from "lucide-react"
import { catalogQuery } from "../read/queries"
import { filterCatalog, productsInView, validateFilters, type CatalogFilters } from "../lib/filters"
import { CatalogGrid, CatalogPending, ProductCard } from "../components/product"
import { IconButton, TagLabel } from "../components/controls"
import { isTag, type Tag, TAGS } from "../lib/product"

export const Route = createFileRoute("/")({
  validateSearch: validateFilters,
  loader: ({ context }) => context.queryClient.fetchQuery(catalogQuery),
  headers: () => ({ "Cache-Control": "no-store" }),
  head: ({ match }) => ({ links: [{ rel: "canonical", href: `${match.context.origin}/` }] }),
  pendingComponent: CatalogPending,
  component: Catalog
})

function Catalog() {
  const { data: products } = useSuspenseQuery(catalogQuery)
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const update = (values: CatalogFilters, replace = false) => {
    void navigate({ search: { ...filters, ...values }, replace, resetScroll: false })
  }
  const searchRef = useRef<HTMLInputElement>(null)
  useSearchShortcut(searchRef)
  const inView = productsInView(products, filters.view)
  const filtered = filterCatalog(products, filters)
  const used = new Set(inView.flatMap((product) => product.tags))
  // The active tag keeps its pill even when this view has nothing tagged with it.
  const tags = (Object.keys(TAGS) as Tag[]).filter((tag) => used.has(tag) || tag === filters.tag)
  const hasFilters = Boolean(filters.q || filters.tag)
  const clear = () => {
    void navigate({ search: { view: filters.view }, resetScroll: false })
  }
  return (
    <main id="main" className="page-width pb-16">
      <section className="mx-auto flex max-w-[560px] flex-col items-center pt-14 pb-12 text-center sm:pt-20 sm:pb-16">
        <h1 className="display text-balance">
          Things for everyday life, work, and everything in between.
        </h1>
        <p className="mt-3 text-base leading-6 text-pretty text-muted">
          A personal collection of what's owned, used every day, and still on the wishlist.
        </p>
        <label className="mt-7 flex h-11 w-full max-w-[428px] items-center gap-2 rounded-full bg-surface pr-1 pl-4 ring-1 ring-transparent focus-within:ring-line">
          <Search size={16} className="shrink-0 text-muted" />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search collection"
            placeholder="Search objects"
            value={filters.q ?? ""}
            onValueChange={(q) => update({ q: q || undefined }, true)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
          />
          {filters.q && (
            <IconButton label="Clear search" onClick={() => update({ q: undefined }, true)}>
              <X size={15} />
            </IconButton>
          )}
        </label>
      </section>
      {/* The scroller clips overflow, so 5px of padding (offset netted out) fits the focus outline. */}
      <ToggleGroup
        aria-label="Category"
        value={[filters.tag ?? "all"]}
        onValueChange={(values) => {
          const value = values[0]
          if (value) update({ tag: isTag(value) ? value : undefined })
        }}
        className="no-scrollbar -mx-4 -mt-[5px] mb-[11px] flex gap-2 overflow-x-auto px-4 py-[5px] lg:-mx-6 lg:px-6"
      >
        <Toggle value="all" className="pill">
          <LayoutGrid size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          All
        </Toggle>
        {tags.map((tag) => (
          <Toggle key={tag} value={tag} className="pill">
            <TagLabel tag={tag} />
          </Toggle>
        ))}
      </ToggleGroup>
      {filtered.length ? (
        <CatalogGrid>
          {filtered.map((product, index) => (
            <ProductCard
              key={product.slug}
              product={product}
              filters={filters}
              priority={index < 5}
            />
          ))}
        </CatalogGrid>
      ) : (
        <div className="flex flex-col items-center rounded-2xl bg-surface py-24 text-center">
          <h2 className="text-xl font-medium">
            {hasFilters ? "No matching objects." : "Nothing here just yet."}
          </h2>
          {hasFilters && (
            <Button className="pill mt-5" onClick={clear}>
              <X size={14} />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </main>
  )
}

/** ⌘K / Ctrl+K anywhere, or "/" outside a text field, focuses the search box. */
function useSearchShortcut(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      const slash =
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("input, textarea, select, [contenteditable]")
        )
      if (!command && !slash) return
      event.preventDefault()
      ref.current?.focus()
      ref.current?.select()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [ref])
}
