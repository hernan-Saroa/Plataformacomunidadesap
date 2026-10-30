import { ProgramasService } from './programas.service';

function createQueryBuilderMock() {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getSql: jest.fn().mockReturnValue('SELECT ...'),
    getParameters: jest.fn().mockReturnValue({}),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
}

describe('ProgramasService - filtros coherentes', () => {
  it('normaliza Activo y busca también por código, nombre corto y facultad', async () => {
    const qb = createQueryBuilderMock();
    const programaRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) } as any;
    const service = new ProgramasService(programaRepo, {} as any);

    await service.listarProgramas({ estado: 'Activo', search: 'APT', page: 1, limit: 10 });

    expect(qb.andWhere).toHaveBeenCalledWith('p.activo = :activo', { activo: true });
    expect(qb.andWhere).toHaveBeenCalledWith('p.deleted_at IS NULL');
    const searchCall = qb.andWhere.mock.calls.find(([sql]) => String(sql).includes('p.codigo ILIKE'));
    expect(searchCall?.[0]).toContain('p.nombre_corto ILIKE');
    expect(searchCall?.[0]).toContain('academic_work_plan.facultad');
    expect(searchCall?.[1]).toEqual({ search: '%APT%' });
  });

  it('aplica el CETAP por id y lo limita al periodo seleccionado', async () => {
    const qb = createQueryBuilderMock();
    const programaRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as any;
    const service = new ProgramasService(programaRepo, {} as any);

    await service.listarProgramas({ sede: '42', periodoAcademico: '2025-2' });

    const sedeCall = qb.andWhere.mock.calls.find(([sql]) => String(sql).includes('ocp_sede'));
    expect(sedeCall?.[0]).toContain('c_sede.id::text = :sede');
    expect(sedeCall?.[0]).toContain('pa_sede.codigo = :periodoSede');
    expect(sedeCall?.[1]).toEqual({ sede: '42', periodoSede: '2025-2' });
  });

  it('una oferta retirada impide que el programa reaparezca por el período propietario', async () => {
    const qb = createQueryBuilderMock();
    const service = new ProgramasService({ createQueryBuilder: jest.fn().mockReturnValue(qb) } as any, {} as any);
    (service as any).programaPeriodoColumn = true;
    await service.listarProgramas({ periodoAcademico: '2026-1' });
    const scope = qb.andWhere.mock.calls.find(([sql]) => String(sql).includes('per_retirada'));
    expect(scope?.[0]).toContain('AND NOT EXISTS');
    expect(scope?.[0]).toContain('retirada.id_programa = p.id');
    expect(scope?.[1]).toEqual({ periodo: '2026-1' });
  });
});
