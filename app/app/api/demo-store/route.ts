import { NextResponse } from "next/server";
import type { RankedLead } from "@/lib/types";

// In-memory store — persists across warm Vercel invocations (good for ~hours of pitching)
// For multi-day persistence, set VERCEL_KV or similar, but not needed for demo pitching.
const store = new Map<string, RankedLead>();

function makeId(lead: RankedLead): string {
  // Generate a 6-char slug from lead name + random
  const base = lead.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 4);
  const rand = Math.random().toString(36).slice(2, 5);
  return `${base}${rand}`;
}

// POST /api/demo-store — save a lead, get back a short ID
export async function POST(req: Request) {
  try {
    const { lead } = (await req.json()) as { lead: RankedLead };
    if (!lead?.id) return NextResponse.json({ error: "No lead" }, { status: 400 });

    const id = makeId(lead);
    store.set(id, lead);

    return NextResponse.json({ id, size: store.size });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET /api/demo-store?id=xxx — fetch a lead by short ID
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  const lead = store.get(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lead });
}
