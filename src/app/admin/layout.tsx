import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin/admin-nav";

const STAFF_ROLES = ["editor", "admin", "superadmin"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/admin");

  const role = session.user.role ?? "user";
  if (!STAFF_ROLES.includes(role)) redirect("/");

  return (
    <Container className="py-8 lg:py-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Badge variant="accent" className="capitalize">{role}</Badge>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <AdminNav isAdmin={isAdminRole(role)} />
        </aside>
        <div className="min-w-0">
          <div className="lg:hidden">
            <AdminNav isAdmin={isAdminRole(role)} />
            <div className="my-6 border-t" />
          </div>
          {children}
        </div>
      </div>
    </Container>
  );
}
