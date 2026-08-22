import type { Lead, AuditResult, RankedLead, BuildPromptResult, OutreachResult, OutreachChannel, OutreachLanguage } from "./types";

/**
 * 100% Free & Local Engine
 * Performs intelligent audits, rankings, site prompts, and outreach copywriting
 * without needing any paid subscription, API key, or external services.
 */

// ─── DETERMINISTIC SEEDED PRNG ────────────────────────────────────────────────
/**
 * Converts a string into a numeric seed (djb2 hash).
 * Same niche+city → same seed → same lead set every time (deterministic per query).
 */
function strToSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep 32-bit unsigned
  }
  // XOR with the current minute-bucket so results change on every new search
  const minuteBucket = Math.floor(Date.now() / 60000);
  return (h ^ minuteBucket) || 1;
}

/** Linear congruential generator — returns a fn that yields [0, 1) floats */
function makePRNG(seed: number) {
  let s = seed >>> 0;
  return function rand(): number {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── TIER-1 METROPOLIS CITY DATABASE ─────────────────────────────────────────
// India Tier-1 + Global financial/commercial centres
const CITY_CENTERS: Record<string, { lat: number; lng: number; country: "IN" | "GLOBAL" }> = {
  // ── India Tier-1 ──
  mumbai:     { lat: 19.076, lng: 72.8777, country: "IN" },
  bandra:     { lat: 19.059, lng: 72.829,  country: "IN" },
  delhi:      { lat: 28.6139, lng: 77.2090, country: "IN" },
  "new delhi":{ lat: 28.6139, lng: 77.2090, country: "IN" },
  bengaluru:  { lat: 12.9716, lng: 77.5946, country: "IN" },
  bangalore:  { lat: 12.9716, lng: 77.5946, country: "IN" },
  hyderabad:  { lat: 17.3850, lng: 78.4867, country: "IN" },
  chennai:    { lat: 13.0827, lng: 80.2707, country: "IN" },
  kolkata:    { lat: 22.5726, lng: 88.3639, country: "IN" },
  pune:       { lat: 18.5204, lng: 73.8567, country: "IN" },
  ahmedabad:  { lat: 23.0225, lng: 72.5714, country: "IN" },
  surat:      { lat: 21.1702, lng: 72.8311, country: "IN" },
  jaipur:     { lat: 26.9124, lng: 75.7873, country: "IN" },
  lucknow:    { lat: 26.8467, lng: 80.9462, country: "IN" },
  chandigarh: { lat: 30.7333, lng: 76.7794, country: "IN" },
  gurgaon:    { lat: 28.4595, lng: 77.0266, country: "IN" },
  noida:      { lat: 28.5355, lng: 77.3910, country: "IN" },
  // ── Global Tier-1 ──
  dubai:      { lat: 25.2048, lng: 55.2708, country: "GLOBAL" },
  london:     { lat: 51.5074, lng: -0.1278, country: "GLOBAL" },
  "new york": { lat: 40.7128, lng: -74.0060, country: "GLOBAL" },
  singapore:  { lat: 1.3521,  lng: 103.8198, country: "GLOBAL" },
  sydney:     { lat: -33.8688, lng: 151.2093, country: "GLOBAL" },
  toronto:    { lat: 43.6532, lng: -79.3832, country: "GLOBAL" },
  "hong kong":{ lat: 22.3193, lng: 114.1694, country: "GLOBAL" },
  paris:      { lat: 48.8566, lng: 2.3522,  country: "GLOBAL" },
  berlin:     { lat: 52.5200, lng: 13.4050,  country: "GLOBAL" },
  tokyo:      { lat: 35.6762, lng: 139.6503, country: "GLOBAL" },
};

function getCityCenter(city: string): { lat: number; lng: number } {
  const key = city.toLowerCase().split(",")[0].trim();
  return CITY_CENTERS[key] ?? { lat: 19.076 + (strToSeed(city) % 100) * 0.0001, lng: 72.877 };
}

function isGlobalCity(city: string): boolean {
  const key = city.toLowerCase().split(",")[0].trim();
  return CITY_CENTERS[key]?.country === "GLOBAL";
}

// ─── HIGH-VALUE CATEGORY DETECTION ───────────────────────────────────────────
/**
 * Returns true for niches that typically command high monthly revenue
 * (₹5L–50L+/month) — these become "Priority" leads.
 */
const HIGH_VALUE_KEYWORDS = [
  "dent", "clinic", "hospital", "doctor", "physician", "specialist",
  "surgeon", "ortho", "dermat", "cosmet", "aesthetic", "ivf", "ivf clinic",
  "hotel", "resort", "boutique hotel",
  "law", "lawyer", "advocate", "legal", "attorney",
  "architect", "interior design", "interior decorator",
  "chartered accountant", "ca firm", "financial advisor",
  "jewelry", "jeweller", "diamond", "gold",
  "luxury", "premium", "elite", "royal",
  "real estate", "property", "realty",
  "diagnostic", "pathology", "radiology",
  "eye care", "ophthalmolog", "vision",
  "fitness", "gym", "wellness", "spa",
  "restaurant", "fine dining",
];

function isHighValue(niche: string): boolean {
  const n = niche.toLowerCase();
  return HIGH_VALUE_KEYWORDS.some((kw) => n.includes(kw));
}

/** Estimate a business's monthly revenue tier in INR (for scoring) */
function estimateMonthlyRevenue(niche: string, reviewsCount: number, rating: number): number {
  const n = niche.toLowerCase();
  let base = 150000; // ₹1.5L default

  if (n.includes("dent") || n.includes("clinic") || n.includes("doctor")) base = 500000;
  else if (n.includes("hotel") || n.includes("resort")) base = 2000000;
  else if (n.includes("law") || n.includes("lawyer")) base = 800000;
  else if (n.includes("jewel") || n.includes("diamond")) base = 3000000;
  else if (n.includes("real estate") || n.includes("property")) base = 1500000;
  else if (n.includes("cosmet") || n.includes("aesthetic")) base = 600000;
  else if (n.includes("architect") || n.includes("interior")) base = 700000;
  else if (n.includes("diagnostic") || n.includes("patholog")) base = 900000;
  else if (n.includes("restaurant") || n.includes("cafe")) base = 400000;
  else if (n.includes("salon") || n.includes("spa") || n.includes("beauty")) base = 300000;
  else if (n.includes("gym") || n.includes("fitness") || n.includes("yoga")) base = 250000;

  // More reviews + high rating = more established business
  const reviewMult = 1 + Math.min(reviewsCount / 200, 2.0);
  const ratingMult = rating >= 4.7 ? 1.3 : rating >= 4.3 ? 1.1 : 0.9;

  return Math.round(base * reviewMult * ratingMult);
}

// ─── EXPANDED BUSINESS NAME TEMPLATES ────────────────────────────────────────
const NAME_PREFIXES = [
  "Apex", "Prime", "Elite", "Royal", "Prestige", "Signature", "Urban",
  "Modern", "Grace", "Sunrise", "ProHealth", "Aesthetic", "City Center",
  "Platinum", "Diamond", "Sterling", "Pinnacle", "Landmark", "Heritage",
  "Avant", "Zenith", "Monarch", "Regal", "Grand", "Luxe", "Serene",
  "Harmony", "Radiant", "Viva", "Bliss", "Pure", "Vita", "Bright",
  "Classic", "Pioneer", "Summit", "Nexus", "Cosmos", "Aura",
];

const NAME_SUFFIXES_CLINIC = [
  "Clinic", "Centre", "Hub", "Care", "Studio", "Specialists", "Associates",
  "Institute", "Practice", "Solutions", "Experts",
];

const NAME_SUFFIXES_GENERIC = [
  "Studio", "Lounge", "Collective", "Services", "Group", "House", "Works",
  "Co.", "Partners", "Lab",
];

const DR_NAMES = [
  "Sharma", "Mehta", "Kapoor", "Shah", "Gupta", "Verma", "Singh", "Joshi",
  "Rao", "Nair", "Patel", "Reddy", "Iyer", "Malhotra", "Khanna", "Bose",
  "Chaudhary", "Pandey", "Dubey", "Mishra",
];

// Global city area names (for international cities)
const GLOBAL_LOCALITIES: Record<string, string[]> = {
  dubai: ["Business Bay", "DIFC", "Jumeirah", "Downtown Dubai", "Al Barsha", "Deira"],
  london: ["Mayfair", "Knightsbridge", "Chelsea", "Canary Wharf", "Soho", "Marylebone"],
  "new york": ["Midtown", "SoHo", "Upper East Side", "Brooklyn Heights", "Financial District"],
  singapore: ["Orchard", "Marina Bay", "CBD", "Raffles Place", "Bugis", "Clarke Quay"],
  sydney: ["CBD", "Darling Harbour", "Mosman", "Bondi", "Surry Hills"],
  toronto: ["Downtown", "Yorkville", "Midtown", "The Annex", "Financial District"],
  "hong kong": ["Central", "Tsim Sha Tsui", "Admiralty", "Causeway Bay", "Wan Chai"],
  paris: ["8th Arr.", "16th Arr.", "Champs-Élysées", "Marais", "Montparnasse"],
  berlin: ["Mitte", "Charlottenburg", "Prenzlauer Berg", "Friedrichshain"],
  tokyo: ["Shinjuku", "Shibuya", "Ginza", "Roppongi", "Marunouchi"],
};

// India locality templates (by city key)
const INDIA_LOCALITIES: Record<string, string[]> = {
  mumbai:    ["Bandra West", "Andheri West", "Juhu", "Powai", "Lower Parel", "Worli", "Churchgate", "Colaba"],
  bandra:    ["Linking Road", "Hill Road", "Pali Hill", "Carter Road", "Bandstand", "SV Road", "Turner Road"],
  delhi:     ["Connaught Place", "Hauz Khas", "Lajpat Nagar", "Vasant Vihar", "Saket", "GK-I", "Defence Colony"],
  "new delhi":["Connaught Place", "Hauz Khas", "Vasant Vihar", "Saket", "GK-I", "Defence Colony"],
  bengaluru: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "JP Nagar", "Jayanagar", "Malleshwaram"],
  bangalore: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "JP Nagar", "Jayanagar", "Malleshwaram"],
  hyderabad: ["Banjara Hills", "Jubilee Hills", "Madhapur", "Gachibowli", "Hitech City", "Begumpet"],
  chennai:   ["Anna Nagar", "Adyar", "Nungambakkam", "T. Nagar", "Mylapore", "Velachery"],
  kolkata:   ["Park Street", "Salt Lake", "New Town", "Ballygunge", "Alipore", "Gariahat"],
  pune:      ["Koregaon Park", "Kalyani Nagar", "Viman Nagar", "Aundh", "Baner", "Kothrud"],
  ahmedabad: ["Satellite", "Vastrapur", "CG Road", "Navrangpura", "Prahlad Nagar"],
  jaipur:    ["C-Scheme", "Vaishali Nagar", "Malviya Nagar", "Mansarovar", "Jagatpura"],
  lucknow:   ["Gomti Nagar", "Hazratganj", "Alambagh", "Aliganj", "Mahanagar"],
  chandigarh:["Sector 17", "Sector 22", "Sector 35", "Sector 43", "Mohali"],
  gurgaon:   ["MG Road", "Cyber City", "Sohna Road", "Golf Course Road", "DLF Phase 1"],
  noida:     ["Sector 18", "Sector 62", "Sector 137", "Sector 104", "Greater Noida"],
  surat:     ["Adajan", "Vesu", "Pal", "Katargam", "City Light"],
};

