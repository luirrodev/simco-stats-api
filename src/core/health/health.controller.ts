import { Controller, Get } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  private static readonly HEALTH_TIMEOUT_MS = 4000;

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private healthIndicatorService: HealthIndicatorService,
    @InjectRedis() private redis: Redis,
  ) {}

  private withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `${label} timed out after ${HealthController.HEALTH_TIMEOUT_MS}ms`,
          ),
        );
      }, HealthController.HEALTH_TIMEOUT_MS);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  private async pingRedis(): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.withTimeout(this.redis.ping(), 'Redis ping');

      if (pong.toUpperCase() !== 'PONG') {
        throw new Error(`Unexpected Redis response: ${pong}`);
      }

      return this.healthIndicatorService.check('redis').up();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      return this.healthIndicatorService.check('redis').down({ message });
    }
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.withTimeout(this.db.pingCheck('postgres'), 'PostgreSQL'),
      () => this.withTimeout(this.pingRedis(), 'Redis health check'),
    ]);
  }
}
