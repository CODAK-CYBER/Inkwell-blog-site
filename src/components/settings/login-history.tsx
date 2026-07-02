import { History } from "lucide-react";
import { SettingsSection } from "@/components/settings/section";

interface LoginEventRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function LoginHistory({ events }: { events: LoginEventRow[] }) {
  return (
    <SettingsSection
      title="Login history"
      description="Recent sign-ins to your account. Unfamiliar activity? Change your password."
    >
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No logins recorded yet.</p>
      ) : (
        <ul className="divide-y">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 py-2.5">
              <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm">
                  {new Date(event.createdAt).toLocaleString()} ·{" "}
                  <span className="text-muted-foreground">{event.ipAddress || "IP unknown"}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {event.userAgent || "Unknown device"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
