export function SettingsSection({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={
        danger
          ? "rounded-xl border border-destructive/40 bg-destructive/5 p-6"
          : "rounded-xl border bg-card p-6"
      }
    >
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
