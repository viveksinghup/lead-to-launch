"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PhaseShell } from "./PhaseShell";
import { IncompleteState } from "./IncompleteState";
import { ClaudeThinking, ClaudeRequired } from "./ClaudeStates";
import { Crown, IndianRupee, MessageCircle, Phone, Mail, Sparkles, Send, CheckSquare, Square } from "lucide-react";
import type { Lead, AuditResult, RankedLead } from "@/lib/types";
import { callClaude } from "@/lib/claudeClient";
import { addToCRM, updateCRMStatus } from "@/lib/crm";
import { sendOutreachEmail } from "@/lib/emailNotifier";
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
  const [sendingEnquiries, setSendingEnquiries] = useState(false);
  const [notInstalled, setNotInstalled] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const [selectedEnquiryIds, setSelectedEnquiryIds] = useState<string[]>([]);

  const auditedCount = leads.filter((l) => audits[l.id]).length;

  // Auto-populate enquiry selections with Top 6 ranked leads whenever ranked updates
  useEffect(() => {
    if (ranked.length > 0 && selectedEnquiryIds.length === 0) {
      const top6 = ranked.slice(0, 6).map((l) => l.id);
      setSelectedEnquiryIds(top6);
    }
  }, [ranked]);

  function toggleEnquiryId(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedEnquiryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAllEnquiries() {
    if (selectedEnquiryIds.length === ranked.length) {
      setSelectedEnquiryIds([]);
    } else {
      setSelectedEnquiryIds(ranked.map((l) => l.id));
    }
  }

  async function sendEnquiries() {
    const targets = ranked.filter((l) => selectedEnquiryIds.includes(l.id));
    if (targets.length === 0) {
      toast.error("Please select at least 1 lead to send an enquiry");
      return;
    }

    setSendingEnquiries(true);
    let sentCount = 0;
    let failCount = 0;

    const storedSettingsRaw = typeof window !== "undefined" ? localStorage.getItem("lead_launch_settings") : null;
    const storedSettings = storedSettingsRaw ? JSON.parse(storedSettingsRaw) : {};
    const yourName = storedSettings.yourName || "Vik";

    for (const lead of targets) {
      const leadEmail = lead.email || `${lead.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`;
      const subject = `Website & Growth Enquiry for ${lead.name}`;
      const pitchBody = `Hi ${lead.name},\n\nI noticed your business in ${lead.city} has high local demand (${lead.reviewsCount || 40} reviews) but is missing an optimized website with 1-click WhatsApp booking.\n\nWe estimated that an updated web presence can capture an additional ₹${(lead.audit?.estLostRevenuePerMonth || 45000).toLocaleString("en-IN")}/mo in client inquiries.\n\nWould you be open to a 5-minute call or a free custom demo?\n\nBest regards,\n${yourName}`;

      const res = await sendOutreachEmail({
        leadEmail,
        leadName: lead.name,
        subject,
        pitchBody,
      });

      if (res.ok) {
        sentCount++;
        // Update status in CRM to messaged
        updateCRMStatus(lead.id, "messaged");
      } else {
        failCount++;
      }
    }

    setSendingEnquiries(false);
    if (sentCount > 0) {
      toast.success(`🚀 Enquiry sent to ${sentCount} prospect${sentCount > 1 ? "s" : ""}! Replies will land in ${storedSettings.yourEmail || "localdev935@gmail.com"}.`);
    } else if (failCount > 0) {
      toast.error("Failed to send enquiry emails. Check EmailJS settings.");
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

    // Auto-select top prospect for site building
    if (rankedList.length > 0 && !selectedId) {
      setSelectedId(rankedList[0].id);
    }
    // Auto-select top 6 for enquiries
    setSelectedEnquiryIds(rankedList.slice(0, 6).map((l) => l.id));

    // Auto-save all ranked leads to CRM
    for (const item of rankedList) {
      addToCRM(item);
    }

    toast.success("Top prospects ranked & saved to CRM!");
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
      subtitle="Scores each lead on conversion potential and explains why. Pick one to build for or send enquiries to multiple prospects."
      onPrev={onPrev}
      onNext={onNext}
      nextDisabled={!selectedId}
      nextLabel="Build website"
    >
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="text-sm text-muted-foreground font-medium">
          {ranked.length > 0
            ? `${ranked.length} prospects ranked · ${selectedEnquiryIds.length} selected for enquiry`
            : `${auditedCount} audited lead${auditedCount === 1 ? "" : "s"} ready to rank`}
        </div>
        <div className="flex items-center gap-2">
          {ranked.length > 0 && (
            <Button
              size="sm"
              onClick={sendEnquiries}
              disabled={sendingEnquiries || selectedEnquiryIds.length === 0}
              className="h-10 px-4 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Send className="h-4 w-4" />
              {sendingEnquiries ? "Sending Enquiries..." : `Send Enquiry (${selectedEnquiryIds.length})`}
            </Button>
          )}
          <Button onClick={runRank} disabled={running} variant="outline" className="h-10 px-4">
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
          {/* Top 6 Ranked Leads Grid */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Top 6 High-Conversion Prospects</span>
            <span className="text-xs text-muted-foreground">Click card to select for Website Building</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {ranked.slice(0, 6).map((lead, i) => {
              const isChecked = selectedEnquiryIds.includes(lead.id);
              const isSelectedForBuild = selectedId === lead.id;

              return (
                <div key={lead.id} className="animate-in fade-in duration-300">
                  <Card
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelectedForBuild}
                    onClick={() => setSelectedId(lead.id)}
                    className={`h-full cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 relative ${
                      isSelectedForBuild
                        ? "ring-2 ring-primary border-primary/40 bg-primary/5"
                        : "hover:border-primary/30"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xs flex items-center gap-1.5 font-semibold uppercase text-muted-foreground">
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          Rank · {String(i + 1).padStart(2, "0")}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => toggleEnquiryId(lead.id, e)}
                            className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                            title="Toggle select for Send Enquiry"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600 fill-emerald-600/10" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <div className="font-display text-2xl tabular-nums leading-none font-bold text-foreground">
                            {lead.score}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="font-semibold text-sm leading-snug line-clamp-1">{lead.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{lead.address}</div>

                      {lead.scoreReasoning && (
                        <div className="mt-2.5 rounded-md bg-muted/60 border border-border/80 p-2 text-[11px] text-muted-foreground italic leading-relaxed line-clamp-2">
                          {lead.scoreReasoning}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-medium text-emerald-600">
                          <IndianRupee className="h-3 w-3" />₹{lead.audit.estLostRevenuePerMonth.toLocaleString("en-IN")}/mo
                        </span>
                        <span className="text-muted-foreground font-mono">{lead.reviewsCount} reviews</span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-xs">
                        <div className="flex gap-1.5">
                          {lead.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                          {lead.whatsapp && <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                          {lead.email && <Mail className="h-3.5 w-3.5 text-blue-500 font-bold" />}
                        </div>
                        {isSelectedForBuild && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">Target for Build</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Table of All Ranked Prospects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">All Ranked Prospects</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAllEnquiries}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {selectedEnquiryIds.length === ranked.length ? "Deselect All" : "Select All for Enquiry"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Enquiry</TableHead>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Business & Opportunity</TableHead>
                      <TableHead className="w-[180px]">Score</TableHead>
                      <TableHead>₹ Lost / mo</TableHead>
                      <TableHead>Email Contact</TableHead>
                      <TableHead className="text-right">Build Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranked.map((lead, i) => {
                      const isChecked = selectedEnquiryIds.includes(lead.id);
                      const isSelectedForBuild = selectedId === lead.id;

                      return (
                        <TableRow
                          key={lead.id}
                          className={`border-b border-border cursor-pointer transition-colors duration-150 hover:bg-muted/40 ${
                            isSelectedForBuild ? "bg-primary/5 font-medium" : ""
                          }`}
                          onClick={() => setSelectedId(lead.id)}
                        >
                          <TableCell className="align-top pt-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleEnquiryId(lead.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium tabular-nums align-top pt-3">{i + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium text-xs">{lead.name}</div>
                            <div className="text-[11px] text-muted-foreground">{lead.reviewsCount} reviews · {lead.rating}★</div>
                            {lead.scoreReasoning && (
                              <div className="text-[11px] text-muted-foreground/80 italic mt-0.5 max-w-md line-clamp-1">{lead.scoreReasoning}</div>
                            )}
                          </TableCell>
                          <TableCell className="align-top pt-3">
                            <div className="flex items-center gap-2">
                              <div className="relative h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  style={{ width: `${lead.score}%` }}
                                  className="h-full bg-primary transition-all duration-500 ease-out"
                                />
                              </div>
                              <span className="font-mono text-xs tabular-nums w-8 text-right font-bold">{lead.score}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-xs align-top pt-3 text-emerald-600 font-semibold">
                            ₹{lead.audit.estLostRevenuePerMonth.toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="align-top pt-3 text-xs">
                            {lead.email ? (
                              <span className="text-[11px] text-blue-500 font-mono flex items-center gap-1">
                                <Mail className="h-3 w-3 shrink-0" /> {lead.email}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {lead.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}@gmail.com
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-top pt-2.5">
                            <Button
                              size="sm"
                              variant={isSelectedForBuild ? "default" : "outline"}
                              className="h-7 text-xs px-2.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(lead.id);
                              }}
                            >
                              {isSelectedForBuild ? "Selected" : "Select Target"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
