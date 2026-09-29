import { DataSource } from 'typeorm';

import { EstadoContrato } from '../../entities/contrato.entity';
import {
  DIAS_POR_VENCER,
  ESTADOS_DE_GESTION,
  ESTADOS_SUSCRITOS,
  EstadisticasGestion,
  EstadisticasService,
  FilaContrato,
  diasEntre,
  estadoDeGestion,
  finDelPlazo,
  nombreDelMes,
  resumenDeDias,
  situacionesDe,
} from './estadisticas.service';
import { nombreDelArchivo, reporteCsv } from './reporte-csv';

/**
 * Criterio de aceptación de EFDS-1189: «dado el conjunto de contratos, cuando
 * el usuario genera un reporte, entonces el sistema produce estadísticas por
 * estado —suscritos, en ejecución, terminados, liquidados, cerrados— y demás
 * indicadores de gestión».
 */
describe('estadoDeGestion', () => {
  it('un contrato firmado por las dos partes está suscrito', () => {
    expect(estadoDeGestion('PERFECCIONADO')).toBe('SUSCRITO');
  });

  it('legalizarlo no lo saca de suscrito: sigue sin arrancar', () => {
    // Legalizado es suscrito con garantías aprobadas; el contrato empieza a
    // correr con el acta de inicio, no con la póliza.
    expect(estadoDeGestion('LEGALIZADO')).toBe('SUSCRITO');
  });

  it('un contrato suspendido cuenta como en ejecución', () => {
    // La suspensión es una pausa sobre ese punto del ciclo, no un escalón
    // anterior: el contrato está en ejecución, detenido.
    expect(estadoDeGestion('SUSPENDIDO')).toBe('EJECUCION');
  });

  it('los tres desenlaces se informan por separado', () => {
    expect(estadoDeGestion('TERMINADO')).toBe('TERMINADO');
    expect(estadoDeGestion('LIQUIDADO')).toBe('LIQUIDADO');
    expect(estadoDeGestion('CERRADO')).toBe('CERRADO');
  });

  it('una minuta generada o aceptada todavía no es un contrato', () => {
    // Falta la firma de las dos partes: contarlas inflaría el número de
    // contratos de la entidad con papeles que no obligan a nadie.
    expect(estadoDeGestion('GENERADO')).toBeNull();
    expect(estadoDeGestion('ACEPTADO')).toBeNull();
  });

  it('una minuta rechazada no cuenta en ningún estado', () => {
    expect(estadoDeGestion('RECHAZADO')).toBeNull();
  });

  it('los cinco estados del informe son los que declara el criterio', () => {
    expect(ESTADOS_DE_GESTION).toEqual([
      'SUSCRITO',
      'EJECUCION',
      'TERMINADO',
      'LIQUIDADO',
      'CERRADO',
    ]);
  });

  it('cada estado del ciclo cae en un estado del informe o en ninguno', () => {
    // Que no quede uno sin decidir: si mañana aparece un estado nuevo del
    // contrato, esta prueba no lo detecta —el `default` lo manda a null—, pero
    // sí fija que los diez de hoy están clasificados a propósito.
    const todos: EstadoContrato[] = [
      'GENERADO',
      'ACEPTADO',
      'RECHAZADO',
      'PERFECCIONADO',
      'LEGALIZADO',
      'EJECUCION',
      'SUSPENDIDO',
      'TERMINADO',
      'LIQUIDADO',
      'CERRADO',
    ];

    const clasificados = todos.filter((e) => estadoDeGestion(e) !== null);
    expect(clasificados).toHaveLength(7);
  });
});

/**
 * El agrupamiento con una base de datos falsa.
 *
 * Se simula `DataSource.query` y no se levanta Postgres porque lo que hay que
 * probar es la regla de negocio —cómo se agrupan y se suman las filas—, no que
 * `GROUP BY` funcione.
 */
