import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-baseline gap-1 font-serif text-2xl font-bold tracking-tight", className)}
      aria-label={`${siteConfig.name} — home`}
    >
      {siteConfig.name}
      <span className="size-1.5 translate-y-[-1px] rounded-full bg-accent" aria-hidden />
    </Link>
  );
}
