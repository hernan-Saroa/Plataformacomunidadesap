import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';

@ApiTags('Health Check')
@Controller()
@Public()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Verificar el estado del microservicio' })
  checkHealth() {
    return {
      status: 'OK',
      service: 'hiring-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get()
  getHome() {
    return {
      service: 'hiring-service',
      status: 'UP',
      docs: '/api/docs',
    };
  }
}
