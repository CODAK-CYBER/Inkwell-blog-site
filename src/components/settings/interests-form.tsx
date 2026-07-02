"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { updateInterests } from "@/app/settings/actions";
import { CONTENT_TYPES } from "@/lib/constants";
import { SettingsSection } from "@/components/settings/section";
import { FormError, FormSuccess } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function InterestsForm({
  categories,
  initialTopics,
  initialContentTypes,
}: {
  categories: Array<{ slug: string; name: string; icon: string | null }>;
  initialTopics: string[];
  initialContentTypes: string[];
}) {
  const router = useRouter();
  const [topics, setTopics] = React.useState(initialTopics);
  const [contentTypes, setContentTypes] = React.useState(initialContentTypes);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setSaved(false);
        setError(null);
        const res = await updateInterests({ topics, contentTypes });
        setPending(false);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setSaved(true);
        router.refresh();
      }}
    >
      <SettingsSection
        title="Your topics"
        description="These shape your homepage, recommendations, and digests."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((c) => {
            const selected = topics.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(topics, setTopics, c.slug)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all",
                  selected
                    ? "border-accent bg-accent-soft shadow-sm"
                    : "hover:border-muted-foreground/40"
                )}
              >
                <span>{c.icon}</span>
                {c.name}
                {selected && <Check className="ml-auto size-4 text-accent" />}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Content formats" description="What you prefer to consume.">
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTENT_TYPES.map((ct) => {
            const selected = contentTypes.includes(ct.slug);
            return (
              <button
                key={ct.slug}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(contentTypes, setContentTypes, ct.slug)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-accent bg-accent-soft shadow-sm"
                    : "hover:border-muted-foreground/40"
                )}
              >
                <span className="flex items-center justify-between text-sm font-medium">
                  {ct.label}
                  {selected && <Check className="size-4 text-accent" />}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{ct.description}</span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <FormError message={error} />
      <FormSuccess message={saved ? "Interests updated — your homepage will reflect them." : null} />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : "Save interests"}
      </Button>
    </form>
  );
}
