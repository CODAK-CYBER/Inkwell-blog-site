import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserRow } from "@/components/admin/user-row";

export const metadata: Metadata = {
  title: "User management",
  robots: { index: false },
};

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams;
  const session = await getServerSession();
  // Editors can access the admin area, but user management is admin-only.
  if (!session || !isAdminRole(session.user.role)) redirect("/admin");
  const page = Math.max(1, Number(pageParam) || 1);
  const query = q?.trim() ?? "";

  const where = query
    ? {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { username: { contains: query } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        role: true,
        banned: true,
        banReason: true,
        emailVerified: true,
        verified: true,
        twoFactorEnabled: true,
        createdAt: true,
        _count: { select: { sessions: true, loginEvents: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <form className="flex max-w-md gap-2" action="/admin/users" method="GET">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search name, email or username…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {total} user{total === 1 ? "" : "s"}
        {query && (
          <>
            {" "}
            matching <span className="font-medium text-foreground">“{query}”</span>
          </>
        )}
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Logins</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  username: user.username,
                  image: user.image,
                  role: user.role ?? "user",
                  banned: Boolean(user.banned),
                  banReason: user.banReason,
                  emailVerified: user.emailVerified,
                  verified: user.verified,
                  twoFactorEnabled: Boolean(user.twoFactorEnabled),
                  createdAt: user.createdAt.toISOString(),
                  loginCount: user._count.loginEvents,
                  activeSessions: user._count.sessions,
                }}
                isSelf={user.id === session?.user.id}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/users?q=${encodeURIComponent(query)}&page=${page - 1}`}
              className="rounded-md border px-3 py-1.5 hover:bg-secondary"
            >
              ← Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/users?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="rounded-md border px-3 py-1.5 hover:bg-secondary"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
