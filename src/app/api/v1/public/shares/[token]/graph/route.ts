import { json, publicHandler } from '@/server/http/handler';
import { assertShareToken, getPublicShareGraph } from '@/server/services/share-service';

export const GET = publicHandler(async (request, params) => {
  const token = params.token ?? '';
  assertShareToken(token);
  const url = new URL(request.url);
  const payload = await getPublicShareGraph({
    token,
    password: request.headers.get('x-share-password') ?? url.searchParams.get('password'),
    embed: url.searchParams.get('embed') === '1',
  });
  return json(payload);
});
