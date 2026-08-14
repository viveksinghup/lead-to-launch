import { NextResponse } from "next/server";
import { generateDemoHtml } from "@/lib/demoGenerator";
import type { RankedLead } from "@/lib/types";

export const maxDuration = 60;

// Same in-memory store shared with demo-store route (same process)
const demoStore = new Map<string, RankedLead>();

function makeShortId(lead: RankedLead): string {
  const base = lead.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
  const rand = Math.random().toString(36).slice(2, 5);
  return `${base}${rand}`;
}

// Exported so demo route can read from it
export { demoStore };

export async function POST(req: Request) {
  try {
    const { lead } = (await req.json()) as { lead: RankedLead };
    if (!lead) return NextResponse.json({ error: "No lead provided." }, { status: 400 });

    // Save lead with a short ID
    const shortId = makeShortId(lead);
    demoStore.set(shortId, lead);

    const html = generateDemoHtml(lead);

    // Resolve base URL — prefer explicit NEXT_PUBLIC_APP_URL (your production Vercel domain)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (hostHeader.includes("localhost") ? "http" : "https");
    const baseUrl = (appUrl || `${proto}://${hostHeader}`).replace(/\/$/, "");

    // 1. If Netlify token set — deploy to real Netlify subdomain
    const token = process.env.NETLIFY_AUTH_TOKEN;
    if (token) {
      try {
        const slug = lead.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30);
        const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: `${slug}-${Math.floor(1000 + Math.random() * 9000)}` }),
        });
        if (createRes.ok) {
          const site = await createRes.json();
          const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
            method: "POST",
            headers: { "Content-Type": "application/zip", Authorization: `Bearer ${token}` },
            body: html,
          });
          if (deployRes.ok) {
            return NextResponse.json({ success: true, deployUrl: site.ssl_url || site.url, provider: "netlify", html });
          }
        }
      } catch (e) {
        console.warn("Netlify deploy failed, falling back:", e);
      }
    }

    // 2. Built-in hosted URL — clean short link, no query params
    const demoUrl = `${baseUrl}/demo/${shortId}`;

    return NextResponse.json({
      success: true,
      deployUrl: demoUrl,
      provider: "vercel-hosted",
      html,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
