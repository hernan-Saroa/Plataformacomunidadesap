import { PtaService } from './pta.service';

describe('catálogo de asignaturas y pensums del PTA', () => {
  function setup() {
    const service = Object.create(PtaService.prototype) as any;
    service.asignaturaRepo = { query: jest.fn().mockResolvedValue([{ id: '1', programaId: '111', programa_real_id: '111',
      nombre: 'Asignatura diurna', codigo: 'A-1', pensum: 'AP_35', activa: true, deletedAt: null }]) };
    return service;
  }

  it.each([{ programa_id: '111' }, { programaId: 'PRO-001' }])('filtra vigencia y asociación por programa con %j', async query => {
    const service = setup();
    const result = await service.getCatalogoAsignaturas(query);
    const [sql, params] = service.asignaturaRepo.query.mock.calls[0];
    expect(sql).toContain('WHERE a.activa = TRUE AND a.deleted_at IS NULL AND p.activo = TRUE AND p.deleted_at IS NULL AND (a.id_programa::text = $1 OR p.id::text = $1 OR p.codigo = $1)');
    expect(params).toEqual([query.programa_id || query.programaId]);
    expect(result[0]).toMatchObject({ programaId: '111', programa_id: '111', pensum: 'AP_35', activa: true, deletedAt: null });
  });

  it('también excluye asignaturas inactivas de la carga general inicial', async () => {
    const service = setup();
    await service.getCatalogoAsignaturas();
    expect(service.asignaturaRepo.query.mock.calls[0][0]).toContain('WHERE a.activa = TRUE AND a.deleted_at IS NULL');
    expect(service.asignaturaRepo.query.mock.calls[0][1]).toEqual([]);
  });

  it('conserva el catálogo completo para administración y referencias históricas', async () => {
    const service = setup();
    service.asignaturaRepo.query.mockResolvedValue([{ id: '2', programaId: '111', pensum: 'ANTIGUO', activa: false }]);
    expect((await service.getCatalogoAsignaturas({ completo: 'true' }))[0]).toMatchObject({ id: '2', activa: false, pensum: 'ANTIGUO' });
    expect(service.asignaturaRepo.query.mock.calls[0][0]).not.toContain('WHERE a.activa = TRUE');
  });
});
