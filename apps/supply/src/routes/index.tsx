import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Input } from "@base-ui/react/input"
import { Button } from "@base-ui/react/button"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { ArrowDownAZ, Search, SlidersHorizontal, X } from "lucide-react"
import { catalogQuery } from "../queries"
import { filterCatalog, validateFilters, type CatalogFilters } from "../filters"
import { CatalogPending, ProductCard } from "../components/product"
import { IconButton, SelectControl } from "../components/controls"

export const Route = createFileRoute("/")({
  validateSearch: validateFilters,
  loader: ({ context }) => context.queryClient.fetchQuery(catalogQuery),
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({ links: [{ rel: "canonical", href: "https://alexandru.supply/" }] }),
  pendingComponent: CatalogPending,
  component: Catalog
})

function Catalog() {
  const { data: products, isRefetchError } = useSuspenseQuery(catalogQuery)
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const update = (values: CatalogFilters, replace = false) => {
    void navigate({ search: { ...filters, ...values }, replace, resetScroll: false })
  }
  const filtered = filterCatalog(products, filters)
  const tags = [...new Set(products.flatMap((product) => product.tags))].sort((a, b) =>
    a.localeCompare(b, "en")
  )
  if (filters.tag && !tags.includes(filters.tag)) tags.push(filters.tag)
  const hasFilters = Boolean(filters.q || filters.tag || filters.ownership)
  return (
    <main id="main" className="page-width pb-6">
      <div className="flex flex-wrap items-end justify-between gap-5 pt-10 pb-8 sm:pt-12">
        <div>
          <h1 className="text-3xl font-medium">The collection</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Things for everyday life, work, and everything in between.
          </p>
        </div>
        <span className="text-xs text-muted tabular-nums">{products.length} objects</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-y border-line py-4">
        <ToggleGroup
          aria-label="Ownership"
          value={[filters.ownership ?? "all"]}
          onValueChange={(values) => {
            const value = values[0]
            if (value)
              update({ ownership: value === "all" ? undefined : (value as "Owned" | "Wishlist") })
          }}
          className="flex h-10 shrink-0 items-center rounded-md bg-line/50 p-1"
        >
          {[
            { value: "all", label: "All" },
            { value: "Owned", label: "Owned" },
            { value: "Wishlist", label: "Wishlist" }
          ].map(({ value, label }) => (
            <Toggle
              key={value}
              value={value}
              className="h-8 rounded px-4 text-xs font-medium text-muted data-pressed:bg-surface data-pressed:text-ink data-pressed:shadow-xs"
            >
              {label}
            </Toggle>
          ))}
        </ToggleGroup>
        <label className="flex h-10 min-w-[150px] flex-1 items-center gap-2 rounded-md border border-line bg-surface pl-3 focus-within:border-accent sm:max-w-[320px]">
          <Search size={16} className="shrink-0 text-muted" />
          <Input
            type="search"
            aria-label="Search collection"
            placeholder="Search objects"
            value={filters.q ?? ""}
            onValueChange={(q) => update({ q: q || undefined }, true)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
          />
          {filters.q ? (
            <IconButton label="Clear search" onClick={() => update({ q: undefined }, true)}>
              <X size={15} />
            </IconButton>
          ) : (
            <span className="w-3" />
          )}
        </label>
        <div className="flex w-full flex-wrap gap-3 sm:ml-auto sm:w-auto">
          <SelectControl
            label="Category"
            value={filters.tag ?? ""}
            items={[
              { label: "All categories", value: "" },
              ...tags.map((tag) => ({ label: tag, value: tag }))
            ]}
            onChange={(tag) => update({ tag: tag || undefined })}
            icon={<SlidersHorizontal size={15} className="shrink-0" />}
          />
          <SelectControl
            label="Sort collection"
            value={filters.sort ?? "asc"}
            items={[
              { label: "A to Z", value: "asc" },
              { label: "Z to A", value: "desc" }
            ]}
            onChange={(sort) => update({ sort: sort === "desc" ? "desc" : undefined })}
            icon={<ArrowDownAZ size={16} className="shrink-0" />}
          />
        </div>
      </div>
      <div className="flex min-h-14 items-center justify-between gap-3 py-3 text-xs text-muted">
        <p role="status" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "object" : "objects"}
          {filters.tag ? ` in ${filters.tag}` : ""}
        </p>
        {hasFilters && (
          <Button
            className="inline-flex items-center gap-1.5 hover:text-ink"
            onClick={() => {
              void navigate({ search: {}, resetScroll: false })
            }}
          >
            <X size={13} />
            Clear filters
          </Button>
        )}
      </div>
      {isRefetchError && (
        <p role="status" className="mb-5 text-sm text-muted">
          Couldn't refresh the collection. Showing the last available version.
        </p>
      )}
      {filtered.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((product, index) => (
            <ProductCard
              key={product.slug}
              product={product}
              filters={filters}
              priority={index < 4}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <h2 className="text-xl font-medium">
            {hasFilters ? "No matching objects." : "Nothing here just yet."}
          </h2>
          {hasFilters && (
            <Button
              className="control mt-5"
              onClick={() => {
                void navigate({ search: {}, resetScroll: false })
              }}
            >
              <X size={14} />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </main>
  )
}
