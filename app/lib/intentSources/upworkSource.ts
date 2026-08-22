import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Upwork Public Job RSS Feed Parser
 * 14 tech-category-specific RSS feeds covering frontend + backend + product.
 * High buyer intent: Direct client projects with hourly/fixed budgets.
 * No API key needed for public search feeds.
 */

const MAX_AGE_DAYS = 7; // Upwork posts are very fresh — only last 7 days

const UPWORK_TECH_FEEDS = [
  // ── Frontend Frameworks ───────────────────────────────────────────
  "https://www.upwork.com/ab/feed/jobs/rss?q=react+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=vue+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=nextjs+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=angular+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=frontend+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=ui+ux+developer&sort=recency",
  // ── Backend & Full Stack ──────────────────────────────────────────
  "https://www.upwork.com/ab/feed/jobs/rss?q=node+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=python+web+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=laravel+php+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=full+stack+developer&sort=recency",
  // ── Platform & Product ────────────────────────────────────────────
  "https://www.upwork.com/ab/feed/jobs/rss?q=shopify+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=wordpress+developer&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=react+native+mobile+app&sort=recency",
  "https://www.upwork.com/ab/feed/jobs/rss?q=saas+web+application&sort=recency",
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

function isRecentPost(isoDate: string): boolean {
  if (!isoDate) return true;
  const age = (Date.now() - new Date(isoDate).getTime()) / 86400000;
  return age <= MAX_AGE_DAYS;
}

function parseUpworkRSS(xml: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch =
      item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
      item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch =
      item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
      item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch =
      item.match(/<link>([\s\S]*?)<\/link>/i) ||
      item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const rawTitle = titleMatch[1] || "";
    const cleanTitle = decodeHtml(rawTitle.replace(/\s*-\s*Upwork$/i, ""));
    const desc = decodeHtml(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!cleanTitle || !url) continue;

    // Recency gate
    if (!isRecentPost(pubDate)) continue;

    // Apply 4-layer classifier
    const classified = classifyAndFilterFreelanceProject(cleanTitle, desc);
    if (!classified.isValid) continue;

    const fullText = `${cleanTitle} ${desc}`;
    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText);

    // Extract Upwork-specific budget fields
    const budgetMatch =
      desc.match(/Budget:\s*\$([0-9,]+)/i) ||
      desc.match(/Hourly Range:\s*([^\n\r<]+)/i);
    const budgetStr = budgetMatch
      ? ` · Budget: ${budgetMatch[0].trim()}`
      : classified.budget
      ? ` · Budget: ${classified.budget}`
      : "";

    results.push({
      id: `upwork-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "linkedin",
      authorName: "Upwork Client",
      authorHandle: "Upwork",
      postTitle: `💼 ${cleanTitle.slice(0, 70)}`,
      postSnippet: `${desc.slice(0, 220)}${budgetStr}`,
      postUrl: url,
      postedAt: pubDate,
      intentScore: classified.score,
      keywords: ["upwork freelance client", classified.category],
      contactHint: email || url,
      location: "Global / Upwork Verified",
    });
  }

  return results;
}

export async function searchUpworkRSS(nicheQuery?: string, limit = 30): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    UPWORK_TECH_FEEDS.map(async (feedUrl) => {
      try {
        const res = await fetch(feedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
