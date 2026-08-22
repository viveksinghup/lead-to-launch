import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

/**
 * Product Hunt RSS Feed Parser
 * Fetches latest launches and filters for startups / small businesses needing web presence.
 * Free, no API key required.
 */
export async function searchProductHunt(nicheQuery?: string, limit = 10): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  try {
    const res = await fetch("https://www.producthunt.com/feed", {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    for (const item of itemMatches) {
      const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      const authorMatch = item.match(/<author[^>]*>([\s\S]*?)<\/author>/i);
      const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

      if (!titleMatch) continue;

      const title = titleMatch[1]?.replace(/<[^>]*>/g, "").trim() || "";
      const desc = descMatch ? descMatch[1]?.replace(/<[^>]*>/g, "").trim() : "";
      const url = linkMatch ? linkMatch[1]?.trim() : "https://www.producthunt.com";
      const author = authorMatch ? authorMatch[1]?.replace(/<[^>]*>/g, "").trim() : "ProductHunt Maker";
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

      if (!url || seen.has(url)) continue;
      seen.add(url);

      const fullText = `${title} ${desc}`;
      const lower = fullText.toLowerCase();
      const hasWebIntent =
        lower.includes("website") ||
        lower.includes("web app") ||
        lower.includes("landing") ||
        lower.includes("online presence") ||
        lower.includes("startup") ||
        lower.includes("saas") ||
        (nicheQuery && lower.includes(nicheQuery.toLowerCase().split(" ")[0]));

      if (!hasWebIntent) continue;

      const email = extractPrimaryEmail(fullText);

      results.push({
        id: `ph-${url.replace(/[^a-z0-9]/gi, "-").slice(-20)}-${Date.now().toString(36)}`,
        platform: "facebook",
        authorName: author || "ProductHunt Maker",
        authorHandle: author,
        postTitle: `🚀 PH Launch: ${title.slice(0, 60)}`,
        postSnippet: (desc || title).slice(0, 220),
        postUrl: url,
        postedAt: pubDate,
        intentScore: email ? 82 : 68,
        keywords: ["product hunt startup launch"],
        contactHint: email || url,
        location: "Global / Remote",
      });

      if (results.length >= limit) break;
    }
  } catch {
    // ignore
  }

  return results.slice(0, limit);
}
