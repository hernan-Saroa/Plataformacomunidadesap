import { ConflictException } from '@nestjs/common';

import {
  cdpCubreElProceso,
  CdpService,
  MODALIDAD_CONTRATACION_DIRECTA,
  puedeTransicionar,
} from './cdp.service';
import { EstadoCdp } from '../../entities/cdp.entity';

/**
 * El orden del ciclo es la garantía de RF-EST-05: que un CDP no se dé por
 * expedido sin que la Dirección Financiera haya verificado la disponibilidad.
 * Si un salto indebido pasara, el proceso se abriría con un respaldo que nadie
 * revisó.
 */
describe('puedeTransicionar', () => {
  it('sigue el camino normal del ciclo', () => {
    expect(puedeTransicionar('SOLICITADO', 'VERIFICADO')).toBe(true);
    expect(puedeTransicionar('VERIFICADO', 'EXPEDIDO')).toBe(true);
  });

  it('no deja expedir sin verificar antes', () => {
    // El salto que más tienta: la Financiera ya tiene el número y quiere
    // registrarlo de una. Verificar es lo que certifica que hay recursos.
    expect(puedeTransicionar('SOLICITADO', 'EXPEDIDO')).toBe(false);
  });

  it('permite rechazar mientras no esté expedido', () => {
    expect(puedeTransicionar('SOLICITADO', 'RECHAZADO')).toBe(true);
    expect(puedeTransicionar('VERIFICADO', 'RECHAZADO')).toBe(true);
  });

  it('no rechaza lo ya expedido: eso se anula', () => {
    // Rechazar un CDP expedido borraría el hecho de que se expidió. Anularlo
    // lo deja sin efecto conservando el rastro.
    expect(puedeTransicionar('EXPEDIDO', 'RECHAZADO')).toBe(false);
    expect(puedeTransicionar('EXPEDIDO', 'ANULADO')).toBe(true);
  });

  it('no revive un CDP cerrado', () => {
    for (const cerrado of ['RECHAZADO', 'ANULADO'] as EstadoCdp[]) {
      for (const destino of ['SOLICITADO', 'VERIFICADO', 'EXPEDIDO'] as EstadoCdp[]) {
        expect(puedeTransicionar(cerrado, destino)).toBe(false);
      }
    }
  });

  it('no se queda en el mismo estado', () => {
    for (const estado of ['SOLICITADO', 'VERIFICADO', 'EXPEDIDO'] as EstadoCdp[]) {
      expect(puedeTransicionar(estado, estado)).toBe(false);
    }
  });
});

/**
 * Un CDP por debajo del valor estimado no alcanza a respaldar el gasto. Se
 * advierte en vez de bloquear: la cuantía definitiva puede bajar respecto del
 * estimado, y esa decisión es de la Dirección Financiera.
 */
describe('cdpCubreElProceso', () => {
  it('acepta un CDP que cubre el estimado', () => {
    expect(cdpCubreElProceso(50_000_000, 45_000_000).cubre).toBe(true);
    expect(cdpCubreElProceso(45_000_000, 45_000_000).advertencia).toBeNull();
  });

  it('advierte cuando el CDP se queda corto', () => {
    const r = cdpCubreElProceso(40_000_000, 45_000_000);
    expect(r.cubre).toBe(false);
    expect(r.advertencia).toContain('inferior al valor estimado');
  });

  it('no opina si falta alguno de los dos datos', () => {
    // Los procesos anteriores a EFDS-1323 no tienen valor estimado, y el CDP
    // recién solicitado todavía no tiene valor.
    expect(cdpCubreElProceso(null, 45_000_000).cubre).toBe(true);
    expect(cdpCubreElProceso(40_000_000, null).cubre).toBe(true);
    expect(cdpCubreElProceso(null, null).advertencia).toBeNull();
  });

  it('trata el cero del estimado como cubierto', () => {
    expect(cdpCubreElProceso(0, 0).cubre).toBe(true);
  });
});

/**
 * Segundo criterio de EFDS-1148 (RF-EST-06). Es una regla de orden reforzada y
 * solo para contratación directa: en las demás modalidades el control
 * presupuestal es la apertura, y adelantarlo a la elaboración documental
 * frenaría procesos que la ley permite avanzar.
 */
describe('exigirCdpParaDocumentos', () => {
  const servicio = (modalidad: string, puedeAbrirse: boolean) => {
    const service = new CdpService({ manager: {} } as any);
    jest
      .spyOn(service as any, 'exigirProceso')
      .mockResolvedValue({ id: 'p1', modalidad } as any);
    jest.spyOn(service, 'estadoRespaldo').mockResolvedValue({
      aplica: true,
      cdp: null,
      expedido: puedeAbrirse,
      soporteAdjunto: false,
      puedeAbrirse,
      motivo: puedeAbrirse ? null : 'El proceso no tiene CDP solicitado',
    } as any);
    return service;
  };

  it('bloquea la elaboración en directa sin CDP expedido', async () => {
    await expect(
      servicio(MODALIDAD_CONTRATACION_DIRECTA, false).exigirCdpParaDocumentos('p1'),
    ).rejects.toThrow(ConflictException);
  });

  it('distingue su mensaje del bloqueo general de apertura', async () => {
    // Si dijera lo mismo que la apertura, el usuario buscaría el problema en
    // el paso equivocado.
    await expect(
      servicio(MODALIDAD_CONTRATACION_DIRECTA, false).exigirCdpParaDocumentos('p1'),
    ).rejects.toThrow(/antes de elaborar los documentos/);
  });

  it('deja pasar en directa cuando el CDP ya está expedido', async () => {
    await expect(
      servicio(MODALIDAD_CONTRATACION_DIRECTA, true).exigirCdpParaDocumentos('p1'),
    ).resolves.toBeUndefined();
  });

  it('no interviene en las demás modalidades, ni siquiera sin CDP', async () => {
    // Ahí el CDP se exige para abrir, no para redactar: bloquear aquí sería
    // inventar una restricción que el requisito no pide.
    for (const m of ['LICITACION_PUBLICA', 'MINIMA_CUANTIA', 'ABREVIADA_MENOR_CUANTIA']) {
      await expect(servicio(m, false).exigirCdpParaDocumentos('p1')).resolves.toBeUndefined();
    }
  });
});
