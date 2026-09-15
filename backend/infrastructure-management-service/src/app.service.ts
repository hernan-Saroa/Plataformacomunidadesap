import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'infrastructure-management-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
