import { apiHandler, json } from '@/server/http/handler';
import { createImportJob } from '@/server/services/import-service';
import { decodeSpreadsheetBytes } from '@/lib/csv';
import { ValidationAppError } from '@/lib/errors';

function parseColumnMap(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ValidationAppError('Column mapping is not valid JSON.');
  }
}

export const POST = apiHandler('people:write', async (ctx) => {
  const form = await ctx.request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new ValidationAppError('Choose a CSV file to import.');
  }
  const job = await createImportJob({
    organisationId: ctx.organisationId,
    actor: ctx.actor,
    fileName: file.name,
    mimeType: file.type,
    text: decodeSpreadsheetBytes(new Uint8Array(await file.arrayBuffer())),
    columnMap: parseColumnMap(form.get('columnMap')),
  });
  return json(job, 201);
});
