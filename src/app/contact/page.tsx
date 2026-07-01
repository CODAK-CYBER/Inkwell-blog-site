import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the editorial team.",
};

export default function ContactPage() {
  return (
    <Container className="max-w-xl py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        Questions, pitches, partnerships — we read everything.
      </p>
      {/* Form submission is wired up with the backend in Phase 2+ */}
      <form className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Your name" aria-label="Your name" required />
          <Input type="email" placeholder="Your email" aria-label="Your email" required />
        </div>
        <Input placeholder="Subject" aria-label="Subject" required />
        <textarea
          placeholder="Your message…"
          aria-label="Your message"
          required
          rows={6}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button variant="accent" type="submit" className="w-full sm:w-auto">
          Send message
        </Button>
      </form>
    </Container>
  );
}
