# Lead → Launch

Local-first dashboard + Claude Code skill that runs a 5-phase freelance website pipeline:

**Scrape** Google Maps → **Audit** (Claude) → **Rank** (Claude) → **Build** site prompt (Claude) → **Outreach** (Claude, Hinglish/English + day-3 follow-up).

Phases 2–5 run on **Claude Code locally, under your subscription — no API key.** Phase 1 uses Apify (or bundled demo data).

## Run the dashboard

```bash
cd app
npm run dev
# open http://localhost:3000
```

Requirements:
- **Node.js 18+**
- **Claude Code** installed + logged in (for Phases 2–5) — [claude.com/claude-code](https://claude.com/claude-code)
- Optional: `APIFY_TOKEN` in `app/.env.local` for live scraping (else Phase 1 uses the seeded 12 Bandra dentists)

Full walkthrough: **`SETUP-GUIDE.md`**.

## Run the skill

The same logic, packaged as a Claude Code skill:

```
.claude/skills/lead-to-launch/SKILL.md
```

In Claude Code: ask `run /lead-to-launch` (or just describe the goal — the skill description triggers it).
