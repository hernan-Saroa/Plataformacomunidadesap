import { DataSource } from 'typeorm';

import { EstadoContrato } from '../../entities/contrato.entity';
import {
  ESTADOS_DE_GESTION,
  EstadisticasService,
  estadoDeGestion,
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
  /** Las filas que devolvería cada consulta, en el orden en que se piden. */
  function servicioCon(opciones: {
    contratos?: any[];
    procesos?: any[];
    pagado?: string;
  }): EstadisticasService {
    const query = jest.fn((sql: string) => {
      if (sql.includes('FROM hiring.contratos c\n')) {
        return Promise.resolve(opciones.contratos ?? []);
      }
      if (sql.includes('FROM hiring.procesos p\n')) {
        return Promise.resolve(opciones.procesos ?? []);
      }
      if (sql.includes('hiring.pagos_contrato')) {
        return Promise.resolve([{ pagado: opciones.pagado ?? '0' }]);
      }
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

    return new EstadisticasService({ query } as unknown as DataSource);
  }

  const fila = (estado: EstadoContrato, cuantos: number, valor: string, extra = {}) => ({
    estado,
    modalidad: 'MC',
    tipologia: 'PS',
    cuantos,
    valor,
    ...extra,
  });

  const SIN_FILTROS = { vigencia: null, modalidad: null };

  it('agrupa los diez estados del ciclo en los cinco del informe', async () => {
    const servicio = servicioCon({
      contratos: [
        fila('PERFECCIONADO', 2, '10000'),
        fila('LEGALIZADO', 3, '15000'),
        fila('EJECUCION', 4, '40000'),
        fila('SUSPENDIDO', 1, '5000'),
        fila('LIQUIDADO', 2, '20000'),
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
        fila('CERRADO', 1, '900000'),
        fila('PERFECCIONADO', 1, '100'),
        fila('EJECUCION', 1, '5000'),
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
        fila('EJECUCION', 2, '20000'),
        fila('GENERADO', 5, '999999'),
        fila('RECHAZADO', 3, '888888'),
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
        fila('EJECUCION', 2, '20000'),
        fila('LIQUIDADO', 1, '30000', { modalidad: 'SA' }),
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
      contratos: [fila('EJECUCION', 1, '1000', { modalidad: null })],
    });

    const { contratos } = await servicio.gestion(SIN_FILTROS);
    expect(contratos.porModalidad).toEqual([]);
    expect(contratos.total).toBe(1);
  });

  it('calcula la ejecución presupuestal sobre lo tramitado', async () => {
    const servicio = servicioCon({
      contratos: [fila('EJECUCION', 1, '100000')],
      pagado: '25000',
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
      contratos: [fila('EJECUCION', 1, '1000')],
      pagado: '1500',
    });

    const { presupuesto } = await servicio.gestion(SIN_FILTROS);
    expect(presupuesto.porPagar).toBe(-500);
    expect(presupuesto.porcentajeEjecutado).toBe(150);
  });

  it('cuenta los procesos de selección por desenlace', async () => {
    const servicio = servicioCon({
      procesos: [
        { estado: 'ADJUDICADO', cuantos: 4, valor: '400' },
        { estado: 'DESIERTO', cuantos: 1, valor: '100' },
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
    const servicio = servicioCon({ contratos: [fila('EJECUCION', 1, '1000')] });

    const estadisticas = await servicio.gestion({ vigencia: 2026, modalidad: 'MC' });
    expect(estadisticas.filtros).toEqual({ vigencia: 2026, modalidad: 'MC' });
    expect(estadisticas.generadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

/**
 * El archivo descargable trae lo mismo que la consulta: dos cifras distintas
 * para un mismo indicador es peor que no tener archivo.
 */
describe('reporteCsv', () => {
  const estadisticas = {
    generadoEn: '2026-09-02T15:30:00.000Z',
    filtros: { vigencia: 2026, modalidad: null },
    contratos: {
      total: 3,
      valorTotal: 60000,
      porEstado: [
        { clave: 'SUSCRITO', etiqueta: 'Suscritos', cuantos: 1, valor: 10000 },
        { clave: 'EJECUCION', etiqueta: 'En ejecución', cuantos: 2, valor: 50000 },
      ],
      porModalidad: [
        { clave: 'MC', etiqueta: 'Mínima cuantía; menor valor', cuantos: 3, valor: 60000 },
      ],
      porTipologia: [],
    },
    procesos: {
      total: 1,
      porDesenlace: [
        { clave: 'ADJUDICADO', etiqueta: 'Adjudicados', cuantos: 1, valor: 60000 },
      ],
    },
    presupuesto: {
      contratado: 60000,
      pagado: 15000,
      porPagar: 45000,
      porcentajeEjecutado: 25,
    },
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

  it('el nombre del archivo distingue vigencia y corte', () => {
    expect(nombreDelArchivo(estadisticas)).toBe(
      'estadisticas-contratacion-2026-2026-09-02.csv',
    );
  });

  it('sin vigencia el archivo se llama histórico', () => {
    expect(
      nombreDelArchivo({ ...estadisticas, filtros: { vigencia: null, modalidad: null } }),
    ).toBe('estadisticas-contratacion-historico-2026-09-02.csv');
  });
});
