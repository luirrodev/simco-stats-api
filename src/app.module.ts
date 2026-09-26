import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER } from '@nestjs/core';

// Utils
import config from '@common/utils/config';
import validationSchema from '@common/utils/validation.schema';
import buildRedisUrl from '@core/common/utils/redis-url.util';

// Middlewares y Servicios
import { RequestContextMiddleware } from '@core/common/middleware/request-context.middleware';
import { GlobalExceptionFilter } from '@core/common/filters/all-exceptions.filter';

// Modulos Core
import { CommonModule } from '@core/common/common.module';
import { HealthModule } from '@core/health/health.module';
import { DatabaseModule } from '@core/database/database.module';
import { LogsModule } from '@core/logs/logs.module';
import { AccessControlModule } from '@core/access-control/access-control.module';
import { AuthModule } from '@core/auth/auth.module';
import { StaffModule } from '@core/access-control/staff/staff.module';
import { SimCompaniesAuthModule } from '@features/auth/auth.module';
import { BuildingModule } from '@features/building/building.module';

// Modulos Features

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [config],
      validationSchema,
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    BullModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => ({
        url: buildRedisUrl(configService.redis),
      }),
    }),
    CommonModule,
    DatabaseModule,
    HealthModule,
    LogsModule,
    AccessControlModule,
    AuthModule,
    StaffModule,
    SimCompaniesAuthModule,
    BuildingModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
