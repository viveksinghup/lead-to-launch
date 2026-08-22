import type { IntentLead } from "../types";
import { extractPrimaryEmail } from "./contactExtractor";

/**
 * RemoteOK Free JSON API — Freelance & remote job aggregator.
 * No API key required. Returns structured JSON with company info.
 * Filters for web design / frontend / freelance tags.
 */

interface RemoteOKJob {
  id: string;
  epoch: number;
  date: string;
  company: string;
  company_logo?: string;
  position: string;
  tags: string[];
  description: string;
  url: string;
  apply_url?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
}

const FREELANCE_TAGS = [
  "design", "frontend", "wordpress", "web", "freelance",
  "ui", "ux", "shopify", "html", "css", "javascript",
  "react", "vue", "landing-page", "webflow",
];

export async function searchRemoteOK(nicheQuery?: string, limit = 15): Promise<IntentLead[]> {
  const results: IntentLead[] = [];

  try {
    // RemoteOK free API — first item is metadata, rest are jobs
    const res = await fetch("https://remoteok.com/api", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data: RemoteOKJob[] = await res.json();
    const jobs = Array.isArray(data) ? data.slice(1) : []; // skip first metadata item

    for (const job of jobs) {
      if (!job.position || !job.url) continue;

      const jobTags = (job.tags || []).map(t => t.toLowerCase());
      const fullText = `${job.position} ${job.description || ""} ${(job.tags || []).join(" ")}`;
      const lower = fullText.toLowerCase();

      // Check if relevant to freelance web dev
      const isRelevant =
        FREELANCE_TAGS.some(tag => jobTags.includes(tag)) ||
        lower.includes("website") ||
        lower.includes("web developer") ||
        lower.includes("web designer") ||
        lower.includes("freelance") ||
        lower.includes("frontend") ||
        lower.includes("landing page") ||
        (nicheQuery && lower.includes(nicheQuery.toLowerCase().split(" ")[0]));

      if (!isRelevant) continue;

      const email = extractPrimaryEmail(fullText);

      // Salary info is great for qualifying leads
      const hasBudget = job.salary_min || job.salary_max;
      const salaryText = hasBudget
        ? ` Budget: $${job.salary_min?.toLocaleString() || "?"}–$${job.salary_max?.toLocaleString() || "?"}`
        : "";

      results.push({
        id: `remoteok-${job.id}-${Date.now().toString(36)}`,
        platform: "twitter",
        authorName: job.company || "Remote Company",
        authorHandle: job.company,
        postTitle: `🌍 RemoteOK: ${job.position.slice(0, 60)}`,
        postSnippet: `${(job.description || "").slice(0, 180)}${salaryText}`,
        postUrl: job.apply_url || job.url,
        postedAt: job.date || new Date().toISOString(),
        intentScore: email ? 90 : hasBudget ? 85 : 78,
        keywords: job.tags?.slice(0, 3) || ["remote freelance"],
        contactHint: email || job.apply_url || job.url,
        location: job.location || "Global / Remote",
      });

      if (results.length >= limit) break;
    }
  } catch {
    // ignore
  }

  return results.slice(0, limit);
}
