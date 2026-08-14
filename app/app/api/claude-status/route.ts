import { NextResponse } from "next/server";
import { getEngineInfo, resolveClaudeBin } from "@/lib/claude";

export async function GET() {
  const info = getEngineInfo();
  return NextResponse.json({
    installed: true,
    mode: info.mode,
    label: info.label,
    path: resolveClaudeBin(),
  });
}
