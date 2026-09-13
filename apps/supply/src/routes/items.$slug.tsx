import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowLeft, ArrowUpRight, Check, Heart, X, ZoomIn } from "lucide-react"
import { productQuery } from "../queries"
import { validateFilters } from "../filters"
import { imagePath } from "../catalog"
import { ProductImage } from "../components/product"
import { NotionBody } from "../components/notion-body"

export const Route = createFileRoute("/items/$slug")({
  validateSearch: validateFilters,
  loader: async ({ context, params }) => {
    const product = await context.queryClient.fetchQuery(productQuery(params.slug))
    if (!product) throw notFound()
    return product
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: ({ loaderData: product }) =>
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
                    content: `https://alexandru.supply${imagePath(product.thumbnail)}`
                  }
                ]
              : [])
          ],
          links: [{ rel: "canonical", href: `https://alexandru.supply/items/${product.slug}` }]
        }
      : {},
  component: Product
})

function Product() {
  const { slug } = Route.useParams()
  const filters = Route.useSearch()
  const { data: product } = useSuspenseQuery(productQuery(slug))
  if (!product) throw notFound()
  return (
    <main id="main" className="page-width">
      <Link
        to="/"
        search={filters}
        className="my-7 inline-flex items-center gap-2 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft size={15} />
        Back to collection
      </Link>
      <div className="grid items-start gap-8 pb-8 md:grid-cols-2 lg:gap-16">
        <div className="md:sticky md:top-8">
          {product.thumbnail ? (
            <Dialog.Root>
              <Dialog.Trigger
                className="product-stage group relative w-full"
                aria-label={`Enlarge ${product.name} image`}
              >
                <ProductImage hash={product.thumbnail} name={product.name} priority />
                <span
                  className="absolute bottom-4 right-4 flex size-9 items-center justify-center rounded-full bg-[#f4f5f3] text-[#646a66]"
                  aria-hidden="true"
                >
                  <ZoomIn size={18} />
                </span>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60" />
                <Dialog.Popup className="fixed inset-3 z-50 flex flex-col rounded-lg bg-page p-4 sm:inset-8">
                  <div className="flex items-center justify-between gap-4">
                    <Dialog.Title className="min-w-0 truncate text-sm">{product.name}</Dialog.Title>
                    <Dialog.Close className="icon-control" aria-label="Close image">
                      <X size={20} />
                    </Dialog.Close>
                  </div>
                  <div className="product-stage mt-4 min-h-0 flex-1 aspect-auto">
                    <ProductImage hash={product.thumbnail} name={product.name} priority />
                  </div>
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          ) : (
            <div className="product-stage">
              <ProductImage hash={null} name={product.name} />
            </div>
          )}
        </div>
        <div className="min-w-0 md:py-5 lg:py-8">
          <p
            className={`mb-5 inline-flex items-center gap-1.5 text-xs ${product.ownership === "Wishlist" ? "text-wishlist" : "text-accent"}`}
          >
            {product.ownership === "Wishlist" ? (
              <Heart size={13} />
            ) : product.ownership === "Owned" ? (
              <Check size={14} />
            ) : null}
            {product.ownership}
          </p>
          <h1 className="text-3xl leading-tight font-medium break-words sm:text-4xl">
            {product.name || "Untitled"}
          </h1>
          {product.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  to="/"
                  search={{ tag }}
                  className="text-xs text-muted underline decoration-line underline-offset-4 hover:text-ink"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          {product.link && (
            <a
              href={product.link}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-11 items-center justify-center gap-3 rounded-md bg-ink px-5 text-sm font-medium text-page hover:opacity-80"
            >
              Visit product
              <ArrowUpRight size={16} />
            </a>
          )}
          {product.body.length > 0 && (
            <section aria-label="Notes" className="notion-body mt-10 border-t border-line pt-7">
              <NotionBody blocks={product.body} />
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
