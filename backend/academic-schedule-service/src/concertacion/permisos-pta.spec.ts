import { PermisosPtaService, tieneGlobal } from './permisos-pta.service.js';

/**
 * EFDS-2315 :: permisos del PTA para la concertación, con el alcance del rol.
 *
 *   · SUPER_ADMIN decide todo (mismo criterio que el PTA);
 *   · un rol sin alcance o con alcance filtrado/por persona NO decide
 *     (fail-closed: no hay vínculo estructurado RUND ↔ seccionales);
 *   · un rol con alcance Global decide.
 */
describe('EFDS-2315 :: permisos del PTA con alcance', () => {
  const servicio = (filas: any[]) => new PermisosPtaService({ query: async () => filas } as any);
  const APROBAR = ['pta.approve.academica.pregrado', 'pta.approve.all'];

  it('SUPER_ADMIN decide todo sin mirar el alcance', async () => {
    const p = await servicio([]).resolver(['SUPER_ADMIN']);
    expect(tieneGlobal(p, APROBAR)).toBe(true);
    expect(tieneGlobal(p, ['pta.review.academica.posgrado', 'pta.review.all'])).toBe(true);
  });

  it('un rol sin alcance (como hoy JEFATURA_TERRITORIAL y APROBADOR_DOCENCIA) no decide', async () => {
    const p = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: null }]).resolver(['JEFATURA_TERRITORIAL']);
    expect(p).toEqual([{ codigo: 'pta.approve.academica.pregrado', alcance: 'limitado' }]);
    expect(tieneGlobal(p, APROBAR)).toBe(false);
  });

  it('alcance filtrado no decide; alcance Global si', async () => {
    const filtrado = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: { tipo: 'Filtrado', territorial: '10' } }]).resolver(['X']);
    expect(tieneGlobal(filtrado, APROBAR)).toBe(false);
    const global = await servicio([{ code: 'pta.approve.academica.pregrado', alcance: '{"tipo":"Global"}' }]).resolver(['X']);
    expect(tieneGlobal(global, APROBAR)).toBe(true);
  });

  it('si no se pueden resolver los permisos, nadie decide', async () => {
    const roto = new PermisosPtaService({ query: async () => { throw new Error('caida'); } } as any);
    expect(await roto.resolver(['JEFATURA_TERRITORIAL'])).toEqual([]);
  });
});
