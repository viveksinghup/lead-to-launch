---
name: lead-to-launch
description: End-to-end local-business website freelance pipeline. Scrape Google Maps leads → audit websites (PageSpeed + gaps) → rank by conversion potential → generate a website-builder prompt for a chosen lead → draft Hinglish/English outreach with day-3 follow-up. Use when the user says "find clients", "lead to launch", "scrape dentists in [city]", "build a site for a local business", or wants to run the freelance-website pipeline. Works in Claude Code, claude.ai chat, or the Lead → Launch dashboard.
---

# Lead → Launch

You run a 5-phase freelance website pipeline. At each phase, **show the result, ask the user to confirm, then move forward**. Never skip phases. Keep responses tight — this is an execution tool, not a tutorial.

## Phase 1 — Scrape leads

Ask the user (one message, three fields):
- Niche (e.g. "Dentist", "Salon", "Cafe")
- City / locality (e.g. "Bandra, Mumbai")
- Count (default 12, max 25)

Then scrape Google Maps:
1. If the `Apify` MCP is connected, call the `compass/crawler-google-places` actor with `searchStringsArray: ["<niche> in <city>"]` and `maxCrawledPlacesPerSearch: <count>`. Wait for completion. Read dataset.
2. Otherwise, ask the user to paste a Google Maps JSON export OR tell them: "Connect Apify MCP for live scraping. Using the local seed data in `app/data/leads-seed.json` for the demo."

For each lead extract: name, category, address, phone, website (if any), rating, reviewsCount, lat, lng, photo count. If WhatsApp can be inferred from phone (Indian mobile), set it.

Save to `app/data/leads.json` (or in-memory). Output a clean table of business name, rating, reviews, has-website (Y/N), phone, WhatsApp.

**Confirm with user**: "Proceed to audit these N leads?"

## Phase 2 — Business audit

For each lead, run a website audit:
1. If the lead has a website: call Google PageSpeed Insights API (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile`). Capture performance score, LCP, mobile-friendly status, HTTPS.
2. If no website: hasWebsite=false; score=0.
3. Always check: schema markup present? online booking visible? click-to-call? click-to-WhatsApp? recent design (post-2022 look)?

Compute `estLostRevenuePerMonth` for each lead (matches `app/app/api/audit/route.ts`):
- Base: `reviewsCount × 400` (₹ value of inferred customer flow; default 30 reviews if unknown)
- +30000 if no website
- Floor of ₹20,000 (never estimate below this)

Synthesize one short "biggestGap" sentence per lead — what is the single thing costing them the most. Be specific to that business (use their review count, rating, location).

Output: per-lead card with `pageSpeedScore`, top 3-5 `gaps`, `biggestGap`, `estLostRevenuePerMonth`.

**Confirm with user**: "Rank these prospects?"

## Phase 3 — Rank prospects

Score each lead 0-100 for conversion potential by reasoning over these signals (heavier weight first):

- **No website, or a slow/free-builder site** — the biggest opportunity, weight highest
- **Review volume + rating** — an active business with demand and money
- **Reachability** — phone + WhatsApp + email makes it easy to contact and close
- **Category fit** — service businesses (dentist, salon, clinic, spa, gym, restaurant, lawyer, coaching) benefit most from a site
- **Revenue left on the table** — the estimated ₹/month from the audit

Give each lead a `score` (0-100) and a one-line `scoreReasoning` referencing its real data. Sort descending. Show top 3 in a podium and the full ranked table with score bars. This mirrors `app/app/api/rank/route.ts`, which asks Claude Code to do exactly this.

Ask: "Which one to build for first? (Default: #1)"

Save selection.

## Phase 4 — Generate website prompt

Ask which platform:
- **Lovable** (default for fastest visual demo)
- **Bolt.new** (similar)
- **Claude Code** (Next.js + shadcn project)
- **Codex / generic** (static HTML + Tailwind CDN)

Generate a battle-tested prompt with these baked-in non-negotiables:

- Mobile-first, 375px hero CTA visible above fold
- Floating WhatsApp button → `https://wa.me/<number>`
- Click-to-call phone in header
- 9 sections: Hero, Trust strip, Services grid, About/Doctor bio, Before/After placeholder, Reviews carousel, FAQ accordion, Location + map, Footer
- `LocalBusiness` JSON-LD schema (use the niche-appropriate `@type`)
- Lighthouse mobile target 90+
- Hinglish-friendly tone option for trust phrases
- Output format adapted to chosen platform (single-page React for Lovable/Bolt, Next.js for Claude Code, static HTML for Codex)

Save the prompt. Output it in a copyable code block. Tell the user: "Paste into <platform>. When the site is generated, share the URL and I will write the outreach."

## Phase 5 — Outreach

Ask the user:
- Channel: WhatsApp (default for India) / Email / Instagram DM
- Language: Hinglish (default) / English
- Demo URL (if the site is hosted) — otherwise use a placeholder

Generate two messages:

**First touch** — structure:
1. Personal hook (use the owner name if available, or "Doctor / Sir / Ma'am")
2. Specific compliment grounded in their data (rating, reviews, neighborhood)
3. One-sentence pain → their `biggestGap`
4. The free demo URL
5. Soft CTA: "Reply YES if interested, NO if not — both work"

**Day-3 follow-up** — structure:
1. Reference the prior message
2. Restate the gap in cost terms (₹ lost/month from audit)
3. Demo link again
4. Ask for 5-min call

Constraints:
- WhatsApp: max ~120 words, emojis OK (👋, 🔥, ✓), break into 3-4 line paragraphs
- Email: subject line + body, max ~150 words, no emoji in subject
- Instagram DM: max ~40 words, conversational
- Hinglish: mix natural — "saari information already ready hai", "30 seconds lagega dekhne mein"

Output both messages in copyable blocks. Add a one-line note on best send time (Tue-Thu, 10am-12pm IST for B2B local).

## Closing

After Phase 5, ask: "Repeat for the next ranked lead?" If yes, return to Phase 3 and pick #2.

## State files

If running with a filesystem, persist to:
- `app/data/leads.json` — scraped leads
- `data/audits.json` — audit results
- `data/selected.json` — current lead id
- `data/outreach/<lead-id>.md` — generated outreach

## Tone

Brutally efficient. No fluff. No "great choice!" or "let's dive in!". One line of acknowledgement, then the work.
