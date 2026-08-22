import { extractPrimaryEmail, extractEmailsFromText } from "./intentSources/contactExtractor";

// ─── LAYER 1: Full-Time Corporate Employee Job Blacklist ──────────────────────
const FULL_TIME_JOB_SIGNALS = [
  "full-time", "full time", "fulltime", "part-time", "part time",
  "401(k)", "401k", "health insurance", "dental insurance", "vision insurance",
  "paid time off", "pto", "annual salary", "salary:", "/year", "per annum",
  "per year", "w2", "w-2", "internship", "unpaid", "equity only", "equity-only",
  "relocation assistance", "on-site in office", "hybrid in office",
  "junior developer role", "staff software engineer", "principal engineer",
  "engineering manager", "vp of engineering", "chief technology officer",
  // HR / apply signals
  "apply now", "submit your resume", "send your cv", "send cv",
  "we are hiring", "join our team", "join us today", "open position",
  "job description", "about the role", "required qualifications",
  "minimum qualifications", "years of experience required", "benefits include",
  "competitive salary", "performance bonus", "health benefits",
  "stock options", "employer of record", "job type: full",
  "indeed.com", "glassdoor.com", "linkedin job",
];

// ─── LAYER 2: Non-Tech & Seller / Ad / Blog Blacklist ────────────────────────
const NON_TECH_AND_SELLER_SIGNALS = [
  // [For Hire] self-promotion
  "[for hire]", "[forhire]", "for hire", "hire me", "available for hire",
  "i am a web developer", "i am a freelancer", "i am available",
  "my portfolio", "check out my portfolio", "check my portfolio",
  "offering my services", "check out our agency", "our agency specializes",
  "we offer web services", "we provide development", "we can build your",
  "as seen in", "award-winning agency", "view our work",
  // Blog / tutorial / promo content
  "why businesses need a website", "why you need a website",
  "top 10 website", "best website builders", "tutorial:", "how to build",
  "guide to building", "tips for website", "case study:", "web design tips",
  "boost your seo with", "learn to code", "course:", "bootcamp", "certification",
  "how to make a website", "free template", "free theme",
  // Non-tech roles — most common polluters
  "geopolitics", "political researcher", "social media manager",
  "content manager", "content creator", "content writer", "copywriter",
  "ghostwriter", "translator", "proofreader", "proofreading",
  "data entry", "data collection", "virtual assistant", "customer support",
  "customer service", "sales representative", "sales rep", "account manager",
  "recruiter", "hr manager", "bookkeeper", "accountant",
  "photo editor", "video editor", "video producer", "video editing",
  "instagram manager", "pinterest", "tiktok creator", "tiktok", "youtube channel",
  "podcast", "influencer", "brand ambassador", "community manager",
  "manga", "comic", "anime", "game artist", "3d artist", "illustrator",
  "logo design only", "graphic designer only", "social media post",
  "email marketing only", "seo specialist only", "ppc specialist only",
  "amazon fba", "dropshipping", "affiliate marketing", "lead generation only",
  "cold calling", "telemarketing", "data analysis only", "excel", "powerpoint",
];

// ─── LAYER 3: Mandatory Tech/Dev Domain Keywords ──────────────────────────────
// At least ONE must appear in the post for it to qualify
export const DEV_DOMAIN_KEYWORDS = [
  // Frontend frameworks & libs
  "react", "vue", "angular", "svelte", "nextjs", "next.js", "nuxt", "astro",
  "remix", "gatsby", "stimulus", "alpine",
  // Backend frameworks
  "node", "nodejs", "express", "fastify", "nestjs",
  "python", "django", "flask", "fastapi",
  "php", "laravel", "symfony", "codeigniter",
  "ruby on rails", "rails", "java spring", "spring boot",
  ".net", "asp.net", "c#", "golang", "go lang",
  // Mobile
  "flutter", "react native", "ios app", "android app", "swift", "kotlin",
  "mobile app", "cross-platform app",
  // General web & product
  "frontend", "front-end", "backend", "back-end", "fullstack", "full stack",
  "full-stack", "website", "web app", "webapp", "landing page", "saas",
  "mvp", "dashboard", "portal", "web developer", "web designer",
  "ui developer", "ui/ux", "ux designer",
  // Platforms & CMS
  "shopify", "wordpress", "webflow", "wix", "squarespace custom",
  "woocommerce", "magento", "prestashop",
  // Data & APIs
  "api", "rest api", "graphql", "microservices", "database",
  "postgresql", "mysql", "mongodb", "firebase", "supabase",
  // Styling
  "typescript", "javascript", "html", "css", "tailwind", "bootstrap",
];

// ─── LAYER 4: High-Intent Client Demand Signals ───────────────────────────────
const CLIENT_DEMAND_SIGNALS = [
  "need", "looking for", "looking to hire", "hire", "hiring",
  "seeking", "wanted", "require", "redesign", "build", "develop",
  "create", "project", "contract", "freelance", "budget",
  "fixed price", "hourly", "gig", "rfp", "[hiring]",
  "help me build", "help us build", "we need a", "i need a",
  "can someone", "does anyone know", "recommend a developer",
];

// ─── Score boosters ───────────────────────────────────────────────────────────
const TECH_STACK_BOOSTERS = [
  "react", "vue", "angular", "next.js", "nextjs", "node", "python",
  "laravel", "flutter", "react native", "shopify", "wordpress", "saas", "mvp",
];

export type FreelanceCategory =
  | "🌐 Website & Landing Page"
  | "💻 Web App & SaaS MVP"
  | "📱 Mobile App Development"
  | "🛍️ E-Commerce & Store"
  | "⚙️ Backend & API Development";

