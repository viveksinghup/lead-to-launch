// ─── LEAD (Google Maps / Business) ───────────────────────────────────────────
export type Lead = {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  lat: number;
  lng: number;
  photosCount?: number;
  yearsInBusiness?: number;
  /** True for high-ticket businesses (clinics, luxury salons, hotels, law firms, etc.)
   *  that are likely to pay premium for a website — surfaced as priority leads. */
  highValue?: boolean;
  /** Estimated monthly revenue of the business (INR) for tiering */
  estMonthlyRevenue?: number;
};

// ─── AUDIT ────────────────────────────────────────────────────────────────────
export type AuditResult = {
  leadId: string;
  pageSpeedScore: number;
  hasWebsite: boolean;
  mobileFriendly: boolean;
  https: boolean;
  hasSchema: boolean;
  loadTimeMs: number;
  gaps: string[];
  biggestGap: string;
  estLostRevenuePerMonth: number;
};

// ─── RANKED LEAD ──────────────────────────────────────────────────────────────
export type RankedLead = Lead & {
  audit: AuditResult;
  score: number;
  scoreReasoning?: string;
  scoreBreakdown?: {
    noOrBadSite: number;
    reviewVolume: number;
    rating: number;
    recency: number;
    reachable: number;
    industryFit: number;
  };
};

// ─── INTENT LEAD (Option B — social/forum posts) ──────────────────────────────
export type IntentPlatform = "twitter" | "reddit" | "linkedin" | "facebook" | "indiamart" | "justdial";

export type IntentLead = {
  id: string;
  platform: IntentPlatform;
  authorName: string;
  authorHandle?: string;
  postTitle?: string;
  postSnippet: string;
  postUrl: string;
  postedAt: string; // ISO date string
  intentScore: number; // 0–100
  keywords: string[];
  contactHint?: string;
  location?: string;
};

// ─── BUILD & OUTREACH ─────────────────────────────────────────────────────────
export type BuildPromptResult = {
  prompt: string;
  pitchPoints: string[];
};

export type OutreachResult = {
  first: string;
  followUp: string;
  bestSendTime: string;
};

// ─── SCRAPE INPUT ─────────────────────────────────────────────────────────────
/** "find" = Option A (Google Maps), "leads" = Option B (Twitter/Reddit/LinkedIn etc.) */
export type ScrapeMode = "find" | "leads";

export type ScrapeInput = {
  niche: string;
  city: string;
  count: number;
  mode?: ScrapeMode;
  serpApiKey?: string;
  geminiApiKey?: string;
  twitterBearerToken?: string;
};

// ─── OUTREACH CHANNEL / LANGUAGE ─────────────────────────────────────────────
export type OutreachChannel = "whatsapp" | "email" | "instagram";
export type OutreachLanguage = "english" | "hinglish";

// ─── CRM ─────────────────────────────────────────────────────────────────────
export type CRMStatus =
  | "new"
  | "messaged"
  | "demo_sent"
  | "replied"
  | "call_booked"
  | "won"
  | "lost";

export type CRMEntry = {
  id: string;
  leadId: string;
  leadName: string;
  leadCategory: string;
  leadCity: string;
  leadPhone?: string;
  leadEmail?: string;
  leadWhatsapp?: string;
  demoUrl?: string;
  score?: number;
  status: CRMStatus;
  notes?: string;
  outreachMessage?: string;
  followUpMessage?: string;
  addedAt: string;
  lastUpdatedAt: string;
  messagedAt?: string;
  repliedAt?: string;
  wonAt?: string;
  estRevenue?: number;
  platform?: IntentPlatform | "google_maps";
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export type NotificationSettings = {
  yourName: string;
  yourEmail: string;
  yourPhone?: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  twitterBearerToken?: string;
  defaultNiche?: string;
  defaultCity?: string;
};
