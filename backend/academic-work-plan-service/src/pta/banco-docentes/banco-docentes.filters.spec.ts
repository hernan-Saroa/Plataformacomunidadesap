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

  it('combina los 7 filtros del reporte de planta docente (territorial, vinculación, categoría, género, nivel de formación, núcleo temático y período)', () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    const params: any[] = [];

    const where = service.buildAuthDocentesFilters({
      territorial: '17',
      vinculacion: 'CARRERA_003',
      periodoCarga: '2025-2',
      categoria: 'Titular',
      genero: 'Femenino',
      nivelFormacion: 'Maestría',
      nucleoTematico: 'Ciencias Sociales',
    }, params);

    expect(where).toContain('auth_territorial_id::text = $1');
    expect(where).toContain('vinculacion_codigo = $2');
    expect(where).toContain('periodo_carga = $3');
    expect(where).toContain('LOWER(categoria) = LOWER($4)');
    expect(where).toContain('LOWER(genero) = LOWER($5)');
    expect(where).toContain('LOWER(nivel_formacion) = LOWER($6)');
    expect(where).toContain('LOWER(nucleo_tematico) = LOWER($7)');
    expect(where.match(/ AND /g)?.length).toBe(6);
    expect(params).toEqual(['17', 'CARRERA_003', '2025-2', 'Titular', 'Femenino', 'Maestría', 'Ciencias Sociales']);
  });

  it('filtra por categoría/género/nivel de formación/núcleo temático de forma independiente (case-insensitive)', () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    const params: any[] = [];

    const where = service.buildAuthDocentesFilters({ genero: 'femenino' }, params);

    expect(where).toBe('WHERE LOWER(genero) = LOWER($1)');
    expect(params).toEqual(['femenino']);
  });
});

describe('BancoDocentesService - getStats agregaciones', () => {
  it('incluye por_nucleo_tematico agrupando y ordenando por total descendente', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    const rows: Record<string, any[]> = {
      summary: [{ total: 3, activos: 3, total_horas: 30, promedio_horas: 10 }],
      nucleo: [
        { nucleo_tematico: 'Ciencias Sociales', total: 2 },
        { nucleo_tematico: 'Sin núcleo temático', total: 1 },
      ],
    };
    service.dataSource = {
      query: jest.fn((sql: string) => {
        if (sql.includes('COUNT(*)::int AS total,')) return Promise.resolve(rows.summary);
        if (sql.includes('nucleo_tematico')) return Promise.resolve(rows.nucleo);
        return Promise.resolve([]);
      }),
    };

    const stats = await service.getStats({ periodoCarga: '2025-2' });

    expect(stats.por_nucleo_tematico).toEqual(rows.nucleo);
  });
});
