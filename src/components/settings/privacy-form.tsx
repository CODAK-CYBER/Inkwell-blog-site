"use client";

import * as React from "react";
import { updatePrivacy } from "@/app/settings/actions";
import { SettingsSection } from "@/components/settings/section";
import { FormSuccess } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function PrivacyForm({
  initial,
}: {
  initial: { profileVisibility: string; showReadingActivity: boolean };
}) {
  const [visibility, setVisibility] = React.useState(initial.profileVisibility);
  const [showActivity, setShowActivity] = React.useState(initial.showReadingActivity);
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setSaved(false);
        await updatePrivacy({ profileVisibility: visibility, showReadingActivity: showActivity });
        setPending(false);
        setSaved(true);
      }}
    >
      <SettingsSection title="Privacy" description="Control what others can see.">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium">Profile visibility</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(
                [
                  ["public", "Public", "Anyone can view your profile page"],
                  ["private", "Private", "Only you can see your profile"],
                ] as const
              ).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={visibility === value}
                  onClick={() => setVisibility(value)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    visibility === value
                      ? "border-accent bg-accent-soft shadow-sm"
                      : "hover:border-muted-foreground/40"
                  )}
                >
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Show reading activity</span>
              <span className="block text-sm text-muted-foreground">
                Let others see topics you follow on your public profile
              </span>
            </span>
            <input
              type="checkbox"
              checked={showActivity}
              onChange={(e) => setShowActivity(e.target.checked)}
              className="size-5 shrink-0 accent-[var(--accent)]"
            />
          </label>

          <FormSuccess message={saved ? "Privacy settings saved." : null} />
          <Button type="submit" variant="accent" size="sm" disabled={pending}>
            {pending ? <Spinner className="size-4" /> : "Save"}
          </Button>
        </div>
      </SettingsSection>
    </form>
  );
}
