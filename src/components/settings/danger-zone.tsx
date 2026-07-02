"use client";

import * as React from "react";
import { Download, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SettingsSection } from "@/components/settings/section";
import { FormError, FormField, FormSuccess } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function DangerZone() {
  const [confirming, setConfirming] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <SettingsSection
      danger
      title="Danger zone"
      description="Export everything we store about you, or delete your account permanently."
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Export account data</p>
            <p className="text-sm text-muted-foreground">
              Download a JSON file with your profile, interests, bookmarks and history.
            </p>
          </div>
          <a href="/api/account/export" download>
            <Button variant="outline" size="sm">
              <Download />
              Export data
            </Button>
          </a>
        </div>

        <div className="border-t border-destructive/20 pt-5">
          <p className="text-sm font-medium">Delete account</p>
          <p className="text-sm text-muted-foreground">
            Permanently removes your account and all data. We&apos;ll email you a
            confirmation link — nothing is deleted until you click it.
          </p>

          {!confirming ? (
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => setConfirming(true)}
            >
              <Trash2 />
              Delete my account
            </Button>
          ) : (
            <form
              className="mt-4 max-w-sm space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setPending(true);
                const { error } = await authClient.deleteUser({
                  password,
                  callbackURL: "/",
                });
                setPending(false);
                if (error) {
                  setError(error.message ?? "Incorrect password.");
                  return;
                }
                setMsg("Confirmation email sent. Your account will be deleted once you click the link.");
                setConfirming(false);
                setPassword("");
              }}
            >
              <FormField
                label="Confirm your password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FormError message={error} />
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                  {pending ? <Spinner className="size-4" /> : "Send deletion email"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <FormSuccess message={msg} />
        </div>
      </div>
    </SettingsSection>
  );
}
