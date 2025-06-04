import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

import config from './config';
import { enviroments } from './enviroments';

@Module({
  imports: [
    ConfigModule.forRoot({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      envFilePath: enviroments[process.env.NODE_ENV || 'dev'],
      isGlobal: true,
      load: [config],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    AuthModule,
    DatabaseModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
