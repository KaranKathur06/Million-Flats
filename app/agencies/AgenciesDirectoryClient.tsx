"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ResolvedImage from "@/components/media/ResolvedImage";
import type { PublicAgencyListItem } from "@/lib/agencies/getPublicAgencies";
import { MEDIA_FALLBACKS } from "@/lib/media/resolveMedia";

type SortOption = "featured" | "newest" | "most_active" | "alphabetical";

type Props = {
  initialAgencies?: PublicAgencyListItem[];
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "most_active", label: "Most Active" },
  { key: "alphabetical", label: "A–Z" },
];

const COUNTRY_OPTIONS = [
  { value: "", label: "All" },
  { value: "UAE", label: "🇦🇪 UAE" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Saudi Arabia", label: "🇸🇦 Saudi Arabia" },
  { value: "UK", label: "🇬🇧 UK" },
  { value: "USA", label: "🇺🇸 USA" },
];

function AgencyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-gray-50 rounded-full" />
          <div className="h-6 w-24 bg-gray-50 rounded-full" />
        </div>
        <div className="h-11 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function AgenciesDirectoryClient({
  initialAgencies = [],
}: Props) {
  const [agencies, setAgencies] = useState<PublicAgencyListItem[]>(initialAgencies);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");

  const isDefaultFilters = !country && !searchDebounced && sort === "featured";

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (isDefaultFilters && initialAgencies.length > 0) {
      setAgencies(initialAgencies);
      setFetchError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (country) params.set("country", country);
      if (searchDebounced) params.set("search", searchDebounced);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/agency/public?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAgencies(json.data);
      } else {
        setFetchError(json.message || "Unable to load agencies right now.");
        if (!isDefaultFilters) setAgencies([]);
      }
    } catch (err) {
      console.error("Agency directory fetch error:", err);
      setFetchError("Unable to load agencies right now.");
      if (!isDefaultFilters) setAgencies([]);
    } finally {
      setLoading(false);
    }
  }, [country, searchDebounced, sort, initialAgencies, isDefaultFilters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      id="agency-grid"
      className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
    >
      {/* ═══════ SECTION HEADER ═══════ */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-dark-blue sm:text-2xl">
          {`Agencies${country ? ` — ${country}` : ""}`}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {loading
            ? "Loading..."
            : `${agencies.length} agenc${agencies.length !== 1 ? "ies" : "y"} found`}
        </p>
        {fetchError ? (
          <p className="mt-2 text-sm text-amber-700">{fetchError}</p>
        ) : null}
      </div>

      {/* ═══════ FILTER BAR ═══════ */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search + Country */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agency..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:w-64"
            />
          </div>

          {/* Country Filter */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 overflow-x-auto">
            {COUNTRY_OPTIONS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => setCountry(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  country === opt.value
                    ? "bg-dark-blue text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                sort === opt.key
                  ? "bg-dark-blue text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ AGENCY GRID ═══════ */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgencyCardSkeleton key={i} />
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <svg
            className="h-12 w-12 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">
            {fetchError || "No agencies found matching your filters."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCountry("");
              setSort("featured");
            }}
            className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}

      {/* ═══════ JOIN CTA ═══════ */}
      <div className="mt-16 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-8 text-center">
        <h3 className="text-2xl font-bold text-dark-blue mb-2">
          List Your Agency on MillionFlats
        </h3>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
          Join verified real estate agencies connecting buyers and sellers
          across global markets.
        </p>
        <a
          href="/agency/auth"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-dark-blue px-8 text-sm font-bold text-white shadow-lg shadow-dark-blue/20 transition-all hover:bg-dark-blue/90"
        >
          Join as Agency →
        </a>
      </div>
    </div>
  );
}

function countryLabel(country: string | null): string {
  if (!country) return ""
  const c = country.trim().toLowerCase()
  if (c === "uae" || c === "united arab emirates") return "🇦🇪 UAE"
  if (c === "india") return "🇮🇳 India"
  if (c === "saudi arabia" || c === "saudi_arabia") return "🇸🇦 Saudi Arabia"
  if (c === "uk" || c === "united kingdom") return "🇬🇧 UK"
  if (c === "usa" || c === "united states") return "🇺🇸 USA"
  return country
}

function AgencyCard({ agency: a }: { agency: PublicAgencyListItem }) {
  const currentYear = new Date().getFullYear();
  const experience = a.yearEstablished ? currentYear - a.yearEstablished : null;
  const visibleSpecs = a.specializations.slice(0, 3);

  return (
    <Link
      href={a.slug ? `/agencies/${a.slug}` : "#"}
      className={`group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:border-gray-200 transition-all duration-300 hover:-translate-y-1 ${
        !a.slug ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {/* Featured accent */}
      {a.isFeatured && (
        <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 z-10" />
      )}

      {/* Banner */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        <ResolvedImage
          src={a.banner || a.logo}
          alt={a.agencyName}
          fallback={MEDIA_FALLBACKS.project}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

        {/* Logo + featured badge overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white shadow-lg border border-white/30 shrink-0">
            {a.logo ? (
              <ResolvedImage
                src={a.logo}
                alt=""
                fallback={MEDIA_FALLBACKS.developerLogo}
                className="h-full w-full rounded-lg p-1"
                objectFit="contain"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-bold text-dark-blue">
                {a.agencyName.charAt(0)}
              </div>
            )}
          </div>
          {a.isFeatured && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm backdrop-blur-sm">
              ★ Featured
            </span>
          )}
        </div>

        {/* Country badge */}
        {a.country && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 backdrop-blur-sm shadow-sm">
              {countryLabel(a.country)}
            </span>
          </div>
        )}

        {/* Verified badge */}
        {a.isVerified && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-sm">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-[1.05rem] font-bold text-dark-blue leading-snug line-clamp-1">
          {a.agencyName}
        </h3>

        {(a.city || a.country) && (
          <p className="mt-1 text-xs text-gray-400 font-medium">
            {[a.city, a.country].filter(Boolean).join(", ")}
          </p>
        )}

        {a.shortDescription && (
          <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {a.shortDescription}
          </p>
        )}

        {/* Specializations */}
        {visibleSpecs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSpecs.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-100"
              >
                {spec}
              </span>
            ))}
            {a.specializations.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
                +{a.specializations.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-dark-blue">{a.totalListings}</p>
            <p className="text-[10px] text-gray-400 font-medium">Listings</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-dark-blue">{a.totalClosedDeals}</p>
            <p className="text-[10px] text-gray-400 font-medium">Deals</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
            <p className="text-sm font-bold text-dark-blue">
              {experience ? `${experience}y` : a.yearEstablished || "—"}
            </p>
            <p className="text-[10px] text-gray-400 font-medium">
              {experience ? "Experience" : "Est."}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-4">
          <span className="flex items-center justify-center h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold shadow-sm group-hover:bg-[#0b1838] group-hover:shadow-md transition-all duration-300">
            View Profile
            <svg
              className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
