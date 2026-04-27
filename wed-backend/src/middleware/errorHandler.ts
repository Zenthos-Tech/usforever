import { Request, Response, NextFunction } from 'express';

const isProd = process.env.NODE_ENV === 'production';

// Status codes that we trust the handler to set deliberately (i.e. validation
// errors or other 4xx). For anything else we don't echo `err.message` back
// in production — it can leak Mongo / AWS / library internals.
function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const rawMessage = err.message || 'Internal Server Error';

  // Always log the real error server-side for debugging.
  console.error(`[ERROR] ${status} - ${rawMessage}`, err.stack ? err.stack : '');

  const message = isProd && !isClientError(status) ? 'Internal Server Error' : rawMessage;

  res.status(status).json({ error: { status, message } });
}
