"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId } from "react";
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
  /** Controlled brand value for client-side catalog surfaces. */
  selectedBrand?: string;
  /** Controlled sort value for client-side catalog surfaces. */
  selectedSort?: string;
  /** Optional client-side brand setter. URL is still updated without a server round trip. */
  onBrandChange?: (value: string) => void;
  /** Optional client-side sort setter. URL is still updated without a server round trip. */
  onSortChange?: (value: string) => void;
  /** Optional snappy client-side search box. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    resultCount: number;
    totalCount: number;
    isSearching?: boolean;
  };
}

const pillBase =
  "px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-[0.2em] transition-colors";
const selectClass =
  "appearance-none rounded-full border border-zinc-700 bg-transparent px-4 py-2 pr-9 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-400 focus:border-amber-500 focus:outline-none";
const searchInputClass =
  "w-full rounded-full border border-zinc-700 bg-black/20 px-4 py-3 pl-10 pr-10 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200 placeholder:text-zinc-600 transition-colors hover:border-amber-500/40 focus:border-amber-500 focus:outline-none md:min-w-[320px]";

/**
 * Sort + filter controls for the watch catalog. A tiny Client Component island
 * — the pages stay Server Components; this only owns the URL-param writes.
 * Each control preserves the others' params so combinations stack.
 */
export function CatalogToolbar({
  brands,
  sortOptions,
  categories,
  selectedBrand,
  selectedSort,
  onBrandChange,
  onSortChange,
  search,
}: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchId = useId();

  const category = searchParams.get("category") ?? "";
  const brand = selectedBrand ?? searchParams.get("brand") ?? "";
  const sort = selectedSort ?? searchParams.get("sort") ?? sortOptions[0]?.value ?? "";

  const buildUrl = useCallback(
    (key: string, value: string) => {
      const currentSearch =
        typeof window === "undefined" ? searchParams.toString() : window.location.search;
      const params = new URLSearchParams(currentSearch);
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams]
  );

  const update = useCallback(
    (key: string, value: string) => {
      const url = buildUrl(key, value);

      if (key === "brand" && onBrandChange) {
        onBrandChange(value);
        window.history.replaceState(null, "", url);
        return;
      }

      if (key === "sort" && onSortChange) {
        onSortChange(value);
        window.history.replaceState(null, "", url);
        return;
      }

      router.push(url, { scroll: false });
    },
    [buildUrl, onBrandChange, onSortChange, router]
  );

  const updateSearch = useCallback(
    (value: string) => {
      if (!search) return;
      search.onChange(value);
      window.history.replaceState(null, "", buildUrl("q", value.trim()));
    },
    [buildUrl, search]
  );

  return (
    <div className="mx-auto mb-8 flex max-w-[1680px] flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category pills (available only) */}
        {categories ? (
          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
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
          <span aria-hidden className="hidden lg:block" />
        )}

        {/* Brand filter + sort */}
        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
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

      {search ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <label htmlFor={searchId} className="sr-only">
              Search available watches
            </label>
            <SearchIcon />
            <input
              id={searchId}
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Search brand, model, reference..."
              value={search.value}
              onInput={(e) => updateSearch(e.currentTarget.value)}
              className={searchInputClass}
            />
            {search.value ? (
              <button
                type="button"
                onClick={() => updateSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-amber-400"
              >
                <span aria-hidden>×</span>
              </button>
            ) : null}
          </div>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 md:text-right">
            {search.isSearching
              ? "Searching..."
              : `${search.resultCount} / ${search.totalCount} pieces`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <title>Search</title>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4 4" strokeLinecap="round" />
    </svg>
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
