"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  inferAdditionalFields,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { ac, roles } from "@/lib/permissions";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        if (typeof window !== "undefined") window.location.href = "/two-factor";
      },
    }),
    adminClient({ ac, roles }),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
