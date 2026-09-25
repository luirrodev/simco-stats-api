import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';

import config from '@core/common/utils/config';
import buildDatabaseUrlFromConfig from '@core/common/utils/database-url.util';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => {
        const databaseUrl = buildDatabaseUrlFromConfig(configService.database);

        return {
          type: 'postgres',
          url: databaseUrl,
          synchronize: false,
          autoLoadEntities: true,
          ssl: configService.database.ssl,
        };
      },
    }),
    RedisModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => ({
        type: 'single',
        options: {
          host: configService.redis.host,
          port: configService.redis.port,
          password: configService.redis.password || undefined,
          db: configService.redis.db,
        },
      }),
    }),
  ],
  exports: [RedisModule],
})
export class DatabaseModule {}
