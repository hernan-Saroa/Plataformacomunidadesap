import { BadRequestException, ConflictException } from '@nestjs/common';

import { motivoParaNoReabrir, ReaperturaService } from './reapertura.service';

/**
 * Reabrir actividades ya cerradas (153).
 *
 * La regla es estrecha a propósito: solo lo aprobado de un proceso vivo, con
 * motivo, todo o nada; y deshacer solo lo que sigue devuelto por esta vía.
 */
describe('ReaperturaService', () => {
  const acceso = { userName: 'directora@esap.edu.co', userId: 'u-1', roles: [] } as never;

  const montar = (opciones: { proceso?: any; actividades?: Record<string, any> }) => {
    const actividades = opciones.actividades ?? {};
    const guardados: any[] = [];
    const repo = (entidad: any) => ({
      findOne: jest.fn(async ({ where }: any) =>
        entidad.name === 'Proceso'
          ? (opciones.proceso === undefined ? { id: 'p-1', estado: 'EN_CURSO' } : opciones.proceso)
          : (actividades[where.numeral] ?? null),
      ),
    });
    const em = {
      getRepository: jest.fn(repo),
      create: jest.fn((entidad: any, datos: any) => ({ __entidad: entidad.name, ...datos })),
      save: jest.fn(async (a: any, b?: any) => {
        guardados.push(b ?? a);
        return b ?? a;
      }),
    };
    const dataSource = { transaction: async (fn: any) => fn(em), manager: em };
    const cadenas = { cancelarRonda: jest.fn(async () => undefined) };
    const s = new ReaperturaService(dataSource as never, cadenas as never);
    return { s, guardados, cadenas };
  };

  it('solo reabre lo aprobado de un proceso vivo', () => {
    expect(motivoParaNoReabrir('EN_CURSO', 'APROBADO')).toBeNull();
    expect(motivoParaNoReabrir('ADJUDICADO', 'APROBADO')).toBeNull();
    expect(motivoParaNoReabrir('EN_CURSO', 'BORRADOR')).not.toBeNull();
    expect(motivoParaNoReabrir('EN_CURSO', 'EN_REVISION')).not.toBeNull();
    expect(motivoParaNoReabrir('EN_CURSO', 'NO_APLICA')).not.toBeNull();
    expect(motivoParaNoReabrir('CANCELADO', 'APROBADO')).not.toBeNull();
    expect(motivoParaNoReabrir('DESIERTO', 'APROBADO')).not.toBeNull();
  });

  it('sin motivo no reabre nada', async () => {
    const { s } = montar({});
    await expect(s.reabrir('p-1', ['3.1'], '  ', acceso)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve la actividad con su revisión, cancela la ronda y deja traza', async () => {
    const actividad = { id: 'a-1', numeral: '4.2', estado: 'APROBADO', version: 3, datos: { x: 1 } };
    const { s, guardados, cadenas } = montar({ actividades: { '4.2': actividad } });

    const r = await s.reabrir('p-1', ['4.2'], 'El número del CDP quedó mal', acceso);

    expect(r).toEqual({ reabiertas: ['4.2'] });
    expect(actividad.estado).toBe('DEVUELTO');
    expect(actividad.datos).toMatchObject({ x: 1, reapertura: { motivo: 'El número del CDP quedó mal' } });
    expect(guardados).toContainEqual(
      expect.objectContaining({ __entidad: 'Revision', decision: 'DEVUELTO', versionRevisada: 3 }),
    );
    expect(guardados).toContainEqual(
      expect.objectContaining({ __entidad: 'Trazabilidad', accion: 'REABRIR' }),
    );
    expect(cadenas.cancelarRonda).toHaveBeenCalledWith(expect.anything(), 'a-1', 'CANCELADA');
  });

  it('si una no se puede, no reabre ninguna', async () => {
    const { s } = montar({
      actividades: {
        '3.1': { id: 'a-1', estado: 'APROBADO', datos: {} },
        '5.2': { id: 'a-2', estado: 'EN_REVISION', datos: {} },
      },
    });
    // La transacción es la que deshace la primera; aquí basta con que falle.
    await expect(s.reabrir('p-1', ['3.1', '5.2'], 'Error', acceso)).rejects.toBeInstanceOf(ConflictException);
  });

  it('deshacer la devuelve a APROBADO y quita la marca', async () => {
    const actividad = {
      id: 'a-1',
      estado: 'DEVUELTO',
      version: 2,
      datos: { x: 1, reapertura: { motivo: 'm', por: 'd', porId: null, at: '' } },
    };
    const { s } = montar({ actividades: { '3.1': actividad } });

    await s.deshacer('p-1', '3.1', acceso);

    expect(actividad.estado).toBe('APROBADO');
    expect(actividad.datos).toEqual({ x: 1 });
  });

  it('no deshace una devolución que no vino de una reapertura', async () => {
    const { s } = montar({ actividades: { '3.1': { id: 'a-1', estado: 'DEVUELTO', datos: {} } } });
    await expect(s.deshacer('p-1', '3.1', acceso)).rejects.toBeInstanceOf(ConflictException);
  });
});
