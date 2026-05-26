/**
 * Custom error classes used across the application.
 * All app-level errors extend AppError so middleware can render them uniformly.
 */

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` ${id}` : ''} not found`, 404, 'NOT_FOUND');
  }
}

export class ComplianceEscalationError extends AppError {
  /** Raised when an agent decides to escalate to a human licensee. */
  constructor(reason: string, context?: unknown) {
    super(`Compliance escalation: ${reason}`, 200, 'ESCALATE_TO_HUMAN', context);
  }
}

export class IntegrationError extends AppError {
  readonly provider: string;

  constructor(provider: string, message: string, details?: unknown) {
    super(`${provider}: ${message}`, 502, 'INTEGRATION_ERROR', details);
    this.provider = provider;
  }
}

export class CrmNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('CRM record', id);
  }
}

export class CrmDuplicateError extends AppError {
  constructor(field: string, value: string) {
    super(`CRM duplicate on ${field}=${value}`, 409, 'CRM_DUPLICATE');
  }
}
