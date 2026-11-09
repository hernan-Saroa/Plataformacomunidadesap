import { describe, it, expect, afterEach } from 'vitest';
import {
  Indicador, FILTROS_VACIOS, filtrarIndicadores, agruparPorEje, calcularAvanceConsolidado,
  calcularMetricas, getNivelSemaforo, configurarSemaforo, resetSemaforo, getFechaCorte,
  hayFiltrosActivos, SEMAFORO_DEFAULT, getSemaforoConfig,
} from './planAccionUtils';
import { construirFilasExport, construirResumenEjes, describirFiltros, COLUMNAS_EXPORT } from './planAccionExport';

const mk = (over: Partial<Indicador>): Indicador => ({
  id: '1', codigo: '1', nombre: 'Indicador', descripcion: '', ejeEstrategico: 'GESTION_INSTITUCIONAL',
  responsable: 'Ana', meta: 100, valorActual: 50, avance: 50,
  fechaInicio: new Date(2025, 0, 1), fechaFin: new Date(2025, 11, 31),
  estado: 'EN_TIEMPO', prioridad: 'MEDIA', periodicidad: 'MENSUAL', tipoIndicador: 'GESTION',
  unidadMedida: '%', ultimaActualizacion: new Date(), registros: [], ...over,
});

const data: Indicador[] = [
  mk({ id: '1', codigo: '1', nombre: 'Eficiencia procesal', ejeEstrategico: 'GESTION_INSTITUCIONAL', avance: 95, estado: 'EN_TIEMPO', responsable: 'Dr. Gerente' }),
  mk({ id: '2', codigo: '2', nombre: 'Gestión de riesgos', ejeEstrategico: 'GESTION_INSTITUCIONAL', avance: 40, estado: 'VENCIDO' }),
  mk({ id: '3', codigo: '3', nombre: 'Capacitación', ejeEstrategico: 'TALENTO_HUMANO', avance: 70, estado: 'EN_RIESGO' }),
  mk({ id: '4', codigo: '4', nombre: 'Rendición', ejeEstrategico: 'TRANSPARENCIA', avance: 100, estado: 'COMPLETADO' }),
  mk({ id: '5', codigo: '5', nombre: 'Digitalización', ejeEstrategico: 'TECNOLOGIA', avance: 10, estado: 'VENCIDO', responsable: 'Juan' }),
];

describe('semáforo', () => {
  afterEach(() => resetSemaforo());

  it('usa verde ≥90, amarillo 60-89, rojo <60 por defecto', () => {
    expect(SEMAFORO_DEFAULT).toEqual({ verde: 90, amarillo: 60 });
    expect(getNivelSemaforo(90)).toBe('verde');
    expect(getNivelSemaforo(89)).toBe('amarillo');
    expect(getNivelSemaforo(60)).toBe('amarillo');
    expect(getNivelSemaforo(59)).toBe('rojo');
    expect(getNivelSemaforo(0)).toBe('rojo');
  });

  it('es parametrizable', () => {
    configurarSemaforo({ verde: 80, amarillo: 50 });
    expect(getNivelSemaforo(80)).toBe('verde');
    expect(getNivelSemaforo(55)).toBe('amarillo');
    expect(getNivelSemaforo(49)).toBe('rojo');
  });

  it('rechaza configuraciones inválidas', () => {
    configurarSemaforo({ verde: 50, amarillo: 70 });
    expect(getSemaforoConfig()).toEqual(SEMAFORO_DEFAULT);
    configurarSemaforo({ verde: 150 });
    expect(getSemaforoConfig()).toEqual(SEMAFORO_DEFAULT);
  });
});

