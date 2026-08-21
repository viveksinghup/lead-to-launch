import type { IntentLead, IntentPlatform } from "../types";
import { extractPrimaryEmail, extractEmailsFromText } from "./contactExtractor";

interface SerpApiOrganicResult {
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
  date?: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
}

function detectPlatform(url: string): IntentPlatform {
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("facebook.com")) return "facebook";
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("indiamart.com")) return "indiamart";
  if (url.includes("github.com")) return "justdial";
  return "twitter";
}

/**
 * Deep Google Email Dorking via SerpAPI
 * Finds posts across freelancing forums, startup boards, and social groups that contain public email addresses.
 */
export async function searchGoogleEmailDorks(
  nicheQuery?: string,
  count: number = 20,
  serpApiKey?: string
): Promise<IntentLead[]> {
  const key = serpApiKey || process.env.SERPAPI_API_KEY;
  if (!key) return [];

  const clean = nicheQuery && nicheQuery.trim().toLowerCase() !== "dentist" ? nicheQuery.trim() : "website";

  const queries = [
    `("need a website" OR "looking for web developer" OR "hiring website designer") ("@gmail.com" OR "@outlook.com" OR "@yahoo.com") ${clean !== "website" ? clean : ""}`,
    `("website developer needed" OR "need landing page built") ("email me" OR "contact:") ${clean !== "website" ? clean : ""}`,
  ];

  const results: IntentLead[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        engine: "google",
        q,
        api_key: key,
        num: String(Math.min(15, count)),
        tbs: "qdr:m", // last month
      });

      const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        next: { revalidate: 1800 },
      });
      if (!res.ok) continue;

      const data = (await res.json()) as SerpApiResponse;
      const organic = data?.organic_results || [];

      for (const r of organic) {
        const fullText = `${r.title} ${r.snippet}`;
        const emails = extractEmailsFromText(fullText);
        const email = emails[0];
        const platform = detectPlatform(r.link);

        if (!seen.has(r.link)) {
          seen.add(r.link);
          results.push({
            id: `dork-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            platform,
            authorName: r.displayed_link?.split("/")[0] || "Client Inquirer",
            postTitle: r.title,
            postSnippet: r.snippet,
            postUrl: r.link,
            postedAt: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
            intentScore: email ? 95 : 75,
            keywords: ["google email search"],
            contactHint: email,
            location: "Global / Web",
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return results.slice(0, count);
}

export async function searchSerpWebSources(
  niche: string,
  count: number = 15,
  serpApiKey?: string
): Promise<IntentLead[]> {
  return searchGoogleEmailDorks(niche, count, serpApiKey);
}
