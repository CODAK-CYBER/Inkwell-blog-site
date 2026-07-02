import { siteConfig } from "@/lib/site";

/**
 * Professional transactional email templates.
 * Inline styles only — email clients don't load stylesheets.
 */

const accent = "#e35c0f";

function layout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f4f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e1;">
        <tr>
          <td style="padding:28px 40px;border-bottom:1px solid #f0efec;">
            <span style="font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#1c1917;">${siteConfig.name}<span style="color:${accent};">.</span></span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#1c1917;">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #f0efec;">
            <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
              You're receiving this because you have an account on ${siteConfig.name}.<br/>
              © ${new Date().getFullYear()} ${siteConfig.name}. ${siteConfig.tagline}.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#44403c;">${text}</p>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">${label}</a></p>`;

const fallbackLink = (href: string) =>
  `<p style="margin:16px 0 0;font-size:12px;color:#a8a29e;line-height:1.6;">If the button doesn't work, copy this link into your browser:<br/><a href="${href}" style="color:${accent};word-break:break-all;">${href}</a></p>`;

export function verifyEmailTemplate(name: string, url: string) {
  return {
    subject: `Verify your email — ${siteConfig.name}`,
    html: layout(
      "Confirm your email address",
      p(`Hi ${name},`) +
        p(
          `Welcome to ${siteConfig.name}! Click the button below to verify your email address and activate your account.`
        ) +
        button(url, "Verify my email") +
        p(`This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.`) +
        fallbackLink(url)
    ),
  };
}

export function welcomeTemplate(name: string, url: string) {
  return {
    subject: `Welcome to ${siteConfig.name} 🎉`,
    html: layout(
      `Welcome aboard, ${name}!`,
      p(`Your email is verified and your account is ready.`) +
        p(
          `Next, tell us what you love reading — we'll build your personalized feed around it.`
        ) +
        button(url, "Choose your interests") +
        p(`Happy reading!<br/>— The ${siteConfig.name} team`)
    ),
  };
}

export function resetPasswordTemplate(name: string, url: string) {
  return {
    subject: `Reset your password — ${siteConfig.name}`,
    html: layout(
      "Reset your password",
      p(`Hi ${name},`) +
        p(`We received a request to reset your password. Click below to choose a new one.`) +
        button(url, "Reset password") +
        p(
          `This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.`
        ) +
        fallbackLink(url)
    ),
  };
}

export function passwordChangedTemplate(name: string) {
  return {
    subject: `Your password was changed — ${siteConfig.name}`,
    html: layout(
      "Password changed",
      p(`Hi ${name},`) +
        p(`Your ${siteConfig.name} password was just changed.`) +
        p(
          `If this was you, no action is needed. If you didn't do this, reset your password immediately and contact support.`
        )
    ),
  };
}

export function newLoginTemplate(
  name: string,
  info: { ip?: string | null; userAgent?: string | null; time: Date }
) {
  return {
    subject: `New sign-in to your account — ${siteConfig.name}`,
    html: layout(
      "New sign-in detected",
      p(`Hi ${name},`) +
        p(`Your account was just signed in to:`) +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px;color:#44403c;line-height:1.9;">
          <tr><td style="color:#a8a29e;padding-right:16px;">Time</td><td>${info.time.toUTCString()}</td></tr>
          <tr><td style="color:#a8a29e;padding-right:16px;">IP</td><td>${info.ip ?? "Unknown"}</td></tr>
          <tr><td style="color:#a8a29e;padding-right:16px;">Device</td><td>${info.userAgent ?? "Unknown"}</td></tr>
        </table>` +
        p(
          `If this was you, you can ignore this email. If not, change your password right away and review your active sessions in Settings → Security.`
        )
    ),
  };
}

export function accountDeletedTemplate(name: string) {
  return {
    subject: `Your account has been deleted — ${siteConfig.name}`,
    html: layout(
      "Account deleted",
      p(`Hi ${name},`) +
        p(
          `Your ${siteConfig.name} account and associated data have been permanently deleted, as you requested.`
        ) +
        p(`We're sorry to see you go. You're always welcome back.`)
    ),
  };
}

export function deleteAccountVerificationTemplate(name: string, url: string) {
  return {
    subject: `Confirm account deletion — ${siteConfig.name}`,
    html: layout(
      "Confirm account deletion",
      p(`Hi ${name},`) +
        p(
          `We received a request to permanently delete your ${siteConfig.name} account. This cannot be undone.`
        ) +
        button(url, "Yes, delete my account") +
        p(`If you didn't request this, ignore this email and your account will remain active.`) +
        fallbackLink(url)
    ),
  };
}

/** Shell for the Phase 8 weekly digest — content plugs in later. */
export function weeklyDigestTemplate(name: string, itemsHtml: string) {
  return {
    subject: `Your weekly digest — ${siteConfig.name}`,
    html: layout(
      "Your week on " + siteConfig.name,
      p(`Hi ${name}, here's what's worth your time this week:`) + itemsHtml
    ),
  };
}
