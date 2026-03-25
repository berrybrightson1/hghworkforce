"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
  officeLat?: string | null;
  officeLng?: string | null;
  geofenceRadius?: number | null;
  _count?: { employees: number };
}

interface CompanyContextValue {
  companies: Company[];
  selected: Company | null;
  select: (id: string) => void;
  loading: boolean;
  refresh: () => void;
  /** Alias for refresh - re-fetches company list. */
  mutate: () => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  companies: [],
  selected: null,
  select: () => {},
  loading: true,
  refresh: () => {},
  mutate: () => {},
});

/**
 * @param lockedCompany — Employee portal: single company only (no /api/companies list).
 */
export function CompanyProvider({
  children,
  lockedCompany,
}: {
  children: React.ReactNode;
  lockedCompany?: { id: string; name: string };
}) {
  const [companies, setCompanies] = useState<Company[]>(() =>
    lockedCompany ? [{ id: lockedCompany.id, name: lockedCompany.name, isActive: true }] : [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(() => lockedCompany?.id ?? null);
  const [loading, setLoading] = useState(() => !lockedCompany);

  const load = useCallback(async () => {
    if (lockedCompany) {
      setCompanies([{ id: lockedCompany.id, name: lockedCompany.name, isActive: true }]);
      setSelectedId(lockedCompany.id);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
        setSelectedId((prev) => {
          if (prev && data.some((c: Company) => c.id === prev)) return prev;
          const saved = typeof localStorage !== "undefined" ? localStorage.getItem("hgh-company") : null;
          const match = saved && data.find((c: Company) => c.id === saved);
          return match ? saved : data[0]?.id ?? null;
        });
      }
    } catch {
      // API not available yet — expected before db:push
    } finally {
      setLoading(false);
    }
  }, [lockedCompany]);

  useEffect(() => {
    load();
  }, [load]);

  const select = useCallback(
    (id: string) => {
      if (lockedCompany) return;
      setSelectedId(id);
      localStorage.setItem("hgh-company", id);
    },
    [lockedCompany],
  );

  const selected = companies.find((c) => c.id === selectedId) ?? null;

  return (
    <CompanyContext.Provider value={{ companies, selected, select, loading, refresh: load, mutate: load }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
