"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, PartyPopper } from "lucide-react";
import { CONTENT_TYPES, EMAIL_FREQUENCIES, TOPICS } from "@/lib/constants";
import { completeOnboarding, type OnboardingData } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STEPS = ["Topics", "Content", "Notifications", "Frequency", "Profile"] as const;

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [topics, setTopics] = React.useState<string[]>([]);
  const [contentTypes, setContentTypes] = React.useState<string[]>(["articles"]);
  const [notifications, setNotifications] = React.useState({
    emailEnabled: true,
    inAppEnabled: true,
    pushEnabled: false,
    weeklyDigest: true,
    breakingNews: false,
  });
  const [emailFrequency, setEmailFrequency] = React.useState("weekly");
  const [bio, setBio] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [location, setLocation] = React.useState("");

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canContinue =
    step === 0 ? topics.length >= 3 : step === 1 ? contentTypes.length >= 1 : true;

  async function finish() {
    setPending(true);
    setError(null);
    try {
      const data: OnboardingData = {
        topics,
        contentTypes,
        notifications,
        emailFrequency,
        profile: { bio, website, location },
      };
      await completeOnboarding(data);
    } catch (err) {
      // Next.js redirect() throws — let it propagate
      if (err && typeof err === "object" && "digest" in err) throw err;
      setError("Something went wrong saving your preferences. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <section>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                Welcome, {userName.split(" ")[0]} 👋
              </h1>
              <p className="mt-2 text-muted-foreground">
                Pick at least 3 topics you love. Your homepage will be built around them.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TOPICS.map((topic) => {
                  const selected = topics.includes(topic.slug);
                  return (
                    <button
                      key={topic.slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggle(topics, setTopics, topic.slug)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all",
                        selected
                          ? "border-accent bg-accent-soft text-foreground shadow-sm"
                          : "hover:border-muted-foreground/40"
                      )}
                    >
                      <span className="text-lg">{topic.emoji}</span>
                      {topic.label}
                      {selected && <Check className="ml-auto size-4 text-accent" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {topics.length} selected {topics.length < 3 && `— pick ${3 - topics.length} more`}
              </p>
            </section>
          )}

          {step === 1 && (
            <section>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                How do you like your content?
              </h1>
              <p className="mt-2 text-muted-foreground">Select all that apply.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {CONTENT_TYPES.map((ct) => {
                  const selected = contentTypes.includes(ct.slug);
                  return (
                    <button
                      key={ct.slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggle(contentTypes, setContentTypes, ct.slug)}
                      className={cn(
                        "rounded-xl border p-5 text-left transition-all",
                        selected
                          ? "border-accent bg-accent-soft shadow-sm"
                          : "hover:border-muted-foreground/40"
                      )}
                    >
                      <span className="flex items-center justify-between font-medium">
                        {ct.label}
                        {selected && <Check className="size-4 text-accent" />}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {ct.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                How should we reach you?
              </h1>
              <p className="mt-2 text-muted-foreground">
                You can change these anytime in Settings.
              </p>
              <div className="mt-8 space-y-3">
                {(
                  [
                    ["emailEnabled", "Email notifications", "Important account and content updates"],
                    ["inAppEnabled", "In-app notifications", "Activity while you're on the site"],
                    ["pushEnabled", "Push notifications", "Browser alerts for big stories (arrives with PWA)"],
                    ["weeklyDigest", "Weekly digest", "The best of your topics, once a week"],
                    ["breakingNews", "Breaking news", "Rare, time-sensitive alerts"],
                  ] as const
                ).map(([key, label, description]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors hover:border-muted-foreground/40"
                  >
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-sm text-muted-foreground">{description}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={notifications[key]}
                      onChange={(e) =>
                        setNotifications((n) => ({ ...n, [key]: e.target.checked }))
                      }
                      className="size-5 accent-[var(--accent)]"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                How often should we email you?
              </h1>
              <p className="mt-2 text-muted-foreground">Digest and recommendation emails.</p>
              <div className="mt-8 space-y-3">
                {EMAIL_FREQUENCIES.map((freq) => (
                  <label
                    key={freq.value}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all",
                      emailFrequency === freq.value
                        ? "border-accent bg-accent-soft shadow-sm"
                        : "hover:border-muted-foreground/40"
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{freq.label}</span>
                      <span className="block text-sm text-muted-foreground">
                        {freq.description}
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="frequency"
                      checked={emailFrequency === freq.value}
                      onChange={() => setEmailFrequency(freq.value)}
                      className="size-5 accent-[var(--accent)]"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                Finish your profile
              </h1>
              <p className="mt-2 text-muted-foreground">
                All optional — you can always do this later in Settings.
              </p>
              <div className="mt-8 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="bio" className="text-sm font-medium">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    maxLength={280}
                    placeholder="A line or two about you…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="website" className="text-sm font-medium">
                    Website
                  </label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://…"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="location" className="text-sm font-medium">
                    Location
                  </label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="accent" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            Continue
            <ArrowRight />
          </Button>
        ) : (
          <Button variant="accent" onClick={finish} disabled={pending}>
            {pending ? (
              <Spinner className="size-4" />
            ) : (
              <>
                <PartyPopper />
                Take me to my feed
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
