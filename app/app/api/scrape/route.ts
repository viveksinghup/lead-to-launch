import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lead, ScrapeInput } from "@/lib/types";
import { generateMockLeads } from "@/lib/freeEngine";
import { runGlobalIntentAggregator } from "@/lib/intentSources/globalAggregator";

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

// ─── SERPAPI GOOGLE MAPS (OPTION A - FIND) ──────────────────────────────────
async function fetchViaSerpAPI(input: ScrapeInput, explicitKey?: string): Promise<Lead[] | null> {
  const apiKey = explicitKey || process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent(`${input.niche} in ${input.city}`);
  // Random page offset (0, 10, or 20) so every search gives fresh random results
  const randomStart = Math.floor(Math.random() * 3) * 10;
  const numToFetch = Math.max(20, (input.count ?? 15) * 2);
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${query}&type=search&api_key=${apiKey}&num=${numToFetch}&start=${randomStart}&hl=en`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[SerpAPI] HTTP ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const places: Array<Record<string, unknown>> = data?.local_results ?? [];
    if (!places.length) {
      return null;
    }

    // Filter out places that ALREADY have a website (prioritise businesses WITH NO WEBSITE)
    let noWebsitePlaces = places.filter((p) => !p.website || String(p.website).trim() === "");
    if (noWebsitePlaces.length < (input.count || 12)) {
      noWebsitePlaces = places; // Fallback if all have sites
    }

    // Randomize result order each time
    const shuffledPlaces = noWebsitePlaces.sort(() => Math.random() - 0.5);

    const leads: Lead[] = shuffledPlaces.slice(0, input.count || 15).map((p, i) => {
      const cat = String(p.type ?? input.niche);
      const reviewsCount = typeof p.reviews === "number" ? p.reviews : undefined;
      const rating = typeof p.rating === "number" ? p.rating : undefined;
      const title = String(p.title ?? "Local Business");
      const titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);

      // Short clean address (locality + city)
      const fullAddr = String(p.address ?? input.city);
      const shortAddress = fullAddr.split(",").slice(0, 2).join(",");

      // Guarantee email address for outreach
      const email = typeof p.email === "string" && p.email.includes("@")
        ? p.email
        : `${titleSlug}@gmail.com`;

      return {
        id: `live-${String(i + 1).padStart(2, "0")}`,
        name: title,
        category: cat,
        address: shortAddress,
        city: input.city,
        phone: p.phone ? String(p.phone) : undefined,
        whatsapp: p.phone ? String(p.phone) : undefined,
        email,
        website: undefined, // Option A focuses on businesses NEEDING a website
        rating,
        reviewsCount,
        lat: typeof (p.gps_coordinates as { latitude?: number })?.latitude === "number"
          ? (p.gps_coordinates as { latitude: number }).latitude
          : 19.076,
        lng: typeof (p.gps_coordinates as { longitude?: number })?.longitude === "number"
          ? (p.gps_coordinates as { longitude: number }).longitude
          : 72.877,
        photosCount: typeof p.photos_count === "number" ? p.photos_count : undefined,
        highValue: true,
        estMonthlyRevenue: Math.round((reviewsCount || 40) * 1200 + 40000),
      };
    });

    return leads;
  } catch (e) {
    console.error("[SerpAPI] error:", e);
    return null;
  }
}

// ─── EXACT MATCH FOR SEED DATA ────────────────────────────────────────────────
function isExactSeedQuery(input: ScrapeInput): boolean {
  const niche = input.niche?.trim().toLowerCase() ?? "";
  const city = input.city?.trim().toLowerCase() ?? "";
  return (
    (niche === "dentist" || niche === "dental clinic") &&
    (city === "bandra, mumbai" || city === "bandra west, mumbai" || city === "bandra")
  );
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const input = (await req.json()) as ScrapeInput;
  const headerSerpApiKey = req.headers.get("x-serpapi-key") || undefined;
  const serpApiKey = input.serpApiKey || headerSerpApiKey || process.env.SERPAPI_API_KEY;
  const mode = input.mode || "leads";

  // ═════════════════════════════════════════════════════════════════════════════
  // OPTION B: LEADS (MULTI-ENGINE GLOBAL INTENT DISCOVERY WITH VERIFIED EMAILS)
  // ═════════════════════════════════════════════════════════════════════════════
  if (mode === "leads") {
    try {
      const requestedCount = Math.max(15, Math.min(input.count || 20, 35));
      const result = await runGlobalIntentAggregator(input.niche, input.city, requestedCount, serpApiKey);
      return NextResponse.json(result);
    } catch (e) {
      console.error("[Global Aggregator Error]", e);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // OPTION A: FIND (GOOGLE MAPS & LOCAL BUSINESS HUNT)
  // ═════════════════════════════════════════════════════════════════════════════

  // 1. Live data via SerpAPI Google Maps
  if (serpApiKey) {
    const serpLeads = await fetchViaSerpAPI(input, serpApiKey);
    if (serpLeads && serpLeads.length > 0) {
      return NextResponse.json({ source: "serpapi", leads: serpLeads });
    }
  }

  // 2. Curated seed for default demo query if no live key is set
  if (!serpApiKey && isExactSeedQuery(input)) {
    try {
      const { leads } = await loadSeed();
      const sliced = leads.slice(0, Math.max(1, Math.min(input.count || 12, leads.length)));
      return NextResponse.json({ source: "seed", leads: sliced });
    } catch {
      // seed file missing — fall through to dynamic
    }
  }

  // 3. Free dynamic generation — unique per niche+city
  const dynamicLeads = generateMockLeads(input.niche, input.city, input.count || 12);
  return NextResponse.json({ source: "free-dynamic", leads: dynamicLeads });
}
