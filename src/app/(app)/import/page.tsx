'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ImportSummary {
  job: {
    id: string;
    fileName: string;
    status: string;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
  };
  preview: Array<{
    rowNumber: number;
    raw: Record<string, string>;
    status: string;
    errors: string[] | null;
  }>;
  counts: { total: number; new: number; invalid: number; duplicate: number; applied: number };
}

const SAMPLE_CSV = `Person,Title,Department,Location,Manager,Email
Pat Newhire,Analyst,Finance,London,Amelia Shah,pat.newhire@northstar.example
`;

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a CSV file first.');
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/v1/imports', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Import failed');
      return payload as ImportSummary;
    },
    onSuccess: (payload) => {
      setResult(payload);
      toast.success('Preview ready');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('Upload a file first.');
      const response = await fetch(`/api/v1/imports/${result.job.id}/apply`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Apply failed');
      return payload as ImportSummary;
    },
    onSuccess: (payload) => {
      setResult(payload);
      toast.success(
        `Imported ${payload.job.createdCount} new people, updated ${payload.job.updatedCount}.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orgpulse-import-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">CSV import</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Upload a spreadsheet of people and seats. Managers are matched by name or email after
          every row is created, so order in the file does not matter.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Label htmlFor="csv-file">CSV file</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="mt-2 block w-full text-sm"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </div>
          <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
            {upload.isPending ? 'Reading…' : 'Preview'}
          </Button>
          <Button variant="outline" onClick={downloadSample}>
            Sample CSV
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Expected headers: Person, Title, Department, Location, Manager, Email. Excel workbooks
          must be saved as CSV first.
        </p>
      </Card>

      {result ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{result.job.fileName}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {result.counts.total} rows · {result.counts.new} ready · {result.counts.invalid}{' '}
                invalid · {result.counts.duplicate} duplicate
                {result.job.status === 'COMPLETED'
                  ? ` · created ${result.job.createdCount}, updated ${result.job.updatedCount}`
                  : ''}
              </p>
            </div>
            {result.job.status !== 'COMPLETED' ? (
              <Button
                onClick={() => apply.mutate()}
                disabled={apply.isPending || result.counts.new === 0}
              >
                {apply.isPending ? 'Applying…' : `Apply ${result.counts.new} rows`}
              </Button>
            ) : (
              <p className="text-sm font-medium text-[#22d3ee]">Applied to the live organisation</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="py-2 pr-3">Row</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Person</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.preview.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-[var(--border)]/60">
                    <td className="py-2 pr-3">{row.rowNumber}</td>
                    <td className="py-2 pr-3 uppercase">{row.status}</td>
                    <td className="py-2 pr-3">{row.raw.displayName || row.raw.email || '—'}</td>
                    <td className="py-2 pr-3">{row.raw.title || '—'}</td>
                    <td className="py-2 text-[var(--muted-foreground)]">
                      {Array.isArray(row.errors) ? row.errors.join(' ') : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
