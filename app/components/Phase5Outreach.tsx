"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PhaseShell } from "./PhaseShell";
import { IncompleteState } from "./IncompleteState";
import { ClaudeThinking, ClaudeRequired } from "./ClaudeStates";
import {
  Mail, MessageSquare, Copy, ExternalLink, Clock,
  Sparkles, CheckCircle2, Globe, Send, Bell, Check
} from "lucide-react";
import type { RankedLead, OutreachResult } from "@/lib/types";
import { callClaude } from "@/lib/claudeClient";
import { sendEmailViaEmailJS, getEmailConfig } from "@/lib/emailNotifier";
import { notifyTelegramHotLead } from "@/lib/telegramNotifier";
import { updateCRMStatus, addToCRM } from "@/lib/crm";
import { toast } from "sonner";

export function Phase5Outreach({
  selected,
  liveDemoUrl,
  onPrev,
}: {
  selected: RankedLead | null;
  liveDemoUrl?: string;
  onPrev: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState(selected?.email || "");
  const [message, setMessage] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [bestSendTime, setBestSendTime] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notifyingMe, setNotifyingMe] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [notInstalled, setNotInstalled] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const lastFor = useRef<string>("");

  const emailConfig = getEmailConfig();
  const yourEmail = emailConfig.yourEmail || "localdev935@gmail.com";

  // Determine fallback active demo url
  const activeDemoUrl = liveDemoUrl || (selected ? `/demo/${selected.id}?name=${encodeURIComponent(selected.name)}&cat=${encodeURIComponent(selected.category)}&city=${encodeURIComponent(selected.city)}` : "");

  // Update recipient email and clear drafts when lead changes
  useEffect(() => {
    if (selected) {
      setRecipientEmail(selected.email || "");
    }
    const key = `${selected?.id ?? ""}`;
    if (key !== lastFor.current) {
      setMessage("");
      setFollowUp("");
      setBestSendTime("");
      setSentSuccess(false);
    }
  }, [selected]);

  async function generate() {
    if (!selected) return;
    setGenerating(true);
    setNotInstalled(false);
    setClaudeError(null);
    const res = await callClaude<OutreachResult>("/api/outreach", {
      lead: selected,
      channel: "email",
      language: "english",
    });
    setGenerating(false);
    if (!res.ok) {
      if (res.notInstalled) setNotInstalled(true);
      else setClaudeError(res.error);
      toast.error(res.notInstalled ? "Claude Code required" : "Draft failed");
      return;
    }
    lastFor.current = `${selected.id}`;

    // Inject live demo URL
    let firstMsg = res.data.first;
    let followMsg = res.data.followUp;
    if (activeDemoUrl) {
      firstMsg = firstMsg.replace(/https:\/\/lead-launch\.demo\/[^\s]+/g, activeDemoUrl).replace(/\[your-demo-link\]/g, activeDemoUrl);
      followMsg = followMsg.replace(/https:\/\/lead-launch\.demo\/[^\s]+/g, activeDemoUrl).replace(/\[your-demo-link\]/g, activeDemoUrl);
    }

    setMessage(firstMsg);
    setFollowUp(followMsg);
    setBestSendTime(res.data.bestSendTime);

    // Save in CRM
    addToCRM(selected, {
      demoUrl: activeDemoUrl,
      outreachMessage: firstMsg,
      followUpMessage: followMsg,
      leadEmail: recipientEmail,
    });

    toast.success("Personalized pitch copy drafted");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }

  async function handleSendEmail() {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address above");
      return;
    }
    setSendingEmail(true);

    const subject = `Built a complimentary website demo for you (${selected?.name})`;

    const res = await sendEmailViaEmailJS({
      toEmail: recipientEmail,
      toName: selected?.name,
      subject,
      body: message,
      replyTo: yourEmail,
    });

    setSendingEmail(false);

    if (res.ok) {
      setSentSuccess(true);
      if (selected) {
        updateCRMStatus(selected.id, "messaged", {
          demoUrl: activeDemoUrl,
          outreachMessage: message,
          leadEmail: recipientEmail,
        });
      }
      if (res.method === "emailjs") {
        toast.success(`Pitch email dispatched directly to ${recipientEmail}! Replies will come to ${yourEmail}.`);
      } else if (res.fallback) {
        window.open(res.fallback, "_blank");
        toast.info(`Opened draft in your email client (Reply-To: ${yourEmail})`);
      }
    } else {
      if (res.fallback) {
        window.open(res.fallback, "_blank");
        toast.info("Opened in your email client");
      } else {
        toast.error(res.error || "Email sending failed");
      }
    }
  }

  async function handleNotifyMe() {
    if (!selected) return;
    setNotifyingMe(true);
    try {
      await notifyTelegramHotLead({
        name: selected.name,
        category: selected.category,
        city: selected.city,
        phone: selected.phone,
        email: recipientEmail,
        score: selected.score,
        gap: selected.audit?.biggestGap,
        estRevenue: selected.audit?.estLostRevenuePerMonth,
        demoUrl: activeDemoUrl,
        postUrl: selected.website,
      });
      toast.success("Lead alert sent to your Telegram!");
    } catch {
      toast.error("Failed to send Telegram alert. Check Settings.");
    } finally {
      setNotifyingMe(false);
    }
  }

  function openDirectPlatformMessage() {
    if (!selected) return;
    if (selected.website && selected.website.includes("reddit.com")) {
      const author = selected.name.replace(/^u\//, "");
      const composeUrl = `https://www.reddit.com/message/compose/?to=${encodeURIComponent(author)}&subject=${encodeURIComponent("Complimentary Website Demo")}&message=${encodeURIComponent(message)}`;
      window.open(composeUrl, "_blank");
      updateCRMStatus(selected.id, "messaged", { demoUrl: activeDemoUrl, outreachMessage: message });
    } else if (selected.website) {
      window.open(selected.website, "_blank");
      updateCRMStatus(selected.id, "messaged", { demoUrl: activeDemoUrl, outreachMessage: message });
    } else {
      copy(message);
    }
  }

  if (!selected) {
    return (
      <PhaseShell
        title="Phase 5 — Outreach"
        subtitle="Generates a personalized pitch email with your live demo link and routes replies straight to your inbox."
        onPrev={onPrev}
      >
        <IncompleteState
          title="No lead selected yet"
          description="Outreach is written per-lead using the name, biggest gap, and live demo link. Run the earlier phases and pick a prospect in Phase 3."
          prevPhaseLabel="Rank"
          onPrev={onPrev}
        />
      </PhaseShell>
    );
  }

  const hasDrafts = !!message || !!followUp;

  return (
    <PhaseShell
      title="Phase 5 — Direct Client Outreach"
      subtitle="Send your tailored pitch email directly to the prospect. Client replies will land directly in your email inbox."
      onPrev={onPrev}
    >
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Prospect Contact</div>
          <div className="font-display text-2xl mt-1 flex items-center gap-2">
            {selected.name}
            <Badge variant="secondary" className="text-xs font-normal">{selected.category}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>Replies go to: <strong className="text-foreground">{yourEmail}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNotifyMe}
            disabled={notifyingMe}
            className="h-9 text-xs gap-1.5 border-sky-500/40 text-sky-500 hover:bg-sky-500/10"
          >
            <Bell className="h-3.5 w-3.5" /> {notifyingMe ? "Sending…" : "Alert My Telegram"}
          </Button>

          {selected.website && (
            <Button
              variant="outline"
              size="sm"
              onClick={openDirectPlatformMessage}
              className="h-9 text-xs gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Send Direct Message ↗
            </Button>
          )}
        </div>
      </div>

      {/* Recipient Email & Live Demo Status */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <Label className="text-xs font-medium flex items-center justify-between">
            <span>Recipient Email Address</span>
            <span className="text-[10px] text-muted-foreground">Where to send pitch</span>
          </Label>
          <Input
            placeholder="client@gmail.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>

        {activeDemoUrl && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-emerald-600" /> Pitch Demo Attached
              </div>
              <div className="font-mono text-[11px] text-slate-600 truncate max-w-[260px] sm:max-w-xs mt-0.5">
                {activeDemoUrl}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => window.open(activeDemoUrl, "_blank")} className="h-7 text-xs text-emerald-700 hover:text-emerald-800">
              Preview ↗
            </Button>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="text-xs text-muted-foreground">
          {hasDrafts ? "Review and click Send Pitch Email below:" : "Click below to draft pitch copy:"}
        </div>
        <Button onClick={generate} disabled={generating} className="h-9 px-4 text-xs font-semibold">
          {generating ? "Drafting Pitch…" : hasDrafts ? "Regenerate Copy" : "Draft Pitch Email"}
        </Button>
      </div>

      {generating && <div className="mb-6"><ClaudeThinking label="Drafting high-converting pitch copy…" /></div>}
      {notInstalled && <div className="mb-6"><ClaudeRequired error={claudeError ?? undefined} onRetry={generate} /></div>}
      {claudeError && !notInstalled && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {claudeError}
        </div>
      )}

      {!hasDrafts && !generating && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="font-display text-xl mb-1">Ready to craft outreach email</div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Click &ldquo;Draft Pitch Email&rdquo; above to generate a personalized email pitch with your live demo link.
            </p>
          </CardContent>
        </Card>
      )}

      {hasDrafts && !generating && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60 flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">Pitch Email Message</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Hook → Value Proposition → Live Demo Link → Call to Action</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(message)} className="h-8 text-xs">
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <Send className="h-3 w-3 mr-1" /> {sendingEmail ? "Sending…" : "Send Pitch Email"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="font-mono text-xs leading-relaxed min-h-[260px] bg-muted/20"
                />
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <CardTitle className="text-base font-semibold">Day-3 Follow-Up Email</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Short follow-up reminder if client hasn&apos;t replied</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => copy(followUp)} className="h-8 text-xs">
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <Textarea
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="font-mono text-xs leading-relaxed min-h-[260px] bg-muted/20"
                />
              </CardContent>
            </Card>
          </div>

          {bestSendTime && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border">
              <Clock className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
              <span><strong>Optimal Send Window:</strong> {bestSendTime}</span>
            </div>
          )}

          {/* Pipeline Complete Banner */}
          <Card className="mt-6 bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="py-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                      <span>Pipeline Complete for {selected.name}</span>
                      {sentSuccess && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          <Check className="h-2.5 w-2.5 mr-1" /> Outreach Sent
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Lead recorded in CRM. All client replies will land in your personal inbox (<code>{yourEmail}</code>).
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/crm"}
                  className="h-8 text-xs bg-white hover:bg-slate-50 text-slate-900 border-slate-300"
                >
                  View in CRM Tracker ↗
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </PhaseShell>
  );
}
