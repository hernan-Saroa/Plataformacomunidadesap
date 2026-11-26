import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';

import { CargasService, TAMANO_PARTE, carpetaDeCarga } from './cargas.service';
import { IniciarCargaDto } from './dto/cargas.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

/**
 * Multer escribe cada parte directo en la carpeta de su carga.
 *
 * El destino sale de la ruta, y el interceptor corre antes que los pipes: por
 * eso `carpetaDeCarga` valida el id y el número aquí mismo, antes de armar la
 * ruta en disco.
 */
const opcionesDeParte = {
  storage: diskStorage({
    destination: (req: any, _file: any, cb: any) => {
      try {
        cb(null, carpetaDeCarga(String(req.params.cargaId)));
      } catch (err) {
        cb(err, '');
      }
    },
    filename: (req: any, _file: any, cb: any) => {
      const n = Number(req.params.n);
      Number.isInteger(n) && n >= 0 ? cb(null, `parte-${n}`) : cb(new Error('Parte inválida'), '');
    },
  }),
  // Un poco de holgura sobre la parte: la cabecera multipart no cuenta, pero así
  // una parte de más no termina en un «file too large» que nadie entiende.
  limits: { fileSize: TAMANO_PARTE + 1024 },
};

/**
 * Cargas por partes de una actividad (BUG-004).
 *
 * Mismo permiso que cargar el documento en la actividad: quien no puede editar
 * la 6.1 tampoco puede subirle una oferta por partes.
 */
@ApiTags('Cargas por partes')
@Controller('procesos/:id/actividades/:numeral/cargas')
export class CargasController {
  constructor(private readonly service: CargasService) {}

  @Post()
  @Puede('editar', { param: 'numeral' })
  @ApiOperation({
    summary: 'Empezar una carga por partes',
    description: 'Dice cuántas partes de cuánto tamaño espera. Valida el formato y el peso antes de recibir nada.',
  })
  iniciar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() dto: IniciarCargaDto,
    @Req() req: any,
  ) {
    return this.service.iniciar(procesoId, numeral, dto, getHiringAccess(req));
  }

  @Put(':cargaId/partes/:n')
  @Puede('editar', { param: 'numeral' })
  @UseInterceptors(FileInterceptor('parte', opcionesDeParte))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Recibir una parte',
    description: 'Partes numeradas desde 0. Mandar otra vez la misma la reemplaza, así que reintentar no duplica.',
  })
  parte(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Param('cargaId', ParseUUIDPipe) cargaId: string,
    @Param('n', ParseIntPipe) n: number,
    @UploadedFile() parte: any,
    @Req() req: any,
  ) {
    return this.service.recibirParte(procesoId, numeral, cargaId, n, parte, getHiringAccess(req));
  }

  @Post(':cargaId/completar')
  @Puede('editar', { param: 'numeral' })
  @ApiOperation({
    summary: 'Unir las partes',
    description: 'Comprueba que estén todas, calcula el hash y, si es un .zip, revisa que no esté dañado, cifrado ni traiga ejecutables.',
  })
  completar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Param('cargaId', ParseUUIDPipe) cargaId: string,
    @Req() req: any,
  ) {
    return this.service.completar(procesoId, numeral, cargaId, getHiringAccess(req));
  }

  @Delete(':cargaId')
  @Puede('editar', { param: 'numeral' })
  @ApiOperation({ summary: 'Cancelar una carga', description: 'Borra las partes y, si ya se unió, el archivo.' })
  cancelar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Param('cargaId', ParseUUIDPipe) cargaId: string,
    @Req() req: any,
  ) {
    return this.service.cancelar(procesoId, numeral, cargaId, getHiringAccess(req));
  }
}
