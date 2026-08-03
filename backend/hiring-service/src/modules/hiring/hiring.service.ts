import { Injectable } from '@nestjs/common';

@Injectable()
export class HiringService {
  getServiceStatus() {
    return {
      status: 'OK',
      module: 'hiring-service',
      message: 'Base del microservicio de Contratación lista para desarrollo',
      timestamp: new Date().toISOString(),
    };
  }
}
