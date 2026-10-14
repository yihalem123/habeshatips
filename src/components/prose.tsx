export function Prose({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12">
      <div className={`grid gap-10 ${aside ? "lg:grid-cols-[240px_1fr]" : ""}`}>
        {aside && <aside className="lg:sticky lg:top-24 lg:self-start">{aside}</aside>}
        <div className="min-w-0">
          <h1 className="text-[36px] font-extrabold tracking-tight">{title}</h1>
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
        </div>
      </div>
    </div>
  );
}
