import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { ActoAdjudicacionService } from './acto-adjudicacion.service';

/**
 * Adjudicar a alguien distinto del que ganó la evaluación (EFDS-1487).
 *
 * Pasa de verdad —el ganador que no firma es el caso típico— así que el sistema
 * no lo impide. Lo que hace es poner la contradicción delante y exigir que se
 * sustente: adjudicar contra el propio informe sin decir por qué es lo que no
 * puede quedar en el expediente.
 *
 * Servicio con la base de datos fuera del camino: aquí se prueba la regla.
 */
function servicio() {
  return new ActoAdjudicacionService({ manager: {} } as any);
}

const OFERTAS = [
  { id: 'of-1', numero: 1, nombre: 'Barata SAS', valorOfertado: '40000000.00' },
  { id: 'of-2', numero: 2, nombre: 'Completa SAS', valorOfertado: '48000000.00' },
] as any[];

const DEFINITIVO = {
  id: 'def-1',
  estado: 'PUBLICADO',
  resultado: { ganadora: { oferenteId: 'of-2', nombre: 'Completa SAS' } },
} as any;

const dto = (parcial: any = {}) => ({
  oferenteId: 'of-2',
  numeroActo: 'RES-2026-114',
  fechaActo: '2026-09-01',
  valorAdjudicado: 48_000_000,
  ...parcial,
});

/**
 * Un servicio con las consultas resueltas: informe definitivo publicado, sin
 * acto vigente y con las dos ofertas del proceso.
 */
function conEscenario(opciones: { definitivo?: any; actoVigente?: any } = {}) {
  const s = servicio() as any;
  s.exigirProceso = async () => ({ id: 'p-1', modalidad: 'LICITACION_PUBLICA' });
  s.exigirQueAplique = async () => undefined;
  s.ofertasDe = async () => OFERTAS;
  s.definitivoPublicado = async () =>
    opciones.definitivo === undefined ? DEFINITIVO : opciones.definitivo;
  s.actoVigente = async () => opciones.actoVigente ?? null;
  s.guardarDocumento = async () => ({ id: 'doc-1' });
  s.marcarActividad = async () => undefined;
  s.traza = async () => undefined;
  s.estado = async () => ({ ok: true });

  const guardados: any[] = [];
  const em = {
    create: (_entidad: any, datos: any) => datos,
    save: async (datos: any) => {
      guardados.push(datos);
      return { id: 'acto-1', ...datos };
    },
  };
  s.dataSource = { transaction: async (fn: any) => fn(em) };

  return { servicio: s, guardados };
}

const archivo = { filename: 'a.pdf' } as any;
const acceso = { userName: 'Ordenadora', userId: 'u-1' } as any;

describe('adjudicar', () => {
  it('adjudica sin justificación cuando es la ganadora del informe', async () => {
    const { servicio: s, guardados } = conEscenario();

    await s.adjudicar('p-1', dto(), archivo, 'hash', acceso);

    expect(guardados[0]).toMatchObject({ oferenteId: 'of-2', numeroActo: 'RES-2026-114' });
  });

  it('exige justificación para adjudicar a otro, y nombra al que proponía el informe', async () => {
    const { servicio: s } = conEscenario();

    // El mensaje trae el nombre a propósito: quien está firmando tiene que ver
    // de qué se está apartando, no solo que "falta un campo".
    await expect(
      s.adjudicar('p-1', dto({ oferenteId: 'of-1' }), archivo, 'hash', acceso),
    ).rejects.toThrow(/Completa SAS/);
  });

  it('con justificación, adjudicar a otro sí procede', async () => {
    const { servicio: s, guardados } = conEscenario();

    await s.adjudicar(
      'p-1',
      dto({ oferenteId: 'of-1', justificacion: 'La ganadora no suscribió el contrato en término' }),
      archivo,
      'hash',
      acceso,
    );

    expect(guardados[0]).toMatchObject({ oferenteId: 'of-1' });
  });

  it('una justificación en blanco no cuenta como justificación', async () => {
    const { servicio: s } = conEscenario();

    await expect(
      s.adjudicar('p-1', dto({ oferenteId: 'of-1', justificacion: '   ' }), archivo, 'hash', acceso),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no adjudica sin informe definitivo publicado', async () => {
    const { servicio: s } = conEscenario({ definitivo: null });

    await expect(s.adjudicar('p-1', dto(), archivo, 'hash', acceso)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('no adjudica dos veces: primero se revoca el acto vigente', async () => {
    const { servicio: s } = conEscenario({ actoVigente: { id: 'acto-0' } });

    await expect(s.adjudicar('p-1', dto(), archivo, 'hash', acceso)).rejects.toThrow(/revocar/i);
  });

  it('no adjudica a quien no presentó oferta', async () => {
    const { servicio: s } = conEscenario();

    await expect(
      s.adjudicar('p-1', dto({ oferenteId: 'of-ajena' }), archivo, 'hash', acceso),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
