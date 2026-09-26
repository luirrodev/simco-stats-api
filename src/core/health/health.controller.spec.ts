import type {
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type Redis from 'ioredis';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  const createController = (redisPing: Promise<string>) => {
    const health = {
      check: jest.fn(async (indicators: (() => Promise<unknown>)[]) =>
        Promise.all(indicators.map((indicator) => indicator())),
      ),
    } as unknown as HealthCheckService;
    const database = {
      pingCheck: jest.fn().mockResolvedValue({ postgres: { status: 'up' } }),
    } as unknown as TypeOrmHealthIndicator;
    const indicator = {
      check: jest.fn().mockReturnValue({
        up: () => ({ redis: { status: 'up' } }),
        down: (details: unknown) => ({ redis: { status: 'down', ...details } }),
      }),
    } as unknown as HealthIndicatorService;
    const redis = { ping: jest.fn().mockReturnValue(redisPing) } as unknown as Redis;

    return { controller: new HealthController(health, database, indicator, redis), health, indicator };
  };

  it('reports healthy PostgreSQL and Redis checks', async () => {
    const { controller, health } = createController(Promise.resolve('PONG'));

    await expect(controller.check()).resolves.toEqual([
      { postgres: { status: 'up' } },
      { redis: { status: 'up' } },
    ]);
    expect(health.check).toHaveBeenCalledTimes(1);
  });

  it('reports Redis as down when it returns an unexpected response', async () => {
    const { controller, indicator } = createController(Promise.resolve('NOPE'));

    await controller.check();

    expect(indicator.check).toHaveBeenCalledWith('redis');
  });

  it('times out unresolved health dependencies', async () => {
    jest.useFakeTimers();
    const { controller } = createController(new Promise<string>(() => undefined));

    const healthCheck = controller.check();
    await jest.advanceTimersByTimeAsync(4000);

    await expect(healthCheck).resolves.toEqual([
      { postgres: { status: 'up' } },
      expect.objectContaining({ redis: expect.objectContaining({ status: 'down' }) }),
    ]);
    jest.useRealTimers();
  });
});
