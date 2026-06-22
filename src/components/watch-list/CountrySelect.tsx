"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, countryCodeToFlag } from "@/lib/watch-list/countries";

interface CountrySelectProps {
  name?: string;
  required?: boolean;
  className?: string;
  id?: string;
  showPhoneCode?: boolean;
  defaultValue?: string; // ISO country code, e.g. "PH"
  onChange?: (code: string) => void;
}

export function CountrySelect({
  name = "country",
  required = false,
  className = "",
  id,
  showPhoneCode = false,
  defaultValue = "PH",
  onChange,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === selectedCode) || COUNTRIES[0];
  const flag = countryCodeToFlag(selectedCountry.code);

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.code.toLowerCase().includes(search.toLowerCase()) ||
      country.phoneCode.includes(search)
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  function selectCountry(code: string) {
    setSelectedCode(code);
    setIsOpen(false);
    setSearch("");
    onChange?.(code);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for form data */}
      <input type="hidden" name={name} value={selectedCountry.name} required={required} />

      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-2.5 text-left cursor-pointer select-none ${className}`}
      >
        <span className="text-lg leading-none shrink-0">{flag}</span>
        <span className="flex-1 truncate text-cream text-sm">
          {selectedCountry.name}
          {showPhoneCode && (
            <span className="ml-1.5 text-cream-60/50 text-xs">
              {selectedCountry.phoneCode}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-amber-300/60 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-full min-w-[280px] bg-[#0d0b09] border border-amber-300/15 rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.8)] backdrop-blur-xl max-h-80 flex flex-col">
          {/* Search bar */}
          <div className="sticky top-0 bg-[#0d0b09] border-b border-amber-300/10 p-3 z-10">
            <div className="relative">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream-60/40 pointer-events-none"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full bg-black/30 text-cream text-xs pl-9 pr-3 py-2.5 rounded-xl border border-amber-300/10 focus:border-amber-300/40 outline-none placeholder:text-cream-60/40"
              />
            </div>
          </div>

          {/* Country list */}
          <div className="overflow-y-auto flex-1 py-1 max-h-56 scrollbar-thin">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.code === selectedCode;
                const countryFlag = countryCodeToFlag(country.code);
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectCountry(country.code)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer select-none flex items-center gap-3 ${
                      isSelected
                        ? "bg-amber-300/10 text-amber-200"
                        : "text-cream-70 hover:bg-white/[0.04] hover:text-cream"
                    }`}
                  >
                    <span className="text-lg leading-none shrink-0">{countryFlag}</span>
                    <span className="flex-1 truncate">{country.name}</span>
                    {showPhoneCode && (
                      <span className="text-xs text-cream-60/50 shrink-0">
                        {country.phoneCode}
                      </span>
                    )}
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 text-amber-300 shrink-0"
                      >
                        <title>Selected</title>
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-xs text-cream-60/40 italic text-center">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
