import { NextResponse } from "next/server";
import { getEngineInfo, resolveClaudeBin } from "@/lib/claude";

export async function GET(req: Request) {
  const customGeminiKey = req.headers.get("x-gemini-key") || undefined;
  const info = getEngineInfo(customGeminiKey);
  const hasSerpApi = !!(process.env.SERPAPI_API_KEY || req.headers.get("x-serpapi-key"));

  return NextResponse.json({
    installed: true,
    mode: info.mode,
    label: info.label,
    path: resolveClaudeBin(),
    hasSerpApi,
  });
}
