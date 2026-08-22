import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

/**
 * IndieHackers RSS Feed Parser
 * Searches for founders asking about web development, website builders, and online presence.
 * Free, no API key required.
 */
export async function searchIndieHackers(nicheQuery?: string, limit = 12): Promise<IntentLead[]> {
  const feeds = [
    "https://www.indiehackers.com/feed.rss",
    "https://www.indiehackers.com/posts/feed.rss",
  ];

  const results: IntentLead[] = [];
  const seen = new Set<string>();

  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      for (const item of itemMatches) {
        const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
        const authorMatch = item.match(/<author>([\s\S]*?)<\/author>/i) || item.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
        const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

        if (!titleMatch) continue;

        const title = titleMatch[1]?.replace(/<[^>]*>/g, "").trim() || "";
        const desc = descMatch ? descMatch[1]?.replace(/<[^>]*>/g, "").trim() : "";
        const url = linkMatch ? linkMatch[1]?.trim() : "https://www.indiehackers.com";
        const author = authorMatch ? authorMatch[1]?.replace(/<[^>]*>/g, "").trim() : "IH Founder";
        const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

        if (!url || seen.has(url)) continue;
        seen.add(url);

        const fullText = `${title} ${desc}`;
        const lower = fullText.toLowerCase();

        const isRelevant =
          lower.includes("website") ||
          lower.includes("web developer") ||
          lower.includes("landing page") ||
          lower.includes("hire developer") ||
          lower.includes("web design") ||
          lower.includes("online store") ||
          lower.includes("need developer") ||
          (nicheQuery && lower.includes(nicheQuery.toLowerCase().split(" ")[0]));

        if (!isRelevant) continue;

        const email = extractPrimaryEmail(fullText);

        results.push({
          id: `ih-${url.replace(/[^a-z0-9]/gi, "-").slice(-20)}-${Date.now().toString(36)}`,
          platform: "indiamart",
          authorName: author || "IH Founder",
          authorHandle: author,
          postTitle: `💡 IH: ${title.slice(0, 60)}`,
          postSnippet: (desc || title).slice(0, 220),
          postUrl: url,
          postedAt: pubDate,
          intentScore: email ? 85 : 70,
          keywords: ["indie hackers startup founder"],
          contactHint: email || url,
          location: "Global / Remote",
        });

        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    } catch {
      // ignore
    }
  }

  return results.slice(0, limit);
}
