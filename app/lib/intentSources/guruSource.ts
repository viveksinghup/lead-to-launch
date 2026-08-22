import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Guru.com Public Project RSS Parser
 * 100% Client Freelance Projects for Web Development & Programming.
 * Public RSS feed, no API key needed.
 */

const GURU_FEEDS = [
  "https://www.guru.com/rss/jobs/c/programming-development",
  "https://www.guru.com/rss/jobs/c/web-software-it",
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

function parseGuruRSS(xml: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const title = decodeHtml(titleMatch[1] || "");
    const desc = decodeHtml(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!title || !url) continue;

    // Apply strict freelance project filter
    const classified = classifyAndFilterFreelanceProject(title, desc);
    if (!classified.isValid) continue;

    const emails = extractEmailsFromText(`${title} ${desc}`);
    const email = emails[0] || extractPrimaryEmail(`${title} ${desc}`);

    const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

    results.push({
      id: `guru-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "indiamart",
      authorName: "Guru.com Client",
      authorHandle: "Client",
      postTitle: `💼 Guru: ${title.slice(0, 65)}`,
      postSnippet: `${desc.slice(0, 200)}${budgetTag}`,
      postUrl: url,
      postedAt: pubDate,
      intentScore: classified.score,
      keywords: ["guru freelance project", classified.category],
      contactHint: email || url,
      location: "Global / Guru.com",
    });
  }

  return results;
}

export async function searchGuruRSS(nicheQuery?: string, limit = 25): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    GURU_FEEDS.map(async (feedUrl) => {
      try {
        const res = await fetch(feedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/rss+xml, text/xml, application/xml",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(2200),
        });

        if (!res.ok) return;

        const xml = await res.text();
        const leads = parseGuruRSS(xml);

        for (const lead of leads) {
          if (!seen.has(lead.postUrl)) {
            seen.add(lead.postUrl);
            results.push(lead);
          }
        }
      } catch {
        // ignore individual feed errors
      }
    })
  );

  return results.sort((a, b) => b.intentScore - a.intentScore).slice(0, limit);
}
