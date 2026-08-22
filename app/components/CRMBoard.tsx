"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Phone, Mail, MessageCircle, Globe, Trash2,
  ExternalLink, Download, Clock, Plus, Search,
  LayoutGrid, ListFilter, IndianRupee, Edit3, Send
} from "lucide-react";
import {
  getAllCRMEntries, updateCRMStatus, deleteCRMEntry, exportCRMAsCSV
} from "@/lib/crm";
import { CRMLeadDrawer } from "./CRMLeadDrawer";
import type { CRMEntry, CRMStatus } from "@/lib/types";
import { toast } from "sonner";

const COLUMNS: Array<{ id: CRMStatus; label: string; color: string; badge: string }> = [
  { id: "new", label: "New Leads", color: "border-slate-500/20 bg-slate-500/5", badge: "bg-slate-500/10 text-slate-400" },
  { id: "messaged", label: "Messaged", color: "border-blue-500/20 bg-blue-500/5", badge: "bg-blue-500/10 text-blue-400" },
  { id: "demo_sent", label: "Demo Sent", color: "border-indigo-500/20 bg-indigo-500/5", badge: "bg-indigo-500/10 text-indigo-400" },
  { id: "replied", label: "Replied", color: "border-purple-500/20 bg-purple-500/5", badge: "bg-purple-500/10 text-purple-400" },
  { id: "call_booked", label: "Call Booked", color: "border-amber-500/20 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-400" },
  { id: "won", label: "Won 🎉", color: "border-emerald-500/20 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-400" },
  { id: "lost", label: "Lost", color: "border-red-500/20 bg-red-500/5", badge: "bg-red-500/10 text-red-400" },
];

