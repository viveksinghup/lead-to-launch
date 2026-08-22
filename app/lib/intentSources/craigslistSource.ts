import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Craigslist Web Gigs RSS — Direct business owners hiring web/app builders.
 * Searches 12 major cities across US, UK, Canada, Australia.
 * No API key required. 100% free public RSS.
 */

const CRAIGSLIST_CITIES = [
  { sub: "newyork", label: "New York" },
  { sub: "sfbay", label: "San Francisco" },
  { sub: "chicago", label: "Chicago" },
  { sub: "losangeles", label: "Los Angeles" },
  { sub: "austin", label: "Austin" },
  { sub: "seattle", label: "Seattle" },
  { sub: "boston", label: "Boston" },
  { sub: "toronto", label: "Toronto" },
  { sub: "london", label: "London" },
  { sub: "sydney", label: "Sydney" },
  { sub: "dubai", label: "Dubai" },
  { sub: "houston", label: "Houston" },
];

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCraigslistRSS(xml: string, cityLabel: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const title = decodeHtml(titleMatch[1] || "");
    const desc = decodeHtml(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!title || !url) continue;

    // Apply strict freelance classifier (rejects full-time jobs, seller posts, and non-dev tasks)
    const classified = classifyAndFilterFreelanceProject(title, desc);
    if (!classified.isValid) continue;

    const fullText = `${title} ${desc}`;
    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText);

    // Extract phone if present
    const phoneMatch = fullText.match(/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

    const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

    results.push({
      id: `craigslist-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "indiamart",
      authorName: `Client (${cityLabel})`,
      authorHandle: undefined,
      postTitle: title.slice(0, 75),
      postSnippet: `${desc.slice(0, 200)}${budgetTag}`,
      postUrl: url,
      postedAt: pubDate,
      intentScore: classified.score,
      keywords: ["craigslist freelance gig", classified.category],
      contactHint: email || phone || url,
      location: cityLabel,
    });
  }

  return results;
}

export async function searchCraigslist(nicheQuery?: string, limit = 30): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  const citiesToSearch = CRAIGSLIST_CITIES.slice(0, 8);

  await Promise.allSettled(
    citiesToSearch.map(async (city) => {
      try {
        const url = `https://${city.sub}.craigslist.org/search/web?format=rss`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "application/rss+xml, text/xml",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(2200),
        });

        if (!res.ok) return;

        const xml = await res.text();
        const cityLeads = parseCraigslistRSS(xml, city.label);

        for (const lead of cityLeads) {
          if (!seen.has(lead.postUrl)) {
            seen.add(lead.postUrl);
            results.push(lead);
          }
        }
      } catch {
        // ignore per-city failures
      }
    })
  );

  return results.sort((a, b) => b.intentScore - a.intentScore).slice(0, limit);
}
