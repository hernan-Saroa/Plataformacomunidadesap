import { PermisosPtaService, decide, normalizarSeccional, type ContextoTerritorial } from './permisos-pta.service.js';

/**
 * EFDS-2315 :: la concertación decide con la MISMA regla que el PTA usa hoy para
 * sus componentes de Docencia (`assertAlcancePersonalDeActividades`): permiso del
 * componente + seccional de la persona del aprobador contra la territorial de
 * cada asignatura, por id o nombre normalizado. El alcance del rol no se usa.
 */
describe('EFDS-2315 :: permisos y alcance territorial, iguales al PTA', () => {
  const servicio = (filas: any[]) => new PermisosPtaService({ query: async () => filas } as any);
  const APROBAR = ['pta.approve.academica.pregrado', 'pta.approve.all'];
  const NOMBRES = new Map([['10', 'Seccional Huila'], ['16', 'Seccional Tolima'], ['900022', 'HUILA']]);
  const ctx = (usuario: string[], asignaturas: Array<string | null>): ContextoTerritorial =>
    ({ seccionalesUsuario: usuario, territorialesAsignaturas: asignaturas, nombres: NOMBRES });
  const aprobador = [{ codigo: 'pta.approve.academica.pregrado' }];

  it('SUPER_ADMIN es superusuario: decide sin restricción geográfica', async () => {
    const p = await servicio([{ role_code: 'SUPER_ADMIN', permission_code: null }]).resolver('u1');
    expect(decide(p, APROBAR, ctx(['16'], [null, '10']))).toBe(true);
  });

  it('sin el permiso del componente no decide, tenga la territorial que tenga', () => {
    expect(decide([{ codigo: 'pta.approve.academica.posgrado' }], APROBAR, ctx([], []))).toBe(false);
  });

  it('con seccional: solo decide asignaturas de su territorial (Huila sí, Tolima no)', () => {
    expect(decide(aprobador, APROBAR, ctx(['10'], ['10']))).toBe(true);
    expect(decide(aprobador, APROBAR, ctx(['10'], ['10', '16']))).toBe(false); // todas deben ser suyas
  });

  it('con seccional y una asignatura sin territorial: no se puede verificar, no decide', () => {
    expect(decide(aprobador, APROBAR, ctx(['10'], [null]))).toBe(false);
  });

  it('sin seccional en Personas: sin restricción geográfica, como hoy en el PTA (hueco reportado)', () => {
    expect(decide(aprobador, APROBAR, ctx([], ['16', null]))).toBe(true);
  });

  it('compara como el PTA: por id o por nombre normalizado; los dos catálogos de auth NO cruzan', () => {
    expect(normalizarSeccional('Seccional Huíla ')).toBe('seccionalhuila');
    // Persona en el catálogo heredado (10 "Seccional Huila"); grupo en el de la
    // carga masiva (900022 "HUILA"): distinto id y distinto nombre → no decide.
    expect(decide(aprobador, APROBAR, ctx(['10'], ['900022']))).toBe(false);
  });

  it('pta.approve.all sin ser superusuario conserva la restricción geográfica', () => {
    expect(decide([{ codigo: 'pta.approve.all' }], APROBAR, ctx(['10'], ['16']))).toBe(false);
  });

  it('si no se pueden resolver los permisos, nadie decide', async () => {
    const roto = new PermisosPtaService({ query: async () => { throw new Error('caida'); } } as any);
    expect(await roto.resolver('u1')).toEqual([]);
    expect(await servicio([]).resolver(null)).toEqual([]);
  });
});
