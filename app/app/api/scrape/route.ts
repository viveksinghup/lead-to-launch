import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lead, ScrapeInput } from "@/lib/types";
import { generateMockLeads } from "@/lib/freeEngine";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR = process.env.APIFY_ACTOR ?? "compass~crawler-google-places";
const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

// ─── LOAD SEED DATA ───────────────────────────────────────────────────────────
async function loadSeed(): Promise<{ leads: Lead[] }> {
  const p = path.join(process.cwd(), "data", "leads-seed.json");
  const raw = await fs.readFile(p, "utf-8");
  const json = JSON.parse(raw);
  return { leads: json.leads as Lead[] };
}

// ─── HIGH-VALUE SIGNAL FROM SCRAPED DATA ─────────────────────────────────────
const HIGH_VALUE_KW = [
  "dent", "clinic", "hospital", "doctor", "specialist", "cosmetic",
  "aesthetic", "hotel", "resort", "law", "architect", "interior",
  "jewel", "diamond", "real estate", "property", "diagnostic",
  "fitness", "spa", "luxury", "premium",
];

function isHighValueCategory(cat: string): boolean {
  const c = cat.toLowerCase();
  return HIGH_VALUE_KW.some((kw) => c.includes(kw));
}

// ─── SERPAPI INTEGRATION (100 free searches/month) ───────────────────────────
async function fetchViaSerpAPI(input: ScrapeInput): Promise<Lead[] | null> {
  if (!SERPAPI_KEY) return null;

  const query = encodeURIComponent(`${input.niche} in ${input.city}`);
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${query}&type=search&api_key=${SERPAPI_KEY}&num=${input.count ?? 12}&hl=en`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[SerpAPI] ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const places: Array<Record<string, unknown>> = data?.local_results ?? [];
    if (!places.length) return null;

    const leads: Lead[] = places.slice(0, input.count).map((p, i) => {
      const cat = String(p.type ?? input.niche);
      const reviewsCount = typeof p.reviews === "number" ? p.reviews : undefined;
      const rating = typeof p.rating === "number" ? p.rating : undefined;

      return {
        id: `live-${String(i + 1).padStart(2, "0")}`,
        name: String(p.title ?? "Unknown Business"),
        category: cat,
        address: String(p.address ?? ""),
        city: input.city,
        phone: p.phone ? String(p.phone) : undefined,
        whatsapp: p.phone ? String(p.phone) : undefined,
        email: undefined,
        website: p.website ? String(p.website) : undefined,
        rating,
        reviewsCount,
        lat: typeof (p.gps_coordinates as { latitude?: number })?.latitude === "number"
          ? (p.gps_coordinates as { latitude: number }).latitude
          : 19.076,
        lng: typeof (p.gps_coordinates as { longitude?: number })?.longitude === "number"
          ? (p.gps_coordinates as { longitude: number }).longitude
          : 72.877,
        photosCount: typeof p.photos_count === "number" ? p.photos_count : undefined,
        highValue: isHighValueCategory(cat) && (rating ?? 0) >= 4.2,
        estMonthlyRevenue: undefined,
      };
    });

    // Surface high-value leads at the top
    leads.sort((a, b) => {
      if (a.highValue && !b.highValue) return -1;
      if (!a.highValue && b.highValue) return 1;
      return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
    });

    return leads;
  } catch (e) {
    console.error("[SerpAPI] error:", e);
    return null;
  }
}

// ─── APIFY INTEGRATION ────────────────────────────────────────────────────────
async function fetchViaApify(input: ScrapeInput): Promise<Lead[] | null> {
  if (!APIFY_TOKEN) return null;

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [`${input.niche} in ${input.city}`],
          maxCrawledPlacesPerSearch: input.count,
          language: "en",
        }),
      },
    );
    if (!runRes.ok) return null;

    const items = (await runRes.json()) as Array<Record<string, unknown>>;
    const leads: Lead[] = items.slice(0, input.count).map((it, i) => {
      const cat = String(it.categoryName ?? input.niche);
      const rating = typeof it.totalScore === "number" ? (it.totalScore as number) : undefined;
      const reviewsCount = typeof it.reviewsCount === "number" ? (it.reviewsCount as number) : undefined;

      return {
        id: `live-${String(i + 1).padStart(2, "0")}`,
        name: String(it.title ?? it.name ?? "Unknown"),
        category: cat,
        address: String(it.address ?? ""),
        city: input.city,
        phone: it.phone ? String(it.phone) : undefined,
        whatsapp: it.phone ? String(it.phone) : undefined,
        email: undefined,
        website: it.website ? String(it.website) : undefined,
        rating,
        reviewsCount,
        lat: typeof (it.location as { lat?: number })?.lat === "number"
          ? (it.location as { lat: number }).lat
          : 19.06,
        lng: typeof (it.location as { lng?: number })?.lng === "number"
          ? (it.location as { lng: number }).lng
          : 72.83,
        photosCount: typeof it.imagesCount === "number" ? (it.imagesCount as number) : undefined,
        highValue: isHighValueCategory(cat) && (rating ?? 0) >= 4.2,
        estMonthlyRevenue: undefined,
      };
    });

    // Surface high-value leads first
    leads.sort((a, b) => {
      if (a.highValue && !b.highValue) return -1;
      if (!a.highValue && b.highValue) return 1;
      return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
    });

    return leads;
  } catch {
    return null;
  }
}

// ─── EXACT MATCH FOR SEED DATA ────────────────────────────────────────────────
function isExactSeedQuery(input: ScrapeInput): boolean {
  const niche = input.niche?.trim().toLowerCase() ?? "";
  const city = input.city?.trim().toLowerCase() ?? "";
  // Only serve seed for the exact default demo query
  return (
    (niche === "dentist" || niche === "dental clinic") &&
    (city === "bandra, mumbai" || city === "bandra west, mumbai" || city === "bandra")
  );
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const input = (await req.json()) as ScrapeInput;

  // 1. Live data via SerpAPI (free — 100 searches/month)
  if (SERPAPI_KEY) {
    const serpLeads = await fetchViaSerpAPI(input);
    if (serpLeads && serpLeads.length > 0) {
      return NextResponse.json({ source: "serpapi", leads: serpLeads });
    }
  }

  // 2. Live data via Apify (paid, limited free tier)
  if (APIFY_TOKEN) {
    const apifyLeads = await fetchViaApify(input);
    if (apifyLeads && apifyLeads.length > 0) {
      return NextResponse.json({ source: "apify", leads: apifyLeads });
    }
  }

  // 3. Free mode — serve curated seed for exact default query only
  if (isExactSeedQuery(input)) {
    try {
      const { leads } = await loadSeed();
      const sliced = leads.slice(0, Math.max(1, Math.min(input.count || 12, leads.length)));
      return NextResponse.json({ source: "seed", leads: sliced });
    } catch {
      // seed file missing — fall through to dynamic
    }
  }

  // 4. Free dynamic generation — unique per niche+city, deterministic per query
  const dynamicLeads = generateMockLeads(input.niche, input.city, input.count || 12);
  return NextResponse.json({ source: "free-dynamic", leads: dynamicLeads });
}
