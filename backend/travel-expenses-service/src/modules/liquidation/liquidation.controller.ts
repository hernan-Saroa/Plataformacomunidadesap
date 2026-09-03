import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LiquidationService } from './liquidation.service';
import { CalcularLiquidacionDto } from '../../dto/liquidation/calcular-liquidacion.dto';
import { LiquidacionResponseDto } from '../../dto/liquidation/liquidacion-response.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';

@ApiTags('liquidation')
@Controller('liquidation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LiquidationController {
  constructor(private readonly liquidationService: LiquidationService) {}

  @Post('calculate')
  @Permissions('travel_expenses:read')
  @ApiOperation({ summary: 'Calcula la autoliquidación de viáticos' })
  @ApiResponse({
    status: 200,
    description: 'Cálculo exitoso',
    type: LiquidacionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o fechas incorrectas',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes' })
  calcular(@Body() dto: CalcularLiquidacionDto) {
    return this.liquidationService.calcularLiquidacion(dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio de liquidación' })
  @ApiResponse({
    status: 200,
    description: 'Servicio activo',
    schema: {
      type: 'object',
      properties: { status: { type: 'string' }, service: { type: 'string' } },
    },
  })
  health() {
    return { status: 'ok', service: 'liquidation' };
  }
}
