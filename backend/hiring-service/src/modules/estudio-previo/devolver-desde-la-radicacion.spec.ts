import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { EstudioPrevioService } from './estudio-previo.service';
import { Revision } from '../../entities/revision.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';

/**
 * Quien toma el proceso en la 3.3 también lo mira, y si llega incompleto se lo
 * devuelve al área con observaciones sin pasarlo antes a los abogados.
 *
 * Es la devolución de la revisión, pero fuera de la cadena: no la hace un
 * escalón sino quien lleva el proceso.
 */
describe('EstudioPrevioService · devolver desde la radicación', () => {
  const OBSERVACIONES = 'Falta el análisis del sector y el anexo técnico firmado.';
  const acceso = { userId: 'u-gestor', userName: 'gestor@esap.edu.co', roles: ['GESTOR_CONTRATACION'] } as never;

  const montar = (estado: string, exigirQueLoLleve: () => Promise<void> = async () => undefined) => {
    const actividad = { id: 'a-31', procesoId: 'p-1', numeral: '3.1', estado, version: 2 };
    const revision34 = { id: 'a-34', numeral: '3.4', estado: 'BORRADOR' };
    const guardados: { entidad: unknown; datos: any }[] = [];

    const em = {
      findOne: async (_entidad: unknown, { where }: any) => (where.numeral === '3.1' ? actividad : null),
      getRepository: () => ({ findOne: async () => revision34 }),
      save: async (entidad: unknown, datos: any) => {
        guardados.push({ entidad, datos });
        return datos;
      },
    };
    const dataSource = { transaction: async (fn: (m: typeof em) => unknown) => fn(em) };
    const participacion = { exigirQueLoLleve: jest.fn(exigirQueLoLleve) };
    const cadenas = { cancelarRonda: jest.fn(async () => undefined) };

    const servicio = new EstudioPrevioService(
      dataSource as never,
      {} as never,
      {} as never,
      participacion as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      cadenas as never,
    );
    return { servicio, actividad, guardados, participacion, cadenas };
  };

  it('le devuelve al área el estudio previo en revisión, con la observación', async () => {
    const { servicio, actividad, guardados, cadenas } = montar('EN_REVISION');

    await expect(servicio.devolverDesdeLaRadicacion('p-1', OBSERVACIONES, acceso)).resolves.toEqual({
      estado: 'DEVUELTO',
    });

    expect(actividad.estado).toBe('DEVUELTO');
    const revision = guardados.find((g) => g.entidad === Revision)?.datos;
    expect(revision).toMatchObject({ decision: 'DEVUELTO', observaciones: OBSERVACIONES, revisadoPor: 'gestor@esap.edu.co' });
    // La ronda de la cadena se cancela: al reenviarlo empieza otra.
    expect(cadenas.cancelarRonda).toHaveBeenCalledWith(expect.anything(), 'a-31', 'CANCELADA');
  });

  it('deja la traza que el motor de avisos usa para avisarle al área', async () => {
    const { servicio, guardados } = montar('EN_REVISION');

    await servicio.devolverDesdeLaRadicacion('p-1', OBSERVACIONES, acceso);

    const traza = guardados.find((g) => g.entidad === Trazabilidad)?.datos;
    expect(traza).toMatchObject({ entidad: 'estudio_previo', accion: 'DEVOLVER' });
    expect(traza.detalle).toMatchObject({ observaciones: OBSERVACIONES, desdeLaRadicacion: true });
  });

  it('reabre la 3.4 para cuando el área lo reenvíe', async () => {
    const { servicio, guardados } = montar('EN_REVISION');

    await servicio.devolverDesdeLaRadicacion('p-1', OBSERVACIONES, acceso);

    const reabierta = guardados.filter((g) => g.entidad === ProcesoActividad).map((g) => g.datos);
    expect(reabierta).toContainEqual(expect.objectContaining({ numeral: '3.4', estado: 'BORRADOR' }));
  });

  it('exige observaciones que el área pueda leer', async () => {
    const { servicio, participacion } = montar('EN_REVISION');

    await expect(servicio.devolverDesdeLaRadicacion('p-1', '  corregir ', acceso)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(participacion.exigirQueLoLleve).not.toHaveBeenCalled();
  });

  it('solo lo devuelve quien lo lleva', async () => {
    const { servicio, actividad } = montar('EN_REVISION', async () => {
      throw new ForbiddenException('Este proceso lo lleva otra persona');
    });

    await expect(servicio.devolverDesdeLaRadicacion('p-1', OBSERVACIONES, acceso)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(actividad.estado).toBe('EN_REVISION');
  });

  it.each(['BORRADOR', 'DEVUELTO', 'APROBADO'])('no devuelve un estudio previo %s', async (estado) => {
    const { servicio, guardados } = montar(estado);

    await expect(servicio.devolverDesdeLaRadicacion('p-1', OBSERVACIONES, acceso)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(guardados).toHaveLength(0);
  });
});
