import { NextResponse } from "next/server";

interface SendEmailRequest {
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
  replyTo?: string;
  serviceId?: string;
  templateId?: string;
  publicKey?: string;
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as SendEmailRequest;
    const { toEmail, toName, subject, body } = data;

    if (!toEmail || !body) {
      return NextResponse.json({ error: "Recipient email and body are required" }, { status: 400 });
    }

    const replyTo = data.replyTo || process.env.YOUR_EMAIL || "localdev935@gmail.com";
    const fromName = process.env.YOUR_NAME || "Vik";

    const serviceId = data.serviceId || process.env.EMAILJS_SERVICE_ID;
    const templateId = data.templateId || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = data.publicKey || process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    const mailtoFallback = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // If EmailJS configured, attempt direct server-side dispatch
    if (serviceId && templateId && publicKey) {
      try {
        const payload: Record<string, unknown> = {
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: toEmail,
            to_name: toName || toEmail,
            from_name: fromName,
            subject,
            message: body,
            body,
            reply_to: replyTo,
            user_email: toEmail,
          },
        };

        if (privateKey) {
          payload.accessToken = privateKey;
        }

        const emailJsRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (emailJsRes.ok) {
          return NextResponse.json({
            success: true,
            method: "emailjs",
            replyTo,
            message: `Email successfully sent to ${toEmail} with reply-to ${replyTo}`,
          });
        }

        const errText = await emailJsRes.text();
        console.warn("[EmailJS server-side failed]", errText);
      } catch (err) {
        console.warn("[EmailJS network error]", err);
      }
    }

    // Return fallback mailto link if direct dispatch was not active or encountered error
    return NextResponse.json({
      success: true,
      method: "mailto",
      fallbackUrl: mailtoFallback,
      replyTo,
      message: "Ready to send via your email client",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
