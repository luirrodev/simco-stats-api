import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    const forwarded = req.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : (req.ip ?? 'unknown');

    // Inyectar en el request para que otros middlewares/guards lo lean
    req.requestId = requestId;

    // Propagar en el header de respuesta
    res.setHeader('x-request-id', requestId);

    this.requestContextService.run(
      {
        requestId,
        ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      },
      () => {
        next();
      },
    );
  }
}
