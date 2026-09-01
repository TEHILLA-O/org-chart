import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DomainError } from '@/domain/org/cycle';
import { PermissionDeniedError } from '@/domain/permissions/policy';
import { getCorrelationId, requestContext } from '@/lib/correlation';
import { AppError, ForbiddenError, toPublicError, ValidationAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { requireOrgContext, type SessionContext } from '@/server/auth/session';
import type { PermissionAction } from '@/domain/permissions/policy';

export interface ApiContext extends SessionContext {
  correlationId: string;
  request: NextRequest;
}

type RouteHandler = (ctx: ApiContext, params: Record<string, string>) => Promise<Response>;

export function apiHandler(action: PermissionAction, handler: RouteHandler) {
  return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const correlationId = request.headers.get('x-correlation-id') ?? crypto.randomUUID();
    const log = createLogger(correlationId);

    return requestContext.run({ correlationId }, async () => {
      try {
        const url = new URL(request.url);
        const organisationId =
          request.headers.get('x-organisation-id') ?? url.searchParams.get('organisationId') ?? undefined;
        const session = await requireOrgContext(organisationId ?? undefined, action);
        const params = context?.params ? await context.params : {};
        return await handler({ ...session, correlationId, request }, params);
      } catch (error) {
        if (error instanceof PermissionDeniedError) {
          const mapped = new ForbiddenError(error.message);
          const publicError = toPublicError(mapped);
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        if (error instanceof DomainError) {
          const mapped = new AppError({
            status: 422,
            code: error.code,
            message: error.message,
          });
          const publicError = toPublicError(mapped);
          log.warn({ err: error, code: error.code }, error.message);
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        if (error instanceof ZodError) {
          const mapped = new ValidationAppError('Invalid request.', error.flatten());
          const publicError = toPublicError(mapped);
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        if (error instanceof ForbiddenError && error.name === 'ForbiddenError') {
          const publicError = toPublicError(error);
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        const publicError = toPublicError(error);
        const logFn = publicError.status >= 500 ? log.error.bind(log) : log.warn.bind(log);
        logFn({ err: error, errorId: publicError.body.errorId }, 'request failed');
        return NextResponse.json(publicError.body, { status: publicError.status });
      }
    });
  };
}

export function publicHandler(
  handler: (request: NextRequest, params: Record<string, string>) => Promise<Response>,
) {
  return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const correlationId = request.headers.get('x-correlation-id') ?? crypto.randomUUID();
    const log = createLogger(correlationId);

    return requestContext.run({ correlationId }, async () => {
      try {
        const params = context?.params ? await context.params : {};
        return await handler(request, params);
      } catch (error) {
        if (error instanceof DomainError) {
          const mapped = new AppError({
            status: 422,
            code: error.code,
            message: error.message,
          });
          const publicError = toPublicError(mapped);
          log.warn({ err: error, code: error.code }, error.message);
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        if (error instanceof ZodError) {
          const mapped = new ValidationAppError('Invalid request.', error.flatten());
          const publicError = toPublicError(mapped);
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        if (error instanceof AppError) {
          const publicError = toPublicError(error);
          const logFn = publicError.status >= 500 ? log.error.bind(log) : log.warn.bind(log);
          logFn({ err: error, errorId: publicError.body.errorId }, 'public request failed');
          return NextResponse.json(publicError.body, { status: publicError.status });
        }
        const publicError = toPublicError(error);
        log.error({ err: error, errorId: publicError.body.errorId }, 'public request failed');
        return NextResponse.json(publicError.body, { status: publicError.status });
      }
    });
  };
}

export function json<T>(data: T, status = 200): NextResponse {
  const correlationId = getCorrelationId();
  const response = NextResponse.json(data, { status });
  response.headers.set('x-correlation-id', correlationId);
  return response;
}

export function fileResponse(body: BodyInit, filename: string, contentType: string): NextResponse {
  const response = new NextResponse(body, { status: 200 });
  response.headers.set('content-type', contentType);
  response.headers.set('content-disposition', `attachment; filename="${filename}"`);
  response.headers.set('x-correlation-id', getCorrelationId());
  response.headers.set('cache-control', 'no-store');
  return response;
}
