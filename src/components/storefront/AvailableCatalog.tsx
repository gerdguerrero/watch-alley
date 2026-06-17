"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { WatchCard } from "@/components/develop/watch-card";
import { WatchTile } from "@/components/develop/watch-tile";
import { formatCategory } from "@/lib/inventory/format";
import { collectBrands, type SortKey, sortWatches } from "@/lib/inventory/sort";
import type { Watch } from "@/lib/inventory/types";
import { CatalogToolbar } from "./CatalogToolbar";

interface Option {
  value: string;
  label: string;
}

interface AvailableCatalogProps {
  watches: Watch[];
  categories: ReadonlyArray<Option>;
  sortOptions: ReadonlyArray<{ value: SortKey; label: string }>;
  initialBrand?: string;
  initialSort?: string;
  initialQuery?: string;
}

const SEARCHABLE_TEXT = new WeakMap<Watch, string>();

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchableText(watch: Watch): string {
  const cached = SEARCHABLE_TEXT.get(watch);
  if (cached) return cached;

  const value = normalizeSearchText(
    [
      watch.brand,
      watch.name,
      watch.model,
      watch.reference,
      watch.conditionLabel,
      formatCategory(watch.category),
      watch.movement,
      watch.caseSize,
      watch.set,
      watch.material,
      watch.edition,
      watch.badge,
      ...watch.badges,
      watch.hasBox ? "box" : "",
      watch.hasPapers ? "papers" : "",
    ]
      .filter(Boolean)
      .join(" ")
  );

  SEARCHABLE_TEXT.set(watch, value);
  return value;
}

function searchWatches(watches: Watch[], query: string): Watch[] {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return watches;

  return watches.filter((watch) => {
    const haystack = searchableText(watch);
    return tokens.every((token) => haystack.includes(token));
  });
}

export function AvailableCatalog({
  watches,
  categories,
  sortOptions,
  initialBrand = "",
  initialSort = "featured",
  initialQuery = "",
}: AvailableCatalogProps) {
  const brands = useMemo(() => collectBrands(watches), [watches]);
  const [brand, setBrand] = useState(initialBrand);
  const [sort, setSort] = useState(initialSort as SortKey);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const brandFiltered = brand ? watches.filter((watch) => watch.brand === brand) : watches;
    const searched = searchWatches(brandFiltered, deferredQuery);
    return sortWatches(searched, sort);
  }, [watches, brand, sort, deferredQuery]);

  const isSearching = query !== deferredQuery;
  const hasActiveFilters = Boolean(brand || query.trim());

  return (
    <>
      <CatalogToolbar
        brands={brands}
        sortOptions={sortOptions}
        categories={categories}
        selectedBrand={brand}
        selectedSort={sort}
        onBrandChange={setBrand}
        onSortChange={(value) => setSort(value as SortKey)}
        search={{
          value: query,
          onChange: setQuery,
          resultCount: filtered.length,
          totalCount: watches.length,
          isSearching,
        }}
      />

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
          {watches.length > 0 && hasActiveFilters
            ? "No pieces match this search. Try a brand, model, reference, or clear the filters."
            : "No active pieces right now. Message us on Messenger for the next drop."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5 -mx-6 md:hidden">
            {filtered.map((watch) => (
              <WatchTile key={watch.slug} watch={watch} />
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 max-w-[1680px] mx-auto">
            {filtered.map((watch, index) => (
              <WatchCard key={watch.slug} watch={watch} index={index} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
