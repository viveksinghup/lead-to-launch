import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditLeadsFree, rankLeadsFree, buildPromptFree, outreachFree } from "./freeEngine";
import type { Lead, AuditResult, RankedLead, BuildPromptResult, OutreachResult, OutreachChannel, OutreachLanguage } from "./types";

export type ClaudeResult<T> =
  | { ok: true; data: T; source: "claude" | "gemini" | "free-local" }
  | { ok: false; notInstalled?: boolean; error: string };

const CANDIDATE_PATHS = [
  process.env.CLAUDE_CLI_PATH,
  path.join(os.homedir(), ".local", "bin", "claude"),
  path.join(os.homedir(), ".claude", "local", "claude"),
  "/opt/homebrew/bin/claude",
  "/usr/local/bin/claude",
  "/usr/bin/claude",
].filter(Boolean) as string[];

export function resolveClaudeBin(): string | null {
  for (const c of CANDIDATE_PATHS) {
    if (existsSync(c)) return c;
  }
  return null;
}

export function claudeInstalled(): boolean {
  return true; // Always return true because we have the 100% Free Local Engine as active engine!
}

export function getEngineInfo(): { mode: "claude" | "gemini" | "free-local"; label: string } {
  if (process.env.GEMINI_API_KEY) {
    return { mode: "gemini", label: "Gemini 2.0 Flash (Free API)" };
  }
  const bin = resolveClaudeBin();
  if (bin) {
    return { mode: "claude", label: "100% Free Engine (Claude / Local)" };
  }
  return { mode: "free-local", label: "100% Free Local Engine" };
}

function extractJSON<T>(text: string): T | null {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end <= start) return null;
  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

/** Call Gemini Free API if GEMINI_API_KEY is configured */
async function callGeminiJSON<T>(prompt: string): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return extractJSON<T>(text);
  } catch {
    return null;
  }
}

/** Run Claude CLI as subprocess */
async function execClaudeCLI<T>(prompt: string, model = "sonnet", timeoutMs = 120_000): Promise<T | null> {
  const bin = resolveClaudeBin();
  if (!bin) return null;

  return new Promise<T | null>((resolve) => {
    execFile(
      bin,
      ["-p", prompt, "--model", model, "--output-format", "json"],
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, cwd: os.homedir(), env: process.env },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        try {
          const envelope = JSON.parse(stdout);
          if (envelope && !envelope.is_error && envelope.result) {
            const parsed = extractJSON<T>(String(envelope.result));
            if (parsed !== null) return resolve(parsed);
          }
        } catch {
          // fall through
        }
        resolve(null);
      },
    );
  });
}

/**
 * Universal JSON Runner
 * Tries Claude Code -> Gemini Free API -> Free Local Engine
 */
export async function runUniversalJSON<T>(
  prompt: string,
  fallbackValue: () => T,
): Promise<ClaudeResult<T>> {
  // 1. Try Gemini if configured
  if (process.env.GEMINI_API_KEY) {
    const geminiRes = await callGeminiJSON<T>(prompt);
    if (geminiRes !== null) {
      return { ok: true, data: geminiRes, source: "gemini" };
    }
  }

  // 2. Try Claude CLI if available
  const claudeRes = await execClaudeCLI<T>(prompt);
  if (claudeRes !== null) {
    return { ok: true, data: claudeRes, source: "claude" };
  }

  // 3. 100% Free Local Engine Fallback (Instant, zero cost, guaranteed success)
  const localData = fallbackValue();
  return { ok: true, data: localData, source: "free-local" };
}

// Higher level handlers
export async function executeAudit(leads: Lead[], rawPrompt: string): Promise<Record<string, AuditResult>> {
  const result = await runUniversalJSON<Array<Partial<AuditResult>>>(rawPrompt, () => Object.values(auditLeadsFree(leads)));
  if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) {
    return auditLeadsFree(leads);
  }

  const byId = new Map<string, Partial<AuditResult>>();
  for (const a of result.data) if (a && a.leadId) byId.set(a.leadId, a);

  const audits: Record<string, AuditResult> = {};
  const freeDefaults = auditLeadsFree(leads);

  for (const lead of leads) {
    const a = byId.get(lead.id) ?? freeDefaults[lead.id];
    audits[lead.id] = {
      leadId: lead.id,
      pageSpeedScore: Number(a?.pageSpeedScore ?? freeDefaults[lead.id].pageSpeedScore),
      hasWebsite: a?.hasWebsite ?? freeDefaults[lead.id].hasWebsite,
      mobileFriendly: a?.mobileFriendly ?? freeDefaults[lead.id].mobileFriendly,
      https: a?.https ?? freeDefaults[lead.id].https,
      hasSchema: a?.hasSchema ?? false,
      loadTimeMs: Number(a?.loadTimeMs ?? freeDefaults[lead.id].loadTimeMs),
      gaps: Array.isArray(a?.gaps) && a.gaps.length ? a.gaps : freeDefaults[lead.id].gaps,
      biggestGap: a?.biggestGap ?? freeDefaults[lead.id].biggestGap,
      estLostRevenuePerMonth: Math.max(20000, Number(a?.estLostRevenuePerMonth ?? freeDefaults[lead.id].estLostRevenuePerMonth)),
    };
  }

  return audits;
}

export async function executeRank(leads: Lead[], audits: Record<string, AuditResult>, rawPrompt: string): Promise<RankedLead[]> {
  const freeDefault = rankLeadsFree(leads, audits);
  const result = await runUniversalJSON<Array<{ leadId: string; score: number; scoreReasoning: string }>>(
    rawPrompt,
    () => freeDefault.map((r) => ({ leadId: r.id, score: r.score, scoreReasoning: r.scoreReasoning || "" })),
  );

  if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) {
    return freeDefault;
  }

  const scoreById = new Map(result.data.filter((r) => r?.leadId).map((r) => [r.leadId, r]));
  const auditable = leads.filter((l) => audits[l.id]);

  return auditable
    .map((lead) => {
      const r = scoreById.get(lead.id);
      const fallback = freeDefault.find((f) => f.id === lead.id);
      return {
        ...lead,
        audit: audits[lead.id],
        score: Math.max(0, Math.min(100, Number(r?.score ?? fallback?.score ?? 50))),
        scoreReasoning: r?.scoreReasoning ?? fallback?.scoreReasoning ?? "",
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function executeBuildPrompt(lead: RankedLead, platform: string, rawPrompt: string): Promise<BuildPromptResult> {
  const freeDefault = buildPromptFree(lead, platform);
  const result = await runUniversalJSON<BuildPromptResult>(rawPrompt, () => freeDefault);
  if (!result.ok || !result.data || !result.data.prompt) {
    return freeDefault;
  }
  return {
    prompt: result.data.prompt || freeDefault.prompt,
    pitchPoints: Array.isArray(result.data.pitchPoints) && result.data.pitchPoints.length ? result.data.pitchPoints : freeDefault.pitchPoints,
  };
}

export async function executeOutreach(lead: RankedLead, channel: OutreachChannel, language: OutreachLanguage, rawPrompt: string): Promise<OutreachResult> {
  const freeDefault = outreachFree(lead, channel, language);
  const result = await runUniversalJSON<OutreachResult>(rawPrompt, () => freeDefault);
  if (!result.ok || !result.data || !result.data.first) {
    return freeDefault;
  }
  return {
    first: result.data.first || freeDefault.first,
    followUp: result.data.followUp || freeDefault.followUp,
    bestSendTime: result.data.bestSendTime || freeDefault.bestSendTime,
  };
}
