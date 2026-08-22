import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject } from "../intentClassifier";

/**
 * Reddit Client [Hiring] Feed Parser
 * Queries exclusively client hiring project posts across r/forhire, r/freelance_forhire, r/jobbit.
 * Strictly eliminates all [For Hire] developer advertisements.
 */

const TARGET_SUBREDDIT_HIRING_FEEDS = [
  "https://www.reddit.com/r/forhire/search.rss?q=flair%3AHiring&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/freelance_forhire/search.rss?q=title%3AHiring&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/jobbit/search.rss?q=title%3AHiring&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/webdev/search.rss?q=title%3AClient+OR+title%3AHiring&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/smallbusiness/search.rss?q=need+website+OR+need+developer&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/startups/search.rss?q=need+developer+OR+looking+for+developer&restrict_sr=1&sort=new",
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAtomFeed(xml: string): IntentLead[] {
  const entries: IntentLead[] = [];
  const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const entry of entryMatches) {
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/i);
    const authorMatch = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i);
    const updatedMatch = entry.match(/<updated>([\s\S]*?)<\/updated>/i);
    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/i);

    if (!titleMatch) continue;

    const title = decodeHtmlEntities(titleMatch[1] || "");
    const content = decodeHtmlEntities(contentMatch ? contentMatch[1] : "");
    const fullText = `${title} ${content}`;

    // Apply strict freelance classifier (discards [For Hire] seller posts & corporate jobs)
    const classified = classifyAndFilterFreelanceProject(title, content);
    if (!classified.isValid) continue;

    const author = authorMatch ? decodeHtmlEntities(authorMatch[1]).replace(/^\/u\//, "").replace(/^u\//, "") : "founder";
    if (author === "[deleted]" || author === "AutoModerator") continue;

    const url = linkMatch ? linkMatch[1] : "https://reddit.com";
    const entryId = idMatch ? idMatch[1].replace(/[^a-zA-Z0-9]/g, "_") : `reddit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const postedAt = updatedMatch ? updatedMatch[1] : new Date().toISOString();

    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText);
    const pmLink = `https://www.reddit.com/message/compose/?to=${author}&subject=Website%20Development%20Proposal`;

    const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

    entries.push({
      id: `reddit-${entryId}`,
      platform: "reddit",
      authorName: `u/${author}`,
      authorHandle: `u/${author}`,
      postTitle: title.slice(0, 75),
      postSnippet: `${content.slice(0, 200)}${budgetTag}`,
      postUrl: url,
      postedAt,
      intentScore: classified.score,
      keywords: ["reddit client hiring", classified.category],
      contactHint: email || pmLink,
      location: "Global / Remote",
    });
  }

  return entries;
}

export async function searchRedditRSS(nicheQuery?: string, limit = 20): Promise<IntentLead[]> {
  const results: IntentLead[] = [];
  const seen = new Set<string>();

  const responses = await Promise.allSettled(
    TARGET_SUBREDDIT_HIRING_FEEDS.map(async (url) => {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/atom+xml, application/rss+xml, text/xml",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(2200),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseAtomFeed(xml);
    })
  );

  for (const r of responses) {
    if (r.status === "fulfilled") {
      for (const lead of r.value) {
        if (!seen.has(lead.postUrl) && !seen.has(lead.authorName)) {
          seen.add(lead.postUrl);
          seen.add(lead.authorName);
          results.push(lead);
        }
      }
    }
  }

  return results.sort((a, b) => b.intentScore - a.intentScore).slice(0, limit);
}
