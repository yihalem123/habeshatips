import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <div className="num text-[64px] font-bold text-muted">404</div>
      <p className="mt-2 text-ink-2">Nothing here.</p>
      <Button href="/" variant="outline" className="mt-6">Home →</Button>
    </div>
  );
}
