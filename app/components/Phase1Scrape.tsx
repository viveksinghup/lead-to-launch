"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PhaseShell } from "./PhaseShell";
import {
  Loader2, MapPin, Phone, Star, Globe, MessageCircle, Mail,
  Crown, Zap, Radio, Search, Sparkles, ExternalLink
} from "lucide-react";
import { SettingsModal } from "./Settings";
import type { Lead, ScrapeInput, ScrapeMode } from "@/lib/types";
import { toast } from "sonner";

type DataSource = "serpapi" | "intent-multi" | "intent-generated" | "seed" | "free-dynamic" | null;

const SOURCE_LABELS: Record<NonNullable<DataSource>, { label: string; color: string; icon: React.ReactNode }> = {
  serpapi:            { label: "Live · Google Maps (SerpAPI)",       color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", icon: <Radio className="h-3 w-3" /> },
  "intent-multi":     { label: "Live · Reddit & Global Intent",      color: "text-purple-400 border-purple-500/40 bg-purple-500/10",  icon: <Sparkles className="h-3 w-3" /> },
  "intent-generated": { label: "Smart Intent Discovery",            color: "text-purple-400 border-purple-500/40 bg-purple-500/10",  icon: <Sparkles className="h-3 w-3" /> },
  seed:               { label: "Curated Demo Data",                  color: "text-sky-400 border-sky-500/40 bg-sky-500/10",          icon: <Zap className="h-3 w-3" /> },
  "free-dynamic":     { label: "Free · Smart Generated Data",        color: "text-violet-400 border-violet-500/40 bg-violet-500/10", icon: <Zap className="h-3 w-3" /> },
};

const QUICK_FILTERS = [
  "All Website Requests",
  "E-Commerce & Store",
  "Landing Page & Redesign",
  "Business & Corporate",
  "Clinic & Healthcare",
];

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
  const [mode, setMode] = useState<ScrapeMode>("leads");
  const [input, setInput] = useState<ScrapeInput>({
    niche: "website developer",
    city: "Global / Remote",
    count: 15,
    mode: "leads"
  });
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<DataSource>(null);

  async function runScrape(nicheOverride?: string) {
    const targetNiche = nicheOverride || input.niche;
    setLoading(true);
    setLeads([]);
    setSource(null);
    try {
      const storedSettingsRaw = typeof window !== "undefined" ? localStorage.getItem("lead_launch_settings") : null;
      const storedSettings = storedSettingsRaw ? JSON.parse(storedSettingsRaw) : {};
      const storedSerpKey = typeof window !== "undefined" ? localStorage.getItem("serpapi_key") || undefined : undefined;
      
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (storedSerpKey) headers["x-serpapi-key"] = storedSerpKey;

      const targetCity = input.city && input.city.trim() ? input.city.trim() : "Global / Remote";
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...input,
          niche: targetNiche,
          city: targetCity,
          mode,
          serpApiKey: storedSerpKey,
          twitterBearerToken: storedSettings.twitterBearerToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scrape failed");

      setSource((data.source as DataSource) ?? "free-dynamic");

      // Stagger in for smooth animation
      for (let i = 0; i < data.leads.length; i++) {
        await new Promise((r) => setTimeout(r, 25));
        setLeads(data.leads.slice(0, i + 1));
      }

      const highValueCount = (data.leads as Lead[]).filter((l) => l.highValue).length;
      const successMsg = mode === "leads"
        ? `${data.leads.length} active intent leads found for ${targetCity} 🔥`
        : highValueCount > 0
        ? `${data.leads.length} leads loaded — ${highValueCount} high-value priority clients found 🔥`
        : `${data.leads.length} businesses found`;

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
      title="Phase 1 — Global Lead Discovery"
      subtitle="Find people actively asking for website development or redesign across Reddit and web communities globally, or search Google Maps."
      onPrev={onPrev}
      onNext={onNext}
      nextDisabled={leads.length === 0}
      nextLabel="Audit these leads"
    >
      {/* 2-Option Discovery Mode Selector */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div
          onClick={() => { setMode("leads"); setInput((prev) => ({ ...prev, mode: "leads", city: "Global / Remote" })); }}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            mode === "leads"
              ? "border-purple-500 bg-purple-500/5 shadow-sm ring-1 ring-purple-500/30"
              : "border-border/80 bg-card hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${mode === "leads" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}`}>
                ★
              </div>
              <span className="font-semibold text-sm">Option B: Free Global Intent Leads (Reddit Priority)</span>
            </div>
            {mode === "leads" && <Badge className="text-[10px] bg-purple-600">Recommended</Badge>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pulls real, high-intent posts from <code>r/forhire</code>, <code>r/smallbusiness</code>, <code>r/entrepreneur</code>, <code>r/startups</code> & web for clients actively hiring website developers.
          </p>
        </div>

        <div
          onClick={() => { setMode("find"); setInput((prev) => ({ ...prev, mode: "find", niche: "Dentist", city: "Mumbai" })); }}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            mode === "find"
              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
              : "border-border/80 bg-card hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${mode === "find" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                A
              </div>
              <span className="font-semibold text-sm">Option A: Local Businesses (Google Maps)</span>
            </div>
            {mode === "find" && <Badge variant="default" className="text-[10px]">Active</Badge>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Search businesses in a specific city (e.g. clinics, law firms, hotels) with zero website or slow mobile loading times.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Search Controls */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Discovery Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="niche" className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {mode === "leads" ? "Search Topic / Skill" : "Business Niche"}
              </Label>
              <Input
                id="niche"
                autoComplete="off"
                value={input.niche}
                onChange={(e) => setInput({ ...input, niche: e.target.value })}
                placeholder={mode === "leads" ? "e.g. website, e-commerce, redesign" : "e.g. Dentist, Lawyer, Hotel"}
                className="h-10 text-sm"
              />
            </div>

            {/* Quick Filter chips for Option B */}
            {mode === "leads" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Quick Filters:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        const clean = f.toLowerCase().replace(/all website requests/i, "website developer").replace(/&/g, "");
                        setInput({ ...input, niche: clean });
                        runScrape(clean);
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-muted/60 hover:bg-purple-500/10 hover:text-purple-600 border border-border/80 transition-colors"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Scope / Location</Label>
              <Input
                id="city"
                autoComplete="off"
                value={input.city}
                onChange={(e) => setInput({ ...input, city: e.target.value })}
                placeholder="Leave blank for Global / Remote search"
                className="h-10 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Leave blank for <strong>Global search</strong>, or type a specific city/country (e.g. <em>Mumbai, London, Dubai</em>).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count" className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Number of Leads</Label>
              <Input
                id="count"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={input.count}
                onChange={(e) => setInput({ ...input, count: Number(e.target.value) })}
                className="h-10 text-sm font-mono tabular-nums"
              />
            </div>

            <Button
              onClick={() => runScrape()}
              disabled={loading}
              className={`w-full h-11 transition-all ${mode === "leads" ? "bg-purple-600 hover:bg-purple-700 text-white font-semibold" : ""}`}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {mode === "leads" ? "Searching Reddit & Global Posts..." : "Scraping Maps..."}</>
              ) : (
                mode === "leads" ? "Search Global Intent Leads (Free)" : "Find Businesses"
              )}
            </Button>

            {/* Source status pill */}
            {sourceMeta && !loading && (
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded-md border flex-1 ${sourceMeta.color}`}>
                  {sourceMeta.icon}
                  {sourceMeta.label}
                </div>
                <SettingsModal />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <Stat label="Total Found" value={leads.length} />
              <Stat label="Hot / Ready" value={highValueLeads.length} highlight />
              <Stat label="Need Site" value={leads.length} />
            </div>
          </CardContent>
        </Card>

        {/* Results Full Width Table */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">
                {mode === "leads" ? "Active Website Inquiries & Job Posts" : "Discovered Businesses"}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {mode === "leads" ? "Real people requesting website development or redesign online" : "Local businesses analyzed from Google Maps"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{leads.length} prospects loaded</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Prospect / Source</TableHead>
                    <TableHead>Contact / Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Intent Score</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l, i) => (
                    <TableRow key={l.id} className={`border-b border-border/60 animate-in fade-in duration-200 ${l.highValue ? "bg-purple-500/5" : ""}`}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {l.highValue && (
                            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Priority Lead" />
                          )}
                          <div>
                            <div className="font-medium text-xs line-clamp-1">{l.name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate max-w-[180px]">{l.address}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          {l.email ? (
                            <span className="flex items-center gap-1 text-[11px] text-blue-500 font-mono font-medium">
                              <Mail className="h-3 w-3 shrink-0" /> {l.email}
                            </span>
                          ) : l.phone ? (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Phone className="h-3 w-3 shrink-0" /> {l.phone}
                            </span>
                          ) : (
                            <span className="text-[11px] text-purple-600 font-medium">Direct Platform DM</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded bg-muted/50 border border-border/60">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate max-w-[120px]">{l.city || "Global / Remote"}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-mono">
                          {l.reviewsCount ? `${l.reviewsCount}% Intent` : "High Intent"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.website ? (
                          <a
                            href={l.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <span>Open Post</span> <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Ready</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {leads.length === 0 && !loading && (
                <div className="text-center py-16 text-xs text-muted-foreground">
                  Click <span className="font-semibold text-foreground">&quot;Search Global Intent Leads (Free)&quot;</span> to discover live people requesting websites right now.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PhaseShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-2.5 py-2 ${highlight && value > 0 ? "border-purple-500/40 bg-purple-500/8" : "border-border"}`}>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className={`font-display text-xl tabular-nums mt-0.5 ${highlight && value > 0 ? "text-purple-400" : ""}`}>{value}</div>
    </div>
  );
}
