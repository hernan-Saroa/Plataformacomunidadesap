import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
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
 * La cabecera `Content-Disposition` con el nombre que el usuario reconoce.
 *
 * `filename*` lleva el nombre real en UTF-8 —tildes, eñes, rayas— y `filename`
 * una versión ASCII para los navegadores que no leen la primera. Las comillas y
 * los saltos de línea se quitan: dentro de una cabecera romperían su sintaxis.
 */
export function disposicionConNombre(disposicion: 'inline' | 'attachment', nombre: string): string {
  const limpio = nombre.replace(/["\\\r\n]/g, '').trim() || 'documento';
  const ascii = limpio
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_');
  // `encodeURIComponent` deja pasar ' ( ) *, que en `filename*` no valen.
  const utf8 = encodeURIComponent(limpio).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${disposicion}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** El nombre de descarga con su extensión, aunque el registrado no la traiga. */
function conExtension(nombre: string, extension: string): string {
  return extname(nombre).toLowerCase() === extension.toLowerCase() ? nombre : `${nombre}${extension}`;
}

/**
 * Descarga de adjuntos. Requiere autenticación: el guard JWT global cubre
 * esta ruta, así que los documentos del expediente no quedan expuestos.
 */
@ApiTags('Archivos')
@Controller('files')
export class FilesController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * El nombre con el que se subió el archivo.
   *
   * En disco cada archivo es un hexadecimal aleatorio —el original lo elige el
   * usuario y podría colisionar o traer separadores de ruta—, y ese hexadecimal
   * era lo que la descarga proponía: quien bajaba lo que acababa de subir
   * recibía «3befe4c0f8cc46bb1ab59ec4f340c8c9.pdf». El nombre real está en la
   * fila que apunta al archivo; las plantillas, que no lo guardan, se nombran
   * por su código, nombre y versión. Si ninguna fila lo reclama queda el de
   * disco, que es lo que había.
   */
  private async nombreOriginal(enDisco: string): Promise<string> {
    const sufijo = `%/${enDisco}`;
    const [documento] = await this.dataSource.query(
      `SELECT archivo_nombre_original AS nombre FROM hiring.documentos
        WHERE archivo_url LIKE $1 AND archivo_nombre_original IS NOT NULL
        ORDER BY created_at DESC LIMIT 1`,
      [sufijo],
    );
    if (documento?.nombre) return documento.nombre;

    const [plantilla] = await this.dataSource.query(
      `SELECT codigo, nombre, version FROM hiring.plantillas
        WHERE archivo_url LIKE $1 ORDER BY created_at DESC LIMIT 1`,
      [sufijo],
    );
    if (plantilla) {
      return conExtension(
        `${plantilla.codigo} ${plantilla.nombre} v${plantilla.version}`,
        extname(enDisco),
      );
    }

    return enDisco;
  }

  @Get(':nombre')
  @ApiOperation({ summary: 'Descargar o abrir un documento del expediente' })
  @ApiQuery({
    name: 'descargar',
    required: false,
    description: 'Con `1` se envía como descarga; sin él se sirve para verlo en pantalla.',
  })
  async descargar(
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
    const original = await this.nombreOriginal(nombre).catch(() => nombre);
    res.setHeader('Content-Disposition', disposicionConNombre(disposicion, original));
    // Lo lee el visor para saber cuánto va a traer, y el navegador para poder
    // pedir rangos de un PDF grande en vez del archivo entero.
    res.setHeader('Content-Length', String(statSync(ruta).size));
    createReadStream(ruta).pipe(res);
  }
}
