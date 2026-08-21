import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, message, botToken, chatId } = body;

    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chat = chatId || process.env.TELEGRAM_CHAT_ID;

    if (type === "telegram") {
      if (!token || !chat) {
        return NextResponse.json({ error: "Telegram Bot Token or Chat ID missing" }, { status: 400 });
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: message || "Lead -> Launch notification",
          parse_mode: "HTML",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return NextResponse.json({ error: data.description || "Telegram notification failed" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, info: "Browser-level notification ready" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
