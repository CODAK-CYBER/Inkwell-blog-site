import * as React from "react";
import { cn } from "@/lib/utils";

/** Consistent page gutter and max width across the site. */
function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

export { Container };
