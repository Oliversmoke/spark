export function PageHeader({
  label,
  title,
  description,
}: {
  label?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6 space-y-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
    </header>
  );
}
