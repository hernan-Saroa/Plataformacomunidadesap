import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

import {
  clasificarSituacion,
  extraerVigencia,
  sigueVigente,
} from './situacion-administrativa.clasificador';
import {
  SITUACIONES_NO_ASIGNABLES,
  SITUACIONES_ASIGNABLES,
} from './situacion-administrativa.config';
import { DocentesContratoController } from './docentes-contrato.controller';

/**
 * EFDS-1372 — Situación administrativa y solo lectura del RUND.
 *
 * Los textos usados son los REALES del archivo del RUND, no inventados: es la
 * única forma de saber que el clasificador aguanta el formato que llega.
 */
describe('EFDS-1372 :: situación administrativa', () => {
  // Fecha fija para que las pruebas de vigencia no dependan del día de ejecución.
  const HOY = new Date('2026-09-01T12:00:00Z');

  it('EFDS-1372 :: situación administrativa :: docente en año sabático no es asignable', () => {
    const r = clasificarSituacion(
      'En Año Sabático hasta 1-10-2026 Resol.2052 30-09-2024',
      HOY,
    );

    expect(r.asignable).toBe(false);
    expect(r.categoria).toBe('ano_sabatico');
    expect(r.vigenteHasta).toBe('2026-10-01');
    // El motivo debe decir la razón, no ser un rechazo genérico.
    expect(r.motivo).toMatch(/año sabático/i);
    expect(r.motivo).toContain('2026-10-01');
  });

  it('EFDS-1372 :: situación administrativa :: docente en comisión no es asignable', () => {
    for (const texto of [
      'En Comisión de Servicios (MinIgualdad) Resol.1300 del 25/10/2023',
      'En comisión de Estudios. Resol. 431 26-03-2025 Doctorado en Desarrollo',
      'En comisión Resol. 2216 01-11-2024 Decano U.Surcolombiana desde 05-11-2024',
    ]) {
      const r = clasificarSituacion(texto, HOY);
      expect(r.asignable).toBe(false);
      expect(r.categoria).toBe('comision');
    }
  });

  // Criterio confirmado por el equipo: están en servicio activo. Son 32 de 263;
  // bloquearlos sin respaldo normativo sería peor error que el contrario.
  it('EFDS-1372 :: situación administrativa :: "En Periodo de Prueba" SÍ es asignable', () => {
    for (const texto of [
      'En Periodo de Prueba hasta 17/07/2025',
      'En Periodo de Prueba hasta 13/01/2026',
    ]) {
      expect(clasificarSituacion(texto, HOY).asignable).toBe(true);
    }
  });

  it('EFDS-1372 :: situación administrativa :: servicio activo y no aplica son asignables', () => {
    expect(clasificarSituacion('Servicio Activo', HOY).asignable).toBe(true);
    expect(clasificarSituacion('No Aplica', HOY).asignable).toBe(true);
    expect(clasificarSituacion('Dedicación Exclusiva. Resol.2313 20-11-2024', HOY).asignable).toBe(true);
  });

  // La vigencia importa: no es una bandera permanente.
  it('EFDS-1372 :: situación administrativa :: una situación vencida deja de bloquear', () => {
    const texto = 'En Año Sabático hasta 1-10-2025 Resol.2052';

    expect(clasificarSituacion(texto, new Date('2025-06-01T12:00:00Z')).asignable).toBe(false);
    // Mismo docente, mismo texto, семестre siguiente: ya no bloquea.
    expect(clasificarSituacion(texto, new Date('2026-01-15T12:00:00Z')).asignable).toBe(true);
  });

  it('EFDS-1372 :: situación administrativa :: sin vigencia declarada se asume vigente', () => {
    const r = clasificarSituacion('En Comisión de Servicios (ICBF)', HOY);
    expect(r.vigenteHasta).toBeNull();
    expect(r.asignable).toBe(false);
  });

  // ⚠️ FAIL-CLOSED: lo que no se reconoce no se asume disponible.
  it('EFDS-1372 :: situación administrativa :: texto no clasificable NO es asignable', () => {
    const r = clasificarSituacion('En licencia no remunerada por seis meses', HOY);

    expect(r.asignable).toBe(false);
    expect(r.categoria).toBeNull();
    expect(r.motivo).toMatch(/no está clasificada|requiere revisión/i);
  });

  it('EFDS-1372 :: situación administrativa :: sin dato registrado NO es asignable', () => {
    for (const vacio of [null, undefined, '', '   ']) {
      expect(clasificarSituacion(vacio as any, HOY).asignable).toBe(false);
    }
  });

  it('EFDS-1372 :: la vigencia se extrae de los dos formatos del RUND', () => {
    expect(extraerVigencia('En Año Sabático hasta 1-10-2026')).toBe('2026-10-01');
    expect(extraerVigencia('En Periodo de Prueba hasta 17/07/2025')).toBe('2025-07-17');
    expect(extraerVigencia('Servicio Activo')).toBeNull();
    expect(sigueVigente(null)).toBe(true);
  });

  // La lista es configuración: se puede ampliar sin tocar el clasificador.
  it('EFDS-1372 :: las situaciones no asignables son configuración, no código', () => {
    expect(SITUACIONES_NO_ASIGNABLES.map((s) => s.categoria).sort())
      .toEqual(['ano_sabatico', 'comision']);
    // "Periodo de prueba" debe estar entre las asignables, no entre las que bloquean.
    expect(SITUACIONES_ASIGNABLES).toContain('periodo de prueba');
    expect(SITUACIONES_NO_ASIGNABLES.some((s) => s.categoria.includes('prueba'))).toBe(false);
  });

  /**
   * ⚠️ FIJA LA CONVENCIÓN DE FECHA: dd-mm-aaaa.
   *
   * Con "1-10-2026" no se distingue a ojo si se leyó bien: dd-mm da el 1 de
   * octubre (futuro, bloquea) y mm-dd da el 10 de enero (pasado, dejaría pasar a
   * un docente en sabático). El resultado parecía correcto sin que nadie lo
   * hubiera fijado.
   *
   * Se usa una fecha AMBIGUA a propósito —3-5-2026, válida en ambas lecturas—
   * para que el test falle si alguien invierte el orden.
   */
  it('EFDS-1372 :: la fecha se interpreta como dd-mm-aaaa, no mm-dd-aaaa', () => {
    // 3 de mayo, no 5 de marzo.
    expect(extraerVigencia('En Año Sabático hasta 3-5-2026')).toBe('2026-05-03');
    expect(extraerVigencia('En comisión hasta 07/09/2026')).toBe('2026-09-07');

    // Un día > 12 solo puede ser día: confirma el orden sin ambigüedad posible.
    expect(extraerVigencia('En Periodo de Prueba hasta 17/07/2025')).toBe('2025-07-17');
    expect(extraerVigencia('En comisión hasta 25/12/2026')).toBe('2026-12-25');

    // Un mes > 12 no es fecha válida en dd-mm: se descarta en vez de invertirse.
    expect(extraerVigencia('En comisión hasta 5-25-2026')).toBeNull();
  });
});