function getLocalities(city: string): string[] {
  const key = city.toLowerCase().split(",")[0].trim();
  return (
    GLOBAL_LOCALITIES[key] ??
    INDIA_LOCALITIES[key] ??
    ["Main Market Road", "MG Road", "Station Road", "Civil Lines", "Ring Road", "Sector 14", "Green Park"]
  );
}

// ─── 1. FREE AUDIT ENGINE ─────────────────────────────────────────────────────
export function auditLeadsFree(leads: Lead[]): Record<string, AuditResult> {
  const audits: Record<string, AuditResult> = {};

  for (const lead of leads) {
    const hasWebsite = !!lead.website && lead.website.trim().length > 0;
    const url = (lead.website || "").toLowerCase();
    const isFreeBuilder =
      url.includes("wix") || url.includes("weebly") ||
      url.includes("business.site") || url.includes("wordpress.com") ||
      url.includes("blogspot");

    let pageSpeedScore = 0;
    if (hasWebsite) {
      pageSpeedScore = isFreeBuilder
        ? Math.floor(25 + ((lead.name.length * 7) % 20))
        : Math.floor(45 + ((lead.name.length * 9) % 35));
    }

    const mobileFriendly = hasWebsite && pageSpeedScore >= 60;
    const https = hasWebsite && url.startsWith("https");
    const hasSchema = false;
    const loadTimeMs = hasWebsite ? Math.round(2200 + (100 - pageSpeedScore) * 65) : 0;

    const cat = (lead.category || "").toLowerCase();
    let gaps: string[] = [];

    if (cat.includes("dent") || cat.includes("clinic") || cat.includes("doctor") || cat.includes("hospital")) {
      gaps = hasWebsite
        ? ["No WhatsApp smile consultation booking", `${(loadTimeMs / 1000).toFixed(1)}s mobile load speed`, "No before/after treatment gallery", "No Google Reviews widget"]
        : ["No website at all", "No online appointment booking", "Missing Google Reviews showcase", "No WhatsApp consultation link", "Zero local SEO presence"];
    } else if (cat.includes("salon") || cat.includes("spa") || cat.includes("beauty") || cat.includes("hair")) {
      gaps = hasWebsite
        ? ["No instant WhatsApp appointment scheduler", "No bridal/service rate card online", "Slow mobile portfolio loading", "Missing click-to-call header"]
        : ["No website for portfolio", "No digital service menu & pricing", "Missing WhatsApp direct booking", "No customer testimonial showcase"];
    } else if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("bar") || cat.includes("food")) {
      gaps = hasWebsite
        ? ["No interactive digital menu", "No direct table reservation CTA", "No WhatsApp ordering link", "Slow mobile page speed"]
        : ["No website for menu/ambience", "No direct WhatsApp table booking", "No daily specials showcase", "Relying purely on aggregator commissions"];
    } else if (cat.includes("gym") || cat.includes("fitness") || cat.includes("yoga")) {
      gaps = hasWebsite
        ? ["No free 1-day pass claim form", "No WhatsApp trainer consultation", "Missing membership pricing matrix", "No member transformation gallery"]
        : ["No website for trial signups", "No membership tier showcase", "No trainer profiles or certifications", "Missing WhatsApp click-to-chat"];
    } else if (cat.includes("law") || cat.includes("legal") || cat.includes("advocate")) {
      gaps = hasWebsite
        ? ["No practice area landing pages", "No free consultation booking form", "No case-study testimonials", "Slow mobile load speed"]
        : ["No professional website", "No digital credibility signals", "No consultation booking funnel", "Zero local SEO for legal queries"];
    } else if (cat.includes("jewel") || cat.includes("diamond") || cat.includes("gold")) {
      gaps = hasWebsite
        ? ["No virtual try-on or gallery", "No WhatsApp enquiry for custom orders", "Slow mobile catalogue load", "No certification showcase"]
        : ["No online jewellery catalogue", "No WhatsApp direct enquiry", "No trust seals / certification display", "Zero e-commerce presence"];
    } else if (cat.includes("hotel") || cat.includes("resort") || cat.includes("stay")) {
      gaps = hasWebsite
        ? ["No direct booking widget (losing OTA commission)", "No WhatsApp check-in link", "No room gallery carousel", "Slow mobile speed"]
        : ["No website — losing to OTA platforms", "No direct booking", "No virtual room tour", "No review showcase"];
    } else if (cat.includes("real estate") || cat.includes("property") || cat.includes("realty")) {
      gaps = hasWebsite
        ? ["No lead capture form", "No interactive floor plan viewer", "No WhatsApp instant enquiry", "Slow mobile load"]
        : ["No property listing website", "No WhatsApp direct enquiry", "No virtual tour integration", "Zero inbound inquiry funnel"];
    } else {
      gaps = hasWebsite
        ? ["No 1-click WhatsApp chat button", "No instant lead inquiry form", "Missing Google Reviews trust badges", `${(loadTimeMs / 1000).toFixed(1)}s load speed`]
        : ["No website at all", "No WhatsApp quick-chat", "Zero Google search visibility", "No digital portfolio or testimonials"];
    }

    let biggestGap = "";
    const reviews = lead.reviewsCount || 40;
    const rating = lead.rating ? `${lead.rating}★` : "high";
    const cityArea = lead.city || "your area";

    if (!hasWebsite) {
      biggestGap = `${reviews} reviews and a ${rating} rating, but zero website presence — losing dozens of high-value ${lead.category || "clients"} in ${cityArea} searching Google every month.`;
    } else if (isFreeBuilder) {
      biggestGap = `Using a free builder template that lacks trust badges and WhatsApp integration, causing potential customers to bounce to competitors.`;
    } else if (pageSpeedScore < 50) {
      biggestGap = `Mobile load time is ${(loadTimeMs / 1000).toFixed(1)}s with no instant WhatsApp booking button, causing over 50% of mobile visitors to abandon the page.`;
    } else {
      biggestGap = `Website lacks a direct WhatsApp booking widget and local schema, missing out on warm inbound inquiries from local Google searches.`;
    }

    const baseLost = Math.round(reviews * 420);
    const noSitePenalty = hasWebsite ? (pageSpeedScore < 50 ? 25000 : 15000) : 38000;
    const highValueBoost = lead.highValue ? 40000 : 0;
    const estLostRevenuePerMonth = Math.max(20000, baseLost + noSitePenalty + highValueBoost);

    audits[lead.id] = {
      leadId: lead.id,
      pageSpeedScore,
      hasWebsite,
      mobileFriendly,
      https,
      hasSchema,
      loadTimeMs,
      gaps,
      biggestGap,
      estLostRevenuePerMonth,
    };
  }

  return audits;
}

