import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM   = process.env.RESEND_FROM_EMAIL ?? "notifications@landed.app";

/* ─── Applied notification ─── */
export async function sendAppliedNotification(params: {
  to: string;
  userName: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  atsScore?: number;
}) {
  return resend.emails.send({
    from: `Landed <${FROM}>`,
    to:   params.to,
    subject: `Applied: ${params.jobTitle} at ${params.company}`,
    html: `
<div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f4f5f1;">
  <div style="background:#18191a;border-radius:16px;padding:24px;margin-bottom:16px;">
    <div style="color:#cce832;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Application sent</div>
    <div style="color:#fff;font-size:20px;font-weight:600;letter-spacing:-0.4px;">${params.jobTitle}</div>
    <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">${params.company}</div>
    ${params.atsScore ? `<div style="margin-top:12px;display:inline-block;background:rgba(204,232,50,0.12);color:#cce832;font-size:11px;font-family:monospace;padding:3px 10px;border-radius:6px;">ATS score: ${params.atsScore}/100</div>` : ""}
  </div>
  <div style="background:#fff;border-radius:16px;padding:20px;font-size:13px;color:#5a5f57;">
    <p>Hi ${params.userName}, your tailored application for <strong>${params.jobTitle}</strong> at <strong>${params.company}</strong> has been submitted.</p>
    <a href="${params.jobUrl}" style="display:inline-block;margin-top:12px;background:#18191a;color:#cce832;text-decoration:none;padding:8px 18px;border-radius:10px;font-size:12px;font-family:monospace;">View job posting →</a>
  </div>
  <div style="text-align:center;margin-top:16px;font-size:11px;color:#97a094;">Landed · AI job application engine</div>
</div>`,
  });
}

/* ─── Positive reply notification ─── */
export async function sendPositiveReplyNotification(params: {
  to: string;
  userName: string;
  jobTitle: string;
  company: string;
  fromEmail: string;
  subject: string;
  dashboardUrl: string;
}) {
  return resend.emails.send({
    from: `Landed <${FROM}>`,
    to:   params.to,
    subject: `A recruiter is interested — ${params.company}`,
    html: `
<div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f4f5f1;">
  <div style="background:rgba(100,190,80,0.1);border:1px solid rgba(100,190,80,0.2);border-radius:16px;padding:24px;margin-bottom:16px;">
    <div style="color:#2d6b1a;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Genuine interest detected</div>
    <div style="color:#18191a;font-size:20px;font-weight:600;letter-spacing:-0.4px;">${params.company} wants to talk</div>
    <div style="color:#5a5f57;font-size:13px;margin-top:4px;">${params.jobTitle}</div>
  </div>
  <div style="background:#fff;border-radius:16px;padding:20px;font-size:13px;color:#5a5f57;">
    <p>Hi ${params.userName},</p>
    <p>A real human at <strong>${params.company}</strong> has replied to your application for <strong>${params.jobTitle}</strong>.</p>
    <p style="margin-top:8px;padding:12px 16px;background:#f4f5f1;border-radius:10px;font-size:12px;">
      <strong>From:</strong> ${params.fromEmail}<br/>
      <strong>Subject:</strong> ${params.subject}
    </p>
    <a href="${params.dashboardUrl}/replies" style="display:inline-block;margin-top:16px;background:#18191a;color:#cce832;text-decoration:none;padding:8px 18px;border-radius:10px;font-size:12px;font-family:monospace;">View reply in Landed →</a>
  </div>
</div>`,
  });
}

/* ─── Interview booked notification ─── */
export async function sendInterviewNotification(params: {
  to: string;
  userName: string;
  jobTitle: string;
  company: string;
  scheduledAt: Date;
  meetingLink?: string;
  dashboardUrl: string;
}) {
  const dateStr = params.scheduledAt.toLocaleString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  return resend.emails.send({
    from: `Landed <${FROM}>`,
    to:   params.to,
    subject: `Interview confirmed — ${params.company} · ${dateStr}`,
    html: `
<div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f4f5f1;">
  <div style="background:#cce832;border-radius:16px;padding:24px;margin-bottom:16px;">
    <div style="color:#4e5f0e;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Interview confirmed</div>
    <div style="color:#18191a;font-size:20px;font-weight:600;letter-spacing:-0.4px;">${params.company}</div>
    <div style="color:#4e5f0e;font-size:13px;margin-top:4px;">${params.jobTitle}</div>
    <div style="margin-top:12px;color:#18191a;font-size:14px;font-weight:500;">${dateStr}</div>
    ${params.meetingLink ? `<a href="${params.meetingLink}" style="display:inline-block;margin-top:12px;background:#18191a;color:#cce832;text-decoration:none;padding:8px 18px;border-radius:10px;font-size:12px;font-family:monospace;">Join meeting →</a>` : ""}
  </div>
  <div style="background:#fff;border-radius:16px;padding:20px;font-size:13px;color:#5a5f57;">
    <p>Congratulations ${params.userName}! Your interview with ${params.company} is confirmed.</p>
    <a href="${params.dashboardUrl}/interviews" style="display:inline-block;margin-top:12px;background:#18191a;color:#cce832;text-decoration:none;padding:8px 18px;border-radius:10px;font-size:12px;font-family:monospace;">View in Landed →</a>
  </div>
</div>`,
  });
}

/* ─── Rejection notification ─── */
export async function sendRejectionNotification(params: {
  to: string;
  userName: string;
  jobTitle: string;
  company: string;
  dashboardUrl: string;
}) {
  return resend.emails.send({
    from: `Landed <${FROM}>`,
    to:   params.to,
    subject: `Update from ${params.company}`,
    html: `
<div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f4f5f1;">
  <div style="background:#fff;border-radius:16px;padding:24px;border:0.5px solid rgba(220,70,70,0.15);">
    <div style="color:#8b1a1a;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Application update</div>
    <div style="color:#18191a;font-size:16px;font-weight:600;">${params.jobTitle} · ${params.company}</div>
    <p style="color:#5a5f57;font-size:13px;margin-top:12px;">
      ${params.company} has passed on your application this time. Landed has already queued similar roles — keep the momentum going.
    </p>
    <a href="${params.dashboardUrl}/pipeline" style="display:inline-block;margin-top:12px;background:#18191a;color:#cce832;text-decoration:none;padding:8px 18px;border-radius:10px;font-size:12px;font-family:monospace;">View pipeline →</a>
  </div>
</div>`,
  });
}
