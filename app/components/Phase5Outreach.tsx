"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PhaseShell } from "./PhaseShell";
import { IncompleteState } from "./IncompleteState";
import { ClaudeThinking, ClaudeRequired } from "./ClaudeStates";
import { MessageCircle, Mail, Camera, Copy, ExternalLink, Clock, Sparkles, CheckCircle2, Globe } from "lucide-react";
import type { RankedLead, OutreachChannel, OutreachLanguage, OutreachResult } from "@/lib/types";
import { callClaude } from "@/lib/claudeClient";
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
  const [channel, setChannel] = useState<OutreachChannel>("whatsapp");
  const [lang, setLang] = useState<OutreachLanguage>("hinglish");
  const [message, setMessage] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [bestSendTime, setBestSendTime] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notInstalled, setNotInstalled] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const lastFor = useRef<string>("");

  // Determine fallback active demo url
  const activeDemoUrl = liveDemoUrl || (selected ? `/demo/${selected.id}?name=${encodeURIComponent(selected.name)}&cat=${encodeURIComponent(selected.category)}&city=${encodeURIComponent(selected.city)}` : "");

  // Clear drafts when lead / channel / language changes
  useEffect(() => {
    const key = `${selected?.id ?? ""}:${channel}:${lang}`;
    if (key !== lastFor.current) {
      setMessage("");
      setFollowUp("");
      setBestSendTime("");
    }
  }, [selected, channel, lang]);

  async function generate() {
    if (!selected) return;
    setGenerating(true);
    setNotInstalled(false);
    setClaudeError(null);
    const res = await callClaude<OutreachResult>("/api/outreach", {
      lead: selected,
      channel,
      language: lang,
    });
    setGenerating(false);
    if (!res.ok) {
      if (res.notInstalled) setNotInstalled(true);
      else setClaudeError(res.error);
      toast.error(res.notInstalled ? "Claude Code required" : "Draft failed");
      return;
    }
    lastFor.current = `${selected.id}:${channel}:${lang}`;

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
    toast.success("Personalized outreach copy drafted");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }

  function openChannel() {
    if (!selected) return;
    if (channel === "whatsapp" && (selected.whatsapp || selected.phone)) {
      const num = (selected.whatsapp || selected.phone || "").replace(/\D/g, "");
      const waNum = num.startsWith("91") ? num : `91${num}`;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(message)}`, "_blank");
    } else if (channel === "email" && selected.email) {
      const subject = lang === "hinglish" ? `Aapke business ke liye ek website demo banayi hai (${selected.name})` : `Built a free website demo for ${selected.name}`;
      window.open(`mailto:${selected.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, "_blank");
    } else if (channel === "instagram") {
      window.open(`https://instagram.com/`, "_blank");
    } else {
      toast.error("No direct contact details for this channel");
    }
  }

  if (!selected) {
    return (
      <PhaseShell
        title="Phase 5 — Outreach"
        subtitle="Generates a personalized first message + day-3 follow-up, tailored to the lead with your live demo link."
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

  const channels: { id: OutreachChannel; label: string; icon: typeof MessageCircle; enabled: boolean }[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, enabled: !!(selected.whatsapp || selected.phone) },
    { id: "email", label: "Email", icon: Mail, enabled: !!selected.email },
    { id: "instagram", label: "Instagram", icon: Camera, enabled: true },
  ];

  const hasDrafts = !!message || !!followUp;

  return (
    <PhaseShell
      title="Phase 5 — Client Outreach"
      subtitle="Send your live pitch demo link to the owner over WhatsApp or Email. Hinglish converts highest for Indian small businesses."
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
          <div className="text-xs text-muted-foreground mt-0.5">
            {selected.phone ? `📞 ${selected.phone}` : ""}{selected.email ? ` · ✉️ ${selected.email}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 border border-border px-3 py-1.5 rounded-lg">
            <Label htmlFor="lang" className="text-xs text-muted-foreground">English</Label>
            <Switch id="lang" checked={lang === "hinglish"} onCheckedChange={(c) => setLang(c ? "hinglish" : "english")} />
            <Label htmlFor="lang" className="text-xs font-semibold text-foreground">Hinglish</Label>
          </div>
        </div>
      </div>

      {/* Live Demo Status Pill */}
      {activeDemoUrl && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold text-slate-900">Pitch Demo Link Attached:</span>
            <span className="font-mono text-slate-600 truncate max-w-sm sm:max-w-md">{activeDemoUrl}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => window.open(activeDemoUrl, "_blank")} className="h-6 text-xs text-emerald-700 hover:text-emerald-800">
            Preview Link ↗
          </Button>
        </div>
      )}

      {/* Channel Selector & Draft Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {channels.map(({ id, label, icon: Icon, enabled }) => (
            <Button
              key={id}
              variant={channel === id ? "default" : "outline"}
              size="sm"
              disabled={!enabled}
              onClick={() => setChannel(id)}
              className="h-9 text-xs"
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" /> {label}
            </Button>
          ))}
        </div>
        <Button onClick={generate} disabled={generating} className="h-9 px-4 text-xs font-semibold">
          {generating ? "Drafting…" : hasDrafts ? "Regenerate Outreach" : "Draft Outreach Copy"}
        </Button>
      </div>

      {generating && <div className="mb-6"><ClaudeThinking label="Drafting high-converting pitch copy…" /></div>}
      {notInstalled && <div className="mb-6"><ClaudeRequired error={claudeError ?? undefined} onRetry={generate} /></div>}
      {claudeError && !notInstalled && (
        <div className="mb-6 rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5 p-3 text-sm text-[color:var(--destructive)]" role="alert">
          {claudeError}
        </div>
      )}

      {!hasDrafts && !generating && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="font-display text-xl mb-1">Ready to draft personalized outreach</div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Click &ldquo;Draft Outreach Copy&rdquo; above to generate the initial pitch and day-3 follow-up containing your live demo link.
            </p>
          </CardContent>
        </Card>
      )}

      {hasDrafts && !generating && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <CardTitle className="text-base font-semibold">First Touch Message</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Hook → Compliment → Gap → Live Demo Link → Soft CTA</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(message)} className="h-8 text-xs">
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  <Button size="sm" onClick={openChannel} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <ExternalLink className="h-3 w-3 mr-1" /> Send on {channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "Instagram"}
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
                  <CardTitle className="text-base font-semibold">Day-3 Follow-Up</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Reminder → Cost of Inaction (₹/mo) → 5-min Call Ask</p>
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
              <span><strong>Best Send Window:</strong> {bestSendTime} (Highest open and response rate for Indian local business owners)</span>
            </div>
          )}

          {/* Pipeline Complete Banner */}
          <Card className="mt-6 bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900">Pipeline Complete for {selected.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Lead scraped → audited → ranked #1 → demo site hosted → outreach drafted with live link. Repeat for the next prospect in Phase 3!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </PhaseShell>
  );
}
