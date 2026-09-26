import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { ConfigType } from '@nestjs/config';

import config from './config';

export function corsOptions(appConfig: ConfigType<typeof config>): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin || origin === appConfig.auth.frontendOrigin) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  };
}
