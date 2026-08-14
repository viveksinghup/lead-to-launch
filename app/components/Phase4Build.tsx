"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PhaseShell } from "./PhaseShell";
import { IncompleteState } from "./IncompleteState";
import { ClaudeThinking, ClaudeRequired } from "./ClaudeStates";
import { Copy, ExternalLink, Sparkles, Check, Smartphone, Tablet, Monitor, Rocket, Download, Globe, CheckCircle2 } from "lucide-react";
import type { RankedLead, BuildPromptResult } from "@/lib/types";
import { callClaude } from "@/lib/claudeClient";
import { generateDemoHtml } from "@/lib/demoGenerator";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "lovable", label: "Lovable", url: "https://lovable.dev" },
  { id: "claude-code", label: "Claude Code", url: "https://claude.com/claude-code" },
  { id: "bolt", label: "Bolt.new", url: "https://bolt.new" },
  { id: "codex", label: "Codex", url: "https://chat.openai.com" },
];

export function Phase4Build({
  selected,
  liveDemoUrl,
  onSetLiveDemoUrl,
  onNext,
  onPrev,
}: {
  selected: RankedLead | null;
  liveDemoUrl?: string;
  onSetLiveDemoUrl?: (url: string) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [platform, setPlatform] = useState("lovable");
  const [prompt, setPrompt] = useState("");
  const [pitchPoints, setPitchPoints] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string>(liveDemoUrl || "");
  const [viewport, setViewport] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [notInstalled, setNotInstalled] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const lastFor = useRef<string>("");

  // Generate realistic HTML preview
  const demoHtml = useMemo(() => {
    if (!selected) return "";
    return generateDemoHtml(selected);
  }, [selected]);

  // Clear prompt when lead changes
  useEffect(() => {
    const key = `${selected?.id ?? ""}:${platform}`;
    if (key !== lastFor.current) {
      setPrompt("");
      setPitchPoints([]);
      setTyped("");
    }
  }, [selected, platform]);

  // Typewriter effect
  useEffect(() => {
    setTyped("");
    if (!prompt) return;
    let i = 0;
    const id = setInterval(() => {
      i += 12;
      setTyped(prompt.slice(0, i));
      if (i >= prompt.length) clearInterval(id);
    }, 8);
    return () => clearInterval(id);
  }, [prompt]);

  async function generate() {
    if (!selected) return;
    setGenerating(true);
    setNotInstalled(false);
    setClaudeError(null);
    const res = await callClaude<BuildPromptResult>("/api/build-prompt", { lead: selected, platform });
    setGenerating(false);
    if (!res.ok) {
      if (res.notInstalled) setNotInstalled(true);
      else setClaudeError(res.error);
      toast.error(res.notInstalled ? "Claude Code required" : "Generation failed");
      return;
    }
    lastFor.current = `${selected.id}:${platform}`;
    setPrompt(res.data.prompt);
    setPitchPoints(res.data.pitchPoints ?? []);
    toast.success("AI website builder prompt generated");
  }

  async function deployLiveDemo() {
    if (!selected) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deployment failed");

      const url = data.deployUrl;
      setDeployedUrl(url);
      if (onSetLiveDemoUrl) onSetLiveDemoUrl(url);
      toast.success("Live Pitch Demo Deployed! Ready to share with client.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeploying(false);
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied. Paste into " + PLATFORMS.find((p) => p.id === platform)?.label);
  }

  function copyLiveUrl() {
    if (!deployedUrl) return;
    navigator.clipboard.writeText(deployedUrl);
    toast.success("Live Demo URL copied to clipboard!");
  }

  function downloadHtml() {
    if (!demoHtml || !selected) return;
    const blob = new Blob([demoHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-demo.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Demo HTML downloaded!");
  }

  function openFullscreenPreview() {
    if (!selected) return;
    const url = deployedUrl || `/demo/${selected.id}?name=${encodeURIComponent(selected.name)}&cat=${encodeURIComponent(selected.category)}&city=${encodeURIComponent(selected.city)}`;
    window.open(url, "_blank");
  }

  function openPlatform() {
    const url = PLATFORMS.find((p) => p.id === platform)?.url;
    if (url) window.open(url, "_blank");
  }

  if (!selected) {
    return (
      <PhaseShell
        title="Phase 4 — Generate website"
        subtitle="Generates a tailored conversion landing page for your prospect with live 1-click free hosting."
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled
        nextLabel="Draft outreach"
      >
        <IncompleteState
          title="No lead selected yet"
          description="Run scrape, audit, and rank, then pick a prospect in Phase 3. We'll generate a production-ready website and 1-click free hosting here."
          prevPhaseLabel="Rank"
          onPrev={onPrev}
        />
      </PhaseShell>
    );
  }

  return (
    <PhaseShell
      title="Phase 4 — Generate & Host Website"
      subtitle="Preview your tailored pitch demo, deploy free with 1-click on Netlify/Vercel, and get a live link for outreach."
      onPrev={onPrev}
      onNext={onNext}
      nextLabel="Draft outreach"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Target Prospect</div>
          <div className="font-display text-2xl mt-1 flex items-center gap-2">
            {selected.name}
            <Badge variant="secondary" className="text-xs font-normal">{selected.category}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{selected.address}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={deployLiveDemo}
            disabled={deploying}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Rocket className="h-4 w-4 mr-2" />
            {deploying ? "Deploying Free Demo…" : deployedUrl ? "Redeploy Demo" : "Deploy Live Demo (Free)"}
          </Button>

          <Button
            variant="outline"
            onClick={openFullscreenPreview}
            className="h-10 px-3"
          >
            <ExternalLink className="h-4 w-4 mr-1.5" /> Full Screen
          </Button>

          <Button
            variant="outline"
            onClick={downloadHtml}
            className="h-10 px-3"
            title="Download index.html"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live Deployed Banner */}
      {deployedUrl && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Live Pitch Demo is Active</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5 break-all">{deployedUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyLiveUrl} className="bg-white hover:bg-slate-50">
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
            </Button>
            <Button size="sm" onClick={() => window.open(deployedUrl, "_blank")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Live Site
            </Button>
          </div>
        </div>
      )}

      {notInstalled && <div className="mb-6"><ClaudeRequired error={claudeError ?? undefined} onRetry={generate} /></div>}
      {claudeError && !notInstalled && (
        <div className="mb-6 rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5 p-3 text-sm text-[color:var(--destructive)]" role="alert">
          {claudeError}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Live Preview with Responsive Toggles */}
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Live Pitch Website
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">High-converting landing page tailored to {selected.category}</p>
            </div>

            {/* Viewport Toggles */}
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/80">
              <button
                onClick={() => setViewport("mobile")}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all ${viewport === "mobile" ? "bg-background font-semibold shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Mobile 375px view"
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
              <button
                onClick={() => setViewport("tablet")}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all ${viewport === "tablet" ? "bg-background font-semibold shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Tablet view"
              >
                <Tablet className="h-3.5 w-3.5" /> Tablet
              </button>
              <button
                onClick={() => setViewport("desktop")}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all ${viewport === "desktop" ? "bg-background font-semibold shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Desktop view"
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col items-center bg-muted/20">
            <div
              className={`rounded-xl overflow-hidden border border-slate-300 shadow-lg bg-white transition-all duration-300 ${
                viewport === "mobile"
                  ? "w-[375px] h-[640px]"
                  : viewport === "tablet"
                  ? "w-[768px] max-w-full h-[640px]"
                  : "w-full h-[640px]"
              }`}
            >
              <iframe
                title="Client Website Preview"
                srcDoc={demoHtml}
                className="w-full h-full border-0 bg-white"
              />
            </div>

            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-3">
              <span>✓ Working WhatsApp booking link</span>
              <span>•</span>
              <span>✓ Verified Google Reviews</span>
              <span>•</span>
              <span>✓ Local schema & timing</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: AI Prompt Generator & Pitch Points */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">AI Builder Prompt</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">For Lovable, Bolt.new, Claude Code, or Codex</p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
                  <SelectTrigger className="w-[125px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={generate} disabled={generating} className="h-8 text-xs">
                  {generating ? "Writing…" : prompt ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {generating ? (
                <ClaudeThinking label="Writing tailored builder prompt…" />
              ) : prompt ? (
                <div>
                  <div className="flex justify-end gap-2 mb-2">
                    <Button size="sm" variant="outline" onClick={openPlatform} className="h-7 text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" /> Open {PLATFORMS.find((p) => p.id === platform)?.label}
                    </Button>
                    <Button size="sm" onClick={copyPrompt} className="h-7 text-xs">
                      <Copy className="h-3 w-3 mr-1" /> Copy Prompt
                    </Button>
                  </div>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono bg-muted/40 rounded-lg p-3 max-h-[300px] overflow-y-auto border border-border">
                    {typed}
                    {typed.length < prompt.length && <span className="animate-pulse">▌</span>}
                  </pre>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div className="text-xs max-w-xs">
                    Want to build this in Lovable/Bolt? Click <span className="text-foreground font-semibold">Generate</span> to get the copy-paste prompt.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pitch Points Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                3 Pitch Points to Tell the Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {(pitchPoints.length > 0
                  ? pitchPoints
                  : [
                      `Converts mobile visitors directly into booked appointments via 1-click WhatsApp chat.`,
                      `Instantly boosts credibility by showcasing your ${selected.rating ?? 4.8}★ rating and ${selected.reviewsCount ?? 120}+ real Google reviews right on the hero fold.`,
                      `Loads in under 1 second on mobile networks with zero friction, replacing outdated competitors in ${selected.city}.`,
                    ]
                ).map((p, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" strokeWidth={2} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PhaseShell>
  );
}
