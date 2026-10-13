import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter
} from "@tanstack/react-router"
import { type QueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { Button } from "@base-ui/react/button"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { useEffect } from "react"
import { siteQuery } from "../read/queries"
import styles from "../styles.css?url"

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => ({
    origin: (await context.queryClient.ensureQueryData(siteQuery)).origin
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Macro | Alexandru's nutrition" },
      { name: "description", content: "Alexandru's daily calories, protein, fiber and weight." },
      { name: "robots", content: "noindex" },
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
      <h1 className="display">Nothing logged here.</h1>
      <Link to="/" className="control mt-8">
        <ArrowLeft size={16} />
        Back to the dashboard
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
      <h1 className="display">The log is unavailable.</h1>
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-5 focus:left-5 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <header className="page-width flex h-[68px] items-center justify-between gap-4">
          <Link to="/" className="text-xl font-medium tracking-[-0.02em]">
            Macro<span className="text-accent">.</span>
          </Link>
          <span className="text-sm text-muted">By Alexandru</span>
        </header>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
