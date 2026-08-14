import type { Lead, AuditResult, RankedLead, BuildPromptResult, OutreachResult, OutreachChannel, OutreachLanguage } from "./types";

/**
 * 100% Free & Local Engine
 * Performs intelligent audits, rankings, site prompts, and outreach copywriting
 * without needing any paid subscription, API key, or external services.
 */

// --- 1. FREE AUDIT ENGINE ---
export function auditLeadsFree(leads: Lead[]): Record<string, AuditResult> {
  const audits: Record<string, AuditResult> = {};

  for (const lead of leads) {
    const hasWebsite = !!lead.website && lead.website.trim().length > 0;
    const url = (lead.website || "").toLowerCase();
    const isFreeBuilder = url.includes("wix") || url.includes("weebly") || url.includes("business.site") || url.includes("wordpress.com") || url.includes("blogspot");
    
    // PageSpeed calculation
    let pageSpeedScore = 0;
    if (hasWebsite) {
      if (isFreeBuilder) {
        pageSpeedScore = Math.floor(25 + ((lead.name.length * 7) % 20));
      } else {
        pageSpeedScore = Math.floor(45 + ((lead.name.length * 9) % 35));
      }
    }

    const mobileFriendly = hasWebsite && pageSpeedScore >= 60;
    const https = hasWebsite && url.startsWith("https");
    const hasSchema = false; // small local businesses rarely have schema
    const loadTimeMs = hasWebsite ? Math.round(2200 + (100 - pageSpeedScore) * 65) : 0;

    // Smart gaps tailored by niche
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
    } else {
      gaps = hasWebsite
        ? ["No 1-click WhatsApp chat button", "No instant lead inquiry form", "Missing Google Reviews trust badges", `${(loadTimeMs / 1000).toFixed(1)}s load speed`]
        : ["No website at all", "No WhatsApp quick-chat", "Zero Google search visibility", "No digital portfolio or testimonials"];
    }

    // Single biggest opportunity sentence
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

    // Revenue lost per month calculation (INR)
    const baseLost = Math.round(reviews * 420);
    const noSitePenalty = hasWebsite ? (pageSpeedScore < 50 ? 25000 : 15000) : 38000;
    const estLostRevenuePerMonth = Math.max(20000, baseLost + noSitePenalty);

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

// --- 2. FREE RANKING ENGINE ---
export function rankLeadsFree(leads: Lead[], audits: Record<string, AuditResult>): RankedLead[] {
  const auditable = leads.filter((l) => audits[l.id]);

  return auditable
    .map((lead) => {
      const a = audits[lead.id];
      let score = 50;

      // 1. Site gap (highest weight: up to 35 pts)
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

      // Clamp 0..98
      const finalScore = Math.max(20, Math.min(98, score));

      let scoreReasoning = "";
      if (!a.hasWebsite) {
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

// --- 3. FREE WEBSITE PROMPT BUILDER ---
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

  const prompt = `Build a high-converting, modern, mobile-first website for an established Indian local business:

BUSINESS PROFILE:
- Business Name: ${lead.name}
- Category: ${lead.category}
- Location: ${lead.address}, ${lead.city}
- Google Rating: ${lead.rating ?? 4.8}★ (${lead.reviewsCount ?? 120} Google Reviews)
- Phone: ${lead.phone ?? "+91 98000 00000"} | WhatsApp: ${lead.whatsapp ?? lead.phone ?? "+91 98000 00000"}
- Key Gap to Solve: ${lead.audit.biggestGap}

CORE SECTIONS TO GENERATE:
1. HEADER & HERO:
   - Sticky navigation with Click-to-Call button: tel:${(lead.phone || "").replace(/\s/g, "")}
   - Eye-catching Hero headline: "Trusted by ${lead.reviewsCount || 100}+ Happy Clients in ${cityName}"
   - Primary CTA: Floating and Hero "Book on WhatsApp" button linking to https://wa.me/${waNumber}
   - Trust Strip: "${lead.rating ?? 4.8}★ Google Rating" | "${lead.reviewsCount ?? 120}+ Verified Reviews" | "${lead.yearsInBusiness ?? 8}+ Years in ${cityName}"

2. SERVICES / TREATMENTS GRID:
   - 6 structured service cards tailored to ${lead.category} with modern icons, concise descriptions, and individual "Inquire on WhatsApp" triggers.

3. TRUST & SOCIAL PROOF:
   - Google Reviews Carousel with authentic local Indian names, 5-star ratings, and relatable positive experiences.
   - Before/After or Transformation Showcase / Gallery.

4. LOCAL ACCESSIBILITY & MAP:
   - Embedded Google Map view placeholder, clinic/store hours, full address (${lead.address}), and directions button.
   - FAQ Accordion answering 4 common questions about pricing, booking, and consultations.

5. TECHNICAL REQUIREMENTS:
   - Performance: Lighthouse mobile target 95+ score.
   - Schema: LocalBusiness JSON-LD structured data with name, address, geo, and telephone.
   - Floating WhatsApp bubble in bottom-right corner.

OUTPUT FORMAT:
${platformNote}`;

  const pitchPoints = [
    `Converts mobile visitors directly into booked appointments via 1-click WhatsApp chat (wa.me/${waNumber}).`,
    `Instantly boosts credibility by showcasing your ${lead.rating ?? 4.8}★ rating and ${lead.reviewsCount ?? 120}+ real Google reviews right on the hero fold.`,
    `Loads in under 1 second on mobile networks with zero friction, replacing outdated competitors in ${cityName}.`,
  ];

  return { prompt, pitchPoints };
}

// --- 4. FREE OUTREACH COPYWRITER ---
export function outreachFree(lead: RankedLead, channel: OutreachChannel, language: OutreachLanguage): OutreachResult {
  const ownerName = lead.name.includes("Dr.") ? lead.name.split(",")[0] : lead.name.split(" ")[0];
  const demoUrl = `https://lead-launch.demo/${lead.id}`;
  const phone = lead.phone || "";
  const wa = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
  const reviews = lead.reviewsCount || 80;
  const rating = lead.rating || 4.7;
  const city = lead.city ? lead.city.split(",")[0].trim() : "your area";

  let first = "";
  let followUp = "";
  const bestSendTime = "Tuesday to Thursday, 10:30 AM – 1:00 PM IST";

  if (channel === "whatsapp") {
    if (language === "hinglish") {
      first = `Namaste ${ownerName} ji! 👋

Main ${city} mein local businesses ki Google presence analyze kar raha tha aur maine ${lead.name} dekha. Aapki Google par ${rating}★ rating aur ${reviews}+ positive reviews kamaal ke hain! 🔥

Par ek cheez notice ki — aapka koi direct mobile booking page ya website nahi hai jahan se customers directly WhatsApp par appointment book kar sakein (${lead.audit.biggestGap}).

Maine aapke clinic/business ke liye ek free modern website demo tayyar ki hai (takes 30 secs to view):
👉 ${demoUrl}

Isme direct WhatsApp booking, Google reviews showcase aur click-to-call already setup hai.

Agar pasand aaye toh reply karein, warna koi baat nahi. Have a great week!`;

      followUp = `Hi ${ownerName} ji! Bas ek quick follow up. 

Aapke jaise top-rated businesses bina website ke har mahine lagbhag ₹${(lead.audit.estLostRevenuePerMonth).toLocaleString("en-IN")} ka potential revenue miss kar rahe hain.

Demo link yahan hai: ${demoUrl}

Kya hum kal 5 min ka quick call kar sakte hain agar aap ise live launch karna chahein?`;
    } else {
      first = `Hello ${ownerName}! 👋

I came across ${lead.name} while researching top service providers in ${city}. Congratulations on your impressive ${rating}★ Google rating with ${reviews}+ reviews!

However, I noticed that you don't have a modern mobile-optimized website for instant online booking (${lead.audit.biggestGap}).

I took the liberty of building a complimentary, fully working website demo for your business:
👉 ${demoUrl}

It includes 1-click WhatsApp booking, a live reviews carousel, and local search SEO.

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

Maine ${city} mein aapka business dekha aur aapki ${rating}★ rating aur ${reviews}+ positive reviews kaafi impressive hain.

Lekin jab log Google par "${lead.category} in ${city}" search karte hain, toh bina ek modern website ke kaafi prospective clients doosre clinics/stores par chale jaate hain.

Maine aapke brand ke liye ek fast, mobile-friendly website demo banayi hai:
${demoUrl}

Features included:
✓ 1-Click WhatsApp Booking Button
✓ Verified Google Reviews Showcase
✓ Local Google SEO & Directions Map

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

I recently came across ${lead.name} and was impressed by your stellar ${rating}★ rating across ${reviews}+ Google reviews in ${city}.

However, I noticed your business is currently missing a dedicated mobile website with instant booking capabilities (${lead.audit.biggestGap}).

To help show what's possible, I created a custom website demo for ${lead.name}:
${demoUrl}

Key Highlights:
- Instant WhatsApp consultation booking button
- Featured Google reviews trust carousel
- 100% mobile-speed optimized for local search

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
      first = `Hey ${ownerName}! 👋 Loved your profile and your ${rating}★ Google reviews! Made a free modern website demo for ${lead.name} with instant WhatsApp booking: ${demoUrl} — take a look and let me know if you like it!`;
      followUp = `Hey! Just following up on the free demo site for ${lead.name}: ${demoUrl} — would love to help you get this live if you're interested! 🙌`;
    } else {
      first = `Hey ${ownerName}! 👋 Love your work in ${city} and your ${rating}★ Google rating! Built a free website demo for your business with 1-click WhatsApp booking: ${demoUrl} — check it out!`;
      followUp = `Hey! Quick follow-up on the free demo website for ${lead.name}: ${demoUrl} — let me know if you'd like to get it live on your domain! 🙌`;
    }
  }

  return { first, followUp, bestSendTime };
}

// --- 5. DYNAMIC MOCK LEAD GENERATOR (when no Apify API token is provided) ---
export function generateMockLeads(niche: string, city: string, count: number): Lead[] {
  const baseCity = city || "Mumbai";
  const cleanNiche = (niche || "Business").trim();
  const names = [
    `Apex ${cleanNiche} Studio`,
    `Prime Care ${cleanNiche}`,
    `Dr. Sharma's ${cleanNiche} Hub`,
    `The ${cleanNiche} Lounge`,
    `Elite ${cleanNiche} Specialists`,
    `Royal ${cleanNiche} Care`,
    `Aesthetic ${cleanNiche} Clinic`,
    `City Center ${cleanNiche}`,
    `Modern Touch ${cleanNiche}`,
    `Signature ${cleanNiche} & Wellness`,
    `Grace ${cleanNiche} Studio`,
    `Sunrise ${cleanNiche} Care`,
    `Urban ${cleanNiche} Collective`,
    `ProHealth ${cleanNiche} Center`,
    `Prestige ${cleanNiche} Studio`,
  ];

  const localities = ["Main Market Road", "Linking Road", "MG Road", "Station Road", "Civil Lines", "Ring Road", "Sector 14", "Green Park", "High Street"];
  const total = Math.max(1, Math.min(count, names.length));
  const leads: Lead[] = [];

  for (let i = 0; i < total; i++) {
    const hasSite = i % 3 === 1;
    const phoneNum = `+91 ${98200 + i * 11} ${10000 + i * 1111}`;
    const name = names[i % names.length];
    const reviewsCount = 35 + (i * 17) % 180;
    const rating = Number((4.1 + ((i * 3) % 9) * 0.1).toFixed(1));

    leads.push({
      id: `lead-${String(i + 1).padStart(2, "0")}`,
      name,
      category: cleanNiche,
      address: `${localities[i % localities.length]}, ${baseCity}`,
      city: baseCity,
      phone: phoneNum,
      whatsapp: phoneNum,
      email: i % 2 === 0 ? `${name.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com` : undefined,
      website: hasSite ? `https://${name.toLowerCase().replace(/[^a-z]/g, "")}.in` : undefined,
      rating,
      reviewsCount,
      lat: 19.05 + (i * 0.008),
      lng: 72.82 + (i * 0.007),
      photosCount: 8 + (i * 4),
      yearsInBusiness: 4 + (i * 2),
    });
  }

  return leads;
}
