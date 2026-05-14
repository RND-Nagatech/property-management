import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// IMPORTANT: keep router + queryClient singletons on the client.
// Re-creating them can cause repeated fetch loops (cache resets) and UI flicker.
let clientQueryClient: QueryClient | null = null;
type AppRouter = ReturnType<typeof createRouter<typeof routeTree>>;

let clientRouter: AppRouter | null = null;

export const getRouter = () => {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    if (!clientQueryClient) clientQueryClient = new QueryClient();
    if (!clientRouter) {
      clientRouter = createRouter({
        routeTree,
        context: { queryClient: clientQueryClient },
        scrollRestoration: true,
        defaultPreloadStaleTime: 0,
      }) as AppRouter;
    }
    return clientRouter;
  }

  // SSR: safe to create per-request instances.
  const queryClient = new QueryClient();
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  }) as AppRouter;
};
