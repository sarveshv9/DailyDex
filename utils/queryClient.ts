import { QueryClient } from "@tanstack/react-query";

/**
 * Global TanStack Query Client configured for offline-first mobile apps.
 * Pokémon API data is immutable, so we configure a 24-hour stale time
 * and 7-day garbage collection cache window.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
