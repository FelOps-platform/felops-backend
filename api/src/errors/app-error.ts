export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown[],
    readonly isOperational = true,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = 'Malformed request',
    code = 'MALFORMED_REQUEST',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(400, code, message, details, true, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Authentication required',
    code = 'UNAUTHENTICATED',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(401, code, message, details, true, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden',
    code = 'FORBIDDEN',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(403, code, message, details, true, options);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    code = 'NOT_FOUND',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(404, code, message, details, true, options);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict',
    code = 'CONFLICT',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(409, code, message, details, true, options);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message = 'Validation failed',
    code = 'VALIDATION_ERROR',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(422, code, message, details, true, options);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Rate limit exceeded',
    code = 'RATE_LIMITED',
    details?: unknown[],
    options?: ErrorOptions,
  ) {
    super(429, code, message, details, true, options);
  }
}
