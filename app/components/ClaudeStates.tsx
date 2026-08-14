"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TriangleAlert, ExternalLink, Zap } from "lucide-react";

/** Branded loading block. */
export function ClaudeThinking({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-14 flex flex-col items-center text-center gap-4">
        <div className="relative h-12 w-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-primary/25 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <div>
          <div className="font-display text-xl">{label}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Processing intelligent local analysis & conversion models...
          </div>
        </div>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Shown if an error occurs. */
export function ClaudeRequired({
  error,
  onRetry,
}: {
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-10 px-6 text-center max-w-xl mx-auto">
        <div className="h-12 w-12 rounded-full bg-primary/15 mx-auto flex items-center justify-center mb-4">
          <Zap className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Engine Notification
        </div>
        <h2 className="font-display text-2xl mb-2">Free Engine Ready</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The pipeline is ready to run in 100% Free Local Mode without requiring any paid subscriptions or API keys.
        </p>
        {error && (
          <p className="text-xs text-muted-foreground/80 italic mb-4 mt-1 break-words">{error}</p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
          {onRetry && (
            <Button className="h-10 px-6" onClick={onRetry}>
              Continue with Free Engine
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
