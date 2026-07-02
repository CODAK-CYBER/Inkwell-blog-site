"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PenSquare } from "lucide-react";
import { becomeAuthor } from "@/app/settings/actions";
import { SettingsSection } from "@/components/settings/section";
import { FormError } from "@/components/auth/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function BecomeAuthor() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <SettingsSection
      title="Become an author"
      description="Write and publish on this platform. Your drafts go through editorial review before they appear publicly."
    >
      <FormError message={error} />
      <Button
        variant="accent"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const res = await becomeAuthor();
          setPending(false);
          if (res?.error) {
            setError(res.error);
            return;
          }
          router.push("/write");
          router.refresh();
        }}
      >
        {pending ? <Spinner className="size-4" /> : (
          <>
            <PenSquare />
            Start writing
          </>
        )}
      </Button>
    </SettingsSection>
  );
}
