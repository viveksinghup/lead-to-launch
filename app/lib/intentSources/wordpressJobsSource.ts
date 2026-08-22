import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * WordPress.org Jobs RSS — Pure Client Freelance Project Demand
 * 100% buyer intent: every approved post is a client seeking a freelance WordPress/WooCommerce developer.
 * Free RSS feed, no API key.
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
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWPJobsRSS(xml: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid>([\s\S]*?)<\/guid>/i);
    const authorMatch = item.match(/<dc:creator[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/i) || item.match(/<author>([\s\S]*?)<\/author>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const title = decodeHtml(titleMatch[1] || "");
    const desc = decodeHtml(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const author = decodeHtml(authorMatch?.[1] || "WP Client");
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!title || !url) continue;

    // Apply strict freelance classifier (filters out full-time agency hires, keeps client projects)
    const classified = classifyAndFilterFreelanceProject(title, desc);
    if (!classified.isValid) continue;

    const fullText = `${title} ${desc}`;
    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText);

    const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

    results.push({
      id: `wp-jobs-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "facebook",
      authorName: author || "WordPress Client",
      authorHandle: undefined,
      postTitle: `🔧 WP Project: ${title.slice(0, 65)}`,
      postSnippet: `${desc.slice(0, 200)}${budgetTag}`,
      postUrl: url,
      postedAt: pubDate,
      intentScore: classified.score,
      keywords: ["wordpress freelance project", classified.category],
      contactHint: email || url,
      location: "Global / Remote",
    });
  }

  return results;
}

export async function searchWordPressJobs(nicheQuery?: string, limit = 20): Promise<IntentLead[]> {
  try {
    const res = await fetch("https://jobs.wordpress.net/feed/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/rss+xml, text/xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(2200),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const results = parseWPJobsRSS(xml);

    if (nicheQuery && nicheQuery.trim()) {
      const nicheWords = nicheQuery.toLowerCase().split(" ").filter(w => w.length > 3);
      const filtered = results.filter(r => {
        const text = `${r.postTitle} ${r.postSnippet}`.toLowerCase();
        return nicheWords.some(w => text.includes(w)) || text.includes("wordpress") || text.includes("website");
      });
      if (filtered.length > 0) return filtered.slice(0, limit);
    }

    return results.slice(0, limit);
  } catch {
    return [];
  }
}
