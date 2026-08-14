import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { OfertasService } from './ofertas.service';
import { FijarPlazoOfertasDto, RegistrarOferenteDto } from './dto/ofertas.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_LECTURA_CONTRATACION,
  ROLES_OFERTAS,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Recepción de ofertas — actividad 6.1 (EFDS-1155).
 *
 * Primera actividad de la etapa 6. El plazo queda fijado al abrirse el proceso
 * y corre hasta una hora concreta; mientras no venza, el gestor va registrando
 * lo que llega a ventanilla.
 */
@ApiTags('Etapa 6 · Recepción de ofertas')
@Controller('procesos/:id/ofertas')
export class OfertasController {
  constructor(private readonly service: OfertasService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Estado de la recepción de ofertas',
    description:
      'Si la modalidad recibe ofertas, cuándo vence el plazo, cuántos días hábiles faltan y qué oferentes van registrados.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Put('plazo')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_OFERTAS)
  @ApiOperation({
    summary: 'Fijar o corregir el vencimiento del plazo',
    description:
      'Hace falta cuando la modalidad no tiene plazo parametrizado, y cuando el cronograma fija una hora distinta del final del día que calcula la plataforma. Solo con la recepción abierta.',
  })
  fijarPlazo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: FijarPlazoOfertasDto,
    @Req() req: any,
  ) {
    return this.service.fijarPlazo(procesoId, dto, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_OFERTAS)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el soporte de una oferta es el documento radicado.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte de la oferta se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.1 · Registrar una oferta recibida',
    description:
      'Con la hora en que se radicó ante la entidad y su soporte. Una oferta posterior al vencimiento no entra a la lista.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarOferenteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el soporte de la oferta recibida');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.registrar(
        procesoId,
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

  @Post('cerrar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_OFERTAS)
  @ApiOperation({
    summary: 'Actividad 6.1 · Cerrar la recepción y publicar la lista',
    description:
      'Solo con el plazo vencido. El cierre congela la lista de oferentes y la publica; una recepción sin ofertas también se cierra.',
  })
  cerrar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.cerrar(procesoId, getHiringAccess(req));
  }

  @Delete(':oferenteId')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_OFERTAS)
  @ApiOperation({
    summary: 'Retirar una oferta registrada por error',
    description:
      'Solo antes del cierre: después, la lista ya está publicada y quitar un oferente no sería corregir sino cambiar el registro de lo que ocurrió.',
  })
  retirar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('oferenteId', ParseUUIDPipe) oferenteId: string,
    @Req() req: any,
  ) {
    return this.service.retirar(procesoId, oferenteId, getHiringAccess(req));
  }
}
