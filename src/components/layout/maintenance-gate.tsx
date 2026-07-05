import { headers } from "next/headers";
import { Wrench } from "lucide-react";
import { getSettings, settingIsOn } from "@/lib/settings";
import { getServerSession } from "@/lib/session";
import { Container } from "@/components/ui/container";

/** Paths that stay reachable during maintenance (so staff can sign in). */
const ALLOWED = ["/login", "/two-factor", "/forgot-password", "/reset-password"];

/**
 * When maintenance mode is on, replaces the page for everyone except
 * staff (editor/admin/superadmin/moderator), who see a notice bar instead.
 */
export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  if (!settingIsOn(settings.maintenanceMode)) return <>{children}</>;

  const pathname = (await headers()).get("x-pathname") ?? "/";
  if (ALLOWED.some((p) => pathname.startsWith(p))) return <>{children}</>;

  const session = await getServerSession();
  const role = session?.user.role ?? "user";
  const isStaff = ["editor", "admin", "superadmin", "moderator"].includes(role);

  if (isStaff) {
    return (
      <>
        <div className="bg-accent px-4 py-1.5 text-center text-sm font-medium text-accent-foreground">
          🔧 Maintenance mode is ON — visitors see the maintenance page. Turn it off in
          Admin → Settings.
        </div>
        {children}
      </>
    );
  }

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <span className="rounded-full bg-accent-soft p-4 text-accent">
        <Wrench className="size-8" />
      </span>
      <h1 className="mt-6 font-serif text-3xl font-bold">Back soon</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{settings.maintenanceMessage}</p>
      {settings.supportEmail && (
        <p className="mt-2 text-sm text-muted-foreground">
          Need something urgent?{" "}
          <a href={`mailto:${settings.supportEmail}`} className="text-accent hover:underline">
            {settings.supportEmail}
          </a>
        </p>
      )}
    </Container>
  );
}
