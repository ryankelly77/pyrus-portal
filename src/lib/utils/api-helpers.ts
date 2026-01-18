import { NextResponse } from 'next/server'

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'

interface ApiErrorOptions {
  code?: ErrorCode
  details?: Record<string, unknown>
}

const STATUS_CODES: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
}

/**
 * Create a standardized API error response
 */
export function apiError(
  message: string,
  options: ApiErrorOptions = {}
): NextResponse {
  const { code = 'BAD_REQUEST', details } = options
  const status = STATUS_CODES[code]

  return NextResponse.json(
    {
      error: message,
      code,
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Shorthand error helpers
 */
export const ApiErrors = {
  badRequest: (message: string, details?: Record<string, unknown>) =>
    apiError(message, { code: 'BAD_REQUEST', details }),

  unauthorized: (message = 'Unauthorized') =>
    apiError(message, { code: 'UNAUTHORIZED' }),

  forbidden: (message = 'Forbidden') =>
    apiError(message, { code: 'FORBIDDEN' }),

  notFound: (resource: string) =>
    apiError(`${resource} not found`, { code: 'NOT_FOUND' }),

  validation: (message: string, details?: Record<string, unknown>) =>
    apiError(message, { code: 'VALIDATION_ERROR', details }),

  internal: (message = 'Internal server error') =>
    apiError(message, { code: 'INTERNAL_ERROR' }),
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return typeof email === 'string' && emailRegex.test(email.trim())
}

/**
 * Validate UUID format
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return typeof id === 'string' && uuidRegex.test(id)
}

export class CustomError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'CustomError' // Ensure the name is set for instanceof checks
    Object.setPrototypeOf(this, CustomError.prototype)
  }
}

/**
 * Create a standardized error object with a status code and message.
 */
export function createError(status: number, message: string) {
  return new CustomError(status, message)
}
