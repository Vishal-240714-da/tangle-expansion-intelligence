import { Request, Response, NextFunction, RequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Async handler wrapper to catch rejected promises and forward them to next() in Express 4
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error | AppError | any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (res.headersSent) {
    return _next(err);
  }

  const statusCode =
    (err instanceof AppError && err.statusCode) ||
    (typeof err?.statusCode === 'number' && err.statusCode) ||
    (typeof err?.status === 'number' && err.status) ||
    500;

  const message = err?.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.url} (${statusCode}):`, err);
  }

  return res.status(statusCode).json({
    success: false,
    status: 'error',
    message,
  });
};