export interface ClassifiedFreelanceLead {
  isValid: boolean;
  rejectReason?: string;
  category: FreelanceCategory;
  budget?: string;
  isUrgent: boolean;
  score: number;
}

/** Parses budget mentions from text (e.g. $500 - $1,500 USD, ₹30,000, $40-$60/hr). */
export function extractBudgetFromText(text: string): string | undefined {
  if (!text) return undefined;
  const hourlyMatch =
    text.match(/\$\s*\d+(?:\.\d+)?\s*(?:-\s*\$?\s*\d+(?:\.\d+)?)?\s*\/\s*(?:hr|hour)/i) ||
    text.match(/hourly\s*(?:rate)?\s*:\s*\$?\s*\d+(?:-\d+)?/i);
  if (hourlyMatch) return hourlyMatch[0].trim();

  const budgetMatch =
    text.match(/budget\s*:\s*([^<\n\r,;.]+)/i) ||
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
 * 4-Layer smart freelance project classifier.
 * Layer 1: Full-time corporate job signals → reject
 * Layer 2: Non-tech roles / seller ads / blogs → reject
 * Layer 3: Must contain at least one dev/tech keyword → reject if not
 * Layer 4: Must contain a client demand signal → reject if not
 * Then: categorize, score, and return.
 */
export function classifyAndFilterFreelanceProject(
  title: string,
  description: string,
  nicheQuery?: string
): ClassifiedFreelanceLead {
  const fullText = `${title} ${description}`.toLowerCase();

  // LAYER 1: Reject full-time / corporate employee signals
  for (const signal of FULL_TIME_JOB_SIGNALS) {
    if (fullText.includes(signal)) {
      return { isValid: false, rejectReason: `FT-job signal: "${signal}"`, category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
    }
  }

  // LAYER 2: Reject non-tech roles, seller ads, promotional content
  for (const signal of NON_TECH_AND_SELLER_SIGNALS) {
    if (fullText.includes(signal)) {
      return { isValid: false, rejectReason: `Non-tech/seller signal: "${signal}"`, category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
    }
  }

  // LAYER 3: Must contain at least one dev/tech domain keyword (hard gate)
  const hasTechMatch = DEV_DOMAIN_KEYWORDS.some((kw) => fullText.includes(kw));
  if (!hasTechMatch) {
    return { isValid: false, rejectReason: "No dev/tech domain keyword found", category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
  }

  // LAYER 4: Must show client demand (someone seeking a developer/project)
  const hasClientDemand = CLIENT_DEMAND_SIGNALS.some((sig) => fullText.includes(sig));
  if (!hasClientDemand) {
    return { isValid: false, rejectReason: "No client demand signal", category: "🌐 Website & Landing Page", isUrgent: false, score: 0 };
  }

  // ── Categorize ───────────────────────────────────────────────────────────
  let category: FreelanceCategory = "🌐 Website & Landing Page";

  if (
    fullText.includes("mobile app") || fullText.includes("ios app") ||
    fullText.includes("android app") || fullText.includes("react native") ||
    fullText.includes("flutter") || fullText.includes("swift") || fullText.includes("kotlin") ||
    fullText.includes("cross-platform app")
  ) {
    category = "📱 Mobile App Development";
  } else if (
    fullText.includes("e-commerce") || fullText.includes("ecommerce") ||
    fullText.includes("shopify") || fullText.includes("woocommerce") ||
    fullText.includes("online store") || fullText.includes("magento") ||
    fullText.includes("prestashop")
  ) {
    category = "🛍️ E-Commerce & Store";
  } else if (
    fullText.includes("api") || fullText.includes("backend") || fullText.includes("back-end") ||
    fullText.includes("microservice") || fullText.includes("database") ||
    fullText.includes("django") || fullText.includes("flask") || fullText.includes("fastapi") ||
    fullText.includes("laravel") || fullText.includes("express") || fullText.includes("nestjs") ||
    fullText.includes("spring boot") || fullText.includes("graphql")
  ) {
    category = "⚙️ Backend & API Development";
  } else if (
    fullText.includes("web app") || fullText.includes("webapp") ||
    fullText.includes("saas") || fullText.includes("mvp") ||
    fullText.includes("dashboard") || fullText.includes("portal") ||
    fullText.includes("fullstack") || fullText.includes("full stack") || fullText.includes("full-stack") ||
    fullText.includes("react") || fullText.includes("nextjs") || fullText.includes("next.js") ||
    fullText.includes("vue") || fullText.includes("angular") || fullText.includes("node") ||
    fullText.includes("booking system") || fullText.includes("crm")
  ) {
    category = "💻 Web App & SaaS MVP";
  }

  // ── Score ────────────────────────────────────────────────────────────────
  const budget = extractBudgetFromText(`${title} ${description}`);
  const isUrgent = fullText.includes("urgent") || fullText.includes("asap") || fullText.includes("immediately") || fullText.includes("within a week");
  const email = extractPrimaryEmail(`${title} ${description}`);

  let score = 70; // base
  if (budget) score += 20;
  if (email) score += 10;
  if (isUrgent) score += 10;
  // Tech stack boost
  const techBoostCount = TECH_STACK_BOOSTERS.filter((t) => fullText.includes(t)).length;
  score += Math.min(techBoostCount * 5, 15);
  if (fullText.includes("[hiring]")) score += 5;
  if (fullText.includes("remote")) score += 5;

  return {
    isValid: true,
    category,
    budget,
    isUrgent,
    score: Math.min(100, score),
  };
}
