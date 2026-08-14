import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lead, ScrapeInput } from "@/lib/types";
import { generateMockLeads } from "@/lib/freeEngine";

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_ACTOR = process.env.APIFY_ACTOR ?? "compass~crawler-google-places";

async function loadSeed(): Promise<{ leads: Lead[] }> {
  const p = path.join(process.cwd(), "data", "leads-seed.json");
  const raw = await fs.readFile(p, "utf-8");
  const json = JSON.parse(raw);
  return { leads: json.leads as Lead[] };
}

export async function POST(req: Request) {
  const input = (await req.json()) as ScrapeInput;

  // No Apify token = serve high-quality free data
  if (!APIFY_TOKEN) {
    const isDefaultQuery =
      (!input.niche || input.niche.toLowerCase().includes("dent")) &&
      (!input.city || input.city.toLowerCase().includes("bandra") || input.city.toLowerCase().includes("mumbai"));

    if (isDefaultQuery) {
      const { leads } = await loadSeed();
      const sliced = leads.slice(0, Math.max(1, Math.min(input.count || 12, leads.length)));
      return NextResponse.json({ source: "seed", leads: sliced });
    }

    // Dynamic generation for any custom niche and city
    const customLeads = generateMockLeads(input.niche, input.city, input.count || 12);
    return NextResponse.json({ source: "free-dynamic", leads: customLeads });
  }

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
    if (!runRes.ok) throw new Error(`Apify ${runRes.status}`);
    const items = (await runRes.json()) as Array<Record<string, unknown>>;

    const leads: Lead[] = items.slice(0, input.count).map((it, i) => ({
      id: `live-${String(i + 1).padStart(2, "0")}`,
      name: String(it.title ?? it.name ?? "Unknown"),
      category: String(it.categoryName ?? input.niche),
      address: String(it.address ?? ""),
      city: input.city,
      phone: it.phone ? String(it.phone) : undefined,
      whatsapp: it.phone ? String(it.phone) : undefined,
      email: undefined,
      website: it.website ? String(it.website) : undefined,
      rating: typeof it.totalScore === "number" ? (it.totalScore as number) : undefined,
      reviewsCount: typeof it.reviewsCount === "number" ? (it.reviewsCount as number) : undefined,
      lat: typeof (it.location as { lat?: number })?.lat === "number" ? (it.location as { lat: number }).lat : 19.06,
      lng: typeof (it.location as { lng?: number })?.lng === "number" ? (it.location as { lng: number }).lng : 72.83,
      photosCount: typeof it.imagesCount === "number" ? (it.imagesCount as number) : undefined,
    }));

    return NextResponse.json({ source: "apify", leads });
  } catch (e) {
    const customLeads = generateMockLeads(input.niche, input.city, input.count || 12);
    return NextResponse.json({ source: "free-fallback", error: (e as Error).message, leads: customLeads });
  }
}
