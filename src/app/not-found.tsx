import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="num text-6xl text-muted">404</div>
      <p className="mt-4 text-ink-2">Nothing here.</p>
      <Link href="/" className="mt-6 inline-block text-gold hover:underline">Home →</Link>
    </div>
  );
}
