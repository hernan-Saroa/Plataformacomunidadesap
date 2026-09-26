import { ConflictException, NotFoundException } from '@nestjs/common';

import { ComiteContratacionService } from './comite-contratacion.service';

/**
 * El comité devuelve a corrección una actividad anterior ya cerrada
 * (EFDS-2068).
 *
 * Antes, «observar» dejaba la 3.7 en DEVUELTO pero la 3.1 y las demás
 * seguían APROBADO: la corrección que pidió el comité no tenía ninguna
 * actividad editable donde aplicarse. `reabrirActividad` escribe en las
 * mismas tablas que ya lee el estudio previo y la aprobación configurable
 * (`proceso_actividades` y `revisiones`), así que ninguna pantalla necesita
 * enterarse de que quien la reabrió fue el comité.
 */
describe('ComiteContratacionService · reabrirActividad', () => {
  const servicio = (opts: { actividad: any }) => {
    const guardados: any[] = [];
    const trazas: any[] = [];

    const em = {
      getRepository: (entidad: any) => ({
        findOne: async () => opts.actividad,
      }),
      save: async (entidadOTrazabilidad: any, valores?: any) => {
        // Trazabilidad::create pasa por em.create primero; aquí solo importa
        // distinguir la fila de Revisión (con procesoActividadId) de la de
        // Trazabilidad (con accion) y de ProcesoActividad (el propio objeto).
        const registro = valores ?? entidadOTrazabilidad;
        if (registro?.accion) {
          trazas.push(registro);
        } else {
          guardados.push(registro);
        }
        return registro;
      },
      create: (_entidad: any, valores: any) => valores,
    };

    const dataSource = { transaction: async (cb: (em: any) => Promise<any>) => cb(em) };

    const instancia = new ComiteContratacionService(
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { instancia, em, guardados, trazas };
  };

  const acceso = { userId: 'u-1', userName: 'abogado@esap.edu.co' } as never;

  it('devuelve la actividad, deja la revisión con las observaciones y traza el origen', async () => {
    const actividad = {
      id: 'act-3.1',
      procesoId: 'p-1',
      numeral: '3.1',
      estado: 'APROBADO',
      version: 3,
    };
    const { instancia, em, guardados, trazas } = servicio({ actividad });

    await (instancia as any).reabrirActividad(
      em,
      'p-1',
      '3.1',
      'Falta actualizar el valor estimado con el nuevo análisis del sector',
      acceso,
    );

    expect(actividad.estado).toBe('DEVUELTO');

    const revision = guardados.find((g) => g.procesoActividadId === 'act-3.1');
    expect(revision).toMatchObject({
      decision: 'DEVUELTO',
      observaciones: 'Falta actualizar el valor estimado con el nuevo análisis del sector',
      versionRevisada: 3,
    });

    expect(trazas).toHaveLength(1);
    expect(trazas[0]).toMatchObject({
      accion: 'DEVOLVER',
      detalle: expect.objectContaining({ numeral: '3.1', origen: 'comite_contratacion' }),
    });
  });

  it('no admite reabrir una actividad que no existe', async () => {
    const { instancia, em } = servicio({ actividad: null });

    await expect(
      (instancia as any).reabrirActividad(em, 'p-1', '3.5', 'Corregir la modalidad', acceso),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('no admite reabrir una actividad que no está aprobada', async () => {
    const actividad = { id: 'act-3.6', numeral: '3.6', estado: 'BORRADOR', version: 1 };
    const { instancia, em } = servicio({ actividad });

    await expect(
      (instancia as any).reabrirActividad(em, 'p-1', '3.6', 'Corregir la causal', acceso),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
