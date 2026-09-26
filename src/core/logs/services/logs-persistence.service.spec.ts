import type { ConfigType } from '@nestjs/config';
import type { Repository } from 'typeorm';

import config from '@common/utils/config';
import { AuditLog } from '../entities/audit-log.entity';
import { Log } from '../entities/log.entity';
import { AuditOperation, LogLevel } from '../types/log.types';
import { LogsPersistenceService } from './logs-persistence.service';

describe('LogsPersistenceService', () => {
  const createService = () => {
    const logRepository = {
      insert: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<Log>;
    const auditRepository = {
      insert: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<AuditLog>;
    const settings = {
      logs: { batchSize: 1, batchTimeoutMs: 60_000, auditBatchSize: 1 },
    } as unknown as ConfigType<typeof config>;
    const service = new LogsPersistenceService(
      logRepository,
      auditRepository,
      settings,
    );

    return { service, logRepository, auditRepository };
  };

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('flushes log and audit buffers at their configured thresholds', async () => {
    const { service, logRepository, auditRepository } = createService();

    await service.addLogToBuffer({
      level: LogLevel.LOG,
      message: 'stored',
      context: { requestId: 'request-1', timestamp: new Date() },
    });
    await service.addAuditLogToBuffer({
      entityName: 'User',
      entityId: '1',
      operation: AuditOperation.CREATE,
      changes: { after: { id: 1 } },
    });

    expect(logRepository.insert).toHaveBeenCalledTimes(1);
    expect(auditRepository.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        entityName: 'User',
        loggedAt: expect.any(Date),
      }),
    ]);

    await service.onApplicationShutdown();
  });
});