export function CRMBoard() {
  const [entries, setEntries] = useState<CRMEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CRMEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

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

  // Filter entries based on search & active filter tabs
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.leadCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.leadCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.leadEmail && e.leadEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStage = stageFilter === "all" || e.status === stageFilter;

    const isOverdue =
      (e.status === "messaged" || e.status === "demo_sent") &&
      new Date().getTime() - new Date(e.messagedAt || e.lastUpdatedAt).getTime() > 3 * 24 * 3600 * 1000;

    const matchesOverdue = !overdueOnly || isOverdue;

    return matchesSearch && matchesStage && matchesOverdue;
  });

  return (
    <div className="space-y-4">
      {/* Header Bar & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold">Lead Pipeline & Deals</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage prospects, track deal stages, and dispatch direct email pitches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV} className="h-8 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/")} className="h-8 text-xs gap-1.5 font-semibold bg-primary">
            <Plus className="h-3.5 w-3.5" /> Find More Leads
          </Button>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and View Switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card/60 p-2.5 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, city, email, category..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select value={stageFilter} onValueChange={(val) => setStageFilter(val || "all")}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {COLUMNS.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant={overdueOnly ? "default" : "outline"}
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`h-8 text-xs gap-1.5 ${overdueOnly ? "bg-amber-600 text-white" : "text-amber-600 border-amber-500/30"}`}
          >
            <Clock className="h-3.5 w-3.5" /> Overdue (3-Day)
          </Button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            onClick={() => setViewMode("kanban")}
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            onClick={() => setViewMode("table")}
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <ListFilter className="h-3.5 w-3.5" /> Table
          </Button>
        </div>
      </div>

      {/* Main View Area */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-display text-lg mb-1">No Leads in CRM Yet</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              When you scrape leads or rank prospects, they automatically appear on this CRM board for deal tracking.
            </p>
            <Button size="sm" onClick={() => (window.location.href = "/")}>
              Start Lead Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        /* KANBAN BOARD VIEW (Horizontal Scroll Wrapper with Fixed 260px Columns) */
        <div className="w-full overflow-x-auto pb-4 pt-1">
          <div className="flex gap-3.5 min-w-[1880px]">
            {COLUMNS.map((col) => {
              const columnEntries = filteredEntries.filter((e) => e.status === col.id);

              return (
                <div
                  key={col.id}
                  className={`w-[260px] shrink-0 rounded-xl border ${col.color} p-3 flex flex-col bg-card/40`}
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>{col.label}</span>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 font-bold ${col.badge}`}>
                        {columnEntries.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2.5 flex-1 max-h-[620px] overflow-y-auto pr-1">
                    {columnEntries.map((entry) => {
                      const isOverdue =
                        (entry.status === "messaged" || entry.status === "demo_sent") &&
                        new Date().getTime() - new Date(entry.messagedAt || entry.lastUpdatedAt).getTime() > 3 * 24 * 3600 * 1000;

                      return (
                        <Card
                          key={entry.id}
                          onClick={() => {
                            setSelectedEntry(entry);
                            setDrawerOpen(true);
                          }}
                          className="bg-card shadow-sm border border-border/80 hover:border-primary/50 cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <div className="font-semibold text-xs line-clamp-1">{entry.leadName}</div>
                                <div className="text-[10px] text-muted-foreground">{entry.leadCategory} · {entry.leadCity}</div>
                              </div>
                              {entry.score && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0 font-mono font-bold">
                                  {entry.score}
                                </Badge>
                              )}
                            </div>

                            {/* Overdue Badge */}
                            {isOverdue && (
                              <div className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" /> Day-3 Follow-up due
                              </div>
                            )}

                            {/* Revenue Opp */}
                            <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
                              <IndianRupee className="h-3 w-3" />
                              {(entry.estRevenue || 45000).toLocaleString("en-IN")}/mo opportunity
                            </div>

                            {/* Contact Badges */}
                            <div className="flex items-center gap-1 text-[11px] pt-1">
                              {entry.leadEmail && (
                                <span className="p-1 rounded bg-blue-500/10 text-blue-500" title={`Email: ${entry.leadEmail}`}>
                                  <Mail className="h-3 w-3" />
                                </span>
                              )}
                              {entry.leadWhatsapp && (
                                <span className="p-1 rounded bg-emerald-500/10 text-emerald-500" title="WhatsApp">
                                  <MessageCircle className="h-3 w-3" />
                                </span>
                              )}
                              {entry.leadPhone && (
                                <span className="p-1 rounded bg-slate-500/10 text-slate-400" title="Phone">
                                  <Phone className="h-3 w-3" />
                                </span>
                              )}
                              {entry.demoUrl && (
                                <span className="p-1 rounded bg-purple-500/10 text-purple-500 flex items-center gap-1 text-[10px] px-1.5 ml-auto font-medium">
                                  <Globe className="h-3 w-3" /> Demo
                                </span>
                              )}
                            </div>

                            {/* Notes snippet */}
                            {entry.notes && (
                              <p className="text-[10px] text-muted-foreground bg-muted/40 p-1.5 rounded italic line-clamp-2">
                                &quot;{entry.notes}&quot;
                              </p>
                            )}

                            {/* Stage Selector & Action */}
                            <div className="pt-2 border-t flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                              <Select value={entry.status} onValueChange={(val) => handleStatusChange(entry.leadId, val as CRMStatus)}>
                                <SelectTrigger className="h-6 text-[10px] px-2 w-[120px] font-semibold"><SelectValue /></SelectTrigger>
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
                                    setDrawerOpen(true);
                                  }}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Lead Details"
                                >
                                  <Edit3 className="h-3 w-3" />
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
                      <div className="text-center py-8 text-[11px] text-muted-foreground/50 border border-dashed rounded-lg">
                        Empty Stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Lead & Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Lost Revenue / mo</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Contact / Pitch</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry, i) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setDrawerOpen(true);
                      }}
                    >
                      <TableCell className="font-medium tabular-nums text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs">{entry.leadName}</div>
                        <div className="text-[11px] text-muted-foreground">{entry.leadCategory}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.leadCity}</TableCell>
                      <TableCell>
                        {entry.score ? (
                          <Badge variant="secondary" className="font-mono text-xs font-bold">
                            {entry.score}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-emerald-600">
                        ₹{(entry.estRevenue || 45000).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select value={entry.status} onValueChange={(val) => handleStatusChange(entry.leadId, val as CRMStatus)}>
                          <SelectTrigger className="h-7 text-xs px-2 w-[130px] font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COLUMNS.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {entry.leadEmail && (
                            <span className="text-[11px] text-blue-500 font-mono">{entry.leadEmail}</span>
                          )}
                          {entry.demoUrl && (
                            <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-500/30">
                              Demo Ready
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setDrawerOpen(true);
                            }}
                            className="h-7 text-xs px-2.5"
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(entry.leadId, entry.leadName)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Details Drawer */}
      <CRMLeadDrawer
        entry={selectedEntry}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRefresh={refresh}
      />
    </div>
  );
}
