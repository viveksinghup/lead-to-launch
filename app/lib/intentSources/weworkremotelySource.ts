import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

/**
 * We Work Remotely RSS — Companies hiring freelance designers & developers.
 * Design, Programming, and Contract job categories.
 * Free RSS, no API key.
 */

const WWR_FEEDS = [
  { url: "https://weworkremotely.com/categories/remote-design-jobs.rss", label: "Design" },
  { url: "https://weworkremotely.com/categories/remote-programming-jobs.rss", label: "Programming" },
  { url: "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss", label: "Frontend" },
  { url: "https://weworkremotely.com/categories/remote-contract-jobs.rss", label: "Contract" },
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

function parseWWRFeed(xml: string, category: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid>([\s\S]*?)<\/guid>/i);
    const authorMatch = item.match(/<author>([\s\S]*?)<\/author>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const title = decodeHtml(titleMatch[1] || "");
    const desc = decodeHtml(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const company = decodeHtml(authorMatch?.[1] || "");
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!title || !url) continue;

    const fullText = `${title} ${desc}`;
    const lower = fullText.toLowerCase();

    // Filter for freelance/contract roles or web/design work
    const isRelevant =
      lower.includes("freelance") ||
      lower.includes("contract") ||
      lower.includes("website") ||
      lower.includes("web developer") ||
      lower.includes("designer") ||
      lower.includes("frontend") ||
      lower.includes("wordpress") ||
      lower.includes("shopify") ||
      lower.includes("landing page") ||
      category === "Contract";

    if (!isRelevant) continue;

    const email = extractPrimaryEmail(fullText);

    results.push({
      id: `wwr-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "linkedin",
      authorName: company || `WWR ${category} Client`,
      authorHandle: undefined,
      postTitle: `💼 WWR: ${title.slice(0, 65)}`,
      postSnippet: desc.slice(0, 220) || title,
      postUrl: url,
      postedAt: pubDate,
      intentScore: email ? 88 : 80,
      keywords: ["we work remotely freelance hire"],
      contactHint: email || url,
      location: "Global / Remote",
    });
  }

  return results;
}

export async function searchWeWorkRemotely(nicheQuery?: string, limit = 20): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    WWR_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "application/rss+xml, text/xml",
          },
          cache: "no-store",
        });

        if (!res.ok) return;

        const xml = await res.text();
        const leads = parseWWRFeed(xml, feed.label);

        for (const lead of leads) {
          if (!seen.has(lead.postUrl)) {
            seen.add(lead.postUrl);
            results.push(lead);
          }
        }
      } catch {
        // ignore
      }
    })
  );

  return results.sort((a, b) => b.intentScore - a.intentScore).slice(0, limit);
}
