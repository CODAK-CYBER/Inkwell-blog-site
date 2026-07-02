"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellPlus, Check } from "lucide-react";
import { toggleFollow } from "@/lib/actions/engagement";
import { Button } from "@/components/ui/button";

interface Props {
  targetType: "author" | "category" | "tag";
  targetKey: string;
  initialFollowing: boolean;
  signedIn: boolean;
  label?: string;
}

export function FollowButton({
  targetType,
  targetKey,
  initialFollowing,
  signedIn,
  label = "Follow",
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [pending, setPending] = React.useState(false);

  async function onClick() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setPending(true);
    setFollowing((v) => !v);
    try {
      const res = await toggleFollow(targetType, targetKey);
      setFollowing(res.following);
    } catch {
      setFollowing(following);
    }
    setPending(false);
  }

  return (
    <Button
      variant={following ? "secondary" : "accent"}
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
    >
      {following ? <Check /> : <BellPlus />}
      {following ? "Following" : label}
    </Button>
  );
}