describe('filtrarIndicadores', () => {
  it('sin filtros devuelve todo', () => {
    expect(filtrarIndicadores(data, FILTROS_VACIOS)).toHaveLength(5);
  });

  it('filtra por un eje', () => {
    const r = filtrarIndicadores(data, { ...FILTROS_VACIOS, ejes: ['TALENTO_HUMANO'] });
    expect(r.map(i => i.id)).toEqual(['3']);
  });

  it('filtra por estado y mantiene el eje de cada indicador', () => {
    const r = filtrarIndicadores(data, { ...FILTROS_VACIOS, estados: ['VENCIDO'] });
    expect(r.map(i => i.id)).toEqual(['2', '5']);
    const g = agruparPorEje(r);
    expect(g.GESTION_INSTITUCIONAL.map(i => i.id)).toEqual(['2']);
    expect(g.TECNOLOGIA.map(i => i.id)).toEqual(['5']);
    expect(g.TALENTO_HUMANO).toEqual([]);
  });

  it('combina eje + estado', () => {
    const r = filtrarIndicadores(data, { ...FILTROS_VACIOS, ejes: ['GESTION_INSTITUCIONAL'], estados: ['VENCIDO'] });
    expect(r.map(i => i.id)).toEqual(['2']);
  });

  it('permite selección múltiple (OR dentro del mismo filtro)', () => {
    const r = filtrarIndicadores(data, { ...FILTROS_VACIOS, ejes: ['TALENTO_HUMANO', 'TECNOLOGIA'], estados: ['EN_RIESGO', 'VENCIDO'] });
    expect(r.map(i => i.id)).toEqual(['3', '5']);
  });

  it('eje + estado sin coincidencias devuelve vacío', () => {
    expect(filtrarIndicadores(data, { ...FILTROS_VACIOS, ejes: ['TRANSPARENCIA'], estados: ['VENCIDO'] })).toEqual([]);
  });

  it('busca por código, nombre y responsable sin distinguir mayúsculas', () => {
    expect(filtrarIndicadores(data, { ...FILTROS_VACIOS, busqueda: 'GERENTE' }).map(i => i.id)).toEqual(['1']);
    expect(filtrarIndicadores(data, { ...FILTROS_VACIOS, busqueda: 'digital' }).map(i => i.id)).toEqual(['5']);
    expect(filtrarIndicadores(data, { ...FILTROS_VACIOS, busqueda: '3' }).map(i => i.id)).toEqual(['3']);
  });

  it('oculta completados', () => {
    const r = filtrarIndicadores(data, { ...FILTROS_VACIOS, ocultarCompletados: true });
    expect(r.map(i => i.id)).not.toContain('4');
    expect(r).toHaveLength(4);
  });

  describe('periodo (fecha de corte)', () => {
    const conRegistros = [
      mk({ id: 'a', registros: [{ id: 1, valorReportado: 1, porcentajeAvance: 1, fechaRegistro: '2025-03-10T10:00:00' }] }),
      mk({ id: 'b', registros: [
        { id: 2, valorReportado: 1, porcentajeAvance: 1, fechaRegistro: '2025-01-10T10:00:00' },
        { id: 3, valorReportado: 2, porcentajeAvance: 2, fechaRegistro: '2025-06-20T10:00:00' },
      ] }),
      mk({ id: 'c', registros: [], fechaFin: new Date(2025, 11, 31) }),
    ];

    it('la fecha de corte es el último registro o, sin registros, la fecha fin', () => {
      expect(getFechaCorte(conRegistros[1]).toISOString().slice(0, 10)).toBe('2025-06-20');
      expect(getFechaCorte(conRegistros[2])).toEqual(new Date(2025, 11, 31));
    });

    it('filtra por rango desde/hasta (inclusivo)', () => {
      const f = { ...FILTROS_VACIOS, periodoDesde: '2025-03-10', periodoHasta: '2025-06-20' };
      expect(filtrarIndicadores(conRegistros, f).map(i => i.id)).toEqual(['a', 'b']);
    });

    it('acepta solo desde o solo hasta', () => {
      expect(filtrarIndicadores(conRegistros, { ...FILTROS_VACIOS, periodoDesde: '2025-07-01' }).map(i => i.id)).toEqual(['c']);
      expect(filtrarIndicadores(conRegistros, { ...FILTROS_VACIOS, periodoHasta: '2025-03-31' }).map(i => i.id)).toEqual(['a']);
    });

    it('se combina con eje y estado', () => {
      const mix = [
        mk({ id: 'x', ejeEstrategico: 'TECNOLOGIA', estado: 'VENCIDO', registros: [{ id: 1, valorReportado: 1, porcentajeAvance: 1, fechaRegistro: '2025-03-10T10:00:00' }] }),
        mk({ id: 'y', ejeEstrategico: 'TECNOLOGIA', estado: 'VENCIDO', registros: [{ id: 2, valorReportado: 1, porcentajeAvance: 1, fechaRegistro: '2025-09-10T10:00:00' }] }),
      ];
      const f = { ...FILTROS_VACIOS, ejes: ['TECNOLOGIA' as const], estados: ['VENCIDO' as const], periodoHasta: '2025-04-01' };
      expect(filtrarIndicadores(mix, f).map(i => i.id)).toEqual(['x']);
    });
  });
});

