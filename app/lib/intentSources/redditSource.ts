import type { IntentLead } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";
import { classifyAndFilterFreelanceProject, DEV_DOMAIN_KEYWORDS } from "../intentClassifier";

/**
 * Reddit Tech Hiring Feed Parser
 * Targets developer-specific hiring subreddits and client communities.
 * Strictly eliminates [For Hire] seller posts, non-tech jobs, and stale content.
 */

const MAX_AGE_DAYS = 14; // only posts within last 14 days

/** Tech-focused subreddit feeds — clients seeking developers */
const REDDIT_TECH_HIRING_FEEDS = [
  // Dedicated [Hiring] feeds — flair or title filtered
  "https://www.reddit.com/r/forhire/search.rss?q=flair%3AHiring+(website+OR+react+OR+vue+OR+developer+OR+app+OR+frontend+OR+backend)&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/freelance_forhire/search.rss?q=title%3AHiring+(web+OR+react+OR+frontend+OR+backend+OR+app)&restrict_sr=1&sort=new",

  // Frontend tech communities — client/hiring threads
  "https://www.reddit.com/r/reactjs/search.rss?q=hiring+OR+%22looking+for%22+OR+%22need+a+developer%22&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/vuejs/search.rss?q=hiring+OR+freelance+needed+OR+%22looking+for%22&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/webdev/search.rss?q=%5BHiring%5D+OR+%22looking+for+freelance%22+OR+%22need+a+developer%22&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/javascript/search.rss?q=%22need+developer%22+OR+%22hire+freelance%22+OR+%22looking+for%22&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/node/search.rss?q=hiring+OR+%22need+backend%22+OR+%22need+developer%22&restrict_sr=1&sort=new",

  // Client communities posting developer needs
  "https://www.reddit.com/r/startups/search.rss?q=need+developer+OR+%22need+website%22+OR+%22looking+for+CTO%22+OR+%22looking+for+developer%22&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/smallbusiness/search.rss?q=%22need+website%22+OR+%22hire+developer%22+OR+%22web+developer%22&restrict_sr=1&sort=new",
  "https://www.reddit.com/r/entrepreneur/search.rss?q=%22need+developer%22+OR+%22looking+for+web%22+OR+%22build+my+app%22+OR+%22build+my+website%22&restrict_sr=1&sort=new",
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

function isRecentPost(isoDate: string): boolean {
  if (!isoDate) return true; // allow if no date
  const age = (Date.now() - new Date(isoDate).getTime()) / 86400000;
  return age <= MAX_AGE_DAYS;
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
    const postedAt = updatedMatch ? updatedMatch[1] : "";

    // Recency gate: skip stale posts
    if (postedAt && !isRecentPost(postedAt)) continue;

    // Apply 4-layer classifier
    const classified = classifyAndFilterFreelanceProject(title, content);
    if (!classified.isValid) continue;

    const author = authorMatch
      ? decodeHtmlEntities(authorMatch[1]).replace(/^\/u\//, "").replace(/^u\//, "")
      : "founder";
    if (author === "[deleted]" || author === "AutoModerator") continue;

    const url = linkMatch ? linkMatch[1] : "https://reddit.com";
    const entryId = idMatch
      ? idMatch[1].replace(/[^a-zA-Z0-9]/g, "_")
      : `reddit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const fullText = `${title} ${content}`;
    const emails = extractEmailsFromText(fullText);
    const email = emails[0] || extractPrimaryEmail(fullText);
    const pmLink = `https://www.reddit.com/message/compose/?to=${author}&subject=Freelance%20Dev%20Project%20Proposal`;
    const budgetTag = classified.budget ? ` · Budget: ${classified.budget}` : "";

    entries.push({
      id: `reddit-${entryId}`,
      platform: "reddit",
      authorName: `u/${author}`,
      authorHandle: `u/${author}`,
      postTitle: title.slice(0, 80),
      postSnippet: `${content.slice(0, 220)}${budgetTag}`,
      postUrl: url,
      postedAt: postedAt || new Date().toISOString(),
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
    REDDIT_TECH_HIRING_FEEDS.map(async (url) => {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
