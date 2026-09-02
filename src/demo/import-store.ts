import type { ImportField } from '@/domain/import/columns';

export interface DemoImportRow {
  id: string;
  rowNumber: number;
  raw: Record<ImportField, string>;
  status: string;
  errors: string[] | null;
}

export interface DemoImportJob {
  id: string;
  organisationId: string;
  fileName: string;
  mimeType: string;
  status: string;
  columnMap: unknown;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  createdAt: string;
  rows: DemoImportRow[];
}

const jobs = new Map<string, DemoImportJob>();

export function saveDemoImportJob(job: DemoImportJob) {
  jobs.set(job.id, job);
  return job;
}

export function getDemoImportJob(id: string, organisationId?: string) {
  const job = jobs.get(id);
  if (!job) return null;
  if (organisationId && job.organisationId !== organisationId) return null;
  return job;
}
