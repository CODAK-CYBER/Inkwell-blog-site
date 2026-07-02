import { Input } from "@/components/ui/input";

export function FormField({
  label,
  hint,
  ...inputProps
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = inputProps.id ?? inputProps.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input id={id} {...inputProps} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent dark:text-foreground">
      {message}
    </p>
  );
}
