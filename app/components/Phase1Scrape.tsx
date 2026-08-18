"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PhaseShell } from "./PhaseShell";
import {
  Loader2, MapPin, Phone, Star, Globe, MessageCircle, Mail,
  Crown, Zap, Radio, KeyRound,
} from "lucide-react";
import { ApiKeysModal } from "./ApiKeysModal";
import type { Lead, ScrapeInput } from "@/lib/types";
import { toast } from "sonner";

const LeadMap = dynamic(() => import("./LeadMap"), { ssr: false });

type DataSource = "serpapi" | "apify" | "seed" | "free-dynamic" | null;

const SOURCE_LABELS: Record<NonNullable<DataSource>, { label: string; color: string; icon: React.ReactNode }> = {
  serpapi:      { label: "Live · Google Maps (SerpAPI)",   color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",  icon: <Radio className="h-3 w-3" /> },
  apify:        { label: "Live · Google Maps (Apify)",     color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",  icon: <Radio className="h-3 w-3" /> },
  seed:         { label: "Curated demo data",              color: "text-sky-400 border-sky-500/40 bg-sky-500/10",             icon: <Zap className="h-3 w-3" /> },
  "free-dynamic": { label: "Free · Smart generated data", color: "text-violet-400 border-violet-500/40 bg-violet-500/10",    icon: <Zap className="h-3 w-3" /> },
};

export function Phase1Scrape({
  leads,
  setLeads,
  onNext,
  onPrev,
}: {
  leads: Lead[];
  setLeads: (l: Lead[]) => void;
  onNext: () => void;
  onPrev?: () => void;
}) {
  const [input, setInput] = useState<ScrapeInput>({ niche: "Dentist", city: "Bandra, Mumbai", count: 12 });
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<DataSource>(null);

  async function runScrape() {
    setLoading(true);
    setLeads([]);
    setSource(null);
    try {
      const storedSerpKey = typeof window !== "undefined" ? localStorage.getItem("serpapi_key") || undefined : undefined;
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (storedSerpKey) headers["x-serpapi-key"] = storedSerpKey;

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...input, serpApiKey: storedSerpKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scrape failed");

      setSource((data.source as DataSource) ?? "free-dynamic");

      // Stagger in for visual drama
      for (let i = 0; i < data.leads.length; i++) {
        await new Promise((r) => setTimeout(r, 40));
        setLeads(data.leads.slice(0, i + 1));
      }

      const highValueCount = (data.leads as Lead[]).filter((l) => l.highValue).length;
      const successMsg = highValueCount > 0
        ? `${data.leads.length} leads loaded — ${highValueCount} high-value priority client${highValueCount > 1 ? "s" : ""} found 🔥`
        : `${data.leads.length} leads loaded for ${input.niche} in ${input.city}`;

      toast.success(successMsg);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const highValueLeads = leads.filter((l) => l.highValue);
  const sourceMeta = source ? SOURCE_LABELS[source] : null;

  return (
    <PhaseShell
      title="Phase 1 — Scrape leads"
      subtitle="Pull local businesses from Google Maps. High-value clients (clinics, hotels, law firms, jewellers, luxury brands) are automatically surfaced first."
      onPrev={onPrev}
      onNext={onNext}
      nextDisabled={leads.length === 0}
      nextLabel="Audit these leads"
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="niche" className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Niche</Label>
              <Input
                id="niche"
                autoComplete="off"
                value={input.niche}
                onChange={(e) => setInput({ ...input, niche: e.target.value })}
                placeholder="e.g. Dentist, Lawyer, Hotel"
                className="h-10 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs uppercase tracking-[0.12em] text-muted-foreground">City</Label>
              <Input
                id="city"
                autoComplete="off"
                value={input.city}
                onChange={(e) => setInput({ ...input, city: e.target.value })}
                placeholder="e.g. Mumbai, Delhi, Dubai, London"
                className="h-10 text-base"
              />
              <p className="text-[11px] text-muted-foreground">Supports Indian & global metropolis cities</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="count" className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Count</Label>
              <Input
                id="count"
                type="number"
                inputMode="numeric"
                min={1}
                max={15}
                value={input.count}
                onChange={(e) => setInput({ ...input, count: Number(e.target.value) })}
                className="h-10 text-base font-mono tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">Max 15 in free mode · unlimited with SerpAPI / Apify</p>
            </div>
            <Button
              onClick={runScrape}
              disabled={loading}
              className="w-full h-11 transition-transform duration-150 active:scale-[0.98]"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scraping...</> : "Scrape leads"}
            </Button>

            {/* Source badge */}
            {sourceMeta && !loading && (
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded-md border flex-1 ${sourceMeta.color}`}>
                  {sourceMeta.icon}
                  {sourceMeta.label}
                </div>
                <ApiKeysModal
                  trigger={
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground">
                      <KeyRound className="h-3 w-3" /> Configure
                    </Button>
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <Stat label="Found" value={leads.length} />
              <Stat label="Priority" value={highValueLeads.length} highlight />
              <Stat label="No site" value={leads.filter((l) => !l.website).length} />
            </div>

            {highValueLeads.length > 0 && !loading && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/8 p-2.5 text-xs text-amber-400">
                <div className="flex items-center gap-1.5 font-medium mb-1">
                  <Crown className="h-3.5 w-3.5" />
                  {highValueLeads.length} High-Value Client{highValueLeads.length > 1 ? "s" : ""} Found
                </div>
                <p className="text-amber-400/70 leading-relaxed">
                  These are premium-tier businesses (clinics, hotels, law firms, etc.) most likely to pay ₹20K–80K+ for a website.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Live map</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadMap leads={leads} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l, i) => (
                  <TableRow key={l.id} className={`border-b border-border animate-in fade-in duration-200 ${l.highValue ? "bg-amber-500/5" : ""}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {l.highValue && (
                          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="High-Value Lead" />
                        )}
                        <div>
                          <div className="font-medium">{l.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {l.address}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        {l.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {l.phone}</span>}
                        {l.whatsapp && <span className="flex items-center gap-1 text-[color:var(--accent-foreground)]"><MessageCircle className="h-3 w-3" /> WhatsApp</span>}
                        {l.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {l.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-[color:var(--chart-4)] text-[color:var(--chart-4)]" />
                        <span className="font-medium">{l.rating?.toFixed(1)}</span>
                        <span className="text-muted-foreground text-xs">({l.reviewsCount})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.website ? (
                        <Badge variant="secondary" className="text-xs font-normal"><Globe className="h-3 w-3 mr-1" /> Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal text-[color:var(--destructive)] border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5">No site</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.highValue ? (
                        <Badge className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                          <Crown className="h-2.5 w-2.5 mr-1" /> Priority
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                          Standard
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {leads.length === 0 && !loading && (
              <div className="text-center py-12 text-sm text-muted-foreground">Run a scrape to populate leads</div>
            )}
          </div>
        </CardContent>
      </Card>
    </PhaseShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-2.5 py-2 ${highlight && value > 0 ? "border-amber-500/40 bg-amber-500/8" : "border-border"}`}>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className={`font-display text-xl tabular-nums mt-0.5 ${highlight && value > 0 ? "text-amber-400" : ""}`}>{value}</div>
    </div>
  );
}
