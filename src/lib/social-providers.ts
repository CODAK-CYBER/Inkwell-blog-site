/** Server-only: which OAuth providers have credentials configured. */
export type SocialProvider = "google" | "github" | "apple";

export function enabledSocialProviders(): SocialProvider[] {
  const providers: SocialProvider[] = [];
  if (process.env.GOOGLE_CLIENT_ID) providers.push("google");
  if (process.env.GITHUB_CLIENT_ID) providers.push("github");
  if (process.env.APPLE_CLIENT_ID) providers.push("apple");
  return providers;
}
