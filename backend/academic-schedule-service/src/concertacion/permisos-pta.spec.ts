import { PermisosPtaService, decide } from './permisos-pta.service.js';

/**
 * EFDS-2315 :: permisos del PTA para la concertación, con el alcance del rol y
 * la territorial del docente (equivalencia explícita, migración 038).
 */
describe('EFDS-2315 :: permisos del PTA con alcance territorial', () => {
  const servicio = (filas: any[]) => new PermisosPtaService({ query: async () => filas } as any);
  const APROBAR = ['pta.approve.academica.pregrado', 'pta.approve.all'];
  const HUILA = { seccionalDocente: '10', seccionalesUsuario: ['10'] };

  it('SUPER_ADMIN decide todo sin mirar el alcance, incluso con territorial no mapeada', async () => {
    const p = await servicio([]).resolver(['SUPER_ADMIN']);
    expect(decide(p, APROBAR, { seccionalDocente: null, seccionalesUsuario: [] })).toBe(true);
  });

  it('sin alcance = por persona: decide solo sobre docentes de su seccional', async () => {
    const p = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: null }]).resolver(['JEFATURA_TERRITORIAL']);
    expect(p).toEqual([{ codigo: 'pta.approve.academica.pregrado', alcance: 'persona' }]);
    expect(decide(p, APROBAR, HUILA)).toBe(true);
    expect(decide(p, APROBAR, { seccionalDocente: '16', seccionalesUsuario: ['10'] })).toBe(false); // Tolima ≠ Huila
    expect(decide(p, APROBAR, { seccionalDocente: '10', seccionalesUsuario: [] })).toBe(false);     // sin seccional asignada
  });

  it('territorial del docente no mapeada en la tabla: falla cerrado para todo alcance no global', async () => {
    const persona = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: null }]).resolver(['X']);
    const filtrado = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: { tipo: 'Filtrado', territorial: '10' } }]).resolver(['X']);
    const sinMapa = { seccionalDocente: null, seccionalesUsuario: ['10'] };
    expect(decide(persona, APROBAR, sinMapa)).toBe(false);
    expect(decide(filtrado, APROBAR, sinMapa)).toBe(false);
  });

  it('filtrado por seccional decide sobre esa seccional; Global y "Todas" deciden siempre', async () => {
    const filtrado = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: { tipo: 'Filtrado', territorial: '10' } }]).resolver(['X']);
    expect(decide(filtrado, APROBAR, HUILA)).toBe(true);
    expect(decide(filtrado, APROBAR, { seccionalDocente: '16', seccionalesUsuario: [] })).toBe(false);
    const global = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: '{"tipo":"Global"}' }]).resolver(['X']);
    const todas = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: { tipo: 'Filtrado', territorial: 'Todas' } }]).resolver(['X']);
    for (const p of [global, todas]) expect(decide(p, APROBAR, { seccionalDocente: '16', seccionalesUsuario: [] })).toBe(true);
  });

  it('filtros de CETAP/programa o alcance desconocido no se vuelven permiso', async () => {
    const cetap = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: { tipo: 'Filtrado', territorial: '10', cetap: 'CET-1' } }]).resolver(['X']);
    const raro = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: { tipo: 'Otro' } }]).resolver(['X']);
    expect(cetap).toEqual([]);
    expect(raro).toEqual([]);
  });

  it('si no se pueden resolver los permisos, nadie decide', async () => {
    const roto = new PermisosPtaService({ query: async () => { throw new Error('caida'); } } as any);
    expect(await roto.resolver(['JEFATURA_TERRITORIAL'])).toEqual([]);
  });
});
