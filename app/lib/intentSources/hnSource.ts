import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

interface HNHit {
  objectID: string;
  author: string;
  title?: string;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  created_at: string;
  url?: string;
  points?: number;
}

interface HNResponse {
  hits: HNHit[];
}

function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchHackerNews(nicheQuery?: string, limit = 15): Promise<IntentLead[]> {
  const queryTerms = [
    `"need website" OR "looking for developer" OR "hiring web developer"`,
    `"need a web developer" OR "need landing page" OR "website redesign"`,
  ];

  const results: IntentLead[] = [];
  const seen = new Set<string>();

  for (const q of queryTerms) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=25`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "LeadToLaunch/1.0" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) continue;

      const data = (await res.json()) as HNResponse;
      const hits = data?.hits || [];

      for (const h of hits) {
        if (!h.author || h.author === "[deleted]") continue;
        const text = cleanHtml(h.comment_text || h.story_text || h.title || h.story_title || "");
        const email = extractPrimaryEmail(text);

        const title = h.title || h.story_title || (text.slice(0, 60) + "…");
        const postUrl = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;

        if (!seen.has(h.objectID) && !seen.has(postUrl)) {
          seen.add(h.objectID);
          seen.add(postUrl);

          results.push({
            id: `hn-${h.objectID}`,
            platform: "linkedin", // mapped for UI
            authorName: h.author,
            authorHandle: `@${h.author}`,
            postTitle: `HN Founder: ${title}`,
            postSnippet: text.slice(0, 220) + (text.length > 220 ? "…" : ""),
            postUrl,
            postedAt: h.created_at || new Date().toISOString(),
            intentScore: email ? 90 : 75,
            keywords: ["hacker news startup founder"],
            contactHint: email,
            location: "Global / Silicon Valley / Remote",
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return results.slice(0, limit);
}
