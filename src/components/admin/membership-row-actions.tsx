"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { adminSetSubscription } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

export function MembershipRowActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run(action: "comp" | "cancel") {
    setPending(true);
    await adminSetSubscription(userId, action);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      {status === "active" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run("cancel")}>
          Cancel
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run("comp")}>
          Gift premium
        </Button>
      )}
    </div>
  );
}
