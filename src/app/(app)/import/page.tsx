'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Finding {
  severity: 'error' | 'warning' | 'info';
  kind: string;
  rowNumber?: number;
  message: string;
}

interface TreeNode {
  name: string;
  title: string;
  reportsTo: string | null;
  department?: string;
  note?: string;
}

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
  review?: {
    findings: Finding[];
    tree: TreeNode[];
    warningCount: number;
    errorCount: number;
  };
}

interface AgentReview {
  modelConnected: boolean;
  privacyLocked: boolean;
  model?: string;
  summary: string;
  findings: Finding[];
  tree: TreeNode[];
  canApply: boolean;
  applyBlockers: string[];
}

const SAMPLE_CSV = `Person,Title,Department,Location,Manager,Email
Sam Imported,Analyst,Finance,London,Amelia Shah,sam.imported@northstar.example
`;

const ISSUE_CSV = `Person,Title,Department,Location,Manager,Email
Pat Newhire,Analyst,Finance,London,Amelia Shah,pat.newhire@northstar.example
Pat Newhire,Lead,Finance,London,Unknown Boss,pat.newhire@northstar.example
Ada Cycle,Manager,Ops,London,Ben Cycle,ada.cycle@example.com
Ben Cycle,Director,Ops,London,Ada Cycle,ben.cycle@example.com
No Title,,Ops,London,Amelia Shah,notitle@example.com
`;

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [agent, setAgent] = useState<AgentReview | null>(null);

  const review = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/v1/imports/${jobId}/review`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Review failed');
      return payload as AgentReview;
    },
    onSuccess: (payload) => {
      setAgent(payload);
      const errors = payload.findings.filter((item) => item.severity === 'error').length;
      const warnings = payload.findings.filter((item) => item.severity === 'warning').length;
      if (errors || warnings) {
        toast.warning(
          `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'} on this file.`,
        );
      } else if (!payload.modelConnected) {
        toast.success('File checks passed. Add DEEPSEEK_API_KEY to enable the import agent.');
      } else {
        toast.success('DeepSeek found no extra issues.');
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
      setAgent(null);
      toast.success('Preview ready');
      review.mutate(payload.job.id);
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

  const downloadCsv = (contents: string, filename: string) => {
    const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const findings = agent?.findings ?? result?.review?.findings ?? [];
  const tree = agent?.tree ?? result?.review?.tree ?? [];
  const errors = findings.filter((item) => item.severity === 'error');
  const warnings = findings.filter((item) => item.severity === 'warning');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">CSV import</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Upload people and seats. The import agent checks errors and duplicates, then DeepSeek explains how the
          chart would be organised. Managers are matched by name or email after every row is created.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <Label htmlFor="csv-file">CSV file</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              className="mt-2 block w-full text-sm"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setAgent(null);
              }}
            />
          </div>
          <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
            {upload.isPending ? 'Reading…' : 'Preview and review'}
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(SAMPLE_CSV, 'orgpulse-import-sample.csv')}>
            Sample CSV
          </Button>
          <Button variant="outline" onClick={() => downloadCsv(ISSUE_CSV, 'orgpulse-import-warnings.csv')}>
            Sample with warnings
          </Button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Expected headers: Person, Title, Department, Location, Manager, Email. Excel workbooks must be saved as CSV
          first. DeepSeek never receives emails — only names, titles, departments, and reporting lines.
        </p>
      </Card>

      {result ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{result.job.fileName}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {result.counts.total} rows · {result.counts.new} ready · {result.counts.invalid} invalid ·{' '}
                {result.counts.duplicate} duplicate
                {result.job.status === 'COMPLETED'
                  ? ` · created ${result.job.createdCount}, updated ${result.job.updatedCount}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.job.status !== 'COMPLETED' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => review.mutate(result.job.id)}
                    disabled={review.isPending}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {review.isPending ? 'Reviewing…' : 'Ask DeepSeek again'}
                  </Button>
                  <Button
                    onClick={() => apply.mutate()}
                    disabled={apply.isPending || result.counts.new === 0}
                  >
                    {apply.isPending ? 'Applying…' : `Apply ${result.counts.new} rows`}
                  </Button>
                </>
              ) : (
                <Link href="/charts" className="text-sm font-medium text-[#22d3ee] underline">
                  Open org chart
                </Link>
              )}
            </div>
          </div>

          {errors.length || warnings.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[#fb7185]/35 bg-[#fb7185]/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#fecdd3]">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.length} error{errors.length === 1 ? '' : 's'}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[#fecdd3]">
                  {errors.length
                    ? errors.slice(0, 8).map((item, index) => (
                        <li key={`${item.message}-${index}`}>
                          {item.rowNumber ? `Row ${item.rowNumber}: ` : ''}
                          {item.message}
                        </li>
                      ))
                    : <li>No blocking errors.</li>}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#e879f9]/35 bg-[#e879f9]/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#f5d0fe]">
                  <AlertTriangle className="h-4 w-4" />
                  {warnings.length} warning{warnings.length === 1 ? '' : 's'}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--muted-foreground)]">
                  {warnings.length
                    ? warnings.slice(0, 8).map((item, index) => (
                        <li key={`${item.message}-${index}`}>
                          {item.rowNumber ? `Row ${item.rowNumber}: ` : ''}
                          {item.message}
                        </li>
                      ))
                    : <li>No warnings.</li>}
                </ul>
              </div>
            </div>
          ) : result.counts.new > 0 ? (
            <p className="flex items-center gap-2 text-sm text-[#67e8f9]">
              <CheckCircle2 className="h-4 w-4" />
              File checks passed. You can apply these rows to the live organisation.
            </p>
          ) : null}

          {result.counts.new === 0 && result.job.status !== 'COMPLETED' ? (
            <p className="text-sm text-[#fecdd3]">
              No valid rows to apply yet. Fix missing names or titles in the file and preview again.
            </p>
          ) : null}

          {agent || review.isPending ? (
            <div className="rounded-2xl border border-[#22d3ee]/25 bg-[#22d3ee]/8 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#67e8f9]">
                <Sparkles className="h-4 w-4" />
                {agent?.modelConnected ? 'DeepSeek import agent' : 'Import checks'}
                {agent?.model && agent.modelConnected ? ` · ${agent.model}` : ''}
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {review.isPending && !agent
                  ? 'Reading the file against the live organisation…'
                  : agent?.summary}
              </p>
              {tree.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Suggested organisation
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {tree.slice(0, 12).map((node) => (
                      <li key={`${node.name}-${node.title}`}>
                        <span className="font-medium">{node.name}</span>
                        <span className="text-[var(--muted-foreground)]">
                          {' '}
                          · {node.title}
                          {node.reportsTo ? ` · reports to ${node.reportsTo}` : ' · top of chart'}
                          {node.note ? ` · ${node.note}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
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
                    <td className="py-2 pr-3">
                      <Badge
                        tone={
                          row.status === 'DUPLICATE' || row.status === 'INVALID' ? 'gold' : 'sea'
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
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
