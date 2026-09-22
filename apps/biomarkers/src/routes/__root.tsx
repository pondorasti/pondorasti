import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router"
import styles from "~/styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", content: "#f2f2f7", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#000000", media: "(prefers-color-scheme: dark)" },
      { title: "Health · Lab Results" }
    ],
    links: [{ rel: "stylesheet", href: styles }]
  }),
  component: Root,
  notFoundComponent: NotFound
})

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="mx-auto max-w-195 px-4 pt-2 pb-16">
          <Outlet />
          <footer className="mt-10 text-center text-xs leading-[1.4] text-ink-3">
            Sources: Function · Quest · Labcorp · Kaiser Permanente
            <br />
            Not medical advice.
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Not found</h1>
      <Link to="/" className="mt-4 inline-block text-link">
        Back to Summary
      </Link>
    </div>
  )
}
