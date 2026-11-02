// Contact form handler: POST /api/contact → emails the foundation via Resend.
// Uses Resend's REST API directly so the site needs no package.json or build step.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY    required
//   CONTACT_TO_EMAIL  optional, defaults to the foundation's inbox below
//   CONTACT_FROM_EMAIL optional, must be on a domain verified in Resend

const DEFAULT_TO = "adewoyefoundation@gmail.com";
const DEFAULT_FROM = "JAA Foundation <noreply@send.nxtedgestudio.com>";
const SITE_URL = "https://adewoyefoundation.org";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// 303 so the browser follows with a GET to the page.
const redirect = (req, path) =>
  new Response(null, { status: 303, headers: { Location: new URL(path, req.url).toString() } });

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function renderEmail({ preheader, heading, details = [], paragraphs = [], footerNote }) {
  const rows = details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;color:#5a6457;font-size:13px;width:110px;vertical-align:top;">${label}</td>
          <td style="padding:8px 0;color:#1d241d;font-size:15px;">${value}</td>
        </tr>`
    )
    .join("");
  const body = paragraphs
    .map((p) => `<p style="margin:16px 0 0;color:#1d241d;font-size:15px;line-height:1.65;">${p}</p>`)
    .join("");

  return `<!doctype html>
<html><body style="margin:0;background:#f8f4e8;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#2b482c;padding:24px 32px;">
          <p style="margin:0;color:#f8f4e8;font-family:Georgia,serif;font-size:20px;">Joseph Alabi Adewoye Foundation</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;color:#1c311d;">${heading}</h1>
          ${rows ? `<table role="presentation" width="100%" style="margin-top:20px;border-top:1px solid #ece4cf;">${rows}</table>` : ""}
          ${body}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #ece4cf;color:#5a6457;font-size:12px;">
          ${footerNote ? `${footerNote}<br />` : ""}<a href="${SITE_URL}" style="color:#2b482c;">adewoyefoundation.org</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail(apiKey, payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
  return res.json();
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  // The page normally submits JSON via fetch. Without JS the browser posts the
  // form itself; those requests get redirected to a page instead of JSON.
  const type = req.headers.get("content-type") || "";
  const isFormPost = type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
  const succeed = () => (isFormPost ? redirect(req, "/message-sent/") : json({ success: true }));
  const fail = (error, status) => (isFormPost ? redirect(req, "/error/?from=contact") : json({ error }, status));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("contact: RESEND_API_KEY is not set");
    return fail("Our message service is temporarily unavailable.", 503);
  }

  let data;
  try {
    data = isFormPost ? Object.fromEntries(await req.formData()) : await req.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  // Honeypot: bots fill the hidden "company" field. Pretend success, send nothing.
  if (data.company) return succeed();

  const firstName = String(data.firstName ?? "").trim().slice(0, 80);
  const lastName = String(data.lastName ?? "").trim().slice(0, 80);
  const email = String(data.email ?? "").trim().slice(0, 200);
  const message = String(data.message ?? "").trim().slice(0, 5000);

  if (!firstName || !lastName || !message || !EMAIL_RE.test(email)) {
    return fail("Please fill in every field with a valid email address.", 400);
  }

  const name = `${firstName} ${lastName}`;
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;
  const to = process.env.CONTACT_TO_EMAIL || DEFAULT_TO;
  const details = [
    { label: "Name", value: escapeHtml(name) },
    { label: "Email", value: `<a href="mailto:${escapeHtml(email)}" style="color:#2b482c;">${escapeHtml(email)}</a>` },
  ];
  const messageHtml = escapeHtml(message).replace(/\n/g, "<br />");

  try {
    await sendEmail(apiKey, {
      from,
      to: [to],
      reply_to: email,
      subject: `New message from ${name} via adewoyefoundation.org`,
      html: renderEmail({
        preheader: `${escapeHtml(name)} sent a message through the website.`,
        heading: "New website message",
        details,
        paragraphs: [`<strong>Message</strong><br />${messageHtml}`],
        footerNote: "Reply to this email to respond directly to the sender.",
      }),
    });
  } catch (err) {
    console.error("contact: notification failed", err);
    return fail("We couldn't send your message right now.", 502);
  }

  // Courtesy confirmation to the sender. Best-effort: the foundation already has
  // the message, so a failure here shouldn't be reported as a failed submission.
  // It deliberately does not echo the message back: the recipient address is
  // whatever the visitor typed, so echoing would let anyone send arbitrary
  // content under the foundation's name.
  try {
    await sendEmail(apiKey, {
      from,
      to: [email],
      reply_to: to,
      subject: "We've received your message | Joseph Alabi Adewoye Foundation",
      html: renderEmail({
        preheader: "Thank you for reaching out. We'll be in touch soon.",
        heading: `Thank you, ${escapeHtml(firstName)}.`,
        paragraphs: [
          "We've received your message and a member of the foundation will get back to you soon.",
          "If anything is urgent, simply reply to this email.",
        ],
        footerNote: "This is an automated confirmation.",
      }),
    });
  } catch (err) {
    console.error("contact: confirmation failed", err);
  }

  return succeed();
};

export const config = { path: "/api/contact" };
