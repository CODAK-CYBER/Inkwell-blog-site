import { cn } from "@/lib/utils";

function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent",
        className
      )}
    />
  );
}

export { Spinner };
