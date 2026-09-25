import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CommonModule } from '@core/common/common.module';

// Entities
import { Log } from './entities/log.entity';
import { AuditLog } from './entities/audit-log.entity';

// Providers
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { LogsPersistenceService } from './services/logs-persistence.service';
import { LogsProcessor } from './processors/logs.processor';
import { LogsEventListener } from './listeners/logs-event.listener';
import { LoggingService } from './services/logging.service';
import { AppLoggerService } from './services/app-logger.service';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([Log, AuditLog]),
    BullModule.registerQueue({
      name: 'logs',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  providers: [
    LoggingService,
    AppLoggerService,
    LogsPersistenceService,
    LogsProcessor,
    LogsEventListener,
    AuditSubscriber,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  controllers: [],
  exports: [LogsPersistenceService, LoggingService, AppLoggerService],
})
export class LogsModule {}
