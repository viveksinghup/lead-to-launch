import { promises as fs } from "node:fs";
import path from "node:path";
import { generateDemoHtml } from "@/lib/demoGenerator";
import { generateMockLeads } from "@/lib/freeEngine";
import type { Lead, RankedLead } from "@/lib/types";

// Shared in-memory store (same Node.js process as deploy route on Vercel)
const store = new Map<string, RankedLead>();

async function getLeadByShortId(id: string): Promise<RankedLead | null> {
  // 1. Check the in-process store (set by deploy route for new short IDs)
  if (store.has(id)) return store.get(id)!;

  // 2. Try seed JSON (for lead-01, lead-02 etc.)
  try {
    const p = path.join(process.cwd(), "data", "leads-seed.json");
    const raw = await fs.readFile(p, "utf-8");
    const json = JSON.parse(raw);
    const leads = (json.leads || []) as Lead[];
    const audits = json.audits || {};
    const found = leads.find((l) => l.id === id);
    if (found) {
      return {
        ...found,
        audit: audits[found.id] || {
          leadId: found.id,
          pageSpeedScore: 0,
          hasWebsite: false,
          mobileFriendly: false,
          https: false,
          hasSchema: false,
          loadTimeMs: 0,
          gaps: [],
          biggestGap: "",
          estLostRevenuePerMonth: 0,
        },
        score: 90,
      };
    }
  } catch {
    // no seed file — continue
  }

  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
  const url = new URL(req.url);

  // Read optional query-param overrides (backward-compat with old-style URLs and future use)
  const nameOverride = url.searchParams.get("name") || undefined;
  const catOverride = url.searchParams.get("cat") || undefined;
  const cityOverride = url.searchParams.get("city") || undefined;
  const phoneOverride = url.searchParams.get("phone") || undefined;
  const ratingOverride = url.searchParams.get("rating") ? Number(url.searchParams.get("rating")) : undefined;
  const reviewsOverride = url.searchParams.get("reviews") ? Number(url.searchParams.get("reviews")) : undefined;

  // If URL has name/cat/city overrides, build a fresh lead from those (highest priority)
  if (nameOverride && catOverride && cityOverride) {
    const lead: RankedLead = {
      id: leadId,
      name: nameOverride,
      category: catOverride,
      city: cityOverride,
      address: `${cityOverride}`,
      phone: phoneOverride,
      whatsapp: phoneOverride,
      rating: ratingOverride ?? 4.7,
      reviewsCount: reviewsOverride ?? 95,
      lat: 19.076,
      lng: 72.877,
      audit: {
        leadId,
        pageSpeedScore: 0,
        hasWebsite: false,
        mobileFriendly: false,
        https: false,
        hasSchema: false,
        loadTimeMs: 0,
        gaps: ["No mobile website", "No WhatsApp booking"],
        biggestGap: "Missing a fast mobile website with instant WhatsApp booking.",
        estLostRevenuePerMonth: 65000,
      },
      score: 92,
    };

    const html = generateDemoHtml(lead);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store", // don't cache when overrides are used
        "X-Demo-Lead": lead.name,
      },
    });
  }

  // Look up by short ID or seed ID
  let lead = await getLeadByShortId(leadId);

  // Fallback: generate a plausible demo from the slug itself
  if (!lead) {
    const nameParts = leadId.replace(/-/g, " ").replace(/[0-9]+/g, "").trim();
    const fallback = generateMockLeads("Local Business", "Mumbai", 1)[0];
    const displayName =
      nameParts.length > 3
        ? nameParts.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : fallback.name;
    lead = {
      ...fallback,
      id: leadId,
      name: displayName,
      audit: {
        leadId,
        pageSpeedScore: 0,
        hasWebsite: false,
        mobileFriendly: false,
        https: false,
        hasSchema: false,
        loadTimeMs: 0,
        gaps: ["No mobile website", "No online booking"],
        biggestGap: "Missing a fast mobile website with WhatsApp booking.",
        estLostRevenuePerMonth: 55000,
      },
      score: 88,
    };
  }

  // Apply any partial query param overrides on top of found lead
  if (nameOverride) lead = { ...lead, name: nameOverride };
  if (catOverride) lead = { ...lead, category: catOverride };
  if (cityOverride) lead = { ...lead, city: cityOverride, address: cityOverride };
  if (phoneOverride) lead = { ...lead, phone: phoneOverride, whatsapp: phoneOverride };
  if (ratingOverride) lead = { ...lead, rating: ratingOverride };
  if (reviewsOverride) lead = { ...lead, reviewsCount: reviewsOverride };

  const html = generateDemoHtml(lead);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Demo-Lead": lead.name,
    },
  });
}
