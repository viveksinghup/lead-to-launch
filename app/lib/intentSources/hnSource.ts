import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

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

/**
 * HackerNews Freelance Client Query
 * Targets the official monthly "Seeking Freelancer" threads and client project posts with direct email.
 */
export async function searchHackerNews(nicheQuery?: string, limit = 15): Promise<IntentLead[]> {
  const queryTerms = [
    `"Seeking Freelancer" OR "Seeking freelance" OR "hiring freelance web"`,
    `"need a web developer" OR "looking to hire web" OR "freelance web developer needed"`,
    `"Ask HN: Freelancer? Seeking Freelancer"`,
  ];

  const results: IntentLead[] = [];
  const seen = new Set<string>();

  for (const q of queryTerms) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=25`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "LeadToLaunch/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(2200),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as HNResponse;
      const hits = data?.hits || [];

      for (const h of hits) {
        if (!h.author || h.author === "[deleted]") continue;
        const text = cleanHtml(h.comment_text || h.story_text || h.title || h.story_title || "");
        const rawTitle = h.title || h.story_title || (text.slice(0, 60) + "…");

        // Apply strict freelance classifier (rejects corporate jobs and seller ads)
        const classified = classifyAndFilterFreelanceProject(rawTitle, text);
        if (!classified.isValid) continue;

        const emails = extractEmailsFromText(text);
        const email = emails[0] || extractPrimaryEmail(text);

        const postUrl = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;

        if (!seen.has(h.objectID) && !seen.has(postUrl)) {
          seen.add(h.objectID);
          seen.add(postUrl);

          const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

          results.push({
            id: `hn-${h.objectID}`,
            platform: "linkedin",
            authorName: `@${h.author} (HN Founder)`,
            authorHandle: `@${h.author}`,
            postTitle: `🚀 HN: ${rawTitle.slice(0, 65)}`,
            postSnippet: `${text.slice(0, 200)}${budgetTag}`,
            postUrl,
            postedAt: h.created_at || new Date().toISOString(),
            intentScore: classified.score,
            keywords: ["hacker news client project", classified.category],
            contactHint: email || postUrl,
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
