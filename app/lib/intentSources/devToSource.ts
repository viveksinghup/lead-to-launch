import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  user: {
    name: string;
    username: string;
  };
  tag_list: string[];
}

/**
 * DEV.to Free API — searches for "hiring" or "freelance" tagged articles.
 * No API key required. Rate limit: 1000 req/day.
 */
export async function searchDevTo(nicheQuery?: string, limit = 12): Promise<IntentLead[]> {
  const tags = ["hiring", "freelancing", "startup"];
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    try {
      const url = `https://dev.to/api/articles?tag=${tag}&per_page=20&top=7`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LeadToLaunch/1.0",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const articles: DevToArticle[] = await res.json();

      for (const article of articles) {
        const fullText = `${article.title} ${article.description}`;
        const lower = fullText.toLowerCase();

        const isRelevant =
          lower.includes("need website") ||
          lower.includes("looking for developer") ||
          lower.includes("web developer") ||
          lower.includes("website built") ||
          lower.includes("landing page") ||
          lower.includes("freelance") ||
          lower.includes("hire") ||
          lower.includes("website design") ||
          (nicheQuery && lower.includes(nicheQuery.toLowerCase().split(" ")[0]));

        if (!isRelevant) continue;
        if (seen.has(article.url)) continue;

        seen.add(article.url);
        const email = extractPrimaryEmail(fullText);

        results.push({
          id: `devto-${article.id}`,
          platform: "twitter",
          authorName: article.user.name || article.user.username,
          authorHandle: `@${article.user.username}`,
          postTitle: article.title,
          postSnippet: article.description?.slice(0, 220) || article.title,
          postUrl: article.url,
          postedAt: article.published_at,
          intentScore: email ? 88 : 72,
          keywords: ["dev.to freelance hire"],
          contactHint: email || `https://dev.to/${article.user.username}`,
          location: "Global / Remote",
        });
      }
    } catch {
      // ignore
    }
  }

  return results.slice(0, limit);
}
