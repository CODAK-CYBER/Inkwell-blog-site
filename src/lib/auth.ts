import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor, username } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { ac, roles } from "@/lib/permissions";
import { sendMail } from "@/lib/email";
import {
  accountDeletedTemplate,
  deleteAccountVerificationTemplate,
  newLoginTemplate,
  passwordChangedTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
  welcomeTemplate,
} from "@/lib/email/templates";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/** Only expose providers whose credentials are configured. */
const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  }),
  ...(process.env.GITHUB_CLIENT_ID && {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  }),
  ...(process.env.APPLE_CLIENT_ID && {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
    },
  }),
};

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL,

  database: prismaAdapter(prisma, { provider: "sqlite" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    // better-auth hashes with scrypt (memory-hard, OWASP-approved)
    sendResetPassword: async ({ user, url }) => {
      const t = resetPasswordTemplate(user.name, url);
      await sendMail({ to: user.email, ...t });
    },
    onPasswordReset: async ({ user }) => {
      const t = passwordChangedTemplate(user.name);
      await sendMail({ to: user.email, ...t });
    },
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      const t = verifyEmailTemplate(user.name, url);
      await sendMail({ to: user.email, ...t });
    },
    afterEmailVerification: async (user) => {
      const t = welcomeTemplate(user.name, `${baseURL}/onboarding`);
      await sendMail({ to: user.email, ...t });
    },
  },

  socialProviders,

  user: {
    additionalFields: {
      bio: { type: "string", required: false },
      website: { type: "string", required: false },
      location: { type: "string", required: false },
      coverImage: { type: "string", required: false },
      socialLinks: { type: "string", required: false },
      language: { type: "string", required: false, defaultValue: "en" },
      timezone: { type: "string", required: false, defaultValue: "UTC" },
      profileVisibility: { type: "string", required: false, defaultValue: "public" },
      showReadingActivity: { type: "boolean", required: false, defaultValue: true },
      preferredContentTypes: { type: "string", required: false },
      emailFrequency: { type: "string", required: false, defaultValue: "weekly" },
      onboardingComplete: { type: "boolean", required: false, defaultValue: false },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({
        user,
        newEmail,
        url,
      }: {
        user: { name: string; email: string };
        newEmail: string;
        url: string;
      }) => {
        const t = verifyEmailTemplate(user.name, url);
        await sendMail({
          to: newEmail,
          subject: `Confirm your new email — ${siteConfig.name}`,
          html: t.html,
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        const t = deleteAccountVerificationTemplate(user.name, url);
        await sendMail({ to: user.email, ...t });
      },
      afterDelete: async (user) => {
        try {
          const t = accountDeletedTemplate(user.name);
          await sendMail({ to: user.email, ...t });
        } catch {
          // account is already gone; the farewell email is best-effort
        }
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days ("remember me" keeps the cookie; otherwise it dies with the browser)
    updateAge: 60 * 60 * 24, // refresh expiry daily while active
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5-min signed cookie cache = fewer DB hits per request
    },
  },

  // Login attempt limits / lockout: repeated failures hit these windows
  // and get 429s until the window resets.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/email": { window: 300, max: 5 },
      "/sign-up/email": { window: 300, max: 3 },
      "/forget-password": { window: 300, max: 3 },
      "/two-factor/verify-totp": { window: 300, max: 5 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Bootstrap: the very first account becomes superadmin.
          try {
            const count = await prisma.user.count();
            if (count === 1) {
              await prisma.user.update({
                where: { id: user.id },
                data: { role: "superadmin" },
              });
            }
          } catch (err) {
            console.error("superadmin bootstrap failed:", err);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          // Device recognition + login history + new-login alert.
          try {
            const [user, prefs, priorLogins] = await Promise.all([
              prisma.user.findUnique({ where: { id: session.userId } }),
              prisma.notificationPreferences.findUnique({ where: { userId: session.userId } }),
              prisma.loginEvent.count({
                where: { userId: session.userId, userAgent: session.userAgent ?? undefined },
              }),
            ]);

            await prisma.loginEvent.create({
              data: {
                userId: session.userId,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
              },
            });

            const alertsOn = prefs?.newLoginAlert ?? true;
            const knownDevice = priorLogins > 0;
            if (user && alertsOn && !knownDevice) {
              const t = newLoginTemplate(user.name, {
                ip: session.ipAddress,
                userAgent: session.userAgent,
                time: new Date(),
              });
              await sendMail({ to: user.email, ...t });
            }
          } catch (err) {
            // Never block sign-in on telemetry
            console.error("login-event hook failed:", err);
          }
        },
      },
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
    twoFactor({
      issuer: siteConfig.name,
    }),
    admin({
      ac,
      roles,
      defaultRole: "user",
      adminRoles: ["admin", "superadmin"],
    }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
