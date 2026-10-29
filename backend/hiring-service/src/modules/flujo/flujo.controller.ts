import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';
import { AprobacionGuardada, LaHaceGuardada, SecuenciaGuardada } from '../../flujo/lectura';
import { FlujoService } from './flujo.service';

export class GuardarAsignacionDto {
  @ApiPropertyOptional({ description: 'Código de la modalidad; sin ella, la asignación general.' })
  @IsOptional()
  @IsString()
  modalidad?: string | null;

  @ApiPropertyOptional({
    description: '{tipo:PERMISO} | {tipo:PUESTO,puestoId} | {tipo:PERSONAS,personas}. null en una modalidad: hereda la general.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  laHace?: LaHaceGuardada | null;

  @ApiPropertyOptional({
    description: '{tipo:NINGUNA} | {tipo:CADENA,cadenaId} | {tipo:ESCALON,roles,personas,puestos}. null en una modalidad: hereda.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  aprobacion?: AprobacionGuardada | null;

  @ApiPropertyOptional({
    description:
      '{dependeDe: string[] | null, noBloquea: boolean} (125). dependeDe null = la anterior. null en una modalidad: hereda; en la general: lo predeterminado.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  secuencia?: SecuenciaGuardada | null;
}

export class ActivarFlujoDto {
  @ApiPropertyOptional({ description: 'Qué cambia en esta versión, en palabras del área.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nota?: string;
}

export class MotivoActualizarDto {
  @ApiProperty()
  @IsString()
  @MinLength(10, { message: 'Explica por qué el proceso pasa a la versión nueva' })
  @MaxLength(1000)
  motivo: string;
}

const CUALES = ['BORRADOR', 'ACTIVA'] as const;

/**
 * El flujo visual de Configuración (migración 111): versiones, diagrama,
 * asignaciones por actividad y modalidad, validación y activación.
 */
@ApiTags('Configuración de etapas')
@Controller('configuracion')
export class FlujoController {
  constructor(private readonly service: FlujoService) {}

  @Get('flujo-versiones')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Las versiones del flujo: la activa, el borrador y las retiradas que aún usan procesos' })
  versiones() {
    return this.service.versiones();
  }

  @Post('flujo-versiones/borrador')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Crear el borrador como copia de la activa (o devolver el que ya hay)' })
  async crearBorrador(@Req() req: any) {
    await this.service.crearBorrador(getHiringAccess(req));
    return this.service.versiones();
  }

  @Delete('flujo-versiones/borrador')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Descartar el borrador' })
  descartar() {
    return this.service.descartarBorrador();
  }

  @Get('flujo-versiones/validacion')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({
    summary: 'Lo que impide activar la versión, en las once modalidades',
    description: 'Sin `cual`, el borrador si lo hay; si no, la activa.',
  })
  validacion(@Query('cual') cual?: string) {
    return this.service.validarVisible(cual === 'ACTIVA' ? 'ACTIVA' : undefined);
  }

  @Post('flujo-versiones/activar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Activar el borrador',
    description:
      'Solo si ninguna actividad queda sin quién la haga ni sin quién la apruebe; si no, 409 con la lista de lo que hay que corregir. Los procesos en curso siguen con su versión.',
  })
  activar(@Body() dto: ActivarFlujoDto, @Req() req: any) {
    return this.service.activar(getHiringAccess(req), dto.nota);
  }

  @Get('flujo-diagrama')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'El flujo de una modalidad, con quién hace y quién aprueba cada actividad, y qué le falta' })
  diagrama(@Query('modalidad') modalidad?: string, @Query('cual') cual?: string) {
    return this.service.diagrama(modalidad || null, (CUALES as readonly string[]).includes(cual ?? '') ? (cual as any) : undefined);
  }

  @Get('flujo-asignaciones/:numeral')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Quién hace y quién aprueba la actividad en la modalidad, y si lo hereda de la general' })
  asignacion(@Param('numeral') numeral: string, @Query('modalidad') modalidad?: string) {
    return this.service.asignacion(numeral, modalidad || null);
  }

  @Put('flujo-asignaciones/:numeral')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Cambiar quién hace, quién aprueba o cuándo empieza la actividad, en el borrador' })
  guardar(@Param('numeral') numeral: string, @Body() dto: GuardarAsignacionDto, @Req() req: any) {
    const cambios: {
      laHace?: LaHaceGuardada | null;
      aprobacion?: AprobacionGuardada | null;
      secuencia?: SecuenciaGuardada | null;
    } = {};
    if ('laHace' in dto) cambios.laHace = dto.laHace ?? null;
    if ('aprobacion' in dto) cambios.aprobacion = dto.aprobacion ?? null;
    if ('secuencia' in dto) cambios.secuencia = dto.secuencia ?? null;
    return this.service.guardarAsignacion(numeral, dto.modalidad || null, cambios, getHiringAccess(req));
  }
}

/** Con qué versión del flujo corre un proceso, y pasarlo a la activa. */
@ApiTags('Etapa 3 · Quién está en el proceso')
@Controller('procesos/:id/flujo')
export class FlujoDelProcesoController {
  constructor(private readonly service: FlujoService) {}

  @Get()
  @Puede('ver', '3.3')
  @ApiOperation({ summary: 'La versión del flujo con la que corre el proceso, y la activa' })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.deProceso(procesoId, getHiringAccess(req));
  }

  @Post('actualizar')
  @ApiOperation({
    summary: 'Pasar el proceso a la versión activa del flujo',
    description: 'Lo hace quien lo lleva en Contratación, o quien reparte. Exige motivo.',
  })
  actualizar(@Param('id', ParseUUIDPipe) procesoId: string, @Body() dto: MotivoActualizarDto, @Req() req: any) {
    return this.service.actualizarProceso(procesoId, dto.motivo, getHiringAccess(req));
  }
}

