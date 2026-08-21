import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

const INTENT_KEYWORDS = [
  "need website",
  "looking for web developer",
  "looking for website developer",
  "website developer needed",
  "need website built",
  "redesign website",
  "hire website designer",
  "need landing page",
  "looking for developer to build website",
  "need a website",
  "hire web developer",
  "website design needed",
  "need web developer",
  "website banwana hai",
  "need application",
  "freelance developer",
  "[hiring] website",
  "[hiring] web",
];

const TARGET_SUBREDDITS = [
  "forhire",
  "hiring",
  "smallbusiness",
  "entrepreneur",
  "freelance_forhire",
  "startups",
  "hireaprogrammer",
  "webdev",
  "jobbit",
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

function parseAtomFeed(xml: string, subreddit: string): IntentLead[] {
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
    const lowerText = fullText.toLowerCase();

    // Check intent
    const hasIntentKeyword = INTENT_KEYWORDS.some((kw) => lowerText.includes(kw.toLowerCase()));
    const hasGeneralIntent =
      (lowerText.includes("need") || lowerText.includes("looking for") || lowerText.includes("hiring")) &&
      (lowerText.includes("website") || lowerText.includes("web app") || lowerText.includes("landing page") || lowerText.includes("web developer") || lowerText.includes("wordpress") || lowerText.includes("shopify"));

    if (!hasIntentKeyword && !hasGeneralIntent) continue;

    const author = authorMatch ? decodeHtmlEntities(authorMatch[1]).replace(/^\/u\//, "").replace(/^u\//, "") : "founder";
    if (author === "[deleted]" || author === "AutoModerator") continue;

    const url = linkMatch ? linkMatch[1] : `https://reddit.com/r/${subreddit}`;
    const entryId = idMatch ? idMatch[1].replace(/[^a-zA-Z0-9]/g, "_") : `reddit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const postedAt = updatedMatch ? updatedMatch[1] : new Date().toISOString();

    const email = extractPrimaryEmail(fullText);
    const pmLink = `https://www.reddit.com/message/compose/?to=${author}&subject=Website%20Development%20Inquiry`;

    let score = 75;
    if (lowerText.includes("budget") || lowerText.includes("$") || lowerText.includes("paid")) score += 15;
    if (lowerText.includes("urgent") || lowerText.includes("asap")) score += 10;
    if (email) score += 10;

    entries.push({
      id: `reddit-${entryId}`,
      platform: "reddit",
      authorName: `u/${author}`,
      authorHandle: `u/${author}`,
      postTitle: title,
      postSnippet: content.slice(0, 220) + (content.length > 220 ? "…" : ""),
      postUrl: url,
      postedAt,
      intentScore: Math.min(100, score),
      keywords: ["need website"],
      contactHint: email || pmLink,
      location: "Global / Remote",
    });
  }

  return entries;
}

export async function searchRedditRSS(nicheQuery?: string, limit = 20): Promise<IntentLead[]> {
  const cleanNiche = nicheQuery && nicheQuery.trim().toLowerCase() !== "dentist" && nicheQuery.trim().toLowerCase() !== "general"
    ? nicheQuery.trim()
    : "website";

  const feeds = TARGET_SUBREDDITS.map((sub) => `https://www.reddit.com/r/${sub}/new/.rss?limit=25`);

  const results: IntentLead[] = [];
  const seen = new Set<string>();

  const responses = await Promise.allSettled(
    feeds.slice(0, 6).map(async (url, idx) => {
      const sub = TARGET_SUBREDDITS[idx] || "forhire";
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/atom+xml, application/rss+xml, text/xml",
        },
        next: { revalidate: 900 },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseAtomFeed(xml, sub);
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
