import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Incident not found</h1>
      <p className="mt-1 text-sm text-muted">It may have been removed, or the link is wrong.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-accent">
        ← Back to incidents
      </Link>
    </div>
  );
}
