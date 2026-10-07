import type { NextFunction, Request, Response } from 'express';

/**
 * צורת שגיאה אחידה לכל ה-API:
 *   { "error": "<הודעה קריאה>", "code": "<קוד יציב למכונה>", "details"?: ... }
 * השדה `error` נשאר מחרוזת (תאימות לאחור ללקוחות קיימים).
 */
export interface ErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const notFound = (message: string): AppError => new AppError(404, 'NOT_FOUND', message);

export function toErrorBody(error: AppError): ErrorBody {
  const body: ErrorBody = { error: error.message, code: error.code };
  if (error.details !== undefined) body.details = error.details;
  return body;
}

/** עוטף handler אסינכרוני כך ששגיאות מגיעות ל-error middleware (Express 4 לא עושה זאת לבד) */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'נתיב לא קיים', code: 'ROUTE_NOT_FOUND' } satisfies ErrorBody);
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json(toErrorBody(error));
    return;
  }
  const type = (error as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'גוף הבקשה אינו JSON תקין', code: 'INVALID_JSON' } satisfies ErrorBody);
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'גוף הבקשה גדול מדי', code: 'PAYLOAD_TOO_LARGE' } satisfies ErrorBody);
    return;
  }
  console.error('[server] שגיאה לא צפויה:', error);
  res.status(500).json({ error: 'שגיאת שרת פנימית', code: 'INTERNAL_ERROR' } satisfies ErrorBody);
}
