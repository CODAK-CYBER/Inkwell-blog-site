"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/settings/actions";
import { SettingsSection } from "@/components/settings/section";
import { FormError, FormField, FormSuccess } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  website: string;
  location: string;
  image: string;
  coverImage: string;
  socialLinks: Record<string, string>;
}

const SOCIAL_FIELDS = ["twitter", "github", "linkedin", "instagram", "youtube"] as const;

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const result = await updateProfile(form);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <SettingsSection
        title="Public profile"
        description="This information appears on your public profile page."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Display name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <FormField
              label="Username"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_.-]+"
              hint={`Your profile: /u/${form.username || "…"}`}
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              maxLength={280}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{form.bio.length}/280</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Website"
              type="url"
              placeholder="https://…"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
            <FormField
              label="Location"
              placeholder="City, Country"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Photos"
        description="Paste image URLs for now — direct uploads arrive with the media library in Phase 4."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Profile photo URL"
            type="url"
            placeholder="https://…/avatar.jpg"
            value={form.image}
            onChange={(e) => set("image", e.target.value)}
          />
          <FormField
            label="Cover image URL"
            type="url"
            placeholder="https://…/cover.jpg"
            value={form.coverImage}
            onChange={(e) => set("coverImage", e.target.value)}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Social links">
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((key) => (
            <FormField
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              placeholder={`https://${key === "twitter" ? "x" : key}.com/…`}
              value={form.socialLinks[key] ?? ""}
              onChange={(e) =>
                set("socialLinks", { ...form.socialLinks, [key]: e.target.value })
              }
            />
          ))}
        </div>
      </SettingsSection>

      <FormError message={error} />
      <FormSuccess message={saved ? "Profile saved." : null} />

      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Save changes"}
      </Button>
    </form>
  );
}
