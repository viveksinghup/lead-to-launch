import type { IntentLead } from "../types";

const INTENT_KEYWORDS = [
  "need website",
  "looking for web developer",
  "website banwana hai",
  "need application",
  "need freelance designer",
  "freelance developer",
  "need a website",
  "want a website",
  "hire web developer",
  "website design needed",
  "need web developer",
  "need web design",
];

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
  };
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

interface TwitterSearchResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
  };
}

function scoreIntent(text: string): { score: number; keywords: string[] } {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const kw of INTENT_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }

  let score = Math.min(100, matched.length * 30);

  if (lower.includes("budget") || lower.includes("pay") || lower.includes("₹") || lower.includes("$")) score = Math.min(100, score + 15);
  if (lower.includes("urgent") || lower.includes("asap")) score = Math.min(100, score + 10);
  if (lower.includes("business") || lower.includes("startup") || lower.includes("shop")) score = Math.min(100, score + 10);

  return { score, keywords: matched };
}

/**
 * Search Twitter/X for intent posts using Bearer Token (X API v2 free tier).
 * Free tier allows 500,000 tweet reads/month with no credit card required.
 * Get token at: https://developer.twitter.com/en/portal/dashboard
 */
export async function searchTwitter(niche: string, count: number = 15, bearerToken?: string): Promise<IntentLead[]> {
  const token = bearerToken || process.env.TWITTER_BEARER_TOKEN;
  if (!token) return [];

  // Build query — all intent keywords in one OR query
  const intentQuery = INTENT_KEYWORDS.slice(0, 5)
    .map((kw) => `"${kw}"`)
    .join(" OR ");
  const query = `(${intentQuery}) ${niche} lang:en -is:retweet`;

  // Date range: last 30 days
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 30);

  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(count, 100)),
    "tweet.fields": "created_at,public_metrics,author_id",
    "user.fields": "name,username",
    expansions: "author_id",
    start_time: startTime.toISOString(),
    sort_order: "relevancy",
  });

  try {
    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`[Twitter] API error ${res.status}:`, await res.text());
      return [];
    }

    const data = (await res.json()) as TwitterSearchResponse;
    const tweets = data?.data ?? [];
    const usersMap = new Map<string, TwitterUser>();
    for (const u of data?.includes?.users ?? []) {
      usersMap.set(u.id, u);
    }

    return tweets
      .map((tweet): IntentLead | null => {
        const { score, keywords } = scoreIntent(tweet.text);
        if (score === 0) return null;

        const user = usersMap.get(tweet.author_id);
        return {
          id: `twitter-${tweet.id}`,
          platform: "twitter",
          authorName: user?.name ?? "Twitter User",
          authorHandle: user ? `@${user.username}` : undefined,
          postSnippet: tweet.text.slice(0, 200),
          postUrl: user ? `https://twitter.com/${user.username}/status/${tweet.id}` : `https://twitter.com/i/web/status/${tweet.id}`,
          postedAt: tweet.created_at ?? new Date().toISOString(),
          intentScore: score,
          keywords,
        };
      })
      .filter((l): l is IntentLead => l !== null)
      .sort((a, b) => b.intentScore - a.intentScore)
      .slice(0, count);
  } catch (e) {
    console.error("[Twitter] Search error:", e);
    return [];
  }
}
