import type { DataSource, InsertEvent } from 'typeorm';

import { RequestContextService } from '@common/services/request-context.service';
import { LogsPersistenceService } from '../services/logs-persistence.service';
import { AuditSubscriber } from './audit.subscriber';
import { AuditOperation } from '../types/log.types';

describe('AuditSubscriber', () => {
  it('buffers audit data for inserted entities and excludes log entities', async () => {
    const dataSource = { subscribers: [] } as unknown as DataSource;
    const persistence = {
      addAuditLogToBuffer: jest.fn().mockResolvedValue(undefined),
    } as unknown as LogsPersistenceService;
    const requestContext = {
      getRequestId: jest.fn().mockReturnValue('request-1'),
      get: jest.fn().mockReturnValue(7),
    } as unknown as RequestContextService;
    const subscriber = new AuditSubscriber(dataSource, persistence, requestContext);
    const event = {
      metadata: { name: 'User' },
      entity: { id: 3, email: 'ada@example.com' },
    } as unknown as InsertEvent<{ id: number; email: string }>;

    await subscriber.afterInsert(event);

    expect(persistence.addAuditLogToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: '3',
        operation: AuditOperation.CREATE,
      }),
    );
  });
});
