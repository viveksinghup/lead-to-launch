import type { RankedLead } from "./types";

/**
 * Production-Grade Demo Website Generator
 * Creates a hyper-realistic, high-converting, niche-tailored landing page
 * for any local business to use as an instant pitch demo.
 */

export function generateDemoHtml(lead: RankedLead): string {
  const waRaw = (lead.whatsapp ?? lead.phone ?? "919999999999").replace(/\D/g, "");
  const waNumber = waRaw.startsWith("91") ? waRaw : `91${waRaw}`;
  const phoneClean = (lead.phone ?? "").replace(/\s/g, "");
  const cityShort = lead.city ? lead.city.split(",")[0].trim() : "your city";
  const category = lead.category || "Service Specialist";
  const catLower = category.toLowerCase();
  const rating = lead.rating ?? 4.8;
  const reviewsCount = lead.reviewsCount ?? 120;
  const years = lead.yearsInBusiness ?? 8;
  const address = lead.address || `${cityShort}, India`;

  // Determine Niche Specific Content
  let heroSubtitle = "";
  let doctorOrOwnerTitle = "Meet The Founder";
  let doctorOrOwnerName = lead.name.includes("Dr.") ? lead.name.split(",")[0] : `Senior Director · ${lead.name}`;
  let doctorBio = "";
  let services: Array<{ title: string; desc: string; price: string; icon: string }> = [];
  let faqs: Array<{ q: string; a: string }> = [];
  let themeColor = "indigo"; // indigo, emerald, rose, amber, teal

  if (catLower.includes("dent") || catLower.includes("clinic") || catLower.includes("doctor")) {
    themeColor = "teal";
    heroSubtitle = "Painless dentistry, state-of-the-art technology, and trusted smile makeovers for the entire family.";
    doctorOrOwnerTitle = "Lead Dental Surgeon";
    doctorOrOwnerName = lead.name.includes("Dr.") ? lead.name.split(",")[0] : "Dr. A. Sharma (BDS, MDS)";
    doctorBio = `With over ${years}+ years of clinical excellence in ${cityShort}, our team has treated ${reviewsCount * 4}+ happy smiles using painless laser dentistry and European sterilization standards.`;
    services = [
      { title: "Invisible Clear Aligners", desc: "Straighten teeth discreetly without metal braces. 3D digital smile preview included.", price: "From ₹28,000", icon: "✨" },
      { title: "Single-Sitting Root Canal", desc: "100% painless rotary endodontic treatment completed in just 45 minutes.", price: "From ₹3,500", icon: "🦷" },
      { title: "Laser Teeth Whitening", desc: "Get up to 6 shades brighter teeth in a single 30-minute session.", price: "₹4,999", icon: "⚡" },
      { title: "Permanent Dental Implants", desc: "Lifetime warranty Swiss titanium implants with natural-looking zirconia crowns.", price: "From ₹22,000", icon: "🛡️" },
      { title: "Cosmetic Smile Designing", desc: "Porcelain veneers, gap closure, and aesthetic gum contouring for wedding-ready smiles.", price: "Custom Plan", icon: "💎" },
      { title: "Kids & Family Dentistry", desc: "Gentle pediatric cavity prevention, fluoride therapy, and stress-free checkups.", price: "From ₹800", icon: "🧸" },
    ];
    faqs = [
      { q: "Is root canal treatment painful at your clinic?", a: "Not at all! We use modern computerized local anesthesia and micro-rotary files ensuring a virtually painless 45-minute procedure." },
      { q: "How can I book an appointment on WhatsApp?", a: "Simply click the 'Book on WhatsApp' button on this page. Our front desk will confirm your slot within 2 minutes." },
      { q: "Do you accept insurance or offer 0% EMI options?", a: "Yes, we support cashless insurance reimbursements and zero-cost 3-to-6 month EMI options for major treatments like Aligners and Implants." },
    ];
  } else if (catLower.includes("salon") || catLower.includes("spa") || catLower.includes("beauty") || catLower.includes("hair")) {
    themeColor = "rose";
    heroSubtitle = "Luxury hair styling, bridal makeovers, and rejuvenating skin therapies tailored to enhance your natural glow.";
    doctorOrOwnerTitle = "Master Stylist & Founder";
    doctorOrOwnerName = "Senior Creative Director";
    doctorBio = `Curating signature looks in ${cityShort} for over ${years}+ years. We use 100% genuine international products (L'Oréal Professionnel, Kérastase, Olaplex).`;
    services = [
      { title: "Keratin & Botoplex Therapy", desc: "Frizz-free, glossy, and silky smooth hair lasting up to 5 months.", price: "From ₹3,999", icon: "✂️" },
      { title: "HD Bridal & Event Makeup", desc: "Long-lasting, camera-ready bridal makeup with pre-bridal skin prep.", price: "From ₹12,000", icon: "💄" },
      { title: "HydraFacial Glow Treatment", desc: "Deep pore suction, exfoliating peptide infusion, and instant red-carpet glow.", price: "₹2,499", icon: "✨" },
      { title: "Balayage & Global Hair Color", desc: "Custom dimensional coloring by certified color masters without hair damage.", price: "From ₹4,500", icon: "🎨" },
      { title: "Luxury Aroma Spa & Massage", desc: "Full-body stress-relief massage with organic essential oils and steam bath.", price: "₹1,899", icon: "🌿" },
      { title: "Gel Extensions & Nail Art", desc: "Durable acrylic and polygel extensions with trending Japanese chrome art.", price: "From ₹1,200", icon: "💅" },
    ];
    faqs = [
      { q: "Do I need to book in advance for hair treatments?", a: "We recommend booking 2-3 hours in advance via WhatsApp so our senior stylists can reserve dedicated time for you." },
      { q: "Which brands do you use for skin and hair treatments?", a: "We exclusively use authentic salon-grade brands including L'Oréal Pro, Olaplex, Dermalogica, and O.P.I." },
    ];
  } else if (catLower.includes("gym") || catLower.includes("fitness") || catLower.includes("crossfit")) {
    themeColor = "amber";
    heroSubtitle = "Transform your physique with world-class biomechanical equipment, certified personal trainers, and personalized diet protocols.";
    doctorOrOwnerTitle = "Head Strength Coach";
    doctorOrOwnerName = "Chief Performance Trainer";
    doctorBio = `Helping ${reviewsCount * 5}+ members in ${cityShort} build strength, lose fat, and stay injury-free over ${years}+ years.`;
    services = [
      { title: "1-on-1 Personal Training", desc: "Custom workout splits, weekly body composition tracking, and form correction.", price: "From ₹6,000/mo", icon: "🏋️" },
      { title: "HIIT & Fat Loss Bootcamp", desc: "High-energy calorie-torching group workouts designed to burn 600+ kcal/session.", price: "From ₹2,500/mo", icon: "🔥" },
      { title: "Clinical Nutrition & Diet", desc: "Customized macro meal plans tailored to Indian diets for muscle gain and fat loss.", price: "Included", icon: "🥗" },
      { title: "Strength & Powerlifting Zone", desc: "Olympic barbells, calibrated steel plates, deadlift platforms, and power racks.", price: "Included", icon: "⚡" },
      { title: "Yoga & Flexibility Flow", desc: "Mobility and recovery sessions led by certified yoga masters.", price: "Included", icon: "🧘" },
      { title: "Steam & Recovery Lounge", desc: "Post-workout detox steam rooms and recovery showers.", price: "Included", icon: "🚿" },
    ];
    faqs = [
      { q: "Can I try a free trial session before joining?", a: "Yes! Click 'Claim Free 1-Day Pass' on WhatsApp and our team will book your complimentary trial workout." },
      { q: "Do you provide trainer guidance for beginners?", a: "Every new member receives a 3-day complimentary floor orientation and form walkthrough from our certified trainers." },
    ];
  } else {
    themeColor = "indigo";
    heroSubtitle = `Premium quality, certified expertise, and prompt service trusted by ${cityShort} residents for over ${years}+ years.`;
    doctorOrOwnerTitle = "Principal Director";
    doctorOrOwnerName = lead.name;
    doctorBio = `Dedicated to delivering 5-star service and transparent pricing in ${cityShort} with over ${reviewsCount}+ verified client reviews.`;
    services = [
      { title: "Priority On-Demand Service", desc: "Fast-track response with transparent pricing and zero hidden charges.", price: "Best Rates", icon: "⚡" },
      { title: "Comprehensive Consultation", desc: "Detailed evaluation and tailored solutions crafted for your specific needs.", price: "Complimentary", icon: "📋" },
      { title: "Certified Professional Care", desc: "Delivered by vetted and experienced industry specialists.", price: "Guaranteed", icon: "⭐" },
      { title: "100% Quality Assurance", desc: "Post-service support and complete client satisfaction warranty.", price: "Included", icon: "🛡️" },
    ];
    faqs = [
      { q: "How quickly do you respond to WhatsApp inquiries?", a: "We reply within 5 minutes during business hours to schedule your consultation." },
    ];
  }

  // Pre-filled WhatsApp booking link
  const waChatUrl = `https://wa.me/${waNumber}?text=Hi%20${encodeURIComponent(lead.name)}%2C%20I%20saw%20your%20website%20and%20would%20like%20to%20inquire%20about%20booking%20an%20appointment.`;

  return `<!doctype html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <title>${lead.name} · Official Website | ${cityShort}</title>
  <meta name="description" content="${lead.name} in ${address}. Rated ${rating}★ across ${reviewsCount}+ Google reviews. Book directly on WhatsApp.">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-serif { font-family: 'Playfair Display', serif; }
    .pulse-glow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .9; transform: scale(1.04); } }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased selection:bg-teal-500 selection:text-white">

  <!-- Top Announcement Bar -->
  <div class="bg-slate-900 text-white text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
    <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
    <span>Now accepting new bookings for ${cityShort} · <strong>Instant confirmation on WhatsApp</strong></span>
  </div>

  <!-- Header -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          ${lead.name.charAt(0)}
        </div>
        <div>
          <div class="font-bold text-slate-900 text-base leading-tight tracking-tight">${lead.name}</div>
          <div class="text-[11px] text-slate-500 font-medium">${category} · ${cityShort}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        ${lead.phone ? `
          <a href="tel:${phoneClean}" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-full px-3.5 py-1.5 transition">
            📞 ${lead.phone}
          </a>
        ` : ""}
        <a href="${waChatUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all transform active:scale-95">
          <span>WhatsApp Book</span> →
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 bg-gradient-to-b from-white via-teal-50/40 to-slate-50 border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="max-w-3xl mx-auto text-center">
        <!-- Trust Pill -->
        <div class="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-1 text-xs text-slate-700 font-medium shadow-sm mb-6">
          <span class="text-amber-400 text-sm">★★★★★</span>
          <span class="font-bold text-slate-900">${rating}★ on Google</span>
          <span class="text-slate-300">|</span>
          <span>${reviewsCount}+ Verified Reviews</span>
        </div>

        <h1 class="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-slate-900 leading-[1.12] tracking-tight">
          Exceptional Care You Can Trust in <span class="text-teal-700 italic">${cityShort}</span>
        </h1>
        <p class="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          ${heroSubtitle}
        </p>

        <!-- CTA Buttons -->
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a href="${waChatUrl}" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-lg shadow-emerald-600/20 transition transform active:scale-95">
            <span>💬 Book on WhatsApp</span>
            <span class="text-emerald-200 text-xs">(30s Response)</span>
          </a>
          ${lead.phone ? `
            <a href="tel:${phoneClean}" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm px-6 py-3.5 rounded-full border border-slate-300 shadow-sm transition">
              <span>📞 Call ${lead.phone.replace(/^\+91\s?/, "")}</span>
            </a>
          ` : ""}
        </div>

        <!-- Mini Features Strip -->
        <div class="mt-10 grid grid-cols-3 gap-2 max-w-lg mx-auto text-center border-t border-slate-200 pt-6 text-xs text-slate-500">
          <div>✓ Same-Day Slots</div>
          <div>✓ Painless & Modern</div>
          <div>✓ 100% Transparent</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Trust Metrics Strip -->
  <section class="bg-white border-b border-slate-200 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        <div>
          <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">${rating}★</div>
          <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Google Rating</div>
        </div>
        <div>
          <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">${reviewsCount}+</div>
          <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Happy Patients</div>
        </div>
        <div>
          <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">${years}+ Yrs</div>
          <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Serving ${cityShort}</div>
        </div>
        <div>
          <div class="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight font-serif">100%</div>
          <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Sterilized & Safe</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Services Grid -->
  <section class="py-16 sm:py-20 bg-slate-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="text-center max-w-xl mx-auto mb-12">
        <span class="text-xs uppercase font-bold tracking-widest text-teal-700">Services & Treatments</span>
        <h2 class="text-2xl sm:text-4xl font-serif font-bold text-slate-900 mt-2">Comprehensive Solutions For You</h2>
        <p class="text-slate-500 text-sm mt-2">Transparent pricing and personalized care with zero waiting time.</p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${services.map((s) => `
          <div class="bg-white rounded-2xl p-6 border border-slate-200 hover:border-teal-500/50 hover:shadow-md transition duration-200 flex flex-col justify-between">
            <div>
              <div class="text-3xl mb-3">${s.icon}</div>
              <h3 class="text-lg font-bold text-slate-900 mb-1">${s.title}</h3>
              <p class="text-xs text-slate-500 leading-relaxed">${s.desc}</p>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">${s.price}</span>
              <a href="${waChatUrl}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-slate-700 hover:text-emerald-600 flex items-center gap-1">
                Inquire →
              </a>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </section>

  <!-- Doctor / Founder Profile -->
  <section class="py-16 bg-white border-y border-slate-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8 shadow-xl">
        <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-teal-700 flex items-center justify-center text-4xl sm:text-5xl font-serif font-bold shrink-0 text-white border-2 border-teal-400/30">
          ${lead.name.charAt(0)}
        </div>
        <div class="flex-1 text-center md:text-left">
          <span class="text-xs uppercase font-bold tracking-widest text-teal-400">${doctorOrOwnerTitle}</span>
          <h3 class="text-2xl sm:text-3xl font-serif font-bold mt-1">${doctorOrOwnerName}</h3>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            ${doctorBio}
          </p>
          <div class="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-300">
            <span class="flex items-center gap-1">⭐ <strong>${rating}★ Rating</strong> (${reviewsCount} Reviews)</span>
            <span>•</span>
            <span>📍 <strong>${address}</strong></span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Google Reviews Carousel -->
  <section class="py-16 bg-slate-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="text-center max-w-xl mx-auto mb-12">
        <span class="text-xs uppercase font-bold tracking-widest text-teal-700">Patient Experiences</span>
        <h2 class="text-2xl sm:text-4xl font-serif font-bold text-slate-900 mt-2">Loved by ${cityShort}</h2>
      </div>

      <div class="grid sm:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div class="text-amber-400 text-sm mb-2">★★★★★</div>
          <p class="text-xs text-slate-600 italic leading-relaxed">"Best clinic in ${cityShort}! I had my treatment done last month and the entire experience was 100% painless. Very polite staff and clean setup."</p>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">R</div>
            <div>
              <div class="text-xs font-bold text-slate-800">Rahul Mehta</div>
              <div class="text-[10px] text-slate-400">Verified Google Review</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div class="text-amber-400 text-sm mb-2">★★★★★</div>
          <p class="text-xs text-slate-600 italic leading-relaxed">"Booking through WhatsApp was super convenient. No waiting at the clinic, doctors explain everything transparently without pushing extra costs."</p>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center">P</div>
            <div>
              <div class="text-xs font-bold text-slate-800">Pooja Deshmukh</div>
              <div class="text-[10px] text-slate-400">Verified Google Review</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div class="text-amber-400 text-sm mb-2">★★★★★</div>
          <p class="text-xs text-slate-600 italic leading-relaxed">"Highly recommended for families. Modern equipment and spotless hygiene. You can trust them blindly."</p>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">A</div>
            <div>
              <div class="text-xs font-bold text-slate-800">Ananya Verma</div>
              <div class="text-[10px] text-slate-400">Verified Google Review</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section class="py-16 bg-white border-t border-slate-200">
    <div class="max-w-4xl mx-auto px-4 sm:px-6">
      <div class="text-center mb-10">
        <span class="text-xs uppercase font-bold tracking-widest text-teal-700">FAQ</span>
        <h2 class="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-2">Frequently Asked Questions</h2>
      </div>

      <div class="space-y-4">
        ${faqs.map((f) => `
          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <h4 class="font-bold text-sm text-slate-900">${f.q}</h4>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed">${f.a}</p>
          </div>
        `).join("")}
      </div>
    </div>
  </section>

  <!-- Location & Map -->
  <section class="py-16 bg-slate-900 text-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <span class="text-xs uppercase font-bold tracking-widest text-teal-400">Visit Us</span>
          <h2 class="text-3xl font-serif font-bold mt-2">${lead.name}</h2>
          <p class="text-slate-300 text-sm mt-3 leading-relaxed">
            📍 ${address}
          </p>
          <div class="mt-6 space-y-2 text-xs text-slate-300">
            <div>🕒 <strong>Mon – Sat:</strong> 9:30 AM – 8:30 PM</div>
            <div>🕒 <strong>Sunday:</strong> 10:00 AM – 2:00 PM (By Appointment)</div>
            <div>📞 <strong>Direct Phone:</strong> ${lead.phone || "Available on WhatsApp"}</div>
          </div>
          <div class="mt-8">
            <a href="${waChatUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-full transition">
              <span>Get Directions on WhatsApp</span> →
            </a>
          </div>
        </div>

        <div class="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 p-6 text-center text-slate-400 text-xs">
          <div class="text-4xl mb-3">🗺️</div>
          <div class="font-bold text-white text-sm mb-1">${address}</div>
          <div class="text-[11px] text-slate-400 mb-4">Centrally located in ${cityShort} with convenient parking.</div>
          <a href="https://maps.google.com/?q=${encodeURIComponent(lead.name + " " + address)}" target="_blank" rel="noopener noreferrer" class="inline-block bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
            Open in Google Maps ↗
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Floating Sticky WhatsApp CTA Button -->
  <a href="${waChatUrl}" target="_blank" rel="noopener noreferrer" aria-label="Book on WhatsApp" class="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl pulse-glow transition-transform active:scale-95">
    💬
  </a>

  <!-- Footer -->
  <footer class="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>© ${new Date().getFullYear()} ${lead.name}. All rights reserved.</div>
      <div class="flex gap-4">
        <span>${address}</span>
      </div>
    </div>
  </footer>

</body>
</html>`;
}
