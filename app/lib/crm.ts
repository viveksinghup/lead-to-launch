import type { CRMEntry, CRMStatus, RankedLead, IntentLead } from "./types";

const CRM_KEY = "lead_launch_crm_v1";

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function loadAll(): CRMEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CRM_KEY);
    return raw ? (JSON.parse(raw) as CRMEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(entries: CRMEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CRM_KEY, JSON.stringify(entries));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export function getAllCRMEntries(): CRMEntry[] {
  return loadAll();
}

export function getCRMEntry(leadId: string): CRMEntry | null {
  return loadAll().find((e) => e.leadId === leadId) ?? null;
}

export function addToCRM(lead: RankedLead, extras?: Partial<CRMEntry>): CRMEntry {
  const existing = getCRMEntry(lead.id);
  if (existing) return existing;

  const entry: CRMEntry = {
    id: `crm-${lead.id}-${Date.now()}`,
    leadId: lead.id,
    leadName: lead.name,
    leadCategory: lead.category,
    leadCity: lead.city,
    leadPhone: lead.phone,
    leadEmail: lead.email,
    leadWhatsapp: lead.whatsapp,
    score: lead.score,
    status: "new",
    addedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    estRevenue: lead.audit?.estLostRevenuePerMonth,
    platform: "google_maps",
    ...extras,
  };

  const all = loadAll();
  all.unshift(entry);
  saveAll(all);
  return entry;
}

export function addIntentLeadToCRM(lead: IntentLead, extras?: Partial<CRMEntry>): CRMEntry {
  const existing = getCRMEntry(lead.id);
  if (existing) return existing;

  const entry: CRMEntry = {
    id: `crm-${lead.id}-${Date.now()}`,
    leadId: lead.id,
    leadName: lead.authorName,
    leadCategory: "Intent Lead",
    leadCity: lead.location ?? "Unknown",
    status: "new",
    addedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    platform: lead.platform,
    ...extras,
  };

  const all = loadAll();
  all.unshift(entry);
  saveAll(all);
  return entry;
}

export function updateCRMStatus(leadId: string, status: CRMStatus, extras?: Partial<CRMEntry>): void {
  const all = loadAll();
  const idx = all.findIndex((e) => e.leadId === leadId);
  if (idx === -1) return;

  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    status,
    lastUpdatedAt: now,
    ...(status === "messaged" ? { messagedAt: now } : {}),
    ...(status === "replied" ? { repliedAt: now } : {}),
    ...(status === "won" ? { wonAt: now } : {}),
    ...extras,
  };
  saveAll(all);
}

export function updateCRMEntry(leadId: string, updates: Partial<CRMEntry>): void {
  const all = loadAll();
  const idx = all.findIndex((e) => e.leadId === leadId);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates, lastUpdatedAt: new Date().toISOString() };
  saveAll(all);
}

export function deleteCRMEntry(leadId: string): void {
  const all = loadAll().filter((e) => e.leadId !== leadId);
  saveAll(all);
}

// ─── STATS ────────────────────────────────────────────────────────────────────
export function getCRMStats() {
  const all = loadAll();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const thisMonth = all.filter((e) => e.addedAt >= startOfMonth);

  return {
    total: all.length,
    thisMonth: thisMonth.length,
    new: all.filter((e) => e.status === "new").length,
    messaged: all.filter((e) => e.status === "messaged").length,
    demoSent: all.filter((e) => e.status === "demo_sent").length,
    replied: all.filter((e) => e.status === "replied").length,
    callBooked: all.filter((e) => e.status === "call_booked").length,
    won: all.filter((e) => e.status === "won").length,
    lost: all.filter((e) => e.status === "lost").length,
    wonThisMonth: thisMonth.filter((e) => e.status === "won").length,
    estRevenueWon: all
      .filter((e) => e.status === "won" && e.estRevenue)
      .reduce((sum, e) => sum + (e.estRevenue ?? 0), 0),
    conversionRate: all.length > 0
      ? Math.round((all.filter((e) => e.status === "won").length / all.length) * 100)
      : 0,
  };
}

// ─── FOLLOW-UP REMINDERS ──────────────────────────────────────────────────────
/** Returns leads that were messaged 3+ days ago with no reply */
export function getFollowUpReminders(): CRMEntry[] {
  const all = loadAll();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return all.filter((e) => {
    if (e.status !== "messaged" && e.status !== "demo_sent") return false;
    const msgAt = e.messagedAt ?? e.lastUpdatedAt;
    return new Date(msgAt) <= threeDaysAgo;
  });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export function exportCRMAsCSV(): string {
  const all = loadAll();
  const headers = [
    "Name", "Category", "City", "Phone", "Email", "WhatsApp",
    "Status", "Score", "Est Revenue", "Added", "Last Updated", "Platform",
  ];
  const rows = all.map((e) => [
    e.leadName, e.leadCategory, e.leadCity,
    e.leadPhone ?? "", e.leadEmail ?? "", e.leadWhatsapp ?? "",
    e.status, e.score ?? "", e.estRevenue ?? "",
    e.addedAt.slice(0, 10), e.lastUpdatedAt.slice(0, 10),
    e.platform ?? "",
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}
