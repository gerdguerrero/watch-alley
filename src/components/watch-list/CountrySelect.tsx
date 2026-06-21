"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/watch-list/countries";

interface CountrySelectProps {
  name?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export function CountrySelect({
  name = "country",
  required = false,
  className = "",
  id,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("PH"); // Default to Philippines as primary market
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === selectedCode) || COUNTRIES[0];

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input to hold the value for standard form data collection */}
      <input type="hidden" name={name} value={selectedCountry.name} required={required} />

      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between text-left cursor-pointer select-none ${className}`}
      >
        <span className={selectedCode ? "text-cream" : "text-cream-60/70"}>
          {selectedCountry.name}
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
        <div className="absolute left-0 z-50 mt-1.5 w-full bg-[#0a0907]/95 backdrop-blur-md border border-amber-300/20 rounded-xl overflow-hidden shadow-2xl transition-all max-h-72 flex flex-col">
          <div className="sticky top-0 bg-[#0a0907] border-b border-amber-300/10 p-2 z-10">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full bg-black/50 text-cream text-xs px-3 py-2 rounded-lg border border-amber-300/10 focus:border-amber-300/40 outline-none placeholder:text-cream-60/50"
            />
          </div>

          <div className="overflow-y-auto flex-1 py-1 max-h-56 scrollbar-thin scrollbar-thumb-amber-300/10">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const isSelected = country.code === selectedCode;
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedCode(country.code);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer select-none flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-300/15 text-amber-200 font-semibold"
                        : "text-cream-60 hover:bg-amber-300/10 hover:text-amber-200"
                    }`}
                  >
                    <span>{country.name}</span>
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5 text-amber-300"
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
              <div className="px-4 py-3 text-xs text-cream-60/50 italic text-center">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
