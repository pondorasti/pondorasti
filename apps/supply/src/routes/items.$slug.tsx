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
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
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
            {product.tags.map((tag) => (
              <span key={tag} className="contents">
                <span aria-hidden="true">·</span>
                <Link to="/" search={{ tag, view }} className="hover:text-ink">
                  {label(tag)}
                </Link>
              </span>
            ))}
          </p>
          <h1 className="display mt-1 break-words">{product.name}</h1>
          {product.variant && <p className="mt-2 text-base text-muted">{product.variant}</p>}
        </div>
        {product.link && (
          <a
            href={product.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-medium text-page transition-opacity hover:opacity-80"
          >
            Visit product
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
      <div className="product-stage mt-6 aspect-square max-h-[720px] w-full rounded-3xl sm:aspect-[8/7]">
        <ProductImage src={product.image} name={product.name} priority />
      </div>
      {product.notes && (
        <section aria-labelledby="notes" className="mt-14">
          <h2
            id="notes"
            className="text-[28px] leading-[1.1] font-medium tracking-[-0.02em] sm:text-[32px]"
          >
            Notes
          </h2>
          {/* Rendered at build time from markdown in the repo, with raw HTML escaped. */}
          <div className="notes mt-4" dangerouslySetInnerHTML={{ __html: product.notes }} />
        </section>
      )}
    </main>
  )
}
