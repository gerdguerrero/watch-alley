"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { WatchCard } from "@/components/site/watch-card";
import { WatchTile } from "@/components/site/watch-tile";
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
}

/** "limited-edition" is a badge on the row, not a value of `category`. */
const LIMITED_EDITION = "limited-edition";

function filterByCategory(watches: Watch[], category: string): Watch[] {
  if (!category) return watches;
  if (category === LIMITED_EDITION) {
    return watches.filter((watch) => watch.badges.includes(LIMITED_EDITION));
  }
  return watches.filter((watch) => watch.category === category);
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

export function AvailableCatalog({ watches, categories, sortOptions }: AvailableCatalogProps) {
  const brands = useMemo(() => collectBrands(watches), [watches]);
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Every filter runs in the client so /available can stay a static prerender -
  // reading `searchParams` on the server made the page dynamic, so each hit
  // re-queried the whole catalog and never touched the CDN cache. Shared links
  // still work: apply their params after mount rather than during render, which
  // would desync from the prerendered HTML.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextBrand = params.get("brand");
    const nextSort = params.get("sort");
    const nextQuery = params.get("q");
    const nextCategory = params.get("category");
    if (nextBrand) setBrand(nextBrand);
    if (nextSort) setSort(nextSort as SortKey);
    if (nextQuery) setQuery(nextQuery);
    if (nextCategory) setCategory(nextCategory);
  }, []);

  const filtered = useMemo(() => {
    const categoryFiltered = filterByCategory(watches, category);
    const brandFiltered = brand
      ? categoryFiltered.filter((watch) => watch.brand === brand)
      : categoryFiltered;
    const searched = searchWatches(brandFiltered, deferredQuery);
    return sortWatches(searched, sort);
  }, [watches, category, brand, sort, deferredQuery]);

  const isSearching = query !== deferredQuery;
  const hasActiveFilters = Boolean(brand || category || query.trim());

  return (
    <>
      <CatalogToolbar
        brands={brands}
        sortOptions={sortOptions}
        categories={categories}
        selectedBrand={brand}
        selectedSort={sort}
        selectedCategory={category}
        onBrandChange={setBrand}
        onSortChange={(value) => setSort(value as SortKey)}
        onCategoryChange={setCategory}
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
            : "No active pieces right now. Message us on Messenger or WhatsApp for the next drop."}
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
