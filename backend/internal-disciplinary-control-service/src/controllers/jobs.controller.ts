import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TerminosProcesalesService } from '../services/terminos-procesales.service';
import { AlertasAutomaticasService } from '../services/alertas-automaticas.service';

@ApiTags('Jobs Automáticos')
@Controller('jobs')
@ApiBearerAuth()
export class JobsController {
  constructor(
    private terminosService: TerminosProcesalesService,
    private alertasAutomaticasService: AlertasAutomaticasService,
  ) {}

  /**
   * Endpoint para ejecutar job de recálculo de términos
   * Puede ser llamado por cron job o manualmente
   */
  @Post('recalcular-terminos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar job de recálculo de términos',
    description: 'Recalcula todos los términos activos. Usado por cron jobs o ejecución manual',
  })
  @ApiResponse({
    status: 200,
    description: 'Recálculo completado',
  })
  async recalcularTerminos() {
    return await this.terminosService.recalcularTodos();
  }

  /**
   * Endpoint para ejecutar job de envío de alertas
   * Debe ejecutarse periódicamente (ej: diario a las 8:00 AM)
   */
  @Post('enviar-alertas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar job de envío de alertas',
    description: 'Envía alertas automáticas según reglas configuradas. Usado por cron jobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Envío de alertas completado',
  })
  async enviarAlertas() {
    return await this.alertasAutomaticasService.ejecutarEnvioAlertas();
  }
}


