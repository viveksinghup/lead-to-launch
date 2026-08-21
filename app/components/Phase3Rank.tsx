"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhaseShell } from "./PhaseShell";
import { IncompleteState } from "./IncompleteState";
import { ClaudeThinking, ClaudeRequired } from "./ClaudeStates";
import { Crown, IndianRupee, MessageCircle, Phone, Mail, Sparkles, Send, Bell } from "lucide-react";
import type { Lead, AuditResult, RankedLead } from "@/lib/types";
import { callClaude } from "@/lib/claudeClient";
import { addToCRM } from "@/lib/crm";
import { notifyTelegramDigest } from "@/lib/telegramNotifier";
import { sendLeadDigestToSelf } from "@/lib/emailNotifier";
import { toast } from "sonner";

export function Phase3Rank({
  leads,
  audits,
  ranked,
  setRanked,
  selectedId,
  setSelectedId,
  onNext,
  onPrev,
}: {
  leads: Lead[];
  audits: Record<string, AuditResult>;
  ranked: RankedLead[];
  setRanked: (r: RankedLead[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notInstalled, setNotInstalled] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);

  const auditedCount = leads.filter((l) => audits[l.id]).length;

  async function notifyMe() {
    if (ranked.length === 0) return;
    setNotifying(true);
    try {
      const storedSettingsRaw = typeof window !== "undefined" ? localStorage.getItem("lead_launch_settings") : null;
      const storedSettings = storedSettingsRaw ? JSON.parse(storedSettingsRaw) : {};

      // 1. Send Telegram Notification
      await notifyTelegramDigest(
        ranked.slice(0, 5).map((l) => ({
          name: l.name,
          category: l.category,
          city: l.city,
          phone: l.phone,
          email: l.email,
          whatsapp: l.whatsapp,
          score: l.score,
          gap: l.audit?.biggestGap,
          estRevenue: l.audit?.estLostRevenuePerMonth,
        }))
      );

      // 2. Send Email Digest if configured
      if (storedSettings.yourEmail && storedSettings.emailjsServiceId) {
        await sendLeadDigestToSelf({
          yourName: storedSettings.yourName || "Vivek",
          yourEmail: storedSettings.yourEmail,
          leads: ranked.slice(0, 5).map((l) => ({
            name: l.name,
            category: l.category,
            city: l.city,
            phone: l.phone,
            email: l.email,
            score: l.score,
            pitchMessage: l.scoreReasoning || "",
            estRevenue: l.audit?.estLostRevenuePerMonth,
          })),
        });
      }

      toast.success("Hot leads digest sent to your Telegram & Email!");
    } catch {
      toast.error("Could not complete notifications. Check Settings.");
    } finally {
      setNotifying(false);
    }
  }

  async function runRank() {
    setRunning(true);
    setNotInstalled(false);
    setClaudeError(null);
    const res = await callClaude<{ ranked: RankedLead[] }>("/api/rank", { leads, audits });
    setRunning(false);
    if (!res.ok) {
      if (res.notInstalled) setNotInstalled(true);
      else setClaudeError(res.error);
      toast.error(res.notInstalled ? "Claude Code required" : "Ranking failed");
      return;
    }
    const rankedList = res.data.ranked;
    setRanked(rankedList);

    // Auto-select the #1 top prospect
    if (rankedList.length > 0 && !selectedId) {
      setSelectedId(rankedList[0].id);
    }

    // Auto-save all ranked leads to CRM
    for (const item of rankedList) {
      addToCRM(item);
    }

    toast.success("Prospects ranked & saved to CRM!");
  }

  // No audits yet → nothing to rank
  if (auditedCount === 0) {
    return (
      <PhaseShell
        title="Phase 3 — Ranked prospects"
        subtitle="Scores each lead on conversion potential — site quality, review volume, reachability, and category fit — then ranks them."
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled
        nextLabel="Build website"
      >
        <IncompleteState
          title={leads.length === 0 ? "No leads scraped yet" : "No audits yet"}
          description={
            leads.length === 0
              ? "Run Phases 1 and 2 first. Once leads are scraped and audited, they are ranked by conversion potential here."
              : "Run an audit in Phase 2 first. Then the audited leads are ranked by how likely they are to convert and how much a website would help them."
          }
          prevPhaseLabel={leads.length === 0 ? "Scrape" : "Audit"}
          onPrev={onPrev}
        />
      </PhaseShell>
    );
  }

  return (
    <PhaseShell
      title="Phase 3 — Ranked prospects"
      subtitle="Scores each lead on conversion potential and explains why. Pick one to build for."
      onPrev={onPrev}
      onNext={onNext}
      nextDisabled={!selectedId}
      nextLabel="Build website"
    >
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {ranked.length > 0
            ? `${ranked.length} prospects ranked`
            : `${auditedCount} audited lead${auditedCount === 1 ? "" : "s"} ready to rank`}
        </div>
        <div className="flex items-center gap-2">
          {ranked.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={notifyMe}
              disabled={notifying}
              className="h-10 px-3 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
            >
              <Bell className="h-4 w-4" /> {notifying ? "Sending Alerts…" : "Send to My Email & Telegram"}
            </Button>
          )}
          <Button onClick={runRank} disabled={running} className="h-10 px-4">
            {running ? "Ranking…" : ranked.length > 0 ? "Re-rank prospects" : "Rank prospects"}
          </Button>
        </div>
      </div>

      {running && <div className="mb-6"><ClaudeThinking label="Ranking your prospects by conversion opportunity…" /></div>}
      {notInstalled && <div className="mb-6"><ClaudeRequired error={claudeError ?? undefined} onRetry={runRank} /></div>}
      {claudeError && !notInstalled && (
        <div className="mb-6 rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5 p-3 text-sm text-[color:var(--destructive)]" role="alert">
          {claudeError}
        </div>
      )}

      {ranked.length === 0 && !running && !notInstalled && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="font-display text-xl mb-1">Ready to rank</div>
            <p className="text-sm text-muted-foreground">Hit &ldquo;Rank prospects&rdquo; above to score and sort your leads.</p>
          </CardContent>
        </Card>
      )}

      {ranked.length > 0 && (
        <>
          <div className="grid lg:grid-cols-3 gap-4 mb-4">
            {ranked.slice(0, 3).map((lead, i) => (
              <div key={lead.id} className="animate-in fade-in duration-300">
                <Card
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedId === lead.id}
                  aria-label={`Select rank ${i + 1}: ${lead.name}`}
                  onClick={() => setSelectedId(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(lead.id);
                    }
                  }}
                  className={`h-full cursor-pointer transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:-translate-y-0.5 ${
                    selectedId === lead.id ? "ring-1 ring-primary border-primary/30" : "hover:border-primary/30"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm flex items-center gap-2 font-medium tracking-wide uppercase text-muted-foreground">
                        <Crown className="h-3.5 w-3.5 text-[color:var(--chart-4)]" strokeWidth={1.5} />
                        Rank · {String(i + 1).padStart(2, "0")}
                      </CardTitle>
                      <div className="font-display text-3xl tabular-nums leading-none">{lead.score}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="font-medium text-base leading-snug">{lead.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{lead.address}</div>
                    {lead.scoreReasoning && (
                      <div className="mt-3 rounded-md bg-muted/50 border border-border p-2.5 text-xs text-muted-foreground italic leading-relaxed">
                        {lead.scoreReasoning}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3 text-muted-foreground" />{lead.audit.estLostRevenuePerMonth.toLocaleString("en-IN")}/mo</span>
                      <span className="text-border">·</span>
                      <span className="text-muted-foreground">{lead.reviewsCount} reviews</span>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {lead.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />}
                      {lead.whatsapp && <MessageCircle className="h-3.5 w-3.5 text-[color:var(--accent-foreground)]" strokeWidth={1.5} />}
                      {lead.email && <Mail className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All ranked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead className="w-[220px]">Score</TableHead>
                      <TableHead>₹ Lost / mo</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead className="text-right">Select</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranked.map((lead, i) => (
                      <TableRow
                        key={lead.id}
                        aria-selected={selectedId === lead.id}
                        className={`border-b border-border cursor-pointer transition-colors duration-150 hover:bg-muted/40 ${selectedId === lead.id ? "bg-primary/5" : ""}`}
                        onClick={() => setSelectedId(lead.id)}
                      >
                        <TableCell className="font-medium tabular-nums align-top pt-3">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.reviewsCount} reviews · {lead.rating}★</div>
                          {lead.scoreReasoning && (
                            <div className="text-xs text-muted-foreground/80 italic mt-1 max-w-md">{lead.scoreReasoning}</div>
                          )}
                        </TableCell>
                        <TableCell className="align-top pt-3.5">
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div
                                style={{ width: `${lead.score}%` }}
                                className="h-full bg-primary transition-all duration-500 ease-out"
                              />
                            </div>
                            <span className="font-mono text-sm tabular-nums w-9 text-right">{lead.score}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-sm align-top pt-3">₹{lead.audit.estLostRevenuePerMonth.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="align-top pt-3">
                          {lead.audit.hasWebsite ? (
                            <Badge variant="secondary" className="text-xs font-normal">{lead.audit.pageSpeedScore} PageSpeed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-normal text-[color:var(--destructive)] border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5">None</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top pt-2.5">
                          <Button
                            size="sm"
                            variant={selectedId === lead.id ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(lead.id);
                            }}
                          >
                            {selectedId === lead.id ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </PhaseShell>
  );
}