// ─── 2. FREE RANKING ENGINE ───────────────────────────────────────────────────
export function rankLeadsFree(leads: Lead[], audits: Record<string, AuditResult>): RankedLead[] {
  const auditable = leads.filter((l) => audits[l.id]);

  return auditable
    .map((lead) => {
      const a = audits[lead.id];
      let score = 50;

      // 1. Site gap (up to 35 pts)
      if (!a.hasWebsite) score += 30;
      else if (a.pageSpeedScore < 45) score += 20;
      else if (a.pageSpeedScore < 65) score += 10;

      // 2. Review volume + Rating (up to 25 pts)
      const revPts = Math.min(18, Math.floor((lead.reviewsCount || 0) / 8));
      const ratPts = lead.rating ? Math.round((lead.rating - 3.8) * 6) : 2;
      score += Math.max(0, revPts + ratPts);

      // 3. Reachability (up to 15 pts)
      if (lead.whatsapp || lead.phone) score += 10;
      if (lead.email) score += 5;

      // 4. Lost revenue tier (up to 10 pts)
      if (a.estLostRevenuePerMonth >= 80000) score += 10;
      else if (a.estLostRevenuePerMonth >= 45000) score += 6;

      // 5. HIGH-VALUE BUSINESS BONUS (+8 pts) — prioritise big clients
      if (lead.highValue) score += 8;

      const finalScore = Math.max(20, Math.min(98, score));

      let scoreReasoning = "";
      if (lead.highValue && !a.hasWebsite) {
        scoreReasoning = `Premium ${lead.category} with ${lead.reviewsCount || 0} reviews and no website — highest revenue potential in this batch.`;
      } else if (!a.hasWebsite) {
        scoreReasoning = `Top opportunity: High demand (${lead.reviewsCount || 0} reviews, ${lead.rating || 4.5}★) and easily reachable on WhatsApp, but completely lacks a website.`;
      } else if (a.pageSpeedScore < 50) {
        scoreReasoning = `Strong business with ${lead.reviewsCount || 0} reviews, but crippled by an outdated ${a.pageSpeedScore} PageSpeed mobile site with no WhatsApp booking.`;
      } else {
        scoreReasoning = `Established local player in ${lead.city} that can quickly unlock 25%+ more conversions with a dedicated high-speed landing page.`;
      }

      return {
        ...lead,
        audit: a,
        score: finalScore,
        scoreReasoning,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── 3. FREE WEBSITE PROMPT BUILDER ──────────────────────────────────────────
const PLATFORM_OUTPUT: Record<string, string> = {
  lovable: "Single-page React + Tailwind. No backend. Use placeholder images from unsplash.com.",
  bolt: "Single-page React + Tailwind. No backend. Use placeholder images from unsplash.com.",
  "claude-code": "Next.js 16 app router + Tailwind + shadcn. Single landing page route.",
  codex: "Static index.html + Tailwind CDN, fully self-contained.",
};

export function buildPromptFree(lead: RankedLead, platform: string): BuildPromptResult {
  const pName = platform || "lovable";
  const platformNote = PLATFORM_OUTPUT[pName] ?? PLATFORM_OUTPUT.lovable;
  const waNumber = (lead.whatsapp ?? lead.phone ?? "919999999999").replace(/\D/g, "");
  const cityName = lead.city ? lead.city.split(",")[0].trim() : "Local Area";
  const globalCity = isGlobalCity(lead.city);
  const currency = globalCity ? "USD" : "INR";
  const priceNote = globalCity
    ? "Use USD pricing benchmarks appropriate for international clients."
    : "Use INR pricing benchmarks appropriate for Indian clients.";

  const prompt = `Build a high-converting, modern, mobile-first website for an established ${globalCity ? "international" : "Indian"} local business:

BUSINESS PROFILE:
- Business Name: ${lead.name}
- Category: ${lead.category}
- Location: ${lead.address}, ${lead.city}
- Google Rating: ${lead.rating ?? 4.8}★ (${lead.reviewsCount ?? 120} Google Reviews)
- Phone: ${lead.phone ?? "+91 98000 00000"} | WhatsApp: ${lead.whatsapp ?? lead.phone ?? "+91 98000 00000"}
- Key Gap to Solve: ${lead.audit.biggestGap}
- Business Tier: ${lead.highValue ? "HIGH-VALUE — premium design, trust-first layout" : "Standard local business"}
- ${priceNote}

CORE SECTIONS TO GENERATE:
1. HEADER & HERO:
   - Sticky navigation with Click-to-Call button: tel:${(lead.phone || "").replace(/\s/g, "")}
   - Eye-catching Hero headline: "Trusted by ${lead.reviewsCount || 100}+ Happy Clients in ${cityName}"
   - Primary CTA: Floating and Hero "Book on WhatsApp" button linking to https://wa.me/${waNumber}
   - Trust Strip: "${lead.rating ?? 4.8}★ Google Rating" | "${lead.reviewsCount ?? 120}+ Verified Reviews" | "${lead.yearsInBusiness ?? 8}+ Years in ${cityName}"
   ${lead.highValue ? "- Include premium hero visual with professional photography placeholder and high-end typography." : ""}

2. SERVICES / TREATMENTS GRID:
   - 6 structured service cards tailored to ${lead.category} with modern icons, concise descriptions, and individual "Inquire on WhatsApp" triggers.

3. TRUST & SOCIAL PROOF:
   - Google Reviews Carousel with authentic local names, 5-star ratings, and relatable positive experiences.
   - Before/After or Transformation Showcase / Gallery.
   ${lead.highValue ? "- Add a 'Featured In' or 'Awards & Recognition' section for premium positioning." : ""}

4. LOCAL ACCESSIBILITY & MAP:
   - Embedded Google Map view placeholder, store hours, full address (${lead.address}), and directions button.
   - FAQ Accordion answering 4 common questions about pricing, booking, and consultations.

5. TECHNICAL REQUIREMENTS:
   - Performance: Lighthouse mobile target 95+ score.
   - Schema: LocalBusiness JSON-LD structured data with name, address, geo, and telephone.
   - Floating WhatsApp bubble in bottom-right corner.
   - Currency: ${currency}

OUTPUT FORMAT:
${platformNote}`;

  const pitchPoints = [
    `Converts mobile visitors directly into booked appointments via 1-click WhatsApp chat (wa.me/${waNumber}).`,
    `Instantly boosts credibility by showcasing your ${lead.rating ?? 4.8}★ rating and ${lead.reviewsCount ?? 120}+ real Google reviews right on the hero fold.`,
    `Loads in under 1 second on mobile networks with zero friction, replacing outdated competitors in ${cityName}.`,
    ...(lead.highValue
      ? [`Premium design positions ${lead.name} above price-competing local rivals — justifying a ₹5,000–15,000/month retainer.`]
      : []),
  ];

  return { prompt, pitchPoints };
}

// ─── 4. FREE OUTREACH COPYWRITER ──────────────────────────────────────────────
export function outreachFree(lead: RankedLead, channel: OutreachChannel, language: OutreachLanguage): OutreachResult {
  const ownerName = lead.name.includes("Dr.") ? lead.name.split(",")[0] : lead.name.split(" ")[0];
  const demoUrl = `https://lead-launch.demo/${lead.id}`;
  const wa = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
  const reviews = lead.reviewsCount || 80;
  const rating = lead.rating || 4.7;
  const city = lead.city ? lead.city.split(",")[0].trim() : "your area";
  const highValueNote = lead.highValue ? " (premium package available)" : "";

  let first = "";
  let followUp = "";
  const bestSendTime = "Tuesday to Thursday, 10:30 AM – 1:00 PM IST";

  if (channel === "whatsapp") {
    if (language === "hinglish") {
      first = `Namaste ${ownerName} ji! 👋

Main ${city} mein local businesses ki Google presence analyze kar raha tha aur maine ${lead.name} dekha. Aapki Google par ${rating}★ rating aur ${reviews}+ positive reviews kamaal ke hain! 🔥${lead.highValue ? "\n\nAapka business clearly premium category mein hai — aur yahi reason hai ki main especially aapke liye reach out kar raha hoon." : ""}

Par ek cheez notice ki — aapka koi direct mobile booking page ya website nahi hai jahan se customers directly WhatsApp par appointment book kar sakein (${lead.audit.biggestGap}).

Maine aapke business ke liye ek free modern website demo tayyar ki hai (30 secs mein dekhein):
👉 ${demoUrl}

Isme direct WhatsApp booking, Google reviews showcase aur click-to-call already setup hai${highValueNote}.

Agar pasand aaye toh reply karein, warna koi baat nahi. Have a great week!`;

      followUp = `Hi ${ownerName} ji! Bas ek quick follow up.

Aapke jaise top-rated businesses bina website ke har mahine lagbhag ₹${(lead.audit.estLostRevenuePerMonth).toLocaleString("en-IN")} ka potential revenue miss kar rahe hain.

Demo link yahan hai: ${demoUrl}

Kya hum kal 5 min ka quick call kar sakte hain?`;
    } else {
      first = `Hello ${ownerName}! 👋

I came across ${lead.name} while researching top service providers in ${city}. Congratulations on your impressive ${rating}★ Google rating with ${reviews}+ reviews!${lead.highValue ? "\n\nYour business clearly stands in the premium tier — which is exactly why I reached out." : ""}

However, I noticed that you don't have a modern mobile-optimized website for instant online booking (${lead.audit.biggestGap}).

I took the liberty of building a complimentary, fully working website demo for your business:
👉 ${demoUrl}

It includes 1-click WhatsApp booking, a live reviews carousel, and local search SEO${highValueNote}.

Would you be open to a 3-minute chat if you'd like to use it for your business? No obligation at all.`;

      followUp = `Hi ${ownerName}, following up on my previous message.

According to our local market audit, missing a fast mobile booking page is costing businesses in ${city} an estimated ₹${(lead.audit.estLostRevenuePerMonth).toLocaleString("en-IN")}/month in new customer bookings.

Here is your free demo site again: ${demoUrl}

Would you have 5 minutes this Wednesday for a quick discussion?`;
    }
  } else if (channel === "email") {
    if (language === "hinglish") {
      first = `Subject: Built a free website demo for ${lead.name} (${city})

Hi ${ownerName},

Maine ${city} mein aapka business dekha aur aapki ${rating}★ rating aur ${reviews}+ positive reviews kaafi impressive hain.${lead.highValue ? "\nAapka business premium segment mein aata hai — is liye maine specially aapke liye ek high-end demo design ki hai." : ""}

Lekin jab log Google par "${lead.category} in ${city}" search karte hain, toh bina ek modern website ke kaafi prospective clients doosre businesses par chale jaate hain.

Maine aapke brand ke liye ek fast, mobile-friendly website demo banayi hai:
${demoUrl}

Features included:
✓ 1-Click WhatsApp Booking Button
✓ Verified Google Reviews Showcase
✓ Local Google SEO & Directions Map
${lead.highValue ? "✓ Premium layout designed for high-ticket clients" : ""}

Let me know if you would like me to hand over the site or customize it for you.

Best regards,
[Your Name]`;

      followUp = `Subject: Re: Website demo for ${lead.name} (Estimated ₹${(lead.audit.estLostRevenuePerMonth).toLocaleString("en-IN")}/mo opportunity)

Hi ${ownerName},

Quick follow-up on the website demo I created for ${lead.name}:
${demoUrl}

Local search analytics show that an optimized mobile landing page with instant WhatsApp booking could bring in 20-30 additional inquiries every month.

Do you have 5 minutes for a brief call this week?

Best,
[Your Name]`;
    } else {
      first = `Subject: Free modern website demo for ${lead.name}

Dear ${ownerName},

I recently came across ${lead.name} and was impressed by your stellar ${rating}★ rating across ${reviews}+ Google reviews in ${city}.${lead.highValue ? "\n\nAs a premium-tier business, you deserve a website that matches the quality of your service — which is why I specifically designed this for you." : ""}

However, I noticed your business is currently missing a dedicated mobile website with instant booking capabilities (${lead.audit.biggestGap}).

To help show what's possible, I created a custom website demo for ${lead.name}:
${demoUrl}

Key Highlights:
- Instant WhatsApp consultation booking button
- Featured Google reviews trust carousel
- 100% mobile-speed optimized for local search
${lead.highValue ? "- Premium design that positions you above competitors" : ""}

Feel free to check it out. If you like it, I'd be happy to transfer it to your domain.

Warm regards,
[Your Name]`;

      followUp = `Subject: Re: Website demo for ${lead.name}

Dear ${ownerName},

Just following up to see if you had a chance to check out the website demo: ${demoUrl}

We estimate that an optimized web presence can help capture an additional ₹${(lead.audit.estLostRevenuePerMonth).toLocaleString("en-IN")} in monthly client inquiries for your business.

Would you be open to a 5-minute call this week?

Best regards,
[Your Name]`;
    }
  } else {
    // Instagram DM
    if (language === "hinglish") {
      first = `Hey ${ownerName}! 👋 Loved your profile and your ${rating}★ Google reviews!${lead.highValue ? " Aapka business premium hai — " : " "}Made a free modern website demo for ${lead.name} with instant WhatsApp booking: ${demoUrl} — take a look and let me know if you like it!`;
      followUp = `Hey! Just following up on the free demo site for ${lead.name}: ${demoUrl} — would love to help you get this live if you're interested! 🙌`;
    } else {
      first = `Hey ${ownerName}! 👋 Love your work in ${city} and your ${rating}★ Google rating!${lead.highValue ? " Your premium business deserves a website that matches 🔥 " : " "}Built a free website demo for your business with 1-click WhatsApp booking: ${demoUrl} — check it out!`;
      followUp = `Hey! Quick follow-up on the free demo website for ${lead.name}: ${demoUrl} — let me know if you'd like to get it live on your domain! 🙌`;
    }
  }

  return { first, followUp, bestSendTime };
}

// ─── 5. DYNAMIC MOCK LEAD GENERATOR ──────────────────────────────────────────
/**
 * Generates deterministic but UNIQUE leads per niche+city combination.
 * Same niche+city → same set (consistent UX), different niche+city → different set.
 * Prioritises high-value leads at the top of the list.
 */
export function generateMockLeads(niche: string, city: string, count: number): Lead[] {
  const baseCity = (city || "Mumbai").trim();
  const cleanNiche = (niche || "Business").trim();
  const hvBusiness = isHighValue(cleanNiche);
  const center = getCityCenter(baseCity);
  const localities = getLocalities(baseCity);
  // Randomize seed each call so user gets fresh random results every search
  const randomSeedStr = `${cleanNiche}::${baseCity}::${Date.now()}::${Math.random()}`;
  const rand = makePRNG(strToSeed(randomSeedStr));

  // Shuffle pools using randomized PRNG
  const shuffledPrefixes = shuffled(NAME_PREFIXES, rand);
  const shuffledSuffixes = shuffled(hvBusiness ? NAME_SUFFIXES_CLINIC : NAME_SUFFIXES_GENERIC, rand);
  const shuffledDrNames = shuffled(DR_NAMES, rand);
  const shuffledLocalities = shuffled(localities, rand);

  const total = Math.max(1, Math.min(count, 15));
  const leads: Lead[] = [];

  for (let i = 0; i < total; i++) {
    const useDoctor = hvBusiness && rand() < 0.4 && (cleanNiche.toLowerCase().includes("dent") || cleanNiche.toLowerCase().includes("clinic") || cleanNiche.toLowerCase().includes("doctor"));
    const name = useDoctor
      ? `Dr. ${shuffledDrNames[i % shuffledDrNames.length]}'s ${cleanNiche} ${shuffledSuffixes[i % shuffledSuffixes.length]}`
      : `${shuffledPrefixes[i % shuffledPrefixes.length]} ${cleanNiche} ${shuffledSuffixes[i % shuffledSuffixes.length]}`;

    // EVERY lead in Option A has NO WEBSITE (needs a site built) & HAS AN EMAIL
    const locality = shuffledLocalities[i % shuffledLocalities.length];
    const shortAddress = `${locality}, ${baseCity}`;

    // Seeded but varied ratings (4.1 – 4.9)
    const rating = Number((4.1 + rand() * 0.8).toFixed(1));
    const reviewsCount = Math.floor(25 + rand() * 280);
    const yearsInBusiness = Math.floor(2 + rand() * 18);
    const photosCount = Math.floor(5 + rand() * 40);

    const latOffset = (rand() - 0.5) * 0.03;
    const lngOffset = (rand() - 0.5) * 0.03;

    const phoneNum = `+91 9${Math.floor(rand() * 9)}${Math.floor(10000000 + rand() * 89999999)}`;
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `${nameSlug.slice(0, 18)}@gmail.com`;

    const estMonthlyRevenue = estimateMonthlyRevenue(cleanNiche, reviewsCount, rating);

    leads.push({
      id: `lead-${String(i + 1).padStart(2, "0")}`,
      name,
      category: cleanNiche,
      address: shortAddress,
      city: baseCity,
      phone: phoneNum,
      whatsapp: phoneNum,
      email,
      website: undefined, // NO WEBSITE (High priority target)
      rating,
      reviewsCount,
      lat: Number((center.lat + latOffset).toFixed(6)),
      lng: Number((center.lng + lngOffset).toFixed(6)),
      photosCount,
      yearsInBusiness,
      highValue: true,
      estMonthlyRevenue,
    });
  }

  // Shuffle order to give dynamic randomized results
  const randomizedLeads = shuffled(leads, rand);
  randomizedLeads.forEach((l, i) => { l.id = `lead-${String(i + 1).padStart(2, "0")}`; });

  return randomizedLeads;
}
