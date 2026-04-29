import { Request, Response, NextFunction } from 'express';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Generic message that's safe to send to clients regardless of status.
 * Per-status copy lets the client at least know the broad failure mode
 * without leaking Mongo / AWS / library internals.
 */
function genericForStatus(status: number): string {
  if (status === 400) return 'Bad Request';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Not Found';
  if (status === 409) return 'Conflict';
  if (status === 413) return 'Payload Too Large';
  if (status === 429) return 'Too Many Requests';
  return 'Internal Server Error';
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const rawMessage = err.message || 'Internal Server Error';

  // Always log the real error server-side for debugging.
  console.error(`[ERROR] ${status} - ${rawMessage}`, err.stack ? err.stack : '');

  // In production, only echo `err.message` when the thrower opts in via
  // `err.expose === true` (the http-errors / Boom convention). Otherwise we
  // ship a per-status generic. Even 4xx codes like 403 / 404 used to leak
  // the underlying Mongoose / AWS error string before this gate.
  const exposed = err.expose === true;
  const message = isProd && !exposed ? genericForStatus(status) : rawMessage;

  res.status(status).json({ error: { status, message } });
}
