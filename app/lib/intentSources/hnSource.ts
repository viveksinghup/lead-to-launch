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

const MAX_AGE_DAYS = 30; // HN monthly threads — allow up to 30 days

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

function isRecentPost(isoDate: string): boolean {
  if (!isoDate) return true;
  const age = (Date.now() - new Date(isoDate).getTime()) / 86400000;
  return age <= MAX_AGE_DAYS;
}

/**
 * HackerNews Freelance Client Query
 * Primary target: Official monthly "Ask HN: Freelancer? Seeking Freelancer?" threads.
 * These are pure client posts — verified founders/businesses looking to hire developers.
 */
const HN_QUERIES = [
  // Official monthly HN threads — pure gold for freelancers
  '"Ask HN" "Seeking freelancer" web OR react OR vue OR node OR app',
  '"Seeking freelancer" developer OR "web developer" OR "app developer"',
  // Direct client posts
  '"need a developer" OR "looking for a freelance developer" website OR app',
  '"building a saas" OR "building an app" OR "building a website" "looking for developer"',
  // Startup/founder dev needs
  '"hire a developer" OR "need a freelancer" web OR react OR frontend OR backend',
];

export async function searchHackerNews(nicheQuery?: string, limit = 15): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  for (const q of HN_QUERIES) {
    try {
      // Use date filter: last 30 days
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 86400000) / 1000);
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=25&numericFilters=created_at_i>${thirtyDaysAgo}`;

      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "LeadToLaunch/2.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(2200),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as HNResponse;
      const hits = data?.hits || [];

      for (const h of hits) {
        if (!h.author || h.author === "[deleted]") continue;
        if (!isRecentPost(h.created_at)) continue;

        const text = cleanHtml(h.comment_text || h.story_text || h.title || h.story_title || "");
        const rawTitle = h.title || h.story_title || text.slice(0, 60) + "…";

        // Apply 4-layer classifier
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
            postTitle: `🚀 HN: ${rawTitle.slice(0, 70)}`,
            postSnippet: `${text.slice(0, 220)}${budgetTag}`,
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
