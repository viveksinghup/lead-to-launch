/**
 * Telegram Bot Notifier
 * Sends instant notifications to YOUR Telegram via free Telegram Bot API.
 * Uses internal server-side proxy route `/api/notify` to avoid browser CORS issues.
 */

export interface TelegramLeadNotification {
  name: string;
  category: string;
  city: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  score?: number;
  gap?: string;
  estRevenue?: number;
  demoUrl?: string;
  platform?: string;
  postUrl?: string;
}

function getTelegramConfig() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("lead_launch_settings");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.telegramBotToken || !s.telegramChatId) return null;
    return {
      botToken: s.telegramBotToken as string,
      chatId: s.telegramChatId as string,
    };
  } catch {
    return null;
  }
}

/**
 * Send a message to Telegram using server-side proxy route to avoid CORS errors
 */
export async function sendTelegramMessage(
  text: string,
  customToken?: string,
  customChatId?: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getTelegramConfig();
  const token = customToken || config?.botToken;
  const chatId = customChatId || config?.chatId;

  if (!token || !chatId) {
    return { ok: false, error: "Telegram Bot Token or Chat ID not configured in Settings" };
  }

  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "telegram",
        message: text,
        botToken: token,
        chatId: chatId,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Send a structured hot lead alert to your Telegram
 */
export async function notifyTelegramHotLead(lead: TelegramLeadNotification): Promise<{ ok: boolean; error?: string }> {
  const scoreBadge = lead.score ? `🏆 <b>Score: ${lead.score}/100</b>` : "";
  const revText = lead.estRevenue ? `\n💸 <b>Est. Lost Revenue:</b> ₹${lead.estRevenue.toLocaleString("en-IN")}/mo` : "";
  const phoneText = lead.phone ? `\n📞 <b>Phone:</b> ${lead.phone}` : "";
  const waText = lead.whatsapp ? `\n💬 <b>WhatsApp:</b> https://wa.me/${lead.whatsapp.replace(/\D/g, "")}` : "";
  const emailText = lead.email ? `\n✉️ <b>Email:</b> ${lead.email}` : "";
  const demoText = lead.demoUrl ? `\n🌐 <b>Live Pitch Demo:</b> ${lead.demoUrl}` : "";
  const gapText = lead.gap ? `\n⚠️ <b>Key Gap:</b> ${lead.gap}` : "";
  const postText = lead.postUrl ? `\n🔗 <b>Source Post:</b> ${lead.postUrl}` : "";

  const message = `🔥 <b>HOT LEAD ALERT — Lead → Launch</b>

🏢 <b>${lead.name}</b> (${lead.category})
📍 ${lead.city}
${scoreBadge}${revText}${gapText}${phoneText}${waText}${emailText}${demoText}${postText}

<i>Ready for immediate outreach!</i>`;

  return sendTelegramMessage(message);
}

/**
 * Send a summary digest of multiple leads
 */
export async function notifyTelegramDigest(leads: TelegramLeadNotification[]): Promise<{ ok: boolean; error?: string }> {
  if (leads.length === 0) return { ok: true };

  const items = leads.slice(0, 5).map((l, i) => {
    const score = l.score ? `[${l.score} pts]` : "";
    const contact = l.phone || l.email || l.whatsapp || "No contact";
    return `${i + 1}. <b>${l.name}</b> (${l.category}, ${l.city}) ${score}\n   👉 ${contact} ${l.demoUrl ? `| <a href="${l.demoUrl}">Demo</a>` : ""}`;
  }).join("\n\n");

  const message = `🚀 <b>${leads.length} Hot Leads Ready for Launch!</b>\n\n${items}\n\n<i>Open your Lead → Launch app to view full pitches and send 1-click outreach.</i>`;

  return sendTelegramMessage(message);
}
