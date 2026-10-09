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
import { useEffect } from "react"
import { siteQuery } from "../read/queries"
import { ownershipView, type View, VIEWS } from "../lib/product"
import styles from "../styles.css?url"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => ({
    origin: (await context.queryClient.ensureQueryData(siteQuery)).origin
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Supply | Alexandru's collection" },
      {
        name: "description",
        content:
          "A personal collection of things for everyday life, work, and everything in between."
      },
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
  const active = (product && ownershipView(product.ownership)) ?? search.view ?? "supply"
  return (
    <nav aria-label="Collection" className="flex items-center gap-1">
      {VIEWS.map(({ id, label }) => (
        <ViewLink key={id} view={id} current={id === active}>
          {label}
        </ViewLink>
      ))}
    </nav>
  )
}

// Link's own active matching treats "/" as a prefix of every view, so the state is set here.
function ViewLink({ view, current, children }: { view: View; current: boolean; children: string }) {
  const props = useLinkProps({ to: "/", search: view === "supply" ? {} : { view } })
  return (
    <a
      {...props}
      aria-current={current ? "page" : undefined}
      data-status={undefined}
      className="inline-flex h-9 items-center rounded-full px-3 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink"
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
            <Link to="/" className="justify-self-start text-xl font-medium tracking-[-0.02em]">
              Supply<span className="text-accent">.</span>
            </Link>
            <ViewNav />
            <span className="hidden justify-self-end text-sm text-muted sm:block">
              By Alexandru
            </span>
          </header>
          <Outlet />
        </Tooltip.Provider>
        <Scripts />
      </body>
    </html>
  )
}
