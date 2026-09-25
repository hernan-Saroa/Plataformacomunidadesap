import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DocumentosRequeridosService } from './documentos-requeridos.service';
import {
  ActualizarDocumentoRequeridoDto,
  CopiarDocumentoRequeridoDto,
  CrearDocumentoRequeridoDto,
} from './dto/documentos-requeridos.dto';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';

/**
 * Qué documentos pide cada actividad (EFDS-2066).
 *
 * Cada fila es un ítem de la lista de chequeo de su actividad: nombre, para qué
 * sirve, plantilla, obligatoriedad y a qué modalidades y tipologías se pide.
 * Es lo que antes estaba sembrado por migración para la 3.1 y la 5.1, y lo que
 * la asignación de formatos decía a medias para el resto.
 */
@ApiTags('Configuración de etapas')
@Controller('configuracion/documentos-requeridos')
export class DocumentosRequeridosController {
  constructor(private readonly service: DocumentosRequeridosService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Documentos que pide una actividad, o todas si no se indica' })
  listar(@Query('numeral') numeral?: string) {
    return this.service.listar(numeral);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Pedir un documento nuevo en una actividad' })
  crear(@Body() dto: CrearDocumentoRequeridoDto) {
    return this.service.crear(dto);
  }

  @Put(':id')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Corregir un documento requerido, reordenarlo o dejar de pedirlo',
    description: 'El código no cambia: las entregas de los procesos lo citan.',
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarDocumentoRequeridoDto,
  ) {
    return this.service.actualizar(id, dto);
  }

  @Post(':id/copiar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Pedir el mismo documento en otra actividad' })
  copiar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CopiarDocumentoRequeridoDto) {
    return this.service.copiar(id, dto.numeral);
  }
}
