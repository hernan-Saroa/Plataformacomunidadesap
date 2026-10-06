import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/auth.decorators';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Verificación del estado del microservicio' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/ready')
  @Public()
  @ApiOperation({ summary: 'Readiness: el servicio responde y la base de datos está disponible' })
  async getReadiness() {
    try {
      return await this.appService.getReadiness();
    } catch {
      throw new ServiceUnavailableException({ status: 'error', service: 'rund-service', database: 'down' });
    }
  }
}
