import { apiHandler, json } from '@/server/http/handler';
import { applyImportJob, type StagedImportRow } from '@/server/services/import-service';

function asStagedRows(value: unknown): StagedImportRow[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (typeof row.rowNumber !== 'number' || typeof row.status !== 'string') return [];
    const raw = row.raw && typeof row.raw === 'object' ? (row.raw as Record<string, string>) : {};
    return [
      {
        rowNumber: row.rowNumber,
        raw,
        status: row.status,
        errors: Array.isArray(row.errors) ? row.errors.filter((msg): msg is string => typeof msg === 'string') : null,
      },
    ];
  });
}

export const POST = apiHandler('people:write', async (ctx, params) => {
  let replaceExisting = false;
  let rows: StagedImportRow[] | undefined;
  try {
    const body = (await ctx.request.json()) as { replaceExisting?: unknown; rows?: unknown };
    replaceExisting = body.replaceExisting === true;
    rows = asStagedRows(body.rows);
  } catch {
    replaceExisting = false;
  }
  const payload = await applyImportJob(ctx.organisationId, ctx.actor, params.id ?? '', {
    replaceExisting,
    rows,
  });
  return json(payload);
});
