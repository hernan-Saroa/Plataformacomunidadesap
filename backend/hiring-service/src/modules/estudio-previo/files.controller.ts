import { Controller, Get, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
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
 * Lo que ve quien abre en una pestaña un documento que ya no está.
 *
 * Los enlaces del módulo abren la descarga en una pestaña nueva, así que un
 * 404 en JSON dejaba al usuario frente a una pantalla negra con
 * `{"message":"Documento no encontrado"}`. Pasa cuando la fila sigue en la base
 * pero el archivo se perdió del disco —en QA, al recrear el contenedor sin
 * volumen—, y lo único que puede hacer quien lo ve es volver a subirlo.
 */
const PAGINA_NO_ENCONTRADO = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documento no disponible</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #f8fafc; color: #1e293b; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 440px; margin: 16px; padding: 28px 32px; background: #fff;
         border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  h1 { margin: 0 0 8px; font-size: 18px; color: #003DA5; }
  p { margin: 0 0 8px; font-size: 14px; line-height: 1.55; color: #475569; }
</style></head>
<body><main>
  <h1>El documento no está disponible</h1>
  <p>El registro existe, pero el archivo ya no está en el servidor.</p>
  <p>Vuelve a subirlo desde donde se cargó. Si es una plantilla, edítala en Configuración y carga el archivo de nuevo.</p>
</main></body></html>`;

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
    @Req() req?: Request,
  ) {
    // El nombre viene de la URL: sin esta comprobación, un "../" permitiría
    // leer archivos fuera del directorio de almacenamiento.
    const base = resolve(STORAGE_PATH);
    const ruta = resolve(join(base, nombre));
    if (!ruta.startsWith(base + sep)) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (!existsSync(ruta)) {
      // Una pestaña recibe una página que se pueda leer; el visor y los
      // `fetch` del módulo, el 404 en JSON de siempre.
      if (req?.accepts(['json', 'html']) === 'html') {
        res.status(404).type('html').send(PAGINA_NO_ENCONTRADO);
        return;
      }
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
