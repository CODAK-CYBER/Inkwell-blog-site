"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the banner doesn't compete with initial page paint.
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (value: "accepted" | "declined") => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:right-6 sm:w-96"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="rounded-xl border bg-popover p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-accent-soft p-2 text-accent">
                <Cookie className="size-5" />
              </span>
              <div>
                <h3 className="font-sans text-sm font-semibold">We value your privacy</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  We use cookies to personalize your reading experience and analyze
                  traffic. Read our{" "}
                  <Link href="/cookies" className="text-accent underline underline-offset-2">
                    cookie policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="accent" className="flex-1" onClick={() => decide("accepted")}>
                Accept all
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => decide("declined")}>
                Decline
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