describe('EstadisticasService · gestion', () => {
  const HOY = '2026-09-25';

  /** Las filas que devolvería cada consulta, reconocida por su comentario. */
  function servicioCon(opciones: {
    contratos?: Partial<FilaContrato>[];
    procesos?: any[];
    modificaciones?: any[];
    cuentas?: any[];
  }): EstadisticasService {
    const query = jest.fn((sql: string) => {
      if (sql.includes('-- corte: contratos')) {
        return Promise.resolve((opciones.contratos ?? []).map((c) => ({ ...base, ...c })));
      }
      if (sql.includes('-- corte: procesos')) return Promise.resolve(opciones.procesos ?? []);
      if (sql.includes('-- corte: modificaciones')) {
        return Promise.resolve(opciones.modificaciones ?? []);
      }
      if (sql.includes('-- corte: cuentas de cobro')) return Promise.resolve(opciones.cuentas ?? []);
      if (sql.includes('hiring.modalidades')) {
        return Promise.resolve([
          { codigo: 'MC', nombre: 'Mínima cuantía' },
          { codigo: 'SA', nombre: 'Selección abreviada' },
        ]);
      }
      if (sql.includes('hiring.tipologias_contrato')) {
        return Promise.resolve([{ codigo: 'PS', nombre: 'Prestación de servicios' }]);
      }
      return Promise.resolve([{ anio: 2026 }, { anio: 2025 }]);
    });

    const servicio = new EstadisticasService({ query } as unknown as DataSource);
    // El día fijo: las situaciones dependen de la fecha y la prueba no puede
    // cambiar de resultado según cuándo se corra.
    (servicio as any).hoy = () => HOY;
    return servicio;
  }

  /** Un contrato cualquiera; cada prueba cambia solo lo que le importa. */
  const base: FilaContrato = {
    proceso_id: 'p-1',
    radicado: 'CTO-2026-1',
    numero: '1',
    objeto: 'Objeto',
    estado: 'EJECUCION',
    modalidad: 'MC',
    tipologia: 'PS',
    contratista_documento: '900',
    contratista_nombre: 'Contratista SAS',
    contratista_tipo: 'JURIDICA',
    valor: 0,
    plazo_dias: null,
    radicado_el: null,
    suscrito_el: '2026-03-10',
    inicio_el: null,
    actualizado_el: '2026-03-10',
    pagado: 0,
    adicionado: 0,
    dias_prorroga: 0,
    modificaciones: 0,
    terminacion_el: null,
    supervisor: 'Supervisora',
    incumplimientos_abiertos: 0,
  };

  /**
   * `cuantos` contratos en ese estado que suman `valor`.
   *
   * La consulta trae un contrato por fila; el ayudante reparte el valor para
   * que las pruebas sigan hablando de «tres contratos por 15.000».
   */
  const fila = (
    estado: EstadoContrato,
    cuantos: number,
    valor: string,
    extra: Partial<FilaContrato> = {},
  ): Partial<FilaContrato>[] =>
    Array.from({ length: cuantos }, (_, i) => ({
      estado,
      valor: Number(valor) / cuantos,
      contratista_documento: `${estado}-${i}`,
      ...extra,
    }));

  const SIN_FILTROS = { vigencia: null, modalidad: null, tipologia: null };

  it('agrupa los diez estados del ciclo en los cinco del informe', async () => {
    const servicio = servicioCon({
      contratos: [
        ...fila('PERFECCIONADO', 2, '10000'),
        ...fila('LEGALIZADO', 3, '15000'),
        ...fila('EJECUCION', 4, '40000'),
        ...fila('SUSPENDIDO', 1, '5000'),
        ...fila('LIQUIDADO', 2, '20000'),
      ],
    });

    const { contratos } = await servicio.gestion(SIN_FILTROS);
    const porClave = new Map(contratos.porEstado.map((c) => [c.clave, c]));

    expect(porClave.get('SUSCRITO')).toMatchObject({ cuantos: 5, valor: 25000 });
    expect(porClave.get('EJECUCION')).toMatchObject({ cuantos: 5, valor: 45000 });
    expect(porClave.get('LIQUIDADO')).toMatchObject({ cuantos: 2, valor: 20000 });
  });

  it('los estados se informan en el orden del ciclo, no por valor', async () => {
    const servicio = servicioCon({
      contratos: [
        ...fila('CERRADO', 1, '900000'),
        ...fila('PERFECCIONADO', 1, '100'),
        ...fila('EJECUCION', 1, '5000'),
      ],
    });

    const { contratos } = await servicio.gestion(SIN_FILTROS);
    expect(contratos.porEstado.map((c) => c.clave)).toEqual([
      'SUSCRITO',
      'EJECUCION',
      'CERRADO',
    ]);
  });

  it('las minutas no suscritas no entran en ningún total', async () => {
    const servicio = servicioCon({
      contratos: [
        ...fila('EJECUCION', 2, '20000'),
        ...fila('GENERADO', 5, '999999'),
        ...fila('RECHAZADO', 3, '888888'),
      ],
    });

    const { contratos } = await servicio.gestion(SIN_FILTROS);
    expect(contratos.total).toBe(2);
    expect(contratos.valorTotal).toBe(20000);
    expect(contratos.porEstado.map((c) => c.clave)).toEqual(['EJECUCION']);
  });

  it('los cortes por modalidad suman el mismo total que los de estado', async () => {
    const servicio = servicioCon({
      contratos: [
        ...fila('EJECUCION', 2, '20000'),
        ...fila('LIQUIDADO', 1, '30000', { modalidad: 'SA' }),
      ],
    });

    const { contratos } = await servicio.gestion(SIN_FILTROS);
    const porModalidad = contratos.porModalidad.reduce((s, c) => s + c.valor, 0);

    expect(porModalidad).toBe(contratos.valorTotal);
    expect(contratos.porModalidad.map((c) => c.etiqueta)).toEqual([
      'Selección abreviada',
      'Mínima cuantía',
    ]);
  });

  it('los contratos sin modalidad no inventan una categoría', async () => {
    // Los procesos anteriores a que la modalidad fuera obligatoria no tienen
    // ninguna; un «(sin modalidad)» diría algo que el expediente no dice.
    const servicio = servicioCon({
      contratos: fila('EJECUCION', 1, '1000', { modalidad: null }),
    });

    const { contratos } = await servicio.gestion(SIN_FILTROS);
    expect(contratos.porModalidad).toEqual([]);
    expect(contratos.total).toBe(1);
  });

  it('calcula la ejecución presupuestal sobre lo tramitado', async () => {
    const servicio = servicioCon({
      contratos: fila('EJECUCION', 1, '100000', { pagado: 25000 }),
    });

    const { presupuesto } = await servicio.gestion(SIN_FILTROS);
    expect(presupuesto).toMatchObject({
      contratado: 100000,
      pagado: 25000,
      porPagar: 75000,
      porcentajeEjecutado: 25,
    });
  });

  it('sin contratos no divide por cero', async () => {
    const servicio = servicioCon({ contratos: [] });

    const { presupuesto, contratos } = await servicio.gestion(SIN_FILTROS);
    expect(contratos.total).toBe(0);
    expect(presupuesto.porcentajeEjecutado).toBe(0);
  });

  it('si se pagó de más lo informa, no lo tapa', async () => {
    const servicio = servicioCon({
      contratos: fila('EJECUCION', 1, '1000', { pagado: 1500 }),
    });

    const { presupuesto } = await servicio.gestion(SIN_FILTROS);
    expect(presupuesto.porPagar).toBe(-500);
    expect(presupuesto.porcentajeEjecutado).toBe(150);
  });

  it('cuenta los procesos de selección por desenlace', async () => {
    const servicio = servicioCon({
      procesos: [
        { estado: 'ADJUDICADO', etapa: 7, modalidad: 'MC', cuantos: 4, valor: '400' },
        { estado: 'DESIERTO', etapa: 6, modalidad: 'MC', cuantos: 1, valor: '100' },
      ],
    });

    const { procesos } = await servicio.gestion(SIN_FILTROS);
    expect(procesos.total).toBe(5);
    expect(procesos.porDesenlace[0]).toMatchObject({
      clave: 'ADJUDICADO',
      etiqueta: 'Adjudicados',
      cuantos: 4,
    });
  });

  it('devuelve los filtros con los que se calculó', async () => {
    // El reporte se cita en un informe: sin saber sobre qué se sacó, la cifra
    // no significa nada.
    const servicio = servicioCon({ contratos: fila('EJECUCION', 1, '1000') });

    const filtros = { vigencia: 2026, modalidad: 'MC', tipologia: 'PS' };
    const estadisticas = await servicio.gestion(filtros);
    expect(estadisticas.filtros).toEqual(filtros);
    expect(estadisticas.generadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('EstadisticasService · indicadores ampliados', () => {
  const HOY = '2026-09-25';
  const base: FilaContrato = {
    proceso_id: 'p-1',
    radicado: 'CTO-2026-1',
    numero: '1',
    objeto: 'Objeto',
    estado: 'EJECUCION',
    modalidad: 'MC',
    tipologia: 'PS',
    contratista_documento: '900',
    contratista_nombre: 'Contratista SAS',
    contratista_tipo: 'JURIDICA',
    valor: 1000,
    plazo_dias: null,
    radicado_el: null,
    suscrito_el: '2026-03-10',
    inicio_el: null,
    actualizado_el: '2026-03-10',
    pagado: 0,
    adicionado: 0,
    dias_prorroga: 0,
    modificaciones: 0,
    terminacion_el: null,
    supervisor: 'Supervisora',
    incumplimientos_abiertos: 0,
  };

  function servicioCon(contratos: Partial<FilaContrato>[], extra: Record<string, any[]> = {}) {
    const query = jest.fn((sql: string) => {
      if (sql.includes('-- corte: contratos')) {
        return Promise.resolve(contratos.map((c) => ({ ...base, ...c })));
      }
      for (const [marca, filas] of Object.entries(extra)) {
        if (sql.includes(`-- corte: ${marca}`)) return Promise.resolve(filas);
      }
      return Promise.resolve([]);
    });
    const servicio = new EstadisticasService({ query } as unknown as DataSource);
    (servicio as any).hoy = () => HOY;
    return servicio;
  }

  const SIN_FILTROS = { vigencia: null, modalidad: null, tipologia: null };

  it('separa el valor inicial de lo adicionado', async () => {
    const { contratos, modificaciones } = await servicioCon([
      { valor: 1200, adicionado: 200, modificaciones: 1 },
      { valor: 1000, contratista_documento: '901' },
    ]).gestion(SIN_FILTROS);

    expect(contratos.valorTotal).toBe(2200);
    expect(contratos.valorInicial).toBe(2000);
    expect(modificaciones.valorAdicionado).toBe(200);
    expect(modificaciones.porcentajeAdicionado).toBe(10);
    expect(modificaciones.contratosModificados).toBe(1);
  });

  it('suma las modificaciones por tipo en el orden del catálogo', async () => {
    const { modificaciones } = await servicioCon([], {
      modificaciones: [
        { tipo: 'PRORROGA', cuantos: 2, valor: '0' },
        { tipo: 'ADICION', cuantos: 1, valor: '500' },
      ],
    }).gestion(SIN_FILTROS);

    expect(modificaciones.total).toBe(3);
    expect(modificaciones.porTipo.map((m) => m.clave)).toEqual(['ADICION', 'PRORROGA']);
    expect(modificaciones.porTipo[1].etiqueta).toBe('Prórrogas');
  });

  it('cuenta como en trámite solo las cuentas radicadas y avaladas', async () => {
    const { presupuesto } = await servicioCon([], {
      'cuentas de cobro': [
        { estado: 'TRAMITADO', cuantos: 3, valor: '3000' },
        { estado: 'AVALADO', cuantos: 1, valor: '400' },
        { estado: 'RADICADO', cuantos: 1, valor: '100' },
        { estado: 'DEVUELTO', cuantos: 1, valor: '50' },
      ],
    }).gestion(SIN_FILTROS);

    expect(presupuesto.enTramite).toBe(500);
    expect(presupuesto.cuentasPorEstado.map((c) => c.clave)).toEqual([
      'RADICADO',
      'DEVUELTO',
      'AVALADO',
      'TRAMITADO',
    ]);
  });

  it('agrupa por contratista y ofrece los diez principales', async () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ({
      contratista_documento: `doc-${i}`,
      contratista_nombre: `Contratista ${i}`,
      valor: (i + 1) * 100,
    }));
    const { contratos } = await servicioCon([
      ...muchos,
      { contratista_documento: 'doc-0', contratista_nombre: 'Contratista 0', valor: 5000 },
    ]).gestion(SIN_FILTROS);

    expect(contratos.contratistasDistintos).toBe(12);
    expect(contratos.principalesContratistas).toHaveLength(10);
    expect(contratos.principalesContratistas[0]).toMatchObject({
      etiqueta: 'Contratista 0',
      cuantos: 2,
      valor: 5100,
    });
  });

  it('la serie mensual va en orden cronológico', async () => {
    const { contratos } = await servicioCon([
      { suscrito_el: '2026-05-02', valor: 9000 },
      { suscrito_el: '2026-01-20' },
      { suscrito_el: '2026-05-30' },
    ]).gestion(SIN_FILTROS);

    expect(contratos.porMes.map((m) => [m.clave, m.etiqueta, m.cuantos])).toEqual([
      ['2026-01', 'ene 2026', 1],
      ['2026-05', 'may 2026', 2],
    ]);
  });

  it('el embudo de procesos en curso va por etapa', async () => {
    const { procesos } = await servicioCon([], {
      procesos: [
        { estado: 'EN_CURSO', etapa: 5, modalidad: 'MC', cuantos: 1, valor: '10' },
        { estado: 'EN_CURSO', etapa: 3, modalidad: 'MC', cuantos: 4, valor: '40' },
        { estado: 'EN_CURSO', etapa: 3, modalidad: 'SA', cuantos: 2, valor: '20' },
        { estado: 'ADJUDICADO', etapa: 8, modalidad: 'SA', cuantos: 3, valor: '30' },
      ],
    }).gestion(SIN_FILTROS);

    expect(procesos.total).toBe(10);
    expect(procesos.valorEstimado).toBe(100);
    expect(procesos.enCursoPorEtapa.map((e) => [e.clave, e.cuantos])).toEqual([
      ['3', 6],
      ['5', 1],
    ]);
    expect(procesos.enCursoPorEtapa[0].etiqueta).toBe('3. Estudios previos');
  });

  it('cuenta los contratos por situación y marca cada uno en el listado', async () => {
    const { seguimiento, contratosDelReporte } = await servicioCon([
      // Vence el 2026-10-04: faltan nueve días.
      { numero: 'A', inicio_el: '2026-04-08', plazo_dias: 180 },
      { numero: 'B', estado: 'SUSPENDIDO', supervisor: null },
      { numero: 'C', estado: 'TERMINADO', terminacion_el: '2026-01-15' },
    ]).gestion(SIN_FILTROS);

    const cuantos = new Map(seguimiento.porSituacion.map((s) => [s.clave, s.cuantos]));
    expect(cuantos.get('POR_VENCER')).toBe(1);
    expect(cuantos.get('SUSPENDIDO')).toBe(1);
    expect(cuantos.get('SIN_SUPERVISOR')).toBe(1);
    expect(cuantos.get('POR_LIQUIDAR')).toBe(1);
    expect(cuantos.get('LIQUIDACION_VENCIDA')).toBe(1);
    expect(cuantos.get('PLAZO_VENCIDO')).toBe(0);

    const a = contratosDelReporte.find((c) => c.numero === 'A');
    expect(a).toMatchObject({ finDelPlazo: '2026-10-04', diasParaVencer: 9 });
  });

  it('del incumplimiento solo informa cuántos casos siguen abiertos', async () => {
    const { seguimiento, contratosDelReporte } = await servicioCon([
      { incumplimientos_abiertos: 2 },
      { incumplimientos_abiertos: 0, contratista_documento: '901' },
    ]).gestion(SIN_FILTROS);

    expect(seguimiento.incumplimientosAbiertos).toBe(2);
    expect(seguimiento.contratosConIncumplimiento).toBe(1);
    // El detalle está bajo reserva legal (EFDS-1182): el listado no lo lleva.
    expect(JSON.stringify(contratosDelReporte)).not.toContain('incumplimiento');
  });

  it('mide los tiempos del ciclo sin los tramos mal cargados', async () => {
    const { tiempos } = await servicioCon([
      { radicado_el: '2026-01-01', suscrito_el: '2026-01-31', inicio_el: '2026-02-05' },
      { radicado_el: '2026-01-01', suscrito_el: '2026-03-02', inicio_el: '2026-01-01' },
    ]).gestion(SIN_FILTROS);

    expect(tiempos.radicacionASuscripcion).toEqual({ promedio: 45, mediana: 45, muestras: 2 });
    // El segundo arrancó antes de firmarse: dato mal cargado, fuera del promedio.
    expect(tiempos.suscripcionAInicio).toEqual({ promedio: 5, mediana: 5, muestras: 1 });
  });

  it('pasa la tipología a las consultas de contratos', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const servicio = new EstadisticasService({ query } as unknown as DataSource);
    await servicio.gestion({ vigencia: 2026, modalidad: 'MC', tipologia: 'PS' });

    const delCorte = query.mock.calls.find(([sql]) => sql.includes('-- corte: contratos'));
    expect(delCorte?.[1]).toEqual([ESTADOS_SUSCRITOS, 2026, 'MC', 'PS']);
  });
});

describe('reglas de fechas del reporte', () => {
  it('el día del acta de inicio es el primero del plazo', () => {
    expect(finDelPlazo('2026-03-01', 30)).toBe('2026-03-30');
    expect(finDelPlazo('2026-12-15', 20)).toBe('2027-01-03');
  });

  it('sin acta de inicio o sin plazo no hay fin que calcular', () => {
    expect(finDelPlazo(null, 30)).toBeNull();
    expect(finDelPlazo('2026-03-01', null)).toBeNull();
    expect(finDelPlazo('2026-03-01', 0)).toBeNull();
  });

  it('un tramo al revés es un dato mal cargado, no un tramo negativo', () => {
    expect(diasEntre('2026-01-10', '2026-01-01')).toBeNull();
    expect(diasEntre('2026-01-01', '2026-01-10')).toBe(9);
    expect(diasEntre(null, '2026-01-10')).toBeNull();
  });

  it('la mediana resiste al proceso que se quedó quieto un año', () => {
    expect(resumenDeDias([10, 12, 400])).toEqual({ promedio: 140.7, mediana: 12, muestras: 3 });
    expect(resumenDeDias([10, 20])).toMatchObject({ mediana: 15 });
    expect(resumenDeDias([null])).toEqual({ promedio: null, mediana: null, muestras: 0 });
  });

  it('nombra el mes en español y corto', () => {
    expect(nombreDelMes('2026-03')).toBe('mar 2026');
    expect(nombreDelMes('2025-12')).toBe('dic 2025');
  });
});

describe('situacionesDe', () => {
  const HOY = '2026-09-25';
  const contrato = (extra: Partial<FilaContrato>): FilaContrato => ({
    proceso_id: 'p',
    radicado: 'r',
    numero: 'n',
    objeto: 'o',
    estado: 'EJECUCION',
    modalidad: null,
    tipologia: null,
    contratista_documento: 'd',
    contratista_nombre: 'c',
    contratista_tipo: 'NATURAL',
    valor: 1,
    plazo_dias: null,
    radicado_el: null,
    suscrito_el: null,
    inicio_el: null,
    actualizado_el: '2026-09-01',
    pagado: 0,
    adicionado: 0,
    dias_prorroga: 0,
    modificaciones: 0,
    terminacion_el: null,
    supervisor: 'S',
    incumplimientos_abiertos: 0,
    ...extra,
  });

  it('un plazo que ya pasó sin terminar el contrato está vencido', () => {
    expect(situacionesDe(contrato({ inicio_el: '2026-01-01', plazo_dias: 30 }), HOY)).toEqual([
      'PLAZO_VENCIDO',
    ]);
  });

  it(`por vencer es dentro de los próximos ${DIAS_POR_VENCER} días, hoy incluido`, () => {
    // Vence hoy.
    expect(situacionesDe(contrato({ inicio_el: '2026-09-25', plazo_dias: 1 }), HOY)).toEqual([
      'POR_VENCER',
    ]);
    // Vence en 31 días: todavía no.
    expect(situacionesDe(contrato({ inicio_el: '2026-09-25', plazo_dias: 32 }), HOY)).toEqual([]);
  });

  it('un suspendido no vence: su plazo está detenido', () => {
    expect(
      situacionesDe(
        contrato({ estado: 'SUSPENDIDO', inicio_el: '2026-01-01', plazo_dias: 30 }),
        HOY,
      ),
    ).toEqual(['SUSPENDIDO']);
  });

  it('en ejecución sin supervisor vigente se señala', () => {
    expect(situacionesDe(contrato({ supervisor: null }), HOY)).toEqual(['SIN_SUPERVISOR']);
  });

  it('antes de arrancar no se exige supervisor', () => {
    expect(situacionesDe(contrato({ estado: 'LEGALIZADO', supervisor: null }), HOY)).toEqual([]);
  });

  it('un terminado dentro de los cuatro meses solo está pendiente de liquidar', () => {
    expect(
      situacionesDe(contrato({ estado: 'TERMINADO', terminacion_el: '2026-08-01' }), HOY),
    ).toEqual(['POR_LIQUIDAR']);
  });

  it('sin terminación anticipada, termina cuando se acaba el plazo', () => {
    // Plazo hasta 2026-05-20: cuatro meses después, 2026-09-20, ya pasó.
    expect(
      situacionesDe(
        contrato({ estado: 'TERMINADO', inicio_el: '2026-05-01', plazo_dias: 20 }),
        HOY,
      ),
    ).toEqual(['POR_LIQUIDAR', 'LIQUIDACION_VENCIDA']);
  });

  it('los liquidados y cerrados ya no piden nada', () => {
    expect(situacionesDe(contrato({ estado: 'LIQUIDADO', supervisor: null }), HOY)).toEqual([]);
    expect(situacionesDe(contrato({ estado: 'CERRADO' }), HOY)).toEqual([]);
  });
});

/**
 * El archivo descargable trae lo mismo que la consulta: dos cifras distintas
 * para un mismo indicador es peor que no tener archivo.
 */
describe('reporteCsv', () => {
  const estadisticas: EstadisticasGestion = {
    generadoEn: '2026-09-02T15:30:00.000Z',
    filtros: { vigencia: 2026, modalidad: null, tipologia: null },
    contratos: {
      total: 3,
      valorTotal: 60000,
      valorInicial: 50000,
      valorPromedio: 20000,
      porEstado: [
        { clave: 'SUSCRITO', etiqueta: 'Suscritos', cuantos: 1, valor: 10000 },
        { clave: 'EJECUCION', etiqueta: 'En ejecución', cuantos: 2, valor: 50000 },
      ],
      porModalidad: [
        { clave: 'MC', etiqueta: 'Mínima cuantía; menor valor', cuantos: 3, valor: 60000 },
      ],
      porTipologia: [],
      porTipoPersona: [
        { clave: 'NATURAL', etiqueta: 'Persona natural', cuantos: 3, valor: 60000 },
      ],
      porMes: [{ clave: '2026-03', etiqueta: 'mar 2026', cuantos: 3, valor: 60000 }],
      contratistasDistintos: 2,
      principalesContratistas: [
        { clave: '900', etiqueta: 'Contratista SAS', cuantos: 2, valor: 50000 },
      ],
    },
    procesos: {
      total: 1,
      valorEstimado: 70000,
      porDesenlace: [
        { clave: 'ADJUDICADO', etiqueta: 'Adjudicados', cuantos: 1, valor: 60000 },
      ],
      porModalidad: [],
      enCursoPorEtapa: [],
    },
    presupuesto: {
      contratado: 60000,
      pagado: 15000,
      porPagar: 45000,
      porcentajeEjecutado: 25,
      enTramite: 5000,
      cuentasPorEstado: [
        { clave: 'AVALADO', etiqueta: 'Avaladas, por pagar', cuantos: 1, valor: 5000 },
      ],
    },
    modificaciones: {
      total: 1,
      contratosModificados: 1,
      porTipo: [{ clave: 'ADICION', etiqueta: 'Adiciones', cuantos: 1, valor: 10000 }],
      valorAdicionado: 10000,
      porcentajeAdicionado: 20,
      diasProrrogados: 0,
    },
    seguimiento: {
      porSituacion: [
        { clave: 'POR_VENCER', etiqueta: 'Plazo por vencer', cuantos: 1, valor: 30000 },
      ],
      incumplimientosAbiertos: 0,
      contratosConIncumplimiento: 0,
      diasDeAnticipacion: 30,
    },
    tiempos: {
      radicacionASuscripcion: { promedio: 42.5, mediana: 40, muestras: 3 },
      suscripcionAInicio: { promedio: null, mediana: null, muestras: 0 },
    },
    contratosDelReporte: [
      {
        procesoId: 'p-1',
        radicado: 'CTO-2026-1',
        numero: '7',
        objeto: 'Apoyo; con punto y coma',
        contratista: 'Contratista SAS',
        tipoPersona: 'Persona jurídica',
        modalidad: 'Mínima cuantía',
        tipologia: null,
        estado: 'EJECUCION',
        estadoCiclo: 'EJECUCION',
        valor: 30000,
        valorInicial: 20000,
        pagado: 15000,
        porcentajePagado: 50,
        suscritoEl: '2026-03-10',
        inicioEl: '2026-03-15',
        plazoDias: 200,
        finDelPlazo: '2026-09-30',
        diasParaVencer: 5,
        modificaciones: 1,
        supervisor: null,
        situaciones: ['POR_VENCER'],
      },
    ],
    vigenciasDisponibles: [2026],
  };

  it('trae las mismas cifras que la consulta', () => {
    const csv = reporteCsv(estadisticas);

    expect(csv).toContain('Suscritos;1;10000');
    expect(csv).toContain('En ejecución;2;50000');
    expect(csv).toContain('Contratado;60000');
    expect(csv).toContain('Pagado;15000');
    expect(csv).toContain('Valor total;60000');
  });

  it('encierra entre comillas lo que lleva el separador', () => {
    // Un nombre con punto y coma partiría la fila en dos columnas.
    const csv = reporteCsv(estadisticas);
    expect(csv).toContain('"Mínima cuantía; menor valor";3;60000');
  });

  it('empieza con BOM para que Excel no rompa las tildes', () => {
    expect(reporteCsv(estadisticas).charCodeAt(0)).toBe(0xfeff);
  });

  it('dice sobre qué se sacó', () => {
    const csv = reporteCsv(estadisticas);
    expect(csv).toContain('Vigencia;2026');
    expect(csv).toContain('Modalidad;Todas');
  });

  it('un corte vacío no deja la sección coja', () => {
    expect(reporteCsv(estadisticas)).toContain('Contratos por tipología\r\nSin datos');
  });

  it('lleva las secciones nuevas y el listado de contratos', () => {
    const csv = reporteCsv(estadisticas);

    for (const titulo of [
      'Contratos por tipo de persona del contratista',
      'Contratos suscritos por mes',
      'Principales contratistas por valor',
      'Procesos en curso por etapa',
      'Cuentas de cobro por estado',
      'Modificaciones por tipo',
      'Contratos que requieren atención',
      'Tiempos del ciclo, en días calendario',
      'Listado de contratos',
    ]) {
      expect(csv).toContain(titulo);
    }
    expect(csv).toContain('Valor inicial, sin adiciones;50000');
    expect(csv).toContain('Cuentas en trámite;5000');
    expect(csv).toContain('De la radicación del proceso a la firma;42.5;40;3');
    expect(csv).toContain('De la firma al acta de inicio;Sin datos;Sin datos;0');
  });

  it('cada contrato es una fila, aunque su objeto lleve el separador', () => {
    expect(reporteCsv(estadisticas)).toContain(
      'CTO-2026-1;7;"Apoyo; con punto y coma";Contratista SAS;Persona jurídica;' +
        'Mínima cuantía;;En ejecución;20000;30000;15000;50;2026-03-10;2026-03-15;200;' +
        '2026-09-30;1;',
    );
  });

  it('el filtro se nombra como se lee, no con el código', () => {
    const csv = reporteCsv({
      ...estadisticas,
      filtros: { vigencia: 2026, modalidad: 'MC', tipologia: 'XX' },
    });
    expect(csv).toContain('Modalidad;"Mínima cuantía; menor valor"');
    // Sin contratos de esa tipología no hay de dónde sacar el nombre.
    expect(csv).toContain('Tipología;XX');
  });

  it('el nombre del archivo distingue vigencia y corte', () => {
    expect(nombreDelArchivo(estadisticas)).toBe(
      'estadisticas-contratacion-2026-2026-09-02.csv',
    );
  });

  it('sin vigencia el archivo se llama histórico', () => {
    expect(
      nombreDelArchivo({
        ...estadisticas,
        filtros: { vigencia: null, modalidad: null, tipologia: null },
      }),
    ).toBe('estadisticas-contratacion-historico-2026-09-02.csv');
  });
});
