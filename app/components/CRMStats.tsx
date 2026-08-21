"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Send, Globe, MessageSquare, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";
import { getCRMStats, getFollowUpReminders } from "@/lib/crm";

export function CRMStats() {
  const stats = getCRMStats();
  const reminders = getFollowUpReminders();

  return (
    <div className="space-y-4">
      {reminders.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs text-amber-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>{reminders.length} Follow-Up Reminder{reminders.length > 1 ? "s" : ""}:</strong> Leads have had no reply for 3+ days. Send your Day-3 follow-up message!
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Leads</span>
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="font-display text-2xl font-bold">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.thisMonth} this month</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Messaged</span>
              <Send className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="font-display text-2xl font-bold text-blue-500">{stats.messaged + stats.demoSent}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.demoSent} demos sent</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Replied</span>
              <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="font-display text-2xl font-bold text-purple-500">{stats.replied + stats.callBooked}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.callBooked} calls booked</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Deals Won</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="font-display text-2xl font-bold text-emerald-500">{stats.won}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{stats.wonThisMonth} won this month</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Conversion</span>
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="font-display text-2xl font-bold text-amber-500">{stats.conversionRate}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Win rate</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider">Pipeline Value</span>
              <Globe className="h-3.5 w-3.5 text-teal-500" />
            </div>
            <div className="font-display text-2xl font-bold text-teal-500">
              ₹{(stats.estRevenueWon / 1000).toFixed(0)}k
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Won value</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
