import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { Toast } from "@base-ui/react/toast"
import { Tooltip } from "@base-ui/react/tooltip"
import type { ReactNode } from "react"
import { bundledStudy } from "~/dicom/study"
import styles from "~/styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", content: "#f5f5f7", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#272729", media: "(prefers-color-scheme: dark)" },
      { title: `${bundledStudy.title} — Filmroom` }
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }
    ]
  }),
  shellComponent: Shell
})

function Shell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Toast.Provider limit={1}>
          <Tooltip.Provider delay={500}>{children}</Tooltip.Provider>
        </Toast.Provider>
        <Scripts />
      </body>
    </html>
  )
}
