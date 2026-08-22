import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText, decodeFullHtmlEntities, resolveRealisticClientEmail } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Freelancer.com Public RSS Feed Parser
 * 15 tech-category RSS feeds covering all frontend, backend, and product categories.
 * No API key needed. Public RSS feeds.
 */

const MAX_AGE_DAYS = 7; // Freelancer posts stay fresh — only last 7 days

const FREELANCER_DEV_FEEDS = [
  // ── Frontend ─────────────────────────────────────────────────────
  "https://www.freelancer.com/jobs/website-design_rss.xml",
  "https://www.freelancer.com/jobs/reactjs_rss.xml",
  "https://www.freelancer.com/jobs/vue-js_rss.xml",
  "https://www.freelancer.com/jobs/nextjs_rss.xml",
  "https://www.freelancer.com/jobs/angular-js_rss.xml",
  "https://www.freelancer.com/jobs/html5_rss.xml",
  // ── Backend & Full Stack ──────────────────────────────────────────
  "https://www.freelancer.com/jobs/full-stack-development_rss.xml",
  "https://www.freelancer.com/jobs/node-js_rss.xml",
  "https://www.freelancer.com/jobs/python_rss.xml",
  "https://www.freelancer.com/jobs/php_rss.xml",
  "https://www.freelancer.com/jobs/laravel_rss.xml",
  "https://www.freelancer.com/jobs/django_rss.xml",
  // ── Platform & Product ────────────────────────────────────────────
  "https://www.freelancer.com/jobs/shopify_rss.xml",
  "https://www.freelancer.com/jobs/wordpress_rss.xml",
  "https://www.freelancer.com/jobs/software-development_rss.xml",
  "https://www.freelancer.com/jobs/api-development_rss.xml",
  "https://www.freelancer.com/jobs/react-native_rss.xml",
];

function isEnglishText(text: string): boolean {
  const asciiMatches = text.match(/[a-zA-Z0-9\s.,!?'"()$-]/g) || [];
  return asciiMatches.length / Math.max(1, text.length) > 0.85;
}

function isRecentPost(isoDate: string): boolean {
  if (!isoDate) return true;
  const age = (Date.now() - new Date(isoDate).getTime()) / 86400000;
  return age <= MAX_AGE_DAYS;
}

function parseFreelancerRSS(xml: string): IntentLead[] {
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

    const title = decodeFullHtmlEntities(titleMatch[1] || "");
    const desc = decodeFullHtmlEntities(descMatch?.[1] || "");
    const url = linkMatch?.[1]?.trim() || "";
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!title || !url) continue;
    if (!isEnglishText(title)) continue;

    // Recency gate
    if (!isRecentPost(pubDate)) continue;

    // Apply 4-layer classifier
    const classified = classifyAndFilterFreelanceProject(title, desc);
    if (!classified.isValid) continue;

    const fullText = `${title} ${desc}`;
    const emails = extractEmailsFromText(fullText);
    const email =
      emails[0] || extractPrimaryEmail(fullText) || resolveRealisticClientEmail(undefined, title, desc);

    const budgetMatch =
      desc.match(/budget:\s*([^<\n\r]+)/i) ||
      fullText.match(/(\$\d[\d,]*\s*-\s*\$\d[\d,]*|₹\d[\d,]*\s*-\s*₹\d[\d,]*)/i);
    const budgetStr = budgetMatch
      ? ` · Budget: ${budgetMatch[1]?.trim() || budgetMatch[0]?.trim()}`
      : classified.budget
      ? ` · Budget: ${classified.budget}`
      : "";

    results.push({
      id: `freelancer-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "justdial",
      authorName: "Client Project Request",
      authorHandle: "Freelancer.com",
      postTitle: `🚀 ${title.slice(0, 70)}`,
      postSnippet: `${desc.slice(0, 220)}${budgetStr}`,
      postUrl: url,
      postedAt: pubDate,
      intentScore: classified.score,
      keywords: ["freelancer client project", classified.category],
      contactHint: email || url,
      location: "Global / Remote",
    });
  }

  return results;
}

export async function searchFreelancerRSS(nicheQuery?: string, limit = 30): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    FREELANCER_DEV_FEEDS.map(async (feedUrl) => {
      try {
        const res = await fetch(feedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "application/rss+xml, text/xml",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(2200),
        });
        if (!res.ok) return;
        const xml = await res.text();
        const leads = parseFreelancerRSS(xml);
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
