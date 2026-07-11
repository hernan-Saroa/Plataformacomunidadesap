import { BancoDocentesService } from './banco-docentes.service';

describe('BancoDocentesService - filtros del listado', () => {
  it('combina territorial, dedicación, vinculación, estado, periodo y búsqueda', () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    const params: any[] = [];

    const where = service.buildAuthDocentesFilters({
      territorial: '17',
      dedicacion: 'TC',
      vinculacion: 'CARRERA_003',
      estado: 'activo',
      periodoCarga: '2025-2',
      search: 'María',
    }, params);

    expect(where).toContain('auth_territorial_id::text = $1');
    expect(where).toContain('dedicacion_codigo = $2');
    expect(where).toContain('estado_efectivo = $3');
    expect(where).toContain('vinculacion_codigo = $4');
    expect(where).toContain('periodo_carga = $5');
    expect(where).toContain('documento_identidad ILIKE $6');
    expect(where).toContain('correo_institucional ILIKE $6');
    expect(params).toEqual(['17', 'TC', 'ACTIVO', 'CARRERA_003', '2025-2', '%María%']);
  });

  it('ignora estados desconocidos para no convertirlos en filtros falsos', () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    const params: any[] = [];

    const where = service.buildAuthDocentesFilters({ estado: 'SUSPENDIDO' }, params);

    expect(where).toBe('');
    expect(params).toEqual([]);
  });
});
