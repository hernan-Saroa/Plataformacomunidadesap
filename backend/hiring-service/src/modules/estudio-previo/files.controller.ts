import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import { join, resolve } from 'path';

const STORAGE_PATH = process.env.HIRING_STORAGE_PATH || './uploads';

/**
 * Descarga de adjuntos. Requiere autenticación: el guard JWT global cubre
 * esta ruta, así que los documentos del expediente no quedan expuestos.
 */
@ApiTags('Archivos')
@Controller('files')
export class FilesController {
  @Get(':nombre')
  @ApiOperation({ summary: 'Descargar un documento del expediente' })
  descargar(@Param('nombre') nombre: string, @Res() res: Response) {
    // El nombre viene de la URL: sin esta comprobación, un "../" permitiría
    // leer archivos fuera del directorio de almacenamiento.
    const base = resolve(STORAGE_PATH);
    const ruta = resolve(join(base, nombre));
    if (!ruta.startsWith(base + require('path').sep)) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (!existsSync(ruta)) {
      throw new NotFoundException('Documento no encontrado');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    createReadStream(ruta).pipe(res);
  }
}
