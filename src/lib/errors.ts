export class AppError extends Error {
  status: 400 | 401 | 403 | 404 | 409 | 503

  constructor(message: string, status: 400 | 401 | 403 | 404 | 409 | 503) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Please sign in') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = 'Cannot reach database. Check DATABASE_URL.') {
    super(message, 503)
    this.name = 'DatabaseUnavailableError'
  }
}

export function toUserMessage(error: unknown) {
  if (error instanceof AppError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
