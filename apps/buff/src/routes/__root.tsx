import { useEffect, useRef } from 'react'
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLocation,
} from '@tanstack/react-router'
import { Sidebar } from '~/components/Sidebar'
import { TabBar } from '~/components/TabBar'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
      { name: 'color-scheme', content: 'light dark' },
      { title: 'buff — training' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="overflow-hidden max-md:overflow-auto">
        <AppShell>{children}</AppShell>
        <Scripts />
      </body>
    </html>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // <main> is the scroll container on desktop — reset it on navigation.
  useEffect(() => {
    mainRef.current?.scrollTop && (mainRef.current.scrollTop = 0)
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[230px_1fr] max-md:h-auto max-md:min-h-dvh">
      <Sidebar />
      <main
        ref={mainRef}
        className="relative overflow-y-auto overflow-x-hidden scroll-smooth max-md:overflow-visible max-md:pb-[calc(60px+env(safe-area-inset-bottom))]"
      >
        {children ?? <Outlet />}
      </main>
      <TabBar />
    </div>
  )
}

function NotFound() {
  return (
    <div className="max-w-[900px] px-4 py-10 md:px-[26px]">
      <h1 className="text-xl font-extrabold tracking-[-0.02em]">Not found</h1>
      <p className="mt-2 text-[14.5px] text-muted">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-accent-2 hover:underline">
        ← Back to overview
      </Link>
    </div>
  )
}
