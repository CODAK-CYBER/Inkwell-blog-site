import { promises as fs } from "fs";
import path from "path";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email delivery:
 * - RESEND_API_KEY set  → send via Resend (https://resend.com)
 * - not set             → dev outbox: log to terminal + save HTML to dev-emails/
 *
 * In development a Resend failure falls back to the dev outbox instead of
 * throwing, so auth flows (signup, reset) keep working while you debug.
 * Note: Resend's free tier only delivers to your own account email until
 * you verify a sending domain.
 */
export async function sendMail(options: SendMailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      await sendViaResend(apiKey, options);
      return;
    } catch (err) {
      if (process.env.NODE_ENV === "production") throw err;
      console.error(
        `⚠️ Resend delivery failed (${err instanceof Error ? err.message : err}). ` +
          "Falling back to the dev outbox. " +
          "Tip: without a verified domain, Resend only delivers to your own account email."
      );
    }
  }

  await devOutbox(options);
}

async function sendViaResend(apiKey: string, { to, subject, html }: SendMailOptions) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Inkwell <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
  console.log(`📧 Sent via Resend → ${to} · "${subject}"`);
}

async function devOutbox({ to, subject, html }: SendMailOptions) {
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  console.log("\n📧 [dev email] ──────────────────────────────");
  console.log(`  To:      ${to}`);
  console.log(`  Subject: ${subject}`);
  for (const link of links) {
    if (link.startsWith(process.env.BETTER_AUTH_URL ?? "http://localhost:3000")) {
      console.log(`  Link:    ${link}`);
    }
  }
  try {
    const dir = path.join(process.cwd(), "dev-emails");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(
      dir,
      `${Date.now()}-${subject.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`
    );
    await fs.writeFile(file, html, "utf8");
    console.log(`  Saved:   ${file}`);
  } catch {
    // best-effort in dev
  }
  console.log("──────────────────────────────────────────────\n");
}
