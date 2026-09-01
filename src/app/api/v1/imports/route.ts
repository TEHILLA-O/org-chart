import { apiHandler, json } from '@/server/http/handler';
import { createImportJob } from '@/server/services/import-service';
import { ValidationAppError } from '@/lib/errors';

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
    text: await file.text(),
  });
  return json(job, 201);
});
