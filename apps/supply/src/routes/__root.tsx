import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLinkProps,
  useMatch,
  useRouter,
  useSearch
} from "@tanstack/react-router"
import { type QueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Tooltip } from "@base-ui/react/tooltip"
import { Button } from "@base-ui/react/button"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { GitHubMark, IconLink } from "../components/controls"
import { siteQuery } from "../read/queries"
import { statusView, type View, VIEWS } from "../lib/product"
import styles from "../styles.css?url"

const DESCRIPTION = "Things I currently own and use, plus the wishlist and the archive."

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const { origin, cards } = await context.queryClient.ensureQueryData(siteQuery)
    return { origin, cards }
  },
  head: ({ match: { context } }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Supply | Alexandru's Collection" },
      { name: "description", content: DESCRIPTION },
      { property: "og:site_name", content: "Supply" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Supply | Alexandru's Collection" },
      { property: "og:description", content: DESCRIPTION },
      // Every page has a card, so the collection's stands in until a route sets its own.
      { property: "og:image", content: `${context.origin}${context.cards.collection}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#f2f2f2", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0e0e0e", media: "(prefers-color-scheme: dark)" }
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }
    ]
  }),
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: LoadError
})

function NotFound() {
  return (
    <main id="main" className="page-width py-24">
      <p className="mb-3 text-sm text-muted">404</p>
      <h1 className="display">This item is no longer here.</h1>
      <Link to="/" className="control mt-8">
        <ArrowLeft size={16} />
        Back to the collection
      </Link>
    </main>
  )
}

function LoadError() {
  const router = useRouter()
  const boundary = useQueryErrorResetBoundary()
  useEffect(() => {
    boundary.reset()
  }, [boundary])
  return (
    <main id="main" className="page-width py-24">
      <h1 className="display">The collection is unavailable.</h1>
      <p className="mt-3 text-muted">Please try again in a moment.</p>
      <Button
        className="control mt-6"
        onClick={() => {
          void router.invalidate()
        }}
      >
        <RotateCcw size={16} />
        Try again
      </Button>
    </main>
  )
}

/** The active tab is the product's own view on a detail page, otherwise the catalog's. */
function ViewNav() {
  const product = useMatch({ from: "/items/$slug", shouldThrow: false })?.loaderData
  const search = useSearch({ strict: false })
  const active = (product && statusView(product.status)) ?? search.view ?? "collection"
  const nav = useRef<HTMLElement>(null)
  // One pill slides between tabs once it's measured; until then the active tab fills itself.
  const [pill, setPill] = useState<{ left: number; width: number }>()
  useLayoutEffect(() => {
    const element = nav.current
    if (!element) return
    const measure = () => {
      const link = element.querySelector<HTMLElement>('[aria-current="page"]')
      setPill(link ? { left: link.offsetLeft, width: link.offsetWidth } : undefined)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [active])
  return (
    <nav ref={nav} aria-label="Collection" className="relative flex items-center gap-1">
      {pill && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full bg-surface motion-safe:transition-[left,width] motion-safe:duration-300 motion-safe:ease-out"
          style={pill}
        />
      )}
      {VIEWS.map(({ id, label }) => (
        <ViewLink key={id} view={id} current={id === active} filled={id === active && !pill}>
          {label}
        </ViewLink>
      ))}
    </nav>
  )
}

// Link's own active matching treats "/" as a prefix of every view, so the state is set here.
function ViewLink({
  view,
  current,
  filled,
  children
}: {
  view: View
  current: boolean
  filled: boolean
  children: string
}) {
  const props = useLinkProps({ to: "/", search: view === "collection" ? {} : { view } })
  return (
    <a
      {...props}
      aria-current={current ? "page" : undefined}
      data-status={undefined}
      className={`relative inline-flex h-9 items-center rounded-full px-3 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:text-ink ${filled ? "bg-surface" : ""}`}
    >
      {children}
    </a>
  )
}

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Tooltip.Provider delay={350}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
          >
            Skip to content
          </a>
          <header className="page-width grid h-[68px] grid-cols-[1fr_auto_1fr] items-center gap-4">
            <p className="justify-self-start text-sm font-medium tracking-wide">
              {/* Thin spaces keep the brackets close to the name; only the words are links. */}
              {"[\u2009"}
              <Link to="/" className="text-link">
                supply
              </Link>
              .{/* Phones keep the short form so the centered nav still fits. */}
              <a
                href="https://alexandru.so"
                target="_blank"
                rel="noreferrer"
                className="hidden text-muted text-link sm:inline"
              >
                alexandru.so
              </a>
              {"\u2009]"}
            </p>
            <ViewNav />
            {/* Pulled out by the button's padding so the mark lines up with the grid's edge; phones
                narrower than 400px drop it, so the centered nav still fits. */}
            <div className="-mr-2 hidden justify-self-end min-[400px]:block">
              <IconLink
                label="Source on GitHub"
                href="https://github.com/pondorasti/pondorasti/tree/main/apps/supply"
              >
                <GitHubMark size={20} />
              </IconLink>
            </div>
          </header>
          <Outlet />
        </Tooltip.Provider>
        <Scripts />
      </body>
    </html>
  )
}
