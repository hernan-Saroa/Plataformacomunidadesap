import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

import { CatalogoController } from './catalogo.controller.js';
import { CatalogoSniesSoloLecturaMiddleware } from '../comun/solo-lectura.middleware.js';
import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';

/**
 * EFDS-1650 — Inmutabilidad de los campos derivados del SNIES (RN-02).
 *
 * ⚠️ Es una regla de SEGURIDAD, no cosmética: deshabilitar el input en React no
 * la hace cumplir. Se verifica en dos planos:
 *
 *   1. ESTRUCTURAL — que el módulo no exponga NINGUNA ruta de escritura hacia el
 *      catálogo. Es la garantía fuerte: si no hay puerta, no hay que vigilarla.
 *   2. DE COMPORTAMIENTO — que el middismo rechace la escritura con un mensaje
 *      que explique por qué, para el día en que alguien agregue una ruta.
 *
 * El mismo mecanismo cubrirá RN-09 (el RUND es de solo lectura para las
 * decanaturas) montándolo sobre su prefijo, sin duplicar la regla.
 */
describe('EFDS-1369 :: AC-02 :: inmutabilidad del catálogo (RN-02)', () => {
  /** Métodos HTTP de Nest, por su índice en RequestMethod. */
  const NOMBRE_METODO = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

  const rutasDelControlador = () => {
    const proto = CatalogoController.prototype as any;
    return Object.getOwnPropertyNames(proto)
      .filter((n) => n !== 'constructor' && typeof proto[n] === 'function')
      .map((n) => ({
        handler: n,
        metodo: NOMBRE_METODO[Reflect.getMetadata(METHOD_METADATA, proto[n]) ?? 0],
        ruta: Reflect.getMetadata(PATH_METADATA, proto[n]),
      }))
      .filter((r) => r.ruta !== undefined);
  };

  // La garantía fuerte: no existe ruta de escritura hacia el catálogo.
  it('EFDS-1369 :: AC-02 :: el módulo no expone ninguna ruta de escritura al catálogo', () => {
    const rutas = rutasDelControlador();

    expect(rutas.length).toBeGreaterThan(0);
    const escritura = rutas.filter((r) => ['POST', 'PUT', 'PATCH', 'DELETE', 'ALL'].includes(r.metodo));
    expect(escritura).toEqual([]);
    expect(rutas.every((r) => r.metodo === 'GET')).toBe(true);
  });

  it('EFDS-1369 :: AC-02 :: intento de modificar créditos vía API es rechazado', () => {
    const middleware = new CatalogoSniesSoloLecturaMiddleware();
    const next = jest.fn();

    expect(() =>
      middleware.use({ method: 'PATCH', body: { creditos: 99 } } as any, {} as any, next),
    ).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it('EFDS-1369 :: AC-02 :: intento de modificar horas totales vía API es rechazado', () => {
    const middleware = new CatalogoSniesSoloLecturaMiddleware();
    const next = jest.fn();

    // Se rechaza por MÉTODO, sin mirar el cuerpo: da igual qué campo se intente.
    for (const metodo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(() =>
        middleware.use({ method: metodo, body: { horasPta: 1, horasClase: 1 } } as any, {} as any, jest.fn()),
      ).toThrow(/solo lectura/i);
    }
    expect(next).not.toHaveBeenCalled();
  });

  it('EFDS-1369 :: AC-02 :: la lectura no se ve afectada', () => {
    const middleware = new CatalogoSniesSoloLecturaMiddleware();
    for (const metodo of ['GET', 'HEAD', 'OPTIONS']) {
      const next = jest.fn();
      middleware.use({ method: metodo } as any, {} as any, next);
      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  // Las entidades del catálogo son vistas de lectura: no deben declarar relaciones
  // ni columnas generadas que habiliten escritura por cascada desde este servicio.
  it('EFDS-1369 :: RN-02 :: las entidades del catálogo se mapean como solo lectura', () => {
    for (const entidad of [ProgramaCatalogoEntity, AsignaturaCatalogoEntity]) {
      const instancia: any = new (entidad as any)();
      expect(instancia).toBeDefined();
      // El id se declara con PrimaryColumn (no generado): este servicio nunca
      // inserta en el catálogo, solo lo referencia.
      const generadas = Reflect.getMetadata('__generatedColumns__', entidad) ?? [];
      expect(generadas).toEqual([]);
    }
  });
});
