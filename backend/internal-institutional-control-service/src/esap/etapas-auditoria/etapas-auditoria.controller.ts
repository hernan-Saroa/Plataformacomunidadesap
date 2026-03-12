import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EtapasAuditoriaService } from './etapas-auditoria.service';
import { RegistrarReunionDto } from './dto/registrar-reunion.dto';

@Controller('etapas-auditoria')
export class EtapasAuditoriaController {
  constructor(private readonly etapasService: EtapasAuditoriaService) {}

  @Get('auditoria/:auditoriaId/ejecucion/reunion-apertura')
  @UseGuards(JwtAuthGuard)
  getReunionApertura(@Param('auditoriaId') auditoriaId: string) {
    return this.etapasService.getReunionApertura(auditoriaId);
  }

  @Get('auditoria/:auditoriaId/ejecucion/reunion-cierre')
  @UseGuards(JwtAuthGuard)
  getReunionCierre(@Param('auditoriaId') auditoriaId: string) {
    return this.etapasService.getReunionCierre(auditoriaId);
  }

  @Post('auditoria/:auditoriaId/ejecucion/reunion-apertura')
  @UseGuards(JwtAuthGuard)
  registrarReunionApertura(
    @Param('auditoriaId') auditoriaId: string,
    @Body() body: RegistrarReunionDto,
  ) {
    return this.etapasService.registrarReunionApertura(auditoriaId, body);
  }

  @Post('auditoria/:auditoriaId/ejecucion/reunion-cierre')
  @UseGuards(JwtAuthGuard)
  registrarReunionCierre(
    @Param('auditoriaId') auditoriaId: string,
    @Body() body: RegistrarReunionDto,
  ) {
    return this.etapasService.registrarReunionCierre(auditoriaId, body);
  }
}
