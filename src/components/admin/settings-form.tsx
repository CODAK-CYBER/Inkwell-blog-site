"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { updateSettings } from "@/lib/actions/system";
import type { SettingKey } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormSuccess } from "@/components/auth/form-field";

export function SettingsForm({ initial }: { initial: Record<SettingKey, string> }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const setBool = (key: SettingKey, on: boolean) =>
    setForm((f) => ({ ...f, [key]: on ? "true" : "false" }));

  const Toggle = ({
    settingKey,
    label,
    description,
    danger,
  }: {
    settingKey: SettingKey;
    label: string;
    description: string;
    danger?: boolean;
  }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className={`block text-sm font-medium ${danger ? "text-destructive" : ""}`}>{label}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={form[settingKey] === "true"}
        onChange={(e) => setBool(settingKey, e.target.checked)}
        className="size-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );

  return (
    <form
      className="max-w-2xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setSaved(false);
        await updateSettings(form);
        setPending(false);
        setSaved(true);
        router.refresh();
      }}
    >
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Settings className="size-5 text-accent" />
        Platform settings
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Feature toggles and operational controls. Changes apply immediately.
      </p>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Feature toggles</h2>
        <div className="mt-2 divide-y">
          <Toggle
            settingKey="registrationEnabled"
            label="Allow new registrations"
            description="When off, sign-up is closed at both the UI and the API."
          />
          <Toggle
            settingKey="commentsEnabled"
            label="Allow commenting platform-wide"
            description="Master switch — overrides per-article comment settings."
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="font-serif text-lg font-semibold">Maintenance</h2>
        <div className="mt-2 divide-y">
          <Toggle
            danger
            settingKey="maintenanceMode"
            label="Maintenance mode"
            description="Visitors see a maintenance page; staff can still browse and see a notice bar."
          />
        </div>
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Maintenance message</label>
          <Input
            value={form.maintenanceMessage}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceMessage: e.target.value }))}
            className="h-9"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold">Contact</h2>
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Support email</label>
          <Input
            type="email"
            value={form.supportEmail}
            onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
            placeholder="support@yourdomain.com"
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            Shown on the maintenance page. Site name, logo and theme tokens live in code
            (src/lib/site.ts, globals.css) — change once, applies everywhere.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? <Spinner className="size-4" /> : "Save settings"}
        </Button>
        <FormSuccess message={saved ? "Settings saved." : null} />
      </div>
    </form>
  );
}
