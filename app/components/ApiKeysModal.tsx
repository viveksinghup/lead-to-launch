"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KeyRound, Radio, Sparkles, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function ApiKeysModal({
  trigger,
  onKeysChanged,
}: {
  trigger?: React.ReactNode;
  onKeysChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [serpApiKey, setSerpApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSerpApiKey(localStorage.getItem("serpapi_key") || "");
      setGeminiApiKey(localStorage.getItem("gemini_key") || "");
    }
  }, [open]);

  function handleSave() {
    if (typeof window !== "undefined") {
      if (serpApiKey.trim()) {
        localStorage.setItem("serpapi_key", serpApiKey.trim());
      } else {
        localStorage.removeItem("serpapi_key");
      }

      if (geminiApiKey.trim()) {
        localStorage.setItem("gemini_key", geminiApiKey.trim());
      } else {
        localStorage.removeItem("gemini_key");
      }
    }

    setSaved(true);
    toast.success("API keys saved successfully! Active for all searches & AI analysis.");
    onKeysChanged?.();
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground border-border/80"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>API Keys</span>
              {(serpApiKey || geminiApiKey) && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Configure Free API Keys
          </DialogTitle>
          <DialogDescription className="text-xs">
            Keys are saved in your browser and used for live Google Maps scraping & Gemini AI analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* SerpAPI Key */}
          <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                <span>SerpAPI Key (Live Google Maps)</span>
              </div>
              <a
                href="https://serpapi.com/users/sign_up"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Get 100 free/mo <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <Input
              type="password"
              placeholder="Paste SerpAPI key (e.g. 520a0069...)"
              value={serpApiKey}
              onChange={(e) => setSerpApiKey(e.target.value)}
              className="font-mono text-xs h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Enables live Google Maps search with real business names, phone numbers, ratings, and reviews.
            </p>
          </div>

          {/* Gemini Free API Key */}
          <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Gemini API Key (AI Speed & Quality)</span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Get free key <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <Input
              type="password"
              placeholder="Paste Gemini API key (e.g. AIzaSy...)"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="font-mono text-xs h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Uses Gemini 3.7 Flash for deep website audits, prospect scoring, and personalized outreach copywriting.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-muted-foreground">
            Leave blank to run 100% free with built-in engine.
          </span>
          <Button onClick={handleSave} size="sm" className="h-9 px-4 gap-1.5">
            {saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Saved
              </>
            ) : (
              "Save Keys"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
