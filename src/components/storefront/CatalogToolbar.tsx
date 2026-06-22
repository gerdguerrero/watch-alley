"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { SortKey } from "@/lib/inventory/sort";

interface Option {
  value: string;
  label: string;
}

interface CatalogToolbarProps {
  brands: string[];
  sortOptions: ReadonlyArray<{ value: SortKey; label: string }>;
  categories?: ReadonlyArray<Option>;
  selectedBrand?: string;
  selectedSort?: string;
  onBrandChange?: (value: string) => void;
  onSortChange?: (value: string) => void;
  search?: {
    value: string;
    onChange: (value: string) => void;
    resultCount: number;
    totalCount: number;
    isSearching?: boolean;
  };
}

const pillBase =
  "rounded-full font-mono text-[10px] uppercase tracking-[0.2em] transition-colors px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2";
const searchInputClass =
  "w-full rounded-full border border-zinc-700 bg-black/20 px-4 py-2.5 pl-10 pr-10 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-200 placeholder:text-zinc-600 transition-colors hover:border-amber-500/40 focus:border-amber-500 focus:outline-none sm:min-w-[240px] lg:min-w-[280px]";

/* ------------------------------------------------------------------ */
/*  PillDropdown - custom select matching site design language         */
/* ------------------------------------------------------------------ */

const dropdownTriggerClass = `${pillBase} inline-flex items-center gap-1.5 border border-zinc-700 bg-transparent text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 focus:border-amber-500 focus:outline-none`;
const dropdownTriggerActiveClass = `${pillBase} inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 text-amber-300`;

const menuClass =
  "absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 min-w-[160px] overflow-hidden rounded-2xl border border-amber-400/10 bg-[#0d0b0a]/95 py-2 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl";
const menuItemClass =
  "block w-full px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:bg-amber-400/10 hover:text-amber-300";
const menuItemActiveClass = "text-amber-300 bg-amber-400/5";

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 10 6"
      className={`h-2.5 w-2.5 shrink-0 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Expand</title>
      <path d="m1 1 4 4 4-4" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-2.5 w-2.5 shrink-0 text-amber-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Selected</title>
      <path d="m1.5 6 3 3 6-6" />
    </svg>
  );
}

function PillDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<Option>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? label;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const isActive = value !== "";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={isActive ? dropdownTriggerActiveClass : dropdownTriggerClass}
      >
        <span>{selectedLabel}</span>
        <Caret open={open} />
      </button>

      {open && (
        <div ref={menuRef} role="listbox" className={menuClass}>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`${menuItemClass} ${selected ? menuItemActiveClass : ""}`}
              >
                <span className="flex items-center gap-2">
                  {selected && <Check />}
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CatalogToolbar                                                     */
/* ------------------------------------------------------------------ */

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

  const brandOptions: Option[] = [
    { value: "", label: "All Brands" },
    ...brands.map((b) => ({ value: b, label: b })),
  ];

  return (
    <div className="mx-auto mb-8 flex max-w-[1680px] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:flex-nowrap lg:justify-start lg:gap-4">
        {/* Category pills */}
        {categories ? (
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
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
        ) : null}

        {/* Brand + sort custom dropdowns */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {brands.length > 1 ? (
            <PillDropdown
              label="All Brands"
              value={brand}
              options={brandOptions}
              onChange={(v) => update("brand", v)}
            />
          ) : null}
          <PillDropdown
            label="Sort"
            value={sort}
            options={sortOptions}
            onChange={(v) => update("sort", v)}
          />
        </div>

        {/* Search input + count */}
        {search ? (
          <div className="flex w-full items-center gap-2 sm:w-auto lg:ml-auto">
            <div className="relative flex-1 sm:w-auto sm:min-w-[200px] lg:min-w-[260px]">
              <label htmlFor={searchId} className="sr-only">
                Search available watches
              </label>
              <SearchIcon />
              <input
                id={searchId}
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Search..."
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
            <p className="shrink-0 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 sm:text-right">
              {search.isSearching ? "Searching..." : `${search.resultCount} / ${search.totalCount}`}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

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
