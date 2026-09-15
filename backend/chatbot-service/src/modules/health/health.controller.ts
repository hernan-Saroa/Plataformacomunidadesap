import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check del microservicio chatbot' })
  @ApiResponse({ status: 200, description: 'Servicio en óptimas condiciones' })
  check() {
    return {
      status: 'ok',
      service: 'chatbot-service',
      port: 3014,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
