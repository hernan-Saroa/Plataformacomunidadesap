import { GruposService } from './grupos.service.js';
import { numeracionSecuencial, siguienteNumeroGrupo } from './numeracion-grupo.js';

/**
 * EFDS-1370 — Gestionar grupos por asignatura.
 * Un test por criterio de aceptación y por RN-11.
 */
describe('EFDS-1370 :: gestión de grupos', () => {
  const ASIGNATURA = { id: '10', nombre: 'Matemática I', activa: true };

  const montar = (existentes: Array<{ numeroGrupo: number }> = []) => {
    const guardados: any[] = [];
    const service = new GruposService(
      {
        find: jest.fn().mockResolvedValue(existentes),
        findOne: jest.fn(({ where }: any) =>
          Promise.resolve(guardados.find((g) => g.idGrupo === where.idGrupo) || null)),
        create: jest.fn((d: any) => ({ ...d })),
        save: jest.fn((d: any) => {
          const filas = Array.isArray(d) ? d : [d];
          filas.forEach((f, i) => {
            if (!f.idGrupo) f.idGrupo = `g-${guardados.length + i + 1}`;
            const prev = guardados.findIndex((x) => x.idGrupo === f.idGrupo);
            if (prev >= 0) guardados[prev] = f; else guardados.push(f);
          });
          return Promise.resolve(Array.isArray(d) ? filas : filas[0]);
        }),
        remove: jest.fn((g: any) => {
          const i = guardados.findIndex((x) => x.idGrupo === g.idGrupo);
          if (i >= 0) guardados.splice(i, 1);
          return Promise.resolve(g);
        }),
      } as any,
      { findOne: jest.fn().mockResolvedValue(ASIGNATURA) } as any,
    );
    return { service, guardados };
  };

  it('EFDS-1370 :: AC-01 :: se pueden crear N grupos para una misma asignatura', async () => {
    const { service } = montar();

    const creados = await service.crear({ idAsignatura: '10', cantidad: 3 });

    expect(creados).toHaveLength(3);
    expect(creados.map((g) => g.numeroGrupo)).toEqual([1, 2, 3]);
    expect(creados.every((g) => g.idAsignatura === '10')).toBe(true);
  });

  it('EFDS-1370 :: AC-02 :: cada grupo mantiene docente, cupo y estado propios', async () => {
    const { service } = montar();
    const [g1, g2] = await service.crear({ idAsignatura: '10', cantidad: 2 });

    await service.actualizar(g1.idGrupo, { idDocente: 'doc-A', cupoMaximo: 40 });
    const otro = await service.obtener(g2.idGrupo);

    expect(otro.idDocente).toBeNull();
    expect(otro.cupoMaximo).toBe(30);
  });

  // Test negativo del aislamiento: tocar un grupo no puede arrastrar al otro.
  it('EFDS-1370 :: AC-02 :: modificar el grupo 1 no altera el grupo 2', async () => {
    const { service } = montar();
    const [g1, g2] = await service.crear({ idAsignatura: '10', cantidad: 2 });

    await service.actualizar(g1.idGrupo, { estado: 'CONFIRMADO', observaciones: 'jornada mañana' });

    const dos = await service.obtener(g2.idGrupo);
    expect(dos.estado).toBe('PROGRAMADO');
    expect(dos.observaciones).toBeNull();
    expect(dos.numeroGrupo).toBe(2);
  });

  // ⚠️ El test que evita el bug de unicidad: es tentador poner
  // UNIQUE(docente, asignatura), y sería incorrecto. Lo que se prohíbe es el
  // cruce de FRANJAS (RN-07, fase 3), no repetir docente en la misma asignatura.
  it('EFDS-1370 :: AC-03 :: el mismo docente puede asignarse a dos grupos de la misma asignatura', async () => {
    const { service } = montar();
    const [g1, g2] = await service.crear({ idAsignatura: '10', cantidad: 2 });

    const a = await service.actualizar(g1.idGrupo, { idDocente: 'doc-A' });
    const b = await service.actualizar(g2.idGrupo, { idDocente: 'doc-A' });

    expect(a.idDocente).toBe('doc-A');
    expect(b.idDocente).toBe('doc-A');
    expect(a.idAsignatura).toBe(b.idAsignatura);
    expect(a.idGrupo).not.toBe(b.idGrupo);
  });

  it('EFDS-1370 :: RN-11 :: la numeración es secuencial y no se repite dentro de la asignatura', async () => {
    const { service } = montar([{ numeroGrupo: 1 }, { numeroGrupo: 2 }]);

    const creados = await service.crear({ idAsignatura: '10', cantidad: 2 });

    expect(creados.map((g) => g.numeroGrupo)).toEqual([3, 4]);
  });

  it('EFDS-1370 :: RN-11 :: la numeración no recicla números liberados', () => {
    // Reutilizar el 2 haría que "grupo 2" designara dos ofertas distintas en
    // horarios y actas ya emitidos.
    expect(numeracionSecuencial([1, 3])).toBe(4);
    expect(siguienteNumeroGrupo([])).toBe(1);
  });

  it('EFDS-1370 :: AC-01 :: crear sobre una asignatura inexistente es rechazado', async () => {
    const { service } = montar();
    (service as any).asignaturaRepo = { findOne: jest.fn().mockResolvedValue(null) };

    await expect(service.crear({ idAsignatura: '999' })).rejects.toThrow(/no existe en el catálogo/i);
  });
});
