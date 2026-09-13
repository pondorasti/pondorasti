import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter
} from "@tanstack/react-router"
import { type QueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Tooltip } from "@base-ui/react/tooltip"
import { Button } from "@base-ui/react/button"
import { ArrowLeft, ArrowUpRight, RotateCcw } from "lucide-react"
import { useEffect } from "react"
import styles from "../styles.css?url"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
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
      { name: "theme-color", content: "#f7f7f6", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#161917", media: "(prefers-color-scheme: dark)" }
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
      <h1 className="text-3xl font-medium">This item is no longer here.</h1>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm">
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
      <h1 className="text-2xl font-medium">The collection is unavailable.</h1>
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
            className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-50 focus:bg-surface focus:p-3"
          >
            Skip to content
          </a>
          <header className="page-width flex h-24 items-center justify-between gap-6 border-b border-line">
            <Link to="/" className="text-[28px] font-semibold">
              Supply<span className="text-accent">.</span>
            </Link>
            <span className="text-sm text-muted">By Alexandru</span>
          </header>
          <Outlet />
          <footer className="page-width mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line py-7 text-xs text-muted">
            <span>Alexandru's collection</span>
            <a
              href="https://www.curated.supply/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              Inspired by Curated Supply
              <ArrowUpRight size={13} />
            </a>
          </footer>
        </Tooltip.Provider>
        <Scripts />
      </body>
    </html>
  )
}
