import { apiHandler, json } from '@/server/http/handler';
import { reviewImportWithAgent } from '@/server/services/import-agent-service';

export const POST = apiHandler('people:write', async (ctx, params) => {
  let replaceExisting = false;
  let rows: Array<{ rowNumber: number; raw: Record<string, string>; status: string; errors: string[] | null }> | undefined;
  try {
    const body = (await ctx.request.json()) as { replaceExisting?: unknown; rows?: unknown };
    replaceExisting = body.replaceExisting === true;
    if (Array.isArray(body.rows)) {
      rows = body.rows.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        if (typeof row.rowNumber !== 'number' || typeof row.status !== 'string') return [];
        return [
          {
            rowNumber: row.rowNumber,
            raw: row.raw && typeof row.raw === 'object' ? (row.raw as Record<string, string>) : {},
            status: row.status,
            errors: Array.isArray(row.errors)
              ? row.errors.filter((msg): msg is string => typeof msg === 'string')
              : null,
          },
        ];
      });
    }
  } catch {
    replaceExisting = false;
  }
  const review = await reviewImportWithAgent(ctx.organisationId, params.id ?? '', {
    replaceExisting,
    rows,
  });
  return json(review);
});
