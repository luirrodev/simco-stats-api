import { Injectable, Logger } from '@nestjs/common';
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm';
import deepEqual from 'fast-deep-equal';
import { RequestContextService } from '@common/services/request-context.service';
import { LogsPersistenceService } from '../services/logs-persistence.service';
import { AuditOperation, AuditableEntity } from '../types/log.types';

const EXCLUDED_ENTITIES = ['Log', 'AuditLog'];

@EventSubscriber()
@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface<AuditableEntity> {
  private readonly logger = new Logger(AuditSubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly logsPersistenceService: LogsPersistenceService,
    private readonly requestContextService: RequestContextService,
  ) {
    dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<AuditableEntity>): Promise<void> {
    const entityName = event.metadata?.name;
    if (!entityName || !event.entity) return;
    if (!this.shouldAudit(entityName)) return;
    const entityId = this.getEntityId(event.entity);
    if (!entityId) return;

    try {
      await this.logsPersistenceService.addAuditLogToBuffer({
        requestId: this.requestContextService.getRequestId(),
        entityName,
        entityId: String(entityId),
        operation: AuditOperation.CREATE,
        changes: { after: event.entity },
        userId: this.requestContextService.get('userId'),
        metadata: {
          event: 'INSERT',
          timestamp: new Date(),
        },
      });
    } catch (error: unknown) {
      this.logger.error('Error logging INSERT:', this.getErrorMessage(error));
    }
  }

  async afterUpdate(event: UpdateEvent<AuditableEntity>): Promise<void> {
    const entityName = event.metadata?.name;
    if (!entityName || !event.entity || !event.databaseEntity) return;
    if (!this.shouldAudit(entityName)) return;
    const entityId = this.getEntityId(event.entity);
    if (!entityId) return;

    const changes = this.detectChanges(event.databaseEntity, event.entity);
    if (Object.keys(changes).length === 0) return;

    try {
      await this.logsPersistenceService.addAuditLogToBuffer({
        requestId: this.requestContextService.getRequestId(),
        entityName,
        entityId: String(entityId),
        operation: AuditOperation.UPDATE,
        changes: {
          before: event.databaseEntity,
          after: event.entity,
          diff: changes,
        },
        userId: this.requestContextService.get('userId'),
        metadata: {
          event: 'UPDATE',
          timestamp: new Date(),
        },
      });
    } catch (error: unknown) {
      this.logger.error('Error logging UPDATE:', this.getErrorMessage(error));
    }
  }

  async afterRemove(event: RemoveEvent<AuditableEntity>): Promise<void> {
    const entityName = event.metadata?.name;
    if (!entityName || !event.entity) return;
    if (!this.shouldAudit(entityName)) return;
    const entityId = this.getEntityId(event.entity);
    if (!entityId) return;

    try {
      await this.logsPersistenceService.addAuditLogToBuffer({
        requestId: this.requestContextService.getRequestId(),
        entityName,
        entityId: String(entityId),
        operation: AuditOperation.DELETE,
        changes: { before: event.entity },
        userId: this.requestContextService.get('userId'),
        metadata: {
          event: 'DELETE',
          timestamp: new Date(),
        },
      });
    } catch (error: unknown) {
      this.logger.error('Error logging DELETE:', this.getErrorMessage(error));
    }
  }

  /**
   * Usa event.metadata.name (siempre disponible en TypeORM)
   * en lugar de instanceof (no funciona con objetos planos)
   */
  private shouldAudit(entityName: string): boolean {
    return !EXCLUDED_ENTITIES.includes(entityName);
  }

  private detectChanges(
    before: Record<string, unknown> | null | undefined,
    after: Record<string, unknown> | null | undefined,
  ): Record<string, { before: unknown; after: unknown }> {
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const IGNORED_KEYS = ['createdAt', 'updatedAt', 'deletedAt', 'id'];

    const keys = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);

    keys.forEach((key) => {
      if (IGNORED_KEYS.includes(key)) return;

      const beforeValue = before?.[key];
      const afterValue = after?.[key];

      if (!deepEqual(beforeValue, afterValue)) {
        changes[key] = { before: beforeValue, after: afterValue };
      }
    });

    return changes;
  }

  private getEntityId(
    entity: Partial<AuditableEntity> | null | undefined,
  ): string | null {
    if (!entity || entity.id === null || entity.id === undefined) return null;

    return String(entity.id);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;

    return String(error);
  }
}
