import { createRouter } from "@tanstack/react-router"
import { QueryClient } from "@tanstack/react-query"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const queryClient = new QueryClient({
    // The catalog only changes with a deploy.
    defaultOptions: { queries: { staleTime: Infinity, retry: 1 } }
  })
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Opening or leaving an item zooms its image (see ITEM_IMAGE); every other navigation is
    // instant. Covers browser back and forward too, which never pass a per-link option.
    defaultViewTransition: {
      types: ({ fromLocation, toLocation, pathChanged }) =>
        Boolean(fromLocation) &&
        pathChanged &&
        [fromLocation?.pathname, toLocation.pathname].some((path) => path?.startsWith("/items/"))
          ? ["item"]
          : false
    }
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
