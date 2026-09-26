import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppLoggerService } from '@core/logs/services/app-logger.service';
import config from '@core/common/utils/config';
import { corsOptions } from '@common/utils/http-security.util';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(AppLoggerService));

  const appConfig: ConfigType<typeof config> = app.get(config.KEY);
  app.enableCors(corsOptions(appConfig));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (appConfig.app.nodeEnv !== 'prod') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appConfig.app.name)
      .setDescription(
        'API para la gestión de estadísticas de restaurantes de SimCompanies',
      )
      .setVersion(appConfig.app.version)
      .addBearerAuth()
      .addTag('Sports Catalog')
      .addTag('Leagues Catalog')
      .addTag('Sport Events')
      .addTag('Odds Sync')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const shutdown = async () => {
    logger.log('Received shutdown signal, closing gracefully...');
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
