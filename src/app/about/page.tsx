import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${siteConfig.name} — who we are and what we publish.`,
};

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">About {siteConfig.name}</h1>
      <div className="mt-6 space-y-5 leading-relaxed text-foreground/90">
        <p>
          {siteConfig.name} is a premium publishing platform built for readers
          who want depth over noise. We publish in-depth articles and essays on
          technology, culture, business, science, health and travel.
        </p>
        <p>
          Every reader gets a personalized experience: follow the categories and
          authors you love, save articles for later, and let your homepage adapt
          to what you actually read.
        </p>
        <p className="text-muted-foreground">
          This page is a placeholder — the full story, team and mission will be
          written here as the platform grows.
        </p>
      </div>
    </Container>
  );
}
