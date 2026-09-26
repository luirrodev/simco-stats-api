import { Module } from '@nestjs/common';

import { RequestContextService } from './services/request-context.service';

@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class CommonModule {}
