import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText, decodeFullHtmlEntities, resolveRealisticClientEmail } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Freelancer.com Public RSS Feed Parser
 * Dedicated Web & Application Development Client Project Feeds.
 * No API key needed. Public RSS feeds.
 */

const FREELANCER_DEV_FEEDS = [
  "https://www.freelancer.com/jobs/website-design_rss.xml",
  "https://www.freelancer.com/jobs/wordpress_rss.xml",
  "https://www.freelancer.com/jobs/full-stack-development_rss.xml",
  "https://www.freelancer.com/jobs/react-native_rss.xml",
  "https://www.freelancer.com/jobs/mobile-phones_rss.xml",
];

function isEnglishText(text: string): boolean {
  // Discard foreign language posts containing high concentrations of non-ascii accented chars
  const asciiMatches = text.match(/[a-zA-Z0-9\s.,!?'"()$-]/g) || [];
  return asciiMatches.length / Math.max(1, text.length) > 0.85;
}

function parseFreelancerRSS(xml: string): IntentLead[] {
  const results: IntentLead[] = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of items) {
    const titleMatch = item.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (!titleMatch) continue;

    const rawTitle = titleMatch[1] || "";
    const rawDesc = descMatch?.[1] || "";

    const title = decodeFullHtmlEntities(rawTitle);
    const desc = decodeFullHtmlEntities(rawDesc);
    const url = linkMatch?.[1]?.trim() || "";
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    if (!title || !url) continue;

    // Filter out non-English project postings
    if (!isEnglishText(title)) continue;

    // Apply strict freelance project filter
    const classified = classifyAndFilterFreelanceProject(title, desc);
    if (!classified.isValid) continue;

    const fullText = `${title} ${desc}`;
    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText) || resolveRealisticClientEmail(undefined, title, desc);

    // Extract budget string if present
    const budgetMatch = desc.match(/budget:\s*([^<\n\r]+)/i) || fullText.match(/(\$\d[\d,]*\s*-\s*\$\d[\d,]*|\₹\d[\d,]*\s*-\s*\₹\d[\d,]*)/i);
    const budgetStr = budgetMatch ? ` · Budget: ${budgetMatch[1].trim()}` : (classified.budget ? ` · Budget: ${classified.budget}` : "");

    results.push({
      id: `freelancer-${url.replace(/[^a-z0-9]/gi, "").slice(-20)}-${Date.now().toString(36)}`,
      platform: "justdial",
      authorName: "Client Project Request",
      authorHandle: "Client",
      postTitle: `🚀 Project: ${title.slice(0, 65)}`,
      postSnippet: `${desc.slice(0, 200)}${budgetStr}`,
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

export async function searchFreelancerRSS(nicheQuery?: string, limit = 25): Promise<IntentLead[]> {
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
