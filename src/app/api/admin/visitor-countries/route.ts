import { type NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/newsletter/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AO: "Angola",
  AR: "Argentina",
  AM: "Armenia",
  AU: "Australia",
  AT: "Austria",
  AZ: "Azerbaijan",
  BD: "Bangladesh",
  BE: "Belgium",
  BO: "Bolivia",
  BR: "Brazil",
  BG: "Bulgaria",
  KH: "Cambodia",
  CM: "Cameroon",
  CA: "Canada",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CD: "DR Congo",
  CR: "Costa Rica",
  CI: "Côte d'Ivoire",
  HR: "Croatia",
  CU: "Cuba",
  CZ: "Czechia",
  DK: "Denmark",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  ET: "Ethiopia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GH: "Ghana",
  GR: "Greece",
  GT: "Guatemala",
  HN: "Honduras",
  HK: "Hong Kong",
  HU: "Hungary",
  IN: "India",
  ID: "Indonesia",
  IR: "Iran",
  IQ: "Iraq",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JP: "Japan",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KW: "Kuwait",
  LB: "Lebanon",
  MY: "Malaysia",
  MX: "Mexico",
  MA: "Morocco",
  MM: "Myanmar",
  NL: "Netherlands",
  NZ: "New Zealand",
  NG: "Nigeria",
  KP: "North Korea",
  NO: "Norway",
  PK: "Pakistan",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  SA: "Saudi Arabia",
  RS: "Serbia",
  SG: "Singapore",
  SK: "Slovakia",
  ZA: "South Africa",
  KR: "South Korea",
  ES: "Spain",
  LK: "Sri Lanka",
  SE: "Sweden",
  CH: "Switzerland",
  SY: "Syria",
  TW: "Taiwan",
  TH: "Thailand",
  TN: "Tunisia",
  TR: "Turkey",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VE: "Venezuela",
  VN: "Vietnam",
  ZW: "Zimbabwe",
};

type VisitorCountryColumn = "visitor_count" | "views_24h" | "views_7d";

type VisitorCountryRow = {
  country: string;
  visitor_count: number | null;
  views_24h: number | null;
  views_7d: number | null;
  last_seen_at: string | null;
};

const PERIOD_COLUMNS: Record<string, VisitorCountryColumn> = {
  all: "visitor_count",
  "24h": "views_24h",
  "7d": "views_7d",
};

function countryToFlag(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Not authorized.",
        countries: [],
      },
      { status: 401 }
    );
  }

  try {
    const period = request.nextUrl.searchParams.get("period") || "7d";
    const sortColumn = PERIOD_COLUMNS[period] || PERIOD_COLUMNS["7d"];

    const supabase = createSupabaseAdminClient();

    const { data: rows, error } = await supabase
      .from("visitor_countries")
      .select("country, visitor_count, views_24h, views_7d, last_seen_at")
      .order(sortColumn, { ascending: false })
      .limit(15);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: "visitor_countries table not found. Run the migration.",
        countries: [],
      });
    }

    const countryRows = (rows ?? []) as VisitorCountryRow[];
    if (countryRows.length === 0) {
      return NextResponse.json({ ok: true, countries: [], period });
    }

    const max = Math.max(1, countryRows[0][sortColumn] || 0);
    const total = countryRows.reduce((s, r) => s + (r[sortColumn] || 0), 0);

    const countries = countryRows.map((r) => ({
      country: r.country,
      label: COUNTRY_NAMES[r.country] || r.country,
      flag: countryToFlag(r.country),
      count: r[sortColumn] || 0,
      pct: Math.round(((r[sortColumn] || 0) / max) * 100),
      share: total > 0 ? Math.round(((r[sortColumn] || 0) / total) * 100) : 0,
      last_seen_at: r.last_seen_at,
    }));

    return NextResponse.json({ ok: true, countries, total, period });
  } catch (err) {
    console.error("visitor-countries error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load visitor countries", countries: [] },
      { status: 500 }
    );
  }
}
