import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

interface GitHubIssueItem {
  id: number;
  title: string;
  body: string | null;
  html_url: string;
  created_at: string;
  user: {
    login: string;
    html_url: string;
  };
  repository_url: string;
}

interface GitHubSearchResponse {
  items?: GitHubIssueItem[];
}

export async function searchGitHubIssues(nicheQuery?: string, limit = 15): Promise<IntentLead[]> {
  const query = `("need website" OR "website developer needed" OR "looking for web developer" OR "need landing page") is:issue is:open`;

  try {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=25`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "LeadToLaunch-App",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as GitHubSearchResponse;
    const items = data.items || [];

    return items
      .map((item): IntentLead => {
        const fullText = `${item.title} ${item.body || ""}`;
        const email = extractPrimaryEmail(fullText);

        return {
          id: `github-${item.id}`,
          platform: "justdial", // mapped for UI
          authorName: `@${item.user.login}`,
          authorHandle: item.user.login,
          postTitle: item.title,
          postSnippet: item.body ? item.body.slice(0, 220) + (item.body.length > 220 ? "…" : "") : item.title,
          postUrl: item.html_url,
          postedAt: item.created_at,
          intentScore: email ? 95 : 80,
          keywords: ["github open request"],
          contactHint: email || item.user.html_url,
          location: "Global / GitHub Open Source",
        };
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}
