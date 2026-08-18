export type ClaudeCallOk<T> = { ok: true; data: T };
export type ClaudeCallErr = { ok: false; notInstalled: boolean; error: string };

export function getStoredApiKeys(): { serpApiKey?: string; geminiApiKey?: string } {
  if (typeof window === "undefined") return {};
  const serpApiKey = localStorage.getItem("serpapi_key") || undefined;
  const geminiApiKey = localStorage.getItem("gemini_key") || undefined;
  return { serpApiKey, geminiApiKey };
}

export async function callClaude<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<ClaudeCallOk<T> | ClaudeCallErr> {
  try {
    const keys = getStoredApiKeys();
    const payload = { ...body, ...keys };
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (keys.geminiApiKey) headers["x-gemini-key"] = keys.geminiApiKey;
    if (keys.serpApiKey) headers["x-serpapi-key"] = keys.serpApiKey;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        notInstalled: !!json.notInstalled || res.status === 503,
        error: json.error ?? `Request failed (${res.status})`,
      };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, notInstalled: false, error: (e as Error).message };
  }
}
