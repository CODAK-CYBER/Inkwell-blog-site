import { Container } from "@/components/ui/container";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="max-w-3xl py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: July 1, 2026
      </p>
      <div className="mt-8 leading-relaxed text-foreground/90">{children}</div>
    </Container>
  );
}
