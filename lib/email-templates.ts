// lib/email-templates.ts
// Branded HTML email templates. Plain string templates (no JSX) so they render
// identically in any email client. Inline styles only — email clients strip
// <style> and external CSS. Brand: indigo accent on a clean light layout.

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const INDIGO = "#4f46e5";
const TEXT = "#0f172a";
const MUTED = "#475569";
const BORDER = "#e2e8f0";

function shell(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0 32px;">
          <span style="display:inline-flex;align-items:center;gap:8px;font-size:18px;font-weight:700;color:${TEXT};">
            <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:${INDIGO};color:#fff;border-radius:8px;font-size:14px;">TQ</span>
            TrackIQ
          </span>
        </td></tr>
        ${bodyHtml}
        <tr><td style="padding:24px 32px 28px 32px;border-top:1px solid ${BORDER};">
          <p style="margin:0;font-size:12px;color:${MUTED};">You're receiving this because you created a TrackIQ account.</p>
          <p style="margin:6px 0 0 0;font-size:12px;color:${MUTED};">&copy; ${new Date().getFullYear()} TrackIQ. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;background:${INDIGO};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>`;
}

/** Welcome / registration email. */
export function renderWelcomeEmail(params: { firstName?: string; appUrl: string }): string {
    const name = params.firstName ? escapeHtml(params.firstName) : "there";
    const dashUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard`;
    const body = `
      <tr><td style="padding:20px 32px 0 32px;">
        <h1 style="margin:0;font-size:24px;line-height:1.25;color:${TEXT};">Welcome to TrackIQ, ${name}.</h1>
        <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:${MUTED};">
          Your job search just got a command center. Track applications, keep private interview notes,
          compare offers with a weighted decision engine, and get explainable Career Intelligence on
          your pipeline.
        </p>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">${button(dashUrl, "Open your dashboard")}</td></tr>
      <tr><td style="padding:24px 32px 0 32px;">
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:${TEXT};">A few good first steps:</p>
        <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:${MUTED};">
          <li>Add your first few applications</li>
          <li>Set your skills &amp; target role to unlock Job Fit scores</li>
          <li>Log interview notes to build your confidence trend</li>
        </ul>
      </td></tr>`;
    return shell(body);
}

export interface DigestItem {
    title: string;
    company: string;
    stage: string;
    action: string;
    daysStale: number;
    impact: "high" | "medium" | "low";
}

const IMPACT_COLOR: Record<DigestItem["impact"], string> = {
    high: "#e11d48", // rose
    medium: "#d97706", // amber
    low: INDIGO,
};

/** Daily/weekly follow-up reminder digest. */
export function renderFollowUpDigestEmail(params: {
    firstName?: string;
    items: DigestItem[];
    appUrl: string;
}): string {
    const name = params.firstName ? escapeHtml(params.firstName) : "there";
    const dashUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard/intelligence`;
    const count = params.items.length;

    const rows = params.items
        .map(
            (it) => `
        <tr><td style="padding:12px 0;border-bottom:1px solid ${BORDER};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:14px;font-weight:600;color:${TEXT};">${escapeHtml(it.company)}</span>
                <span style="font-size:12px;color:${MUTED};"> · ${escapeHtml(it.title)}</span>
                <span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:600;color:${IMPACT_COLOR[it.impact]};text-transform:capitalize;">${it.impact}</span>
                <div style="font-size:13px;color:${MUTED};margin-top:3px;">${escapeHtml(it.action)} — quiet for ${it.daysStale} day${it.daysStale === 1 ? "" : "s"}.</div>
              </td>
            </tr>
          </table>
        </td></tr>`
        )
        .join("");

    const body = `
      <tr><td style="padding:20px 32px 0 32px;">
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:${TEXT};">${count} follow-up${count === 1 ? "" : "s"} due today, ${name}.</h1>
        <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
          These applications have gone quiet past their usual response window. A timely nudge
          measurably improves your odds.
        </p>
      </td></tr>
      <tr><td style="padding:12px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td></tr>
      <tr><td style="padding:24px 32px 0 32px;">${button(dashUrl, "Review in TrackIQ")}</td></tr>`;
    return shell(body);
}
