"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Mail, Phone, MessageCircle, Globe, Clock,
  Trash2, Send, CheckCircle2, IndianRupee, MapPin, ExternalLink, Calendar
} from "lucide-react";
import { updateCRMStatus, updateCRMEntry, deleteCRMEntry } from "@/lib/crm";
import { sendOutreachEmail, getPitchTemplate, getEmailConfig } from "@/lib/emailNotifier";
import type { CRMEntry, CRMStatus } from "@/lib/types";
import { toast } from "sonner";

export function CRMLeadDrawer({
  entry,
  open,
  onOpenChange,
  onRefresh,
}: {
  entry: CRMEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}) {
  if (!entry) return null;

  const [notes, setNotes] = useState(entry.notes || "");
  const [sendingEmail, setSendingEmail] = useState(false);

  const isOverdue =
    (entry.status === "messaged" || entry.status === "demo_sent") &&
    new Date().getTime() - new Date(entry.messagedAt || entry.lastUpdatedAt).getTime() > 3 * 24 * 3600 * 1000;

  function handleStatusChange(newStatus: CRMStatus) {
    updateCRMStatus(entry!.leadId, newStatus);
    onRefresh();
    toast.success(`Stage updated to ${newStatus.replace("_", " ")}`);
  }

  function handleSaveNote() {
    updateCRMEntry(entry!.leadId, { notes });
    onRefresh();
    toast.success("Notes saved!");
  }

  function handleDelete() {
    if (confirm(`Remove "${entry!.leadName}" from CRM?`)) {
      deleteCRMEntry(entry!.leadId);
      onRefresh();
      onOpenChange(false);
      toast.success("Lead removed from CRM");
    }
  }

  async function handleSendPitch() {
    if (!entry?.leadEmail) {
      toast.error("No email address saved for this lead");
      return;
    }
    setSendingEmail(true);

    const emailConfig = getEmailConfig();
    const yourName = emailConfig.yourName || "Vik";

    const pitchBody = entry.outreachMessage || getPitchTemplate({
      leadName: entry.leadName,
      leadCity: entry.leadCity,
      category: entry.leadCategory,
      demoUrl: entry.demoUrl || "http://localhost:3000",
      yourName,
    });

    const res = await sendOutreachEmail({
      leadEmail: entry.leadEmail,
      leadName: entry.leadName,
      subject: `Website Demo & Growth Proposal for ${entry.leadName}`,
      pitchBody,
    });

    setSendingEmail(false);
    if (res.ok) {
      updateCRMStatus(entry.leadId, "messaged");
      onRefresh();
      toast.success(`Outreach pitch sent to ${entry.leadEmail}!`);
    } else {
      toast.error("Failed to send pitch email. Check settings.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-bold">{entry.leadName}</DialogTitle>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <span>{entry.leadCategory}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{entry.leadCity}</span>
              </div>
            </div>
            {entry.score && (
              <Badge className="bg-purple-600 text-white font-mono font-bold text-xs">
                Score: {entry.score}/100
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isOverdue && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-500 font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Overdue Follow-Up: Contacted &gt; 3 days ago without reply. Reach out again!</span>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {/* Stage Selector & Revenue */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Deal Stage</Label>
              <Select value={entry.status} onValueChange={(val) => handleStatusChange(val as CRMStatus)}>
                <SelectTrigger className="h-8 text-xs font-semibold mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Lead</SelectItem>
                  <SelectItem value="messaged">Messaged</SelectItem>
                  <SelectItem value="demo_sent">Demo Sent</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="call_booked">Call Booked</SelectItem>
                  <SelectItem value="won">Won 🎉</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Lost Revenue Opp</Label>
              <div className="h-8 flex items-center gap-1 font-mono text-sm font-bold text-emerald-600 mt-1">
                <IndianRupee className="h-3.5 w-3.5" />
                {(entry.estRevenue || 45000).toLocaleString("en-IN")}/mo
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Quick Outreach</Label>
            <div className="flex flex-wrap gap-2">
              {entry.leadEmail && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSendPitch}
                  disabled={sendingEmail}
                  className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingEmail ? "Sending..." : "Send Pitch Email"}
                </Button>
              )}
              {entry.demoUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(entry.demoUrl, "_blank")}
                  className="h-8 text-xs gap-1.5 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                >
                  <Globe className="h-3.5 w-3.5" /> Preview Demo
                </Button>
              )}
              {entry.leadWhatsapp && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`https://wa.me/${entry.leadWhatsapp?.replace(/\D/g, "")}`, "_blank")}
                  className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              )}
              {entry.leadPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`tel:${entry.leadPhone}`, "_blank")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </Button>
              )}
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="space-y-1 text-xs border rounded-lg p-3 bg-card">
            <div className="font-semibold text-muted-foreground mb-1">Lead Contact Information</div>
            {entry.leadEmail && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-blue-500" /><span className="font-mono">{entry.leadEmail}</span></div>}
            {entry.leadPhone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-emerald-500" /><span>{entry.leadPhone}</span></div>}
            <div className="flex items-center gap-2 text-muted-foreground pt-1 text-[11px]">
              <Calendar className="h-3 w-3" /> Added {new Date(entry.addedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Notes & Meeting History */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes & Meeting Activity Log</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record call outcomes, meeting notes, client feedback, or agreed deal terms..."
              className="text-xs min-h-[90px]"
            />
            <Button size="sm" onClick={handleSaveNote} className="h-7 text-xs mt-1">
              Save Notes
            </Button>
          </div>

          <div className="pt-3 border-t flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
