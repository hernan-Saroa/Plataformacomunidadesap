import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SeedService } from './seed.service';
import { SequenceService } from './services/sequence.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seedService: SeedService,
    private readonly sequenceService: SequenceService,
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

  @Get('generate-acta-consecutivo')
  @ApiOperation({
    summary: 'Generar consecutivo para Acta',
    description: 'Genera un número de consecutivo único para actas disciplinarias',
  })
  async generateActaConsecutivo(): Promise<{ consecutive: string }> {
    const consecutive = await this.sequenceService.generateActaConsecutivo();
    return { consecutive };
  }

  @Get('preview-acta-consecutivo')
  @ApiOperation({
    summary: 'Previsualizar próximo consecutivo para Acta',
    description: 'Obtiene el próximo número de consecutivo sin incrementarlo (para previsualización)',
  })
  async previewActaConsecutivo(): Promise<{ consecutive: string }> {
    const consecutive = await this.sequenceService.getPreviewActaConsecutivo();
    return { consecutive };
  }
}
