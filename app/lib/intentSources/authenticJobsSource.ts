import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

/**
 * Authentic Jobs RSS — Curated web design & development job board.
 * Companies actively hiring web designers/developers for projects.
 * Free RSS, no API key.
 */

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchAuthenticJobs(nicheQuery?: string, limit = 15): Promise<IntentLead[]> {
  const results: IntentLead[] = [];

  try {
    const res = await fetch("https://authenticjobs.com/feed/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/rss+xml, text/xml",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    for (const item of items) {
      const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid>([\s\S]*?)<\/guid>/i);
      const authorMatch = item.match(/<author>([\s\S]*?)<\/author>/i) || item.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
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

      // Only web-related positions
      const isWebRole =
        lower.includes("web") ||
        lower.includes("design") ||
        lower.includes("frontend") ||
        lower.includes("developer") ||
        lower.includes("ux") ||
        lower.includes("ui") ||
        lower.includes("freelance") ||
        lower.includes("wordpress") ||
        lower.includes("shopify");

      if (!isWebRole) continue;

      // Extra points for contract/freelance roles
      const isFreelance =
        lower.includes("freelance") ||
        lower.includes("contract") ||
        lower.includes("part-time") ||
        lower.includes("project");

      const email = extractPrimaryEmail(fullText);

      results.push({
        id: `authentic-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
        platform: "linkedin",
        authorName: company || "Authentic Jobs Client",
        authorHandle: undefined,
        postTitle: `🎨 AJ: ${title.slice(0, 65)}`,
        postSnippet: desc.slice(0, 220) || title,
        postUrl: url,
        postedAt: pubDate,
        intentScore: email ? 87 : isFreelance ? 84 : 78,
        keywords: ["authentic jobs web design hire"],
        contactHint: email || url,
        location: "Global / Remote",
      });

      if (results.length >= limit) break;
    }
  } catch {
    return [];
  }

  return results.slice(0, limit);
}
