import { CatalogoService } from './catalogo.service.js';
import {
  POSGRADO_PROGRAMA_TIPOS,
  nivelDeProgramaTipo,
} from './nivel-academico.js';
import {
  PERMISO_CATALOGO_POR_NIVEL,
  PERMISO_DISPONIBILIDAD_DOCENTE,
  puedeVerDisponibilidadDocente,
} from '../auth/programacion-permissions.js';

/**
 * EFDS-1368 — Seleccionar nivel académico y programa.
 * Un test por criterio de aceptación y por RN-08, en positivo y en negativo.
 */
describe('EFDS-1368 :: catálogo por nivel y semestre', () => {
  const PROGRAMAS = [
    { id: '1', codigo: 'AP', nombre: 'Administración Pública', tipo: 'pregrado', modalidad: 'presencial', horasBasePorCredito: 16, activo: true },
    { id: '2', codigo: 'APT', nombre: 'Administración Pública Territorial', tipo: 'pregrado', modalidad: 'distancia', horasBasePorCredito: 16, activo: true },
    { id: '3', codigo: 'MGP', nombre: 'Maestría en Gestión Pública', tipo: 'maestria', modalidad: 'presencial', horasBasePorCredito: 12, activo: true },
    { id: '4', codigo: 'EFP', nombre: 'Especialización en Finanzas Públicas', tipo: 'especializacion', modalidad: 'presencial', horasBasePorCredito: 16, activo: true },
  ];

  // Asignaturas de AP repartidas en dos semestres, con una del 2.º cargada
  // primero para comprobar que la agrupación no depende del orden de llegada.
  const ASIGNATURAS = [
    { id: '20', idPrograma: '1', nombre: 'Estadística I', codigo: 'AP-201', pensum: 'NUEVO', creditos: 3, idUbicacionSemestral: 2, modalidad: 'presencial', horasClase: 48, activo: true },
    { id: '10', idPrograma: '1', nombre: 'Matemática I', codigo: 'AP-101', pensum: 'NUEVO', creditos: 3, idUbicacionSemestral: 1, modalidad: 'presencial', horasClase: 48, activo: true },
    { id: '11', idPrograma: '1', nombre: 'Teoría del Estado', codigo: 'AP-102', pensum: 'NUEVO', creditos: 2, idUbicacionSemestral: 1, modalidad: 'presencial', horasClase: 32, activo: true },
  ];

  const SEMESTRES = [
    { id: 2, codigo: 'SEM_2', etiqueta: 'Semestre 2', tipoPrograma: 'pregrado', orden: 2 },
    { id: 1, codigo: 'SEM_1', etiqueta: 'Semestre 1', tipoPrograma: 'pregrado', orden: 1 },
  ];

  const montar = () => new CatalogoService(
    {
      find: jest.fn().mockResolvedValue(PROGRAMAS),
      findOne: jest.fn(({ where }: any) =>
        Promise.resolve(PROGRAMAS.find((p) => p.id === String(where.id)) || null)),
    } as any,
    {
      find: jest.fn(({ where }: any) =>
        Promise.resolve(ASIGNATURAS.filter((a) => a.idPrograma === String(where.idPrograma)))),
    } as any,
    { find: jest.fn().mockResolvedValue(SEMESTRES) } as any,
  );

  const permisosDe = (...codes: string[]) => new Set(codes);

  it('EFDS-1368 :: AC-01 :: el catálogo se agrupa por semestre del plan de estudios', async () => {
    const service = montar();

    const { semestres } = await service.catalogoPorSemestre(
      permisosDe(PERMISO_CATALOGO_POR_NIVEL.pregrado),
      '1',
    );

    expect(semestres.map((s) => s.etiqueta)).toEqual(['Semestre 1', 'Semestre 2']);
    expect(semestres[0].asignaturas.map((a) => a.nombre)).toEqual(['Matemática I', 'Teoría del Estado']);
    expect(semestres[1].asignaturas.map((a) => a.nombre)).toEqual(['Estadística I']);
  });

  it('EFDS-1368 :: AC-02 :: perfil pregrado no obtiene asignaturas de posgrado', async () => {
    const service = montar();
    const permisos = permisosDe(PERMISO_CATALOGO_POR_NIVEL.pregrado);

    const programas = await service.listarProgramas(permisos);
    expect(programas.map((p) => p.codigo)).toEqual(['AP', 'APT']);
    expect(programas.every((p) => p.nivel === 'pregrado')).toBe(true);

    // Aunque conozca el id de un programa de posgrado, se rechaza: el nivel se
    // valida contra el programa real, no contra lo que declare el cliente.
    await expect(service.catalogoPorSemestre(permisos, '3'))
      .rejects.toThrow(/no tiene permiso/i);
  });

  it('EFDS-1368 :: AC-02 :: perfil posgrado no obtiene asignaturas de pregrado', async () => {
    const service = montar();
    const permisos = permisosDe(PERMISO_CATALOGO_POR_NIVEL.posgrado);

    const programas = await service.listarProgramas(permisos);
    expect(programas.map((p) => p.codigo).sort()).toEqual(['EFP', 'MGP']);
    expect(programas.every((p) => p.nivel === 'posgrado')).toBe(true);

    await expect(service.catalogoPorSemestre(permisos, '1'))
      .rejects.toThrow(/no tiene permiso/i);
  });

  // ⚠️ El test que protege RN-07: RN-08 segrega el CATÁLOGO, nunca la
  // disponibilidad de docentes. Si se segregara, moriría el bloqueo transversal
  // de franjas de la fase 3 antes de existir.
  it('EFDS-1368 :: AC-03 :: ambos perfiles ven disponibilidad de docente compartido', () => {
    const pregrado = permisosDe(PERMISO_CATALOGO_POR_NIVEL.pregrado, PERMISO_DISPONIBILIDAD_DOCENTE);
    const posgrado = permisosDe(PERMISO_CATALOGO_POR_NIVEL.posgrado, PERMISO_DISPONIBILIDAD_DOCENTE);

    expect(puedeVerDisponibilidadDocente(pregrado)).toBe(true);
    expect(puedeVerDisponibilidadDocente(posgrado)).toBe(true);

    // Y también quien solo puede programar un nivel: la ocupación es compartida
    // y no revela qué asignatura la causó.
    expect(puedeVerDisponibilidadDocente(permisosDe(PERMISO_CATALOGO_POR_NIVEL.pregrado))).toBe(true);
  });

  it('EFDS-1368 :: RN-08 :: usuario sin permisos de programación es rechazado', async () => {
    const service = montar();

    await expect(service.listarProgramas(permisosDe()))
      .rejects.toThrow(/ningún nivel académico/i);
    await expect(service.catalogoPorSemestre(permisosDe(), '1'))
      .rejects.toThrow(/no tiene permiso/i);
    expect(puedeVerDisponibilidadDocente(permisosDe())).toBe(false);
  });

  // Detecta la divergencia con la lista de origen del PTA, que no se puede
  // importar por límite de microservicio (ver nivel-academico.ts).
  it('EFDS-1368 :: RN-08 :: la lista de tipos de posgrado coincide con la del PTA', () => {
    expect([...POSGRADO_PROGRAMA_TIPOS].sort())
      .toEqual(['doctorado', 'especializacion', 'maestria']);

    expect(nivelDeProgramaTipo('maestria')).toBe('posgrado');
    expect(nivelDeProgramaTipo('especializacion')).toBe('posgrado');
    expect(nivelDeProgramaTipo('doctorado')).toBe('posgrado');
    // Todo lo demás cae en pregrado, igual que reparte Docencia el PTA.
    expect(nivelDeProgramaTipo('pregrado')).toBe('pregrado');
    expect(nivelDeProgramaTipo('tecnico_profesional')).toBe('pregrado');
    expect(nivelDeProgramaTipo('tecnologico')).toBe('pregrado');
  });
});
