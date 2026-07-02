"use client";

import * as React from "react";
import { updateNotifications } from "@/app/settings/actions";
import { EMAIL_FREQUENCIES } from "@/lib/constants";
import { SettingsSection } from "@/components/settings/section";
import { FormSuccess } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface Prefs {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  weeklyDigest: boolean;
  breakingNews: boolean;
  newFollower: boolean;
  newLoginAlert: boolean;
  emailFrequency: string;
}

const CHANNELS: Array<[keyof Prefs & string, string, string]> = [
  ["emailEnabled", "Email notifications", "Account and content updates by email"],
  ["inAppEnabled", "In-app notifications", "Activity while you're on the site"],
  ["pushEnabled", "Push notifications", "Browser alerts (activates with the PWA in Phase 14)"],
];

const TYPES: Array<[keyof Prefs & string, string, string]> = [
  ["weeklyDigest", "Weekly digest", "The best of your topics, once a week"],
  ["breakingNews", "Breaking news", "Rare, time-sensitive alerts"],
  ["newFollower", "New followers", "When someone follows you"],
  ["newLoginAlert", "New sign-in alerts", "When your account signs in from a new device"],
];

export function NotificationsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = React.useState(initial);
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const Toggle = ({ item: [key, label, description] }: { item: [keyof Prefs & string, string, string] }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={Boolean(prefs[key])}
        onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
        className="size-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setSaved(false);
        await updateNotifications(prefs);
        setPending(false);
        setSaved(true);
      }}
    >
      <SettingsSection title="Channels" description="Where notifications reach you.">
        <div className="divide-y">
          {CHANNELS.map((item) => (
            <Toggle key={item[0]} item={item} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="What you hear about">
        <div className="divide-y">
          {TYPES.map((item) => (
            <Toggle key={item[0]} item={item} />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Email frequency" description="For digests and recommendations.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EMAIL_FREQUENCIES.map((freq) => (
            <button
              key={freq.value}
              type="button"
              aria-pressed={prefs.emailFrequency === freq.value}
              onClick={() => setPrefs((p) => ({ ...p, emailFrequency: freq.value }))}
              className={cn(
                "rounded-xl border p-3 text-sm font-medium transition-all",
                prefs.emailFrequency === freq.value
                  ? "border-accent bg-accent-soft shadow-sm"
                  : "hover:border-muted-foreground/40"
              )}
            >
              {freq.label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <FormSuccess message={saved ? "Notification preferences saved." : null} />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Save preferences"}
      </Button>
    </form>
  );
}
