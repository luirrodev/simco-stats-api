import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): { status: string; message: string } {
    return {
      status: 'ok',
      message: 'SIMCO Restaurant Stats API is running!',
    };
  }
}
