import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Inmutabilidad de catálogos ajenos, aplicada ANTES del enrutamiento — RN-02 y RN-09.
 *
 * Las dos reglas son la MISMA sobre catálogos distintos:
 *   RN-02 · los datos derivados del código de asignatura los define el SNIES y
 *           ningún usuario puede modificarlos (EFDS-1369).
 *   RN-09 · el RUND lo administra la Subdirección Nacional de Servicios
 *           Académicos; las decanaturas lo consumen en LECTURA (EFDS-1372).
 *
 * ⚠️ Por qué middleware y no un guard sobre el controlador:
 *
 * Un guard solo corre sobre rutas REGISTRADAS. Como el controlador del catálogo
 * declara únicamente GET, un PATCH devolvía 404 "ruta no encontrada": la
 * escritura quedaba rechazada por accidente, no por regla. Eso trae dos
 * problemas — el mensaje sugiere que la ruta aún no existe (lo contrario de lo
 * que se quiere comunicar), y no protege nada el día que alguien agregue un POST
 * a ese controlador.
 *
 * El middleware corre antes del enrutamiento, así que rechaza CUALQUIER método
 * de escritura sobre el prefijo protegido, exista la ruta o no. Eso es
 * fail-closed de verdad.
 *
 * Se monta por prefijo (ver CatalogoModule), de modo que RN-09 se resuelve
 * montándolo sobre el prefijo del RUND sin duplicar la regla.
 */
const METODOS_DE_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class SoloLecturaMiddleware implements NestMiddleware {
  /**
   * Nombre del catálogo protegido, para que el mensaje diga cuál es. Se puede
   * sobrescribir por subclase cuando se monte sobre otro prefijo (p. ej. RUND).
   */
  protected readonly nombreCatalogo: string = 'catálogo de origen';

  use(req: Request, _res: Response, next: NextFunction) {
    if (METODOS_DE_ESCRITURA.has(String(req.method).toUpperCase())) {
      // Se rechaza por MÉTODO, sin mirar el cuerpo: inspeccionar qué campos
      // vienen dejaría abierta la siguiente forma de escritura que a nadie se le
      // ocurra enumerar.
      throw new ForbiddenException(
        `El ${this.nombreCatalogo} es de solo lectura y no admite modificaciones desde este módulo. `
        + 'Sus datos son autoritativos y se administran en su módulo de origen.',
      );
    }
    next();
  }
}

/** RN-02 — catálogo académico del SNIES (EFDS-1369). */
@Injectable()
export class CatalogoSniesSoloLecturaMiddleware extends SoloLecturaMiddleware {
  protected readonly nombreCatalogo = 'catálogo académico (SNIES)';
}