describe('consolidados y métricas', () => {
  it('el avance del eje es el promedio de sus indicadores', () => {
    const g = agruparPorEje(data);
    expect(calcularAvanceConsolidado(g.GESTION_INSTITUCIONAL)).toBe(68); // (95+40)/2 = 67.5
    expect(calcularAvanceConsolidado([])).toBe(0);
  });

  it('las métricas se recalculan sobre los indicadores filtrados', () => {
    const todas = calcularMetricas(data);
    expect(todas).toEqual({ total: 5, avancePromedio: 63, enTiempo: 2, enRiesgo: 1, vencidos: 2 });

    const filtrado = calcularMetricas(filtrarIndicadores(data, { ...FILTROS_VACIOS, estados: ['VENCIDO'] }));
    expect(filtrado).toEqual({ total: 2, avancePromedio: 25, enTiempo: 0, enRiesgo: 0, vencidos: 2 });
  });

  it('hayFiltrosActivos detecta cualquier filtro', () => {
    expect(hayFiltrosActivos(FILTROS_VACIOS)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, ejes: ['TECNOLOGIA'] })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, periodoDesde: '2025-01-01' })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, ocultarCompletados: true })).toBe(true);
  });
});

describe('exportación respeta filtros', () => {
  it('las filas contienen todas las columnas requeridas y solo los indicadores filtrados', () => {
    const filtrados = filtrarIndicadores(data, { ...FILTROS_VACIOS, ejes: ['GESTION_INSTITUCIONAL'] });
    const filas = construirFilasExport(filtrados);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveLength(COLUMNAS_EXPORT.length);
    expect(COLUMNAS_EXPORT).toEqual(expect.arrayContaining(['Indicador', 'Meta', 'Valor ejecutado', '% Avance', 'Responsable', 'Fecha de corte']));
    expect(filas[0].slice(0, 8)).toEqual(['Gestión Institucional', '1', 'Eficiencia procesal', 100, 50, 95, 'Verde', 'En Tiempo']);
    expect(filas[1][6]).toBe('Rojo');
  });

  it('el resumen solo incluye ejes con indicadores y su consolidado', () => {
    const filtrados = filtrarIndicadores(data, { ...FILTROS_VACIOS, estados: ['VENCIDO'] });
    expect(construirResumenEjes(filtrados)).toEqual([
      { eje: 'Gestión Institucional', indicadores: 1, avance: 40 },
      { eje: 'Tecnología', indicadores: 1, avance: 10 },
    ]);
  });

  it('describe los filtros aplicados', () => {
    expect(describirFiltros(FILTROS_VACIOS)).toMatch(/Sin filtros/);
    const txt = describirFiltros({ ...FILTROS_VACIOS, ejes: ['TECNOLOGIA'], estados: ['VENCIDO'], periodoDesde: '2025-01-01' });
    expect(txt).toContain('Tecnología');
    expect(txt).toContain('Vencido');
    expect(txt).toContain('2025-01-01');
  });
});
