import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SeedService } from './seed.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seedService: SeedService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health Check' })
  getHealth(): string {
    return this.appService.getHello();
  }

  @Post('seed')
  @ApiOperation({
    summary: 'Ejecutar Seed',
    description: 'Inyecta datos de prueba en la base de datos',
  })
  async seed(): Promise<{ message: string }> {
    await this.seedService.seed();
    return { message: 'Seed ejecutado exitosamente' };
  }
}
