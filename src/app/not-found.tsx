import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <p className="font-serif text-8xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Page not found</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The story you&apos;re looking for may have been moved, renamed, or never
        existed in the first place.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={buttonVariants({ variant: "accent" })}>
          <ArrowLeft className="size-4" />
          Back home
        </Link>
        <Link href="/search" className={buttonVariants({ variant: "outline" })}>
          <Search className="size-4" />
          Search articles
        </Link>
      </div>
    </Container>
  );
}
