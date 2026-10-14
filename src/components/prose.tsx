export function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-2 [&_h2]:font-display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </div>
  );
}
