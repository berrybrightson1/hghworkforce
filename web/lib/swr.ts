"use client";

import useSWR, { type SWRConfiguration } from "swr";

/**
 * Default fetcher — calls the URL and returns JSON.
 * Throws on non-ok responses so SWR can surface the error.
 */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * useApi — thin wrapper around SWR that provides:
 *  • Automatic client-side caching (avoids redundant re-fetches on navigation)
 *  • Stale-while-revalidate (shows cached data instantly, refreshes in background)
 *  • Deduplication (parallel calls to same key share a single request)
 *
 * Usage:
 *   const { data, error, isLoading } = useApi<Employee[]>("/api/employees");
 *   const { data } = useApi<Payrun>(`/api/payruns/${id}`);
 *   const { data } = useApi<Employee[]>(shouldFetch ? "/api/employees" : null);
 */
export function useApi<T>(
  url: string | null,
  options?: SWRConfiguration<T>,
) {
  return useSWR<T>(url, fetcher<T>, {
    revalidateOnFocus: false,       // don't refetch when tab regains focus
    dedupingInterval: 10_000,       // deduplicate identical requests within 10s
    ...options,
  });
}
