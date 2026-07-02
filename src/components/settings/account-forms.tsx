"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { updateLocale } from "@/app/settings/actions";
import { LANGUAGES } from "@/lib/constants";
import { SettingsSection } from "@/components/settings/section";
import { FormError, FormField, FormSuccess } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AccountForms({
  email,
  language,
  timezone,
}: {
  email: string;
  language: string;
  timezone: string;
}) {
  return (
    <div className="space-y-6">
      <ChangeEmail current={email} />
      <ChangePassword />
      <LocaleForm language={language} timezone={timezone} />
      <ThemePicker />
    </div>
  );
}

function ChangeEmail({ current }: { current: string }) {
  const [newEmail, setNewEmail] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <SettingsSection
      title="Email address"
      description={`Currently ${current}. Changing it requires confirming the new address.`}
    >
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setMsg(null);
          setPending(true);
          const { error } = await authClient.changeEmail({
            newEmail,
            callbackURL: "/settings/account",
          });
          setPending(false);
          if (error) setError(error.message ?? "Could not change email.");
          else {
            setMsg("Confirmation sent to the new address — the change applies once you click it.");
            setNewEmail("");
          }
        }}
      >
        <div className="flex-1">
          <FormField
            label="New email"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : "Update email"}
        </Button>
      </form>
      <div className="mt-3 space-y-2">
        <FormError message={error} />
        <FormSuccess message={msg} />
      </div>
    </SettingsSection>
  );
}

function ChangePassword() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [revokeOthers, setRevokeOthers] = React.useState(true);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <SettingsSection
      title="Password"
      description="Use a strong, unique password of at least 8 characters."
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setMsg(null);
          if (next !== confirm) {
            setError("New passwords don't match.");
            return;
          }
          setPending(true);
          const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: revokeOthers,
          });
          setPending(false);
          if (error) setError(error.message ?? "Could not change password.");
          else {
            setMsg("Password changed.");
            setCurrent("");
            setNext("");
            setConfirm("");
          }
        }}
      >
        <FormField
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <FormField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={revokeOthers}
            onChange={(e) => setRevokeOthers(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Sign out all other devices
        </label>
        <FormError message={error} />
        <FormSuccess message={msg} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : "Change password"}
        </Button>
      </form>
    </SettingsSection>
  );
}

function LocaleForm({ language, timezone }: { language: string; timezone: string }) {
  const [lang, setLang] = React.useState(language);
  const [tz, setTz] = React.useState(timezone);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const timezones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];

  return (
    <SettingsSection title="Language & time zone">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          await updateLocale({ language: lang, timezone: tz });
          setPending(false);
          setMsg("Saved.");
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="language" className="text-sm font-medium">
              Preferred language
            </label>
            <select
              id="language"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className={selectClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="timezone" className="text-sm font-medium">
              Time zone
            </label>
            <select
              id="timezone"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className={selectClass}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>
        <FormSuccess message={msg} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </form>
    </SettingsSection>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <SettingsSection title="Theme" description="How the site looks on this device.">
      {mounted && (
        <div className="grid grid-cols-3 gap-3">
          {(["light", "dark", "system"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                "rounded-xl border p-4 text-sm font-medium capitalize transition-all",
                theme === value
                  ? "border-accent bg-accent-soft shadow-sm"
                  : "hover:border-muted-foreground/40"
              )}
            >
              {value}
            </button>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
