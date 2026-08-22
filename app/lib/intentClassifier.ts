import { extractPrimaryEmail, extractEmailsFromText } from "./intentSources/contactExtractor";

/**
 * 1. Anti-Full-Time Corporate Job Blacklist (DISQUALIFIED)
 * Eliminates full-time employee roles, salary/benefits packages, internships, etc.
 */
const FULL_TIME_JOB_SIGNALS = [
  "full-time",
  "full time",
  "fulltime",
  "401(k)",
  "401k",
  "health insurance",
  "dental insurance",
  "vision insurance",
  "paid time off",
  "pto",
  "annual salary",
  "salary:",
  "/year",
  "per annum",
  "per year",
  "w2",
  "w-2",
  "internship",
  "unpaid",
  "equity only",
  "equity-only",
  "relocation assistance",
  "on-site in office",
  "hybrid in office",
  "junior developer role",
  "staff software engineer",
  "principal engineer",
  "engineering manager",
  "vp of engineering",
];

/**
 * 2. Anti-Advertisement & Seller Blacklist (DISQUALIFIED)
 * Eliminates freelancers advertising themselves, blog posts, tutorials, promotional content.
 */
const SELLER_AND_AD_SIGNALS = [
  "[for hire]",
  "[forhire]",
  "for hire",
  "hire me",
  "i am a web developer",
  "i am available for hire",
  "i am a freelancer",
  "my portfolio",
  "check out my portfolio",
  "check my portfolio",
  "offering my services",
  "check out our agency",
  "why businesses need a website",
  "why you need a website",
  "top 10 website",
  "best website builders",
  "tutorial:",
  "how to build",
  "guide to building",
  "tips for website",
  "case study:",
  "web design agency offering",
  "we can build your",
  "boost your seo with",
];

/**
 * 3. Positive Client Demand Signals (REQUIRED)
 * Must indicate a client seeking someone to build a website/application.
 */
const CLIENT_DEMAND_SIGNALS = [
  "need",
  "looking for",
  "looking to hire",
  "hire",
  "hiring",
  "seeking",
  "wanted",
  "require",
  "redesign",
  "build",
  "develop",
  "create",
  "project",
  "contract",
  "freelance",
  "budget",
  "fixed price",
  "hourly",
  "gig",
  "rfp",
  "[hiring]",
];

export type FreelanceCategory =
  | "🌐 Website & Landing Page"
  | "💻 Web App & SaaS MVP"
  | "📱 Mobile App Development"
  | "🛍️ E-Commerce & Store";

export interface ClassifiedFreelanceLead {
  isValid: boolean;
  rejectReason?: string;
  category: FreelanceCategory;
  budget?: string;
  isUrgent: boolean;
  score: number;
}

/**
 * Parses budget mentions from text (e.g. $500 - $1,500 USD, ₹30,000, $40-$60/hr).
 */
export function extractBudgetFromText(text: string): string | undefined {
  if (!text) return undefined;

  // Hourly patterns
  const hourlyMatch = text.match(/\$\s*\d+(?:\.\d+)?\s*(?:-\s*\$?\s*\d+(?:\.\d+)?)?\s*\/\s*(?:hr|hour)/i) ||
                      text.match(/hourly\s*(?:rate)?\s*:\s*\$?\s*\d+(?:-\d+)?/i);
  if (hourlyMatch) return hourlyMatch[0].trim();

  // Fixed budget patterns (USD/EUR/GBP/INR)
  const budgetMatch = text.match(/budget\s*:\s*([^<\n\r,;.]+)/i) ||
                      text.match(/(?:\$|€|£|₹)\s*\d[\d,]*(?:\s*-\s*(?:\$|€|£|₹)?\s*\d[\d,]*)?/i);
  if (budgetMatch) {
    const raw = budgetMatch[0].trim();
    if (raw.length <= 35 && !raw.toLowerCase().includes("per year") && !raw.toLowerCase().includes("/yr")) {
      return raw;
    }
  }

  return undefined;
}

/**
 * Validates, filters, and classifies any raw post into a pure freelance development opportunity.
 */
export function classifyAndFilterFreelanceProject(
  title: string,
  description: string,
  nicheQuery?: string
): ClassifiedFreelanceLead {
  const fullText = `${title} ${description}`.toLowerCase();

  // 1. REJECT if contains full-time employee signals
  for (const signal of FULL_TIME_JOB_SIGNALS) {
    if (fullText.includes(signal)) {
      return { isValid: false, rejectReason: `Full-time job signal: "${signal}"`, category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
    }
  }

  // 2. REJECT if contains seller / advertisement / promotional signals
  for (const signal of SELLER_AND_AD_SIGNALS) {
    if (fullText.includes(signal)) {
      return { isValid: false, rejectReason: `Seller/Ad signal: "${signal}"`, category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
    }
  }

  // 3. REQUIRE client demand signal
  const hasClientDemand = CLIENT_DEMAND_SIGNALS.some((sig) => fullText.includes(sig));
  if (!hasClientDemand) {
    return { isValid: false, rejectReason: "Missing client demand signal", category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
  }

  // 4. Determine core domain category
  let category: FreelanceCategory = "🌐 Website & Landing Page";

  if (
    fullText.includes("mobile app") ||
    fullText.includes("ios app") ||
    fullText.includes("android app") ||
    fullText.includes("react native") ||
    fullText.includes("flutter") ||
    fullText.includes("swift") ||
    fullText.includes("kotlin")
  ) {
    category = "📱 Mobile App Development";
  } else if (
    fullText.includes("e-commerce") ||
    fullText.includes("ecommerce") ||
    fullText.includes("shopify") ||
    fullText.includes("woocommerce") ||
    fullText.includes("online store") ||
    fullText.includes("magento")
  ) {
    category = "🛍️ E-Commerce & Store";
  } else if (
    fullText.includes("web app") ||
    fullText.includes("webapp") ||
    fullText.includes("saas") ||
    fullText.includes("mvp") ||
    fullText.includes("dashboard") ||
    fullText.includes("portal") ||
    fullText.includes("fullstack") ||
    fullText.includes("full stack") ||
    fullText.includes("react") ||
    fullText.includes("nextjs") ||
    fullText.includes("vue") ||
    fullText.includes("node") ||
    fullText.includes("api integration") ||
    fullText.includes("booking system") ||
    fullText.includes("crm")
  ) {
    category = "💻 Web App & SaaS MVP";
  }

  // 5. Extract budget & urgency
  const budget = extractBudgetFromText(`${title} ${description}`);
  const isUrgent = fullText.includes("urgent") || fullText.includes("asap") || fullText.includes("immediate") || fullText.includes("within a week");
  const email = extractPrimaryEmail(`${title} ${description}`);

  // Calculate quality score (0 - 100)
  let score = 80;
  if (budget) score += 10;
  if (email) score += 10;
  if (isUrgent) score += 5;
  if (fullText.includes("[hiring]")) score += 5;

  return {
    isValid: true,
    category,
    budget,
    isUrgent,
    score: Math.min(100, score),
  };
}
