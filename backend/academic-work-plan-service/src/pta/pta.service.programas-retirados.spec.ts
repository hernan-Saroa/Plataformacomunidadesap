import { PtaService } from './pta.service';
import { AsignaturasImportService } from './asignaturas-import/asignaturas-import.service';
import { ImportCountDto } from './asignaturas-import/dto/import-result.dto';

describe('programas retirados y continuidad de PTAs históricos', () => {
  it('conserva la clasificación de Posgrado al consultar un PTA con un programa retirado', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const programa = { id: '111', tipo: 'maestria', activo: false, deletedAt: new Date() };
    service.programaRepo = { find: jest.fn(async options => options.withDeleted ? [programa] : []) };
    service.resolveTerritorialIdsNoCentrales = jest.fn().mockResolvedValue(new Set());
    const asignatura = { asignatura_id: 'a-1', programa_id: '111', total_horas: 96 };
    const clasificacion = await service.clasificarAsignaturasDocencia([asignatura]);
    expect(clasificacion.academica_posgrado).toEqual([asignatura]);
    expect(clasificacion.academica_pregrado).toEqual([]);
    expect(service.programaRepo.find).toHaveBeenCalledWith(expect.objectContaining({ withDeleted: true }));
    expect(asignatura.total_horas).toBe(96);
  });

  it('el catálogo para nuevas selecciones requiere programas activos', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.programaRepo = { find: jest.fn().mockResolvedValue([]) };
    expect(await service.getCatalogoProgramas()).toEqual([]);
    expect(service.programaRepo.find).toHaveBeenCalledWith({ where: { activo: true }, order: { nombre: 'ASC' } });
  });

  it('la importación vuelve a habilitar el mismo programa sin duplicar sus identificadores', async () => {
    const service = Object.create(AsignaturasImportService.prototype) as any;
    const query = jest.fn(async (sql: string) => sql.includes('SELECT id, codigo')
      ? [{ id: '1', codigo: 'PREGRADO' }] : [{ id: '111' }]);
    const count = new ImportCountDto();
    const resultado = await service.loadProgramas({ query }, [{ codigo_programa: 'PRO-001',
      nombre_programa: 'Programa de prueba', nombre_corto: 'Prueba', codigo_facultad: 'PREGRADO',
      tipo_programa: 'pregrado', modalidad_principal: 'presencial', horas_base_por_credito: 16,
      horas_pregrado_central: 64, activo: true }], count, '1');
    expect(resultado.get('pro-001')).toBe('111');
    const sql = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO academic_work_plan.programa'))?.[0];
    expect(sql).toContain('ON CONFLICT (codigo) DO UPDATE');
    expect(sql).toContain('deleted_at = NULL');
  });

  it('una matriz reimportada reactiva su oferta preservando los cupos registrados', async () => {
    const service = Object.create(AsignaturasImportService.prototype) as any;
    const query = jest.fn().mockResolvedValue([]);
    await service.loadOfertasCetapPrograma({ query }, [{ codigo_cetap: 'CET-1', programas_ofertados: ['PRO-001'] }],
      new Map([['pro-001', '111']]), new Map([['cet-1', '222']]), '1', new ImportCountDto());
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO academic_work_plan.oferta_cetap_programa'));
    expect(insert[0]).toContain('ON CONFLICT (id_cetap, id_programa, id_periodo_academico) DO UPDATE SET activa = TRUE');
    expect(insert[1]).toEqual(['222', '111', '1']);
    expect(insert[0]).not.toContain('SET cupos_estimados');
  });
});
