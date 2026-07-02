import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Server-side session lookup, deduped per request. */
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getServerSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
