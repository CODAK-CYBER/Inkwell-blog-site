import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { SearchDialog } from "@/components/search/search-dialog";

export async function Header() {
  const popularCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    take: 8,
    select: { name: true, slug: true },
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <MainNav />
        </div>

        <div className="flex items-center gap-2">
          <SearchDialog categories={popularCategories} />
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
