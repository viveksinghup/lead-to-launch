import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Upwork Public Job RSS Feed Parser
 * High Buyer Intent: Direct job posts from clients with hourly/fixed budgets.
 * No API key needed for public search feeds.
 */

const UPWORK_FEEDS = [
  "https://www.upwork.com/ab/feed/jobs/rss?q=website+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=landing+page&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=wordpress&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=web+application&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=mobile+app&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?category2_uid=531770282580668418&sort=recency",
];

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

function parseUpworkRSS(xml: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const rawTitle = titleMatch[1] || "";
    const cleanTitle = decodeHtml(rawTitle.replace(/\s*-\s*Upwork$/i, ""));
    const desc = decodeHtml(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!cleanTitle || !url) continue;

    // Apply strict anti-job and anti-ad classifier
    const classified = classifyAndFilterFreelanceProject(cleanTitle, desc);
    if (!classified.isValid) continue;

    const fullText = `${cleanTitle} ${desc}`;
    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText);

    // Extract Upwork specific budget lines (e.g. Budget: $500 or Hourly Range: $30-$50)
    const budgetMatch = desc.match(/Budget:\s*\$([0-9,]+)/i) || desc.match(/Hourly Range:\s*([^\n\r<]+)/i);
    const budgetStr = budgetMatch ? ` · Budget: ${budgetMatch[0].trim()}` : (classified.budget ? ` · Budget: ${classified.budget}` : "");

    results.push({
      id: `upwork-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "linkedin",
      authorName: "Upwork Client",
      authorHandle: "Upwork",
      postTitle: `💼 Upwork: ${cleanTitle.slice(0, 65)}`,
      postSnippet: `${desc.slice(0, 200)}${budgetStr}`,
      postUrl: url,
      postedAt: pubDate,
      intentScore: classified.score,
      keywords: ["upwork freelance client job", classified.category],
      contactHint: email || url,
      location: "Global / Upwork Verified",
    });
  }

  return results;
}

export async function searchUpworkRSS(nicheQuery?: string, limit = 25): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    UPWORK_FEEDS.map(async (feedUrl) => {
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
        const leads = parseUpworkRSS(xml);

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