/**
 * RN-09 — el RUND es de solo lectura para las decanaturas.
 *
 * Mismo criterio estructural que EFDS-1650: la garantía es que no exista ruta de
 * escritura. Si no hay puerta, no hay que vigilarla.
 */
describe('EFDS-1372 :: RN-09 :: el contrato no expone escritura sobre el RUND', () => {
  const NOMBRE_METODO = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD', 'SEARCH'];

  it('EFDS-1372 :: RN-09 :: el controlador del contrato solo declara métodos GET', () => {
    const proto = DocentesContratoController.prototype as any;
    const rutas = Object.getOwnPropertyNames(proto)
      .filter((n) => n !== 'constructor' && typeof proto[n] === 'function')
      .map((n) => ({
        metodo: NOMBRE_METODO[Reflect.getMetadata(METHOD_METADATA, proto[n]) ?? 0],
        ruta: Reflect.getMetadata(PATH_METADATA, proto[n]),
      }))
      .filter((r) => r.ruta !== undefined);

    expect(rutas.length).toBeGreaterThan(0);
    expect(rutas.every((r) => r.metodo === 'GET')).toBe(true);
    expect(rutas.filter((r) => ['POST', 'PUT', 'PATCH', 'DELETE', 'ALL'].includes(r.metodo))).toEqual([]);
  });
});
