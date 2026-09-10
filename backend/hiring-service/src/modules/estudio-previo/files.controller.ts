import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync, createReadStream, statSync } from 'fs';
import { extname, join, resolve, sep } from 'path';

const STORAGE_PATH = process.env.HIRING_STORAGE_PATH || './uploads';

/**
 * El tipo de cada extensión que el módulo admite subir.
 *
 * Se resuelve por extensión y no se guarda del `mimeType` de la carga: el
 * archivo en disco se renombra a un hexadecimal con su extensión, y quien
 * descarga pide por ese nombre sin pasar por la fila de `documentos`.
 *
 * Sin esta tabla la respuesta salía sin `Content-Type` —`pipe` no lo pone— y el
 * navegador no sabía qué le llegó: un PDF incrustado en el visor quedaba en
 * blanco, y descargado a veces perdía la extensión.
 */
const TIPOS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Descarga de adjuntos. Requiere autenticación: el guard JWT global cubre
 * esta ruta, así que los documentos del expediente no quedan expuestos.
 */
@ApiTags('Archivos')
@Controller('files')
export class FilesController {
  @Get(':nombre')
  @ApiOperation({ summary: 'Descargar o abrir un documento del expediente' })
  @ApiQuery({
    name: 'descargar',
    required: false,
    description: 'Con `1` se envía como descarga; sin él se sirve para verlo en pantalla.',
  })
  descargar(
    @Param('nombre') nombre: string,
    @Res() res: Response,
    @Query('descargar') descargar?: string,
  ) {
    // El nombre viene de la URL: sin esta comprobación, un "../" permitiría
    // leer archivos fuera del directorio de almacenamiento.
    const base = resolve(STORAGE_PATH);
    const ruta = resolve(join(base, nombre));
    if (!ruta.startsWith(base + sep)) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (!existsSync(ruta)) {
      throw new NotFoundException('Documento no encontrado');
    }

    /**
     * `inline` por defecto, y `attachment` solo si lo piden.
     *
     * Antes era siempre `attachment`, y con eso el único modo de mirar un
     * soporte era bajarlo al disco y abrirlo por fuera: el abogado que revisa
     * cuatro anexos hacía cuatro descargas para leerlos. El botón de descargar
     * sigue existiendo —pasa `descargar=1`—, pero deja de ser la única vía.
     */
    const disposicion = descargar === '1' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', TIPOS[extname(nombre).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposicion}; filename="${nombre}"`);
    // Lo lee el visor para saber cuánto va a traer, y el navegador para poder
    // pedir rangos de un PDF grande en vez del archivo entero.
    res.setHeader('Content-Length', String(statSync(ruta).size));
    createReadStream(ruta).pipe(res);
  }
}
