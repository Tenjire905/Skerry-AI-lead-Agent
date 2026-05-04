/**
 * Minimal markdown → HTML / plain text for Resend payloads.
 * Dependencies: none. Env: N/A.
 */

export function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, '<h1 style="font-size:24px;margin:0 0 16px;color:#0a1628;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.18em;margin:24px 0 8px;color:#0891b2;">$1</h2>')
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #06b6d4;padding-left:12px;color:#475569;margin:16px 0;">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />');
  html = html
    .split(/\n{2,}/)
    .map((para) =>
      /^\s*<(h1|h2|blockquote|hr)/.test(para)
        ? para
        : `<p style="margin:0 0 12px;line-height:1.5;color:#1e293b;">${para.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;">${html}</div>`;
}

export function mdToText(md: string): string {
  return md
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^---$/gm, "");
}

export function extractSubjectAndBody(md: string): { subject: string; body: string } {
  const m = md.match(/^\s*\*\*Subject:\*\*\s*(.+?)\n([\s\S]*)$/);
  if (m) return { subject: m[1].trim(), body: m[2].trim() };
  const firstH1 = md.match(/^#\s+(.+)$/m);
  return { subject: firstH1 ? firstH1[1].trim() : "Quick note", body: md };
}
