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

export type BuildPromptResult = {
  prompt: string;
  pitchPoints: string[];
};

export type OutreachResult = {
  first: string;
  followUp: string;
  bestSendTime: string;
};

export type ScrapeInput = {
  niche: string;
  city: string;
  count: number;
};

export type OutreachChannel = "whatsapp" | "email" | "instagram";
export type OutreachLanguage = "english" | "hinglish";
