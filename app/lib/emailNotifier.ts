import emailjs from "@emailjs/browser";

export interface EmailPayload {
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
  fromName?: string;
  replyTo?: string;
}

export interface LeadEmailDigest {
  yourName: string;
  yourEmail: string;
  leads: Array<{
    name: string;
    category: string;
    city: string;
    phone?: string;
    email?: string;
    score: number;
    demoUrl?: string;
    pitchMessage: string;
    estRevenue?: number;
  }>;
}

/** Pre-configured defaults */
export const DEFAULT_EMAIL_CONFIG = {
  serviceId: "service_h4m3f9i",
  templateId: "template_lux2umu",
  publicKey: "bHNuPTl0EQZW6Ls2E",
  yourEmail: "localdev935@gmail.com",
  yourName: "Vik",
};

/** Default pitch email template sent to leads.
 *  Supports variables: {{leadName}}, {{leadCity}}, {{category}}, {{demoUrl}}, {{yourName}}
 */
export const DEFAULT_PITCH_TEMPLATE = `Hi {{leadName}},

I came across your business in {{leadCity}} and noticed you might benefit from a modern, professional website to attract more customers and grow online.

I've already built a custom website demo tailored specifically for your {{category}} business — it's fast, mobile-friendly, and ready to go live.

🔗 View your free demo here: {{demoUrl}}

Here's what's included:
• Fast-loading, mobile-first design
• WhatsApp/Email contact form integration
• Google Maps & Google SEO optimization
• Ready to launch within 24 hours

I'd love to help you get more leads online. Would you be open to a quick 10-minute chat?

Best regards,
{{yourName}}`;

/** Load the pitch template from localStorage (user-editable) or return default */
export function getPitchTemplate(data: {
  leadName?: string;
  leadCity?: string;
  category?: string;
  demoUrl?: string;
  yourName?: string;
}): string {
  let template = DEFAULT_PITCH_TEMPLATE;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("lead_launch_settings");
      const s = raw ? JSON.parse(raw) : {};
      if (s.pitchTemplate && typeof s.pitchTemplate === "string" && s.pitchTemplate.trim()) {
        template = s.pitchTemplate;
      }
    } catch {
      // use default
    }
  }

  return template
    .replace(/\{\{leadName\}\}/g, data.leadName || "there")
    .replace(/\{\{leadCity\}\}/g, data.leadCity || "your city")
    .replace(/\{\{category\}\}/g, data.category || "business")
    .replace(/\{\{demoUrl\}\}/g, data.demoUrl || "http://localhost:3000")
    .replace(/\{\{yourName\}\}/g, data.yourName || "Vik");
}

/** Load EmailJS / profile settings from localStorage or defaults */
export function getEmailConfig() {
  if (typeof window === "undefined") {
    return DEFAULT_EMAIL_CONFIG;
  }
  try {
    const raw = localStorage.getItem("lead_launch_settings");
    const s = raw ? JSON.parse(raw) : {};
    return {
      serviceId: s.emailjsServiceId || DEFAULT_EMAIL_CONFIG.serviceId,
      templateId: s.emailjsTemplateId || DEFAULT_EMAIL_CONFIG.templateId,
      publicKey: s.emailjsPublicKey || DEFAULT_EMAIL_CONFIG.publicKey,
      yourEmail: s.yourEmail || DEFAULT_EMAIL_CONFIG.yourEmail,
      yourName: s.yourName || DEFAULT_EMAIL_CONFIG.yourName,
    };
  } catch {
    return DEFAULT_EMAIL_CONFIG;
  }
}

/**
 * Send email using official @emailjs/browser SDK directly from browser,
 * with fallback to server route and mailto:.
 * Ensures reply_to is set to your personal email so client replies come directly to you.
 */
export async function sendEmailViaEmailJS(payload: EmailPayload): Promise<{
  ok: boolean;
  method?: string;
  error?: string;
  fallback?: string;
}> {
  const config = getEmailConfig();
  const replyTo = payload.replyTo || config.yourEmail || "localdev935@gmail.com";
  const mailtoUrl = `mailto:${payload.toEmail}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(payload.body)}`;

  // 1. Try direct browser EmailJS SDK first (works without requiring server backend API toggle)
  if (config.serviceId && config.templateId && config.publicKey) {
    try {
      const templateParams = {
        to_email: payload.toEmail,
        to_name: payload.toName || payload.toEmail,
        from_name: payload.fromName || config.yourName || "Vik",
        subject: payload.subject,
        message: payload.body,
        body: payload.body,
        reply_to: replyTo,
        user_email: payload.toEmail,
      };

      const res = await emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
      );

      if (res.status === 200 || res.text === "OK") {
        return { ok: true, method: "emailjs" };
      }
    } catch (browserErr) {
      console.warn("[EmailJS Browser SDK Error]", browserErr);
    }
  }

  // 2. Try server route /api/email/send as fallback
  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail: payload.toEmail,
        toName: payload.toName,
        subject: payload.subject,
        body: payload.body,
        replyTo,
        serviceId: config.serviceId,
        templateId: config.templateId,
        publicKey: config.publicKey,
      }),
    });

    const data = await res.json();
    if (res.ok && data.method === "emailjs") {
      return { ok: true, method: "emailjs" };
    }
    if (res.ok && data.fallbackUrl) {
      return { ok: true, method: "mailto", fallback: data.fallbackUrl };
    }
  } catch (e) {
    console.warn("[Server email error]", e);
  }

  return {
    ok: true,
    method: "mailto",
    fallback: mailtoUrl,
  };
}

/** Send a lead digest notification to YOUR OWN email */
export async function sendLeadDigestToSelf(digest: LeadEmailDigest): Promise<{ ok: boolean; error?: string }> {
  const config = getEmailConfig();
  const targetEmail = digest.yourEmail || config.yourEmail || "localdev935@gmail.com";

  const leadLines = digest.leads
    .map(
      (l, i) =>
        `Lead #${i + 1}: ${l.name} (${l.category}, ${l.city})
Score: ${l.score}/100 | Est. ₹${(l.estRevenue ?? 0).toLocaleString("en-IN")}/mo opportunity
Phone: ${l.phone ?? "N/A"} | Email: ${l.email ?? "N/A"}
Demo: ${l.demoUrl ?? "Not generated yet"}
---`
    )
    .join("\n\n");

  const body = `Hi ${digest.yourName || "Vik"},

${digest.leads.length} hot lead${digest.leads.length > 1 ? "s" : ""} found and ready for outreach!

${leadLines}

Open your Lead → Launch app to send outreach messages.`;

  return sendEmailViaEmailJS({
    toEmail: targetEmail,
    toName: digest.yourName,
    subject: `🔥 ${digest.leads.length} Hot Lead${digest.leads.length > 1 ? "s" : ""} Found — Lead → Launch`,
    body,
    fromName: "Lead → Launch Alerts",
  });
}

/** Send outreach pitch email directly to a LEAD */
export async function sendOutreachEmail(params: {
  leadEmail: string;
  leadName: string;
  subject: string;
  pitchBody: string;
}): Promise<{ ok: boolean; error?: string; fallback?: string }> {
  return sendEmailViaEmailJS({
    toEmail: params.leadEmail,
    toName: params.leadName,
    subject: params.subject,
    body: params.pitchBody,
  });
}
