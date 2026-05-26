import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { loadEnv } from './config/env.js';
import { logger } from './shared/logger.js';
import { AppError } from './shared/errors.js';
import { healthRouter } from './routes/health.js';
import { customerMessageRouter } from './routes/customer-message.js';
import { leadRouter } from './routes/lead.js';
import { operationsRouter } from './routes/operations.js';

export function buildServer(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Per-request log
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug({ method: req.method, path: req.path }, 'http.request');
    next();
  });

  app.use(healthRouter);
  app.use(customerMessageRouter);
  app.use(leadRouter);
  app.use(operationsRouter);

  // 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' });
  });

  // Centralized error handler
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      logger.warn(
        { code: err.code, status: err.statusCode, details: err.details },
        'http.app_error',
      );
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
        details: err.details,
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, 'http.unhandled_error');
    res.status(500).json({ error: 'INTERNAL_ERROR', message });
  };
  app.use(errorHandler);

  return app;
}

export function startServer(): void {
  const env = loadEnv();
  const app = buildServer();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'server.listening');
  });
}
