"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reported to a monitoring service (Sentry etc.) in Phase 13.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <span className="rounded-full bg-destructive/10 p-4 text-destructive">
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="mt-6 text-2xl font-bold sm:text-3xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        An unexpected error occurred on our end. Please try again — if the
        problem persists, we&apos;re probably already on it.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <Button variant="accent" className="mt-8" onClick={reset}>
        <RotateCcw />
        Try again
      </Button>
    </Container>
  );
}
