import { useEffect } from "react"
import { AppProps } from "next/app"
import { useRouter } from "next/router"
import * as Fathom from "fathom-client"
import Inspect from "inspx"
import "tailwindcss/tailwind.css"
import { ThemeProvider } from "next-themes"
import NavigationBar from "@components/NavigationBar"
import clsx from "clsx"
import Footer from "@components/Footer"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { Analytics } from "@vercel/analytics/react"
import "@lib/palette"
import { PaletteProvider } from "@lib/palette"

export default function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  // Fathom Analytics
  // Source: https://vercel.com/guides/deploying-nextjs-using-fathom-analytics-with-vercel
  const router = useRouter()
  useEffect(() => {
    Fathom.load("LTCIFPOU", {
      url: "https://rook.alexandru.so/script.js",
      includedDomains: ["alexandru.so"],
    })

    function onRouteChangeComplete() {
      Fathom.trackPageview()
    }
    // Record a pageview when route changes
    router.events.on("routeChangeComplete", onRouteChangeComplete)

    return () => {
      router.events.off("routeChangeComplete", onRouteChangeComplete)
    }
  }, [])

  const hideGradient = router.route.includes("journal")
  const showFooter = router.route !== "/"

  return (
    <PaletteProvider>
      <ThemeProvider attribute="class" storageKey="app-theme" defaultTheme="system">
        <Inspect>
          <div className="mx-auto max-w-screen-lg">
            <span
              className={clsx(
                "rounded-full bg-gradient-to-r",
                "dark:from-rose-700 dark:via-pink-700 dark:to-purple-700 dark:opacity-60",
                "from-blue-300 via-cyan-300 to-green-300 opacity-70",
                "-z-50 aspect-square w-full max-w-screen-lg blur-3xl filter",
                "bottom-[calc(100%-200px)] dark:bottom-[calc(100%-180px)]",
                hideGradient ? "absolute" : "fixed"
              )}
            />
          </div>
          <TooltipProvider>
            <NavigationBar />
          </TooltipProvider>
          <main className="body">
            <TooltipProvider>
              <Component {...pageProps} />
            </TooltipProvider>
          </main>
          <>
            {showFooter && (
              <TooltipProvider>
                <Footer />
              </TooltipProvider>
            )}
          </>
          <Analytics />
        </Inspect>
      </ThemeProvider>
    </PaletteProvider>
  )
}
