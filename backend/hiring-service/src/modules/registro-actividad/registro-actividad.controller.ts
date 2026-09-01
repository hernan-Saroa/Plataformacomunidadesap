import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { RegistroActividadService } from './registro-actividad.service';
import { AnularRegistroDto, RegistrarActividadDto } from './dto/registro-actividad.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_DOCUMENTOS_PROCESO,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Actividades que se cumplen dejando constancia (migración 051).
 *
 * Una sola ruta para las once, con el numeral en el camino: son la misma
 * operación sobre actividades distintas, y una ruta por actividad habría sido
 * once veces el mismo controlador.
 *
 * Escribe quien elabora los documentos del proceso —el gestor y la Dirección de
 * Contratación—, que es de quien la matriz cuelga las once. Es **supuesto del
 * equipo**: ninguna historia asigna estas actividades, porque ninguna historia
 * las recogió.
 */
@ApiTags('Actividades · Registro con soporte')
@Controller('procesos/:id/actividades/:numeral/registro')
export class RegistroActividadController {
  constructor(private readonly service: RegistroActividadService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_DOCUMENTOS_PROCESO)
  @ApiOperation({
    summary: 'Estado del registro de la actividad',
    description:
      'El registro vigente con su soporte, si la actividad aplica a la modalidad, si exige soporte y si esa exigencia está confirmada.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Param('numeral') numeral: string) {
    return this.service.estado(procesoId, numeral);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DOCUMENTOS_PROCESO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'El soporte de la actividad se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar que la actividad ocurrió',
    description:
      'Deja la fecha del hecho, la nota de trazabilidad y el soporte. No hay integración con SECOP II ni con Active Document: lo que llega de afuera lo transcribe el gestor.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() dto: RegistrarActividadDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // El soporte puede faltar: si la actividad lo exige lo dice el servicio, que
    // es quien conoce el parámetro. Aquí no se adivina.
    if (!file) {
      return this.service.registrar(procesoId, numeral, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      return await this.service.registrar(
        procesoId,
        numeral,
        dto,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DOCUMENTOS_PROCESO)
  @ApiOperation({
    summary: 'Anular el registro vigente',
    description:
      'La actividad vuelve al riel sin cumplir. El registro no se borra: queda con su motivo, porque es la historia de lo que se corrigió.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() dto: AnularRegistroDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, numeral, dto, getHiringAccess(req));
  }
}
