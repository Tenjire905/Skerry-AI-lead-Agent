import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(env: ImportMetaEnv): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (cached) return cached;
  cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export interface ConfirmationContext {
  email: string;
  position: number;
  siteUrl: string;
  founding: boolean;
}

const logoImg = (siteUrl: string) =>
  `<img src="${siteUrl}/logo.png" width="36" height="36" alt="Skerry" style="display:inline-block;vertical-align:middle;" />`;

export function renderConfirmationEmail(ctx: ConfirmationContext): {
  subject: string;
  html: string;
  text: string;
} {
  const { email, position, siteUrl, founding } = ctx;
  const subject = founding
    ? `You're in — Founding spot #${position} reserved`
    : `You're #${position} on the Skerry waitlist`;

  const headline = founding
    ? "Founding spot reserved."
    : "You're on the Skerry waitlist.";
  const body = founding
    ? `Your €19 deposit is locked in. When we open, you'll get 50% off Skerry — for life. We'll email you the moment your access is live.`
    : `We'll email the second your slot opens. Want to skip the queue? Founding members lock in 50% off lifetime for a refundable €19 deposit — link below.`;

  const html = `<!doctype html>
<html><body style="margin:0;background:#06030d;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="margin-bottom:28px;">
      ${logoImg(siteUrl)}
      <span style="font-size:14px;font-weight:600;color:#fff;letter-spacing:-0.01em;margin-left:10px;vertical-align:middle;">Skerry LeadGen</span>
    </div>
    <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c4b5fd;">${founding ? "Founding member" : "Waitlist confirmed"}</div>
    <h1 style="font-size:28px;font-weight:600;margin:12px 0 8px;color:#fff;line-height:1.25;">${headline}</h1>
    <p style="font-size:14px;line-height:1.6;color:#cbd5e1;">${body}</p>
    <div style="margin:32px 0;padding:20px;border:1px solid rgba(167,139,250,0.22);border-radius:12px;background:rgba(167,139,250,0.06);">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#c4b5fd;">Your position</div>
      <div style="font-size:32px;font-weight:700;color:#fff;margin-top:6px;">#${position}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${email}</div>
    </div>
    ${
      founding
        ? ""
        : `<a href="${siteUrl}/founding?email=${encodeURIComponent(email)}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#a78bfa);color:#06030d;font-weight:600;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:13px;">Lock founding pricing — €19 refundable</a>`
    }
    <p style="font-size:12px;color:#64748b;margin-top:32px;">If this wasn't you, just ignore this email. We won't follow up.</p>
    <p style="font-size:11px;color:#475569;margin-top:24px;">Skerry · skerry.cloud · Built for B2B SaaS founders who want pipeline without hiring an SDR.</p>
  </div>
</body></html>`;

  const text = `${headline}

${body}

Your position: #${position}
Email: ${email}

${founding ? "" : `Lock founding pricing (€19, refundable): ${siteUrl}/founding?email=${encodeURIComponent(email)}`}

Skerry · skerry.cloud`;

  return { subject, html, text };
}
