'use client';

export default function AppError({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <h1 className="text-lg font-semibold">That page is not available</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{error.message}</p>
    </div>
  );
}
