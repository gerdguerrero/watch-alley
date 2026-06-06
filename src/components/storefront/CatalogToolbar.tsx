"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { SortKey } from "@/lib/inventory/sort";

interface Option {
  value: string;
  label: string;
}

interface CatalogToolbarProps {
  /** Distinct brands present in the current result set. */
  brands: string[];
  /** Sort choices for this surface (differ between /available and /sold). */
  sortOptions: ReadonlyArray<{ value: SortKey; label: string }>;
  /** Category pills, shown only on /available. */
  categories?: ReadonlyArray<Option>;
}

const pillBase =
  "px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-[0.2em] transition-colors";
const selectClass =
  "appearance-none rounded-full border border-zinc-700 bg-transparent px-4 py-2 pr-9 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-400 focus:border-amber-500 focus:outline-none";

/**
 * Sort + filter controls for the watch catalog. A tiny Client Component island
 * — the pages stay Server Components; this only owns the URL-param writes.
 * Each control preserves the others' params so combinations stack.
 */
export function CatalogToolbar({ brands, sortOptions, categories }: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const sort = searchParams.get("sort") ?? sortOptions[0]?.value ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="mx-auto mb-8 flex max-w-[1680px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Category pills (available only) */}
      {categories ? (
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          {categories.map((cat) => {
            const isActive = category === cat.value || (!category && cat.value === "");
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => update("category", cat.value)}
                className={
                  isActive
                    ? `${pillBase} border border-amber-500 bg-amber-500 text-zinc-900`
                    : `${pillBase} border border-zinc-700 bg-transparent text-zinc-400 hover:border-amber-500/50 hover:text-amber-400`
                }
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span aria-hidden className="hidden sm:block" />
      )}

      {/* Brand filter + sort */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        {brands.length > 1 ? (
          <div className="relative">
            <select
              aria-label="Filter by brand"
              value={brand}
              onChange={(e) => update("brand", e.target.value)}
              className={selectClass}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        ) : null}

        <div className="relative">
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className={selectClass}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-zinc-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <title>Open menu</title>
      <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
