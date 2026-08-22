import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * PeoplePerHour Public Project Scraper & RSS
 * Gathers active web design, software development, and mobile app freelance client projects.
 * Free, public project endpoints.
 */

const PPH_QUERIES = [
  "website development",
  "landing page",
  "wordpress",
  "web application",
  "mobile app",
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

export async function searchPeoplePerHour(nicheQuery?: string, limit = 20): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  const queries = nicheQuery && nicheQuery.trim() ? [nicheQuery.trim(), ...PPH_QUERIES.slice(0, 2)] : PPH_QUERIES;

  await Promise.allSettled(
    queries.slice(0, 3).map(async (query) => {
      try {
        // Fetch public project search RSS/HTML from PeoplePerHour
        const url = `https://www.peopleperhour.com/freelance-${encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"))}-jobs`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(2200),
        });

        if (!res.ok) return;

        const html = await res.text();

        // Extract project cards from public page HTML
        const projectMatches = html.match(/<a[^>]+href="(\/freelance-jobs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi) || [];

        for (const item of projectMatches) {
          const hrefMatch = item.match(/href="([^"]+)"/i);
          const rawTitle = item.replace(/<[^>]*>/g, " ").trim();
          if (!hrefMatch || !rawTitle || rawTitle.length < 15) continue;

          const projectUrl = `https://www.peopleperhour.com${hrefMatch[1]}`;
          if (seen.has(projectUrl)) continue;
          seen.add(projectUrl);

          const classified = classifyAndFilterFreelanceProject(rawTitle, rawTitle);
          if (!classified.isValid) continue;

          const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

          results.push({
            id: `pph-${projectUrl.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
            platform: "linkedin",
            authorName: "PeoplePerHour Client",
            authorHandle: "PPH",
            postTitle: `🎯 PPH: ${rawTitle.slice(0, 65)}`,
            postSnippet: `Seeking freelance developer for ${classified.category.toLowerCase()} project.${budgetTag}`,
            postUrl: projectUrl,
            postedAt: new Date().toISOString(),
            intentScore: classified.score,
            keywords: ["peopleperhour freelance client project", classified.category],
            contactHint: projectUrl,
            location: "Global / PeoplePerHour",
          });
        }
      } catch {
        // ignore
      }
    })
  );

  return results.sort((a, b) => b.intentScore - a.intentScore).slice(0, limit);
}
