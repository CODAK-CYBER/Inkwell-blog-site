import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { Container } from "@/components/ui/container";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/settings");

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your profile, account, and preferences.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
