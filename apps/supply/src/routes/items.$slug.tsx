import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Archive, ArrowLeft, ArrowUpRight, Check, Heart } from "lucide-react"
import { productQuery } from "../read/queries"
import { CatalogFilters } from "../lib/filters"
import { label, Slug, statusView } from "../lib/product"
import { ProductImage } from "../components/product"

export const Route = createFileRoute("/items/$slug")({
  validateSearch: CatalogFilters,
  loader: async ({ context, params }) => {
    if (!Slug.safeParse(params.slug).success) throw notFound()
    const product = await context.queryClient.fetchQuery(productQuery(params.slug))
    if (!product) throw notFound()
    return product
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: ({ loaderData: product, match: { context } }) =>
    product
      ? {
          meta: [
            { title: `${product.name} | Supply` },
            { name: "description", content: `${product.name} in Alexandru's personal collection.` },
            { property: "og:title", content: `${product.name} | Supply` },
            { property: "og:image", content: `${context.origin}${product.image}` }
          ],
          links: [{ rel: "canonical", href: `${context.origin}/items/${product.slug}` }]
        }
      : {},
  component: Product
})

function Product() {
  const { slug } = Route.useParams()
  const filters = Route.useSearch()
  const { data: product } = useSuspenseQuery(productQuery(slug))
  if (!product) throw notFound()
  // Links back into the catalog stay in this product's view, even when it was opened directly.
  const productView = statusView(product.status)
  const view = productView === "supply" ? undefined : productView
  return (
    <main id="main" className="page-width pb-16">
      <Link
        to="/"
        search={{ ...filters, view }}
        aria-label="Back to collection"
        className="mt-2 inline-flex size-9 items-center justify-center rounded-full bg-surface transition-opacity hover:opacity-80"
      >
        <ArrowLeft size={16} />
      </Link>
      {/* Stacked on phones; from lg the image sits on the left and stays in view while the details scroll. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="product-stage aspect-square w-full rounded-3xl lg:sticky lg:top-6 lg:max-h-[calc(100svh-9rem)]">
          <ProductImage src={product.image} name={product.name} priority />
        </div>
        <div className="min-w-0 lg:pt-2">
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            <span
              className={`inline-flex items-center gap-1 ${product.status === "wishlist" ? "text-wishlist" : ""}`}
            >
              {product.status === "wishlist" ? (
                <Heart size={13} />
              ) : product.status === "owned" ? (
                <Check size={14} />
              ) : (
                <Archive size={13} />
              )}
              {label(product.status)}
            </span>
            <span aria-hidden="true">·</span>
            <Link to="/" search={{ tag: product.tag, view }} className="hover:text-ink">
              {label(product.tag)}
            </Link>
          </p>
          <h1 className="display mt-1 break-words">{product.name}</h1>
          {product.variant && <p className="mt-2 text-base text-muted">{product.variant}</p>}
          {product.link && (
            <a
              href={product.link}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-page transition-opacity hover:opacity-80"
            >
              Visit product
              <ArrowUpRight size={16} />
            </a>
          )}
          {product.notes && (
            <section aria-labelledby="notes" className="mt-10 border-t border-line pt-8">
              <h2 id="notes" className="text-lg font-medium tracking-[-0.01em]">
                Notes
              </h2>
              {/* Rendered at build time from markdown in the repo, with raw HTML escaped. */}
              <div className="notes mt-4" dangerouslySetInnerHTML={{ __html: product.notes }} />
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
