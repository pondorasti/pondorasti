import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Dialog } from "@base-ui/react/dialog"
import { Archive, ArrowLeft, ArrowUpRight, Check, Heart, X, ZoomIn } from "lucide-react"
import { productQuery } from "../read/queries"
import { validateFilters } from "../lib/filters"
import { imagePath } from "../lib/links"
import { isSlug, ownershipView } from "../lib/product"
import { ProductImage } from "../components/product"
import { NotionBody } from "../components/notion-body"

export const Route = createFileRoute("/items/$slug")({
  validateSearch: validateFilters,
  loader: async ({ context, params }) => {
    if (!isSlug(params.slug)) throw notFound()
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
            ...(product.thumbnail
              ? [
                  {
                    property: "og:image",
                    content: `${context.origin}${imagePath(product.thumbnail)}`
                  }
                ]
              : [])
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
  const tags = product.tags.filter((tag) => tag !== product.ownership)
  // Links back into the catalog stay in this product's view, even when it was opened directly.
  const productView = ownershipView(product.ownership)
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
              className={`inline-flex items-center gap-1 ${product.ownership === "Wishlist" ? "text-wishlist" : ""}`}
            >
              {product.ownership === "Wishlist" ? (
                <Heart size={13} />
              ) : product.ownership === "Owned" ? (
                <Check size={14} />
              ) : product.ownership === "Retired" ? (
                <Archive size={13} />
              ) : null}
              {product.ownership}
            </span>
            {tags.map((tag) => (
              <span key={tag} className="contents">
                <span aria-hidden="true">·</span>
                <Link to="/" search={{ tag, view }} className="hover:text-ink">
                  {tag}
                </Link>
              </span>
            ))}
          </p>
          <h1 className="display mt-1 break-words">{product.name || "Untitled"}</h1>
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
      <div className="mt-6">
        {product.thumbnail ? (
          <Dialog.Root>
            <Dialog.Trigger
              className="product-stage group relative aspect-square max-h-[720px] w-full rounded-3xl sm:aspect-[8/7]"
              aria-label={`Enlarge ${product.name} image`}
            >
              <ProductImage hash={product.thumbnail} name={product.name} priority />
              <span
                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-page text-muted transition-colors group-hover:text-ink"
                aria-hidden="true"
              >
                <ZoomIn size={16} />
              </span>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60" />
              <Dialog.Popup className="fixed inset-3 z-50 flex flex-col rounded-3xl bg-page p-4 sm:inset-8">
                <div className="flex items-center justify-between gap-4 pl-2">
                  <Dialog.Title className="min-w-0 truncate text-sm">{product.name}</Dialog.Title>
                  <Dialog.Close className="icon-control" aria-label="Close image">
                    <X size={18} />
                  </Dialog.Close>
                </div>
                <div className="product-stage mt-4 min-h-0 flex-1 rounded-2xl">
                  <ProductImage hash={product.thumbnail} name={product.name} priority />
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        ) : (
          <div className="product-stage aspect-square max-h-[720px] w-full rounded-3xl sm:aspect-[8/7]">
            <ProductImage hash={null} name={product.name} />
          </div>
        )}
      </div>
      {product.body.length > 0 && (
        <section aria-labelledby="notes" className="mt-14">
          <h2
            id="notes"
            className="text-[28px] leading-[1.1] font-medium tracking-[-0.02em] sm:text-[32px]"
          >
            Notes
          </h2>
          <div className="notion-body mt-4">
            <NotionBody blocks={product.body} />
          </div>
        </section>
      )}
    </main>
  )
}
