"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone, Mail, MessageCircle, Globe, Trash2,
  ExternalLink, Download, Clock, Copy, Plus
} from "lucide-react";
import {
  getAllCRMEntries, updateCRMStatus, updateCRMEntry,
  deleteCRMEntry, exportCRMAsCSV
} from "@/lib/crm";
import type { CRMEntry, CRMStatus } from "@/lib/types";
import { toast } from "sonner";

const COLUMNS: Array<{ id: CRMStatus; label: string; color: string; badge: string }> = [
  { id: "new", label: "New Leads", color: "border-slate-500/30 bg-slate-500/5", badge: "bg-slate-500/10 text-slate-400" },
  { id: "messaged", label: "Messaged", color: "border-blue-500/30 bg-blue-500/5", badge: "bg-blue-500/10 text-blue-400" },
  { id: "demo_sent", label: "Demo Sent", color: "border-indigo-500/30 bg-indigo-500/5", badge: "bg-indigo-500/10 text-indigo-400" },
  { id: "replied", label: "Replied", color: "border-purple-500/30 bg-purple-500/5", badge: "bg-purple-500/10 text-purple-400" },
  { id: "call_booked", label: "Call Booked", color: "border-amber-500/30 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-400" },
  { id: "won", label: "Won 🎉", color: "border-emerald-500/30 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-400" },
  { id: "lost", label: "Lost", color: "border-red-500/30 bg-red-500/5", badge: "bg-red-500/10 text-red-400" },
];

export function CRMBoard() {
  const [entries, setEntries] = useState<CRMEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CRMEntry | null>(null);
  const [noteText, setNoteText] = useState("");

  function refresh() {
    setEntries(getAllCRMEntries());
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleStatusChange(leadId: string, newStatus: CRMStatus) {
    updateCRMStatus(leadId, newStatus);
    refresh();
    toast.success(`Moved to ${newStatus.replace("_", " ")}`);
  }

  function handleDelete(leadId: string, name: string) {
    if (confirm(`Remove "${name}" from CRM?`)) {
      deleteCRMEntry(leadId);
      refresh();
      toast.success("Lead removed from CRM");
    }
  }

  function handleSaveNote() {
    if (!selectedEntry) return;
    updateCRMEntry(selectedEntry.leadId, { notes: noteText });
    refresh();
    setSelectedEntry(null);
    toast.success("Note saved");
  }

  function downloadCSV() {
    const csv = exportCRMAsCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CRM CSV exported!");
  }

  function copyPitch(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-semibold">Lead Pipeline & Deals</h2>
          <p className="text-xs text-muted-foreground">Track communication, demo links, and closing stages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV} className="h-8 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => window.location.href = "/"} className="h-8 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Find More Leads
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-display text-lg mb-1">No Leads in CRM Yet</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              When you scrape leads or draft pitches in Phase 5, they will automatically appear on this Kanban board for tracking.
            </p>
            <Button size="sm" onClick={() => window.location.href = "/"}>
              Start Lead Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnEntries = entries.filter((e) => e.status === col.id);

            return (
              <div key={col.id} className={`rounded-xl border ${col.color} p-3 flex flex-col min-w-[240px]`}>
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/60">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>{col.label}</span>
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${col.badge}`}>
                      {columnEntries.length}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1">
                  {columnEntries.map((entry) => {
                    const isOverdue =
                      (entry.status === "messaged" || entry.status === "demo_sent") &&
                      new Date().getTime() - new Date(entry.messagedAt || entry.lastUpdatedAt).getTime() > 3 * 24 * 3600 * 1000;

                    return (
                      <Card key={entry.id} className="bg-card shadow-sm border border-border/80 hover:border-primary/50 transition-colors">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="font-medium text-xs line-clamp-1">{entry.leadName}</div>
                              <div className="text-[10px] text-muted-foreground">{entry.leadCategory} · {entry.leadCity}</div>
                            </div>
                            {entry.score && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0 font-mono">
                                {entry.score}
                              </Badge>
                            )}
                          </div>

                          {/* 3-day reminder badge */}
                          {isOverdue && (
                            <div className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" /> Day-3 Follow-up due
                            </div>
                          )}

                          {/* Contact buttons */}
                          <div className="flex items-center gap-1 text-[11px] pt-1">
                            {entry.leadWhatsapp && (
                              <button
                                onClick={() => window.open(`https://wa.me/${entry.leadWhatsapp?.replace(/\D/g, "")}`, "_blank")}
                                className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </button>
                            )}
                            {entry.leadEmail && (
                              <button
                                onClick={() => window.open(`mailto:${entry.leadEmail}`, "_blank")}
                                className="p-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                                title="Email"
                              >
                                <Mail className="h-3 w-3" />
                              </button>
                            )}
                            {entry.leadPhone && (
                              <button
                                onClick={() => window.open(`tel:${entry.leadPhone}`, "_blank")}
                                className="p-1 rounded bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                                title="Phone"
                              >
                                <Phone className="h-3 w-3" />
                              </button>
                            )}
                            {entry.demoUrl && (
                              <button
                                onClick={() => window.open(entry.demoUrl, "_blank")}
                                className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1 text-[10px] px-1.5 ml-auto"
                                title="Live Demo"
                              >
                                <Globe className="h-3 w-3" /> Demo
                              </button>
                            )}
                          </div>

                          {/* Notes snippet */}
                          {entry.notes && (
                            <p className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded italic line-clamp-2">
                              &quot;{entry.notes}&quot;
                            </p>
                          )}

                          {/* Status Mover & Actions */}
                          <div className="pt-2 border-t flex items-center justify-between gap-1">
                            <Select value={entry.status} onValueChange={(val) => handleStatusChange(entry.leadId, val as CRMStatus)}>
                              <SelectTrigger className="h-6 text-[10px] px-2 w-[110px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {COLUMNS.map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setNoteText(entry.notes || "");
                                }}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                title="Add Note"
                              >
                                📝
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(entry.leadId, entry.leadName)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {columnEntries.length === 0 && (
                    <div className="text-center py-6 text-[11px] text-muted-foreground/60 border border-dashed rounded-lg">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Edit Modal */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Lead Notes — {selectedEntry.leadName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Discussed redesign pricing ₹35k, client prefers callback on Friday afternoon..."
                className="h-28 text-xs leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveNote} className="h-8 text-xs">
                  Save Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
