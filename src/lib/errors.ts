export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errorId: string;
  readonly expose: boolean;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    errorId?: string;
    expose?: boolean;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code;
    this.errorId = options.errorId ?? crypto.randomUUID();
    this.expose = options.expose ?? options.status < 500;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You need to sign in.') {
    super({ status: 401, code: 'UNAUTHORIZED', message });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that.') {
    super({ status: 403, code: 'FORBIDDEN', message });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested record was not found.') {
    super({ status: 404, code: 'NOT_FOUND', message });
    this.name = 'NotFoundError';
  }
}

export class ValidationAppError extends AppError {
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super({ status: 422, code: 'VALIDATION_FAILED', message });
    this.name = 'ValidationAppError';
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super({ status: 409, code: 'CONFLICT', message });
    this.name = 'ConflictError';
  }
}

export function toPublicError(error: unknown): {
  status: number;
  body: { message: string; code: string; errorId: string; details?: unknown };
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        message: error.expose ? error.message : 'Something went wrong.',
        code: error.code,
        errorId: error.errorId,
        details: error instanceof ValidationAppError ? error.details : undefined,
      },
    };
  }

  const errorId = crypto.randomUUID();
  return {
    status: 500,
    body: {
      message: 'Something went wrong.',
      code: 'INTERNAL',
      errorId,
    },
  };
}
