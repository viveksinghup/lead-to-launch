"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Mail, MessageSquare, Send, CheckCircle2, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { sendTelegramMessage } from "@/lib/telegramNotifier";
import { sendEmailViaEmailJS, DEFAULT_PITCH_TEMPLATE } from "@/lib/emailNotifier";
import type { NotificationSettings } from "@/lib/types";

const SETTINGS_KEY = "lead_launch_settings";

const INITIAL_DEFAULTS: NotificationSettings = {
  yourName: "Vik",
  yourEmail: "localdev935@gmail.com",
  yourPhone: "",
  emailjsServiceId: "service_h4m3f9i",
  emailjsTemplateId: "template_lux2umu",
  emailjsPublicKey: "bHNuPTl0EQZW6Ls2E",
  telegramBotToken: "8940664777:AAEKkivGr75VRr5GVyAUiA12FRCxUrPZXlc",
  telegramChatId: "",
  twitterBearerToken: "",
  defaultNiche: "website developer",
  defaultCity: "Global / Remote",
};

export function SettingsModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(INITIAL_DEFAULTS);
  const [pitchTemplate, setPitchTemplate] = useState("");
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [detectingChatId, setDetectingChatId] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          emailjsServiceId: parsed.emailjsServiceId || INITIAL_DEFAULTS.emailjsServiceId,
          emailjsTemplateId: parsed.emailjsTemplateId || INITIAL_DEFAULTS.emailjsTemplateId,
          emailjsPublicKey: parsed.emailjsPublicKey || INITIAL_DEFAULTS.emailjsPublicKey,
          telegramBotToken: parsed.telegramBotToken || INITIAL_DEFAULTS.telegramBotToken,
          yourEmail: parsed.yourEmail || INITIAL_DEFAULTS.yourEmail,
          yourName: parsed.yourName || INITIAL_DEFAULTS.yourName,
        }));
        setPitchTemplate(parsed.pitchTemplate || DEFAULT_PITCH_TEMPLATE);
      } else {
        setPitchTemplate(DEFAULT_PITCH_TEMPLATE);
      }
    } catch {
      setPitchTemplate(DEFAULT_PITCH_TEMPLATE);
    }
  }, [open]);

  function saveSettings() {
    if (typeof window === "undefined") return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, pitchTemplate }));
    toast.success("Settings saved successfully!");
    setOpen(false);
  }

  async function autoDetectChatId() {
    if (!settings.telegramBotToken) {
      toast.error("Please enter a Telegram Bot Token first");
      return;
    }
    setDetectingChatId(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/getUpdates`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        // Find latest chat id
        const lastUpdate = data.result[data.result.length - 1];
        const chatId = lastUpdate?.message?.chat?.id || lastUpdate?.my_chat_member?.chat?.id;
        if (chatId) {
          const idStr = String(chatId);
          setSettings((prev) => ({ ...prev, telegramChatId: idStr }));
          localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, telegramChatId: idStr }));
          toast.success(`Chat ID detected: ${idStr}! Saved.`);
          setDetectingChatId(false);
          return;
        }
      }
      toast.info("No messages found yet. Please open Telegram, search @LocalDev935_Bot, send '/start', and click detect again!");
    } catch {
      toast.error("Failed to connect to Telegram API");
    } finally {
      setDetectingChatId(false);
    }
  }

  async function testTelegram() {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      toast.error("Please enter both Bot Token and Chat ID (or click Auto-Detect)");
      return;
    }
    setTestingTelegram(true);
    const res = await sendTelegramMessage(
      "🚀 <b>Lead → Launch Test Alert</b>\n\nYour Telegram notifications are successfully connected! You will now receive hot lead alerts directly here.",
      settings.telegramBotToken,
      settings.telegramChatId
    );
    setTestingTelegram(false);
    if (res.ok) {
      toast.success("Test message sent to your Telegram!");
    } else {
      toast.error(res.error || "Failed to send test message");
    }
  }

  async function testEmailJS() {
    if (!settings.yourEmail) {
      toast.error("Please fill in your Email address");
      return;
    }
    setTestingEmail(true);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    const res = await sendEmailViaEmailJS({
      toEmail: settings.yourEmail,
      toName: settings.yourName,
      subject: "🚀 Lead → Launch Email Notification Test",
      body: `Hi ${settings.yourName},\n\nYour EmailJS integration is working! You will now receive lead alerts and can send 1-click pitches directly from your app.`,
      fromName: "Lead → Launch",
    });
    setTestingEmail(false);
    if (res.ok) {
      toast.success("Test email sent to your inbox!");
    } else {
      toast.error(res.error || "Failed to send test email");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <SettingsIcon className="h-3.5 w-3.5" /> Settings
            </Button>
          )
        }
      />
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="h-5 w-5 text-primary" /> Settings & Sender Channels
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="notifications" className="w-full mt-2">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="notifications" className="text-xs">Email & Telegram</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs">Profile & Defaults</TabsTrigger>
            <TabsTrigger value="api-keys" className="text-xs">API Keys</TabsTrigger>
            <TabsTrigger value="pitch" className="text-xs">Pitch Template</TabsTrigger>
          </TabsList>

          {/* TAB 1: Notifications */}
          <TabsContent value="notifications" className="space-y-5">
            {/* Telegram Bot */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-sky-500/10 text-sky-500 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Telegram Instant Alerts (100% Free)</div>
                    <div className="text-[10px] text-muted-foreground">Receive instant mobile push notifications for hot leads</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={autoDetectChatId}
                    disabled={detectingChatId}
                    className="h-7 text-[11px] px-2.5 text-sky-600 border-sky-500/30 hover:bg-sky-500/10"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${detectingChatId ? "animate-spin" : ""}`} /> Auto-Detect ID
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testTelegram}
                    disabled={testingTelegram}
                    className="h-7 text-[11px] px-2.5"
                  >
                    <Send className="h-3 w-3 mr-1" /> {testingTelegram ? "Testing…" : "Test Bot"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px]">Telegram Bot Token</Label>
                  <Input
                    type="password"
                    placeholder="123456789:ABCdefGHI..."
                    value={settings.telegramBotToken}
                    onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Your Telegram Chat ID</Label>
                  <Input
                    placeholder="e.g. 987654321 (numeric)"
                    value={settings.telegramChatId}
                    onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                💡 <strong>How to get your Chat ID in 10 seconds:</strong> Open Telegram → search <strong>@LocalDev935_Bot</strong> → send <code>/start</code> → click <strong>Auto-Detect ID</strong> above!
              </p>
            </div>

            {/* EmailJS */}
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">EmailJS (Direct Pitch Outreach & Alerts)</div>
                    <div className="text-[10px] text-muted-foreground">Sends pitch emails directly to leads (Reply-To: {settings.yourEmail})</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testEmailJS}
                  disabled={testingEmail}
                  className="h-7 text-[11px] px-2.5"
                >
                  <Send className="h-3 w-3 mr-1" /> {testingEmail ? "Sending…" : "Test Email"}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Service ID</Label>
                  <Input
                    placeholder="service_..."
                    value={settings.emailjsServiceId}
                    onChange={(e) => setSettings({ ...settings, emailjsServiceId: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Template ID</Label>
                  <Input
                    placeholder="template_..."
                    value={settings.emailjsTemplateId}
                    onChange={(e) => setSettings({ ...settings, emailjsTemplateId: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Public Key</Label>
                  <Input
                    type="password"
                    placeholder="pk_..."
                    value={settings.emailjsPublicKey}
                    onChange={(e) => setSettings({ ...settings, emailjsPublicKey: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Profile */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="yourName" className="text-xs font-medium">Your Full Name / Alias</Label>
                <Input
                  id="yourName"
                  value={settings.yourName}
                  onChange={(e) => setSettings({ ...settings, yourName: e.target.value })}
                  placeholder="e.g. Vik"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Used as the sender signature in pitch emails</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yourEmail" className="text-xs font-medium">Your Primary Email (Reply-To)</Label>
                <Input
                  id="yourEmail"
                  type="email"
                  value={settings.yourEmail}
                  onChange={(e) => setSettings({ ...settings, yourEmail: e.target.value })}
                  placeholder="localdev935@gmail.com"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">All client replies will land here</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="defaultNiche" className="text-xs font-medium">Default Search Term</Label>
                <Input
                  id="defaultNiche"
                  value={settings.defaultNiche}
                  onChange={(e) => setSettings({ ...settings, defaultNiche: e.target.value })}
                  placeholder="e.g. website developer"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultCity" className="text-xs font-medium">Default Region</Label>
                <Input
                  id="defaultCity"
                  value={settings.defaultCity}
                  onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })}
                  placeholder="e.g. Global / Remote"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: API Keys */}
          <TabsContent value="api-keys" className="space-y-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-slate-900">Backend API Services Active</div>
                <div className="text-slate-600 text-[11px] mt-0.5">
                  Your SerpAPI, Gemini 3.7 Flash AI, and EmailJS backend configurations are active in <code>.env.local</code>.
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: Pitch Template */}
          <TabsContent value="pitch" className="space-y-4">
            <div className="rounded-lg border p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Email Pitch Template</div>
                  <div className="text-[10px] text-muted-foreground">Customize the outreach email sent to your leads</div>
                </div>
              </div>

              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-[11px] text-purple-700">
                <strong>Available Variables:</strong>{" "}
                <code className="bg-purple-200/40 px-1 rounded">&#123;&#123;leadName&#125;&#125;</code>{" "}
                <code className="bg-purple-200/40 px-1 rounded">&#123;&#123;leadCity&#125;&#125;</code>{" "}
                <code className="bg-purple-200/40 px-1 rounded">&#123;&#123;category&#125;&#125;</code>{" "}
                <code className="bg-purple-200/40 px-1 rounded">&#123;&#123;demoUrl&#125;&#125;</code>{" "}
                <code className="bg-purple-200/40 px-1 rounded">&#123;&#123;yourName&#125;&#125;</code>
              </div>

              <Textarea
                value={pitchTemplate}
                onChange={(e) => setPitchTemplate(e.target.value)}
                placeholder={DEFAULT_PITCH_TEMPLATE}
                className="min-h-[280px] text-xs font-mono leading-relaxed"
              />

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPitchTemplate(DEFAULT_PITCH_TEMPLATE);
                    toast.success("Reset to default template");
                  }}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Reset to Default
                </Button>
                <p className="text-[10px] text-muted-foreground">Changes apply to all future emails sent from CRM and Phase 5</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={saveSettings} className="h-8 text-xs font-semibold">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
