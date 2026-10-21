import { Client } from 'pg';

import { OfertasService } from './ofertas.service.js';

/**
 * EFDS-1375 :: periodos de oferta (modelo legado `periodo_programacion`).
 *
 * Canario AGREGADO sobre la base real, con fixtures propios dentro de una transacción
 * que se revierte. Antes se afirmaba la SEMILLA de la migración 016 (cinco periodos:
 * 2 regulares, 2 virtuales, 1 interperiodo); esa semilla es historia de pruebas y se
 * purga al reiniciar la base local, así que lo que debe seguir invariante es el
 * COMPORTAMIENTO del módulo, no un conteo de datos prestados.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('EFDS-1375 :: periodos de oferta (agregado real, en transaccion)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      hayBase = true;
    } catch {
      client = null;
      hayBase = false;
    }
  });

  afterAll(async () => { if (client) await client.end(); });

  const servicio = () => new OfertasService(
    { query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows) } as any,
    null as any,
  );

  /** Cada caso corre en su propia transacción: nada de lo que crea sale de aquí. */
  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try { await fn(); } finally { await client.query('ROLLBACK'); }
    });

  const sembrar = async (codigo: string, tipo: string, estado: string) => client!.query(
    `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
     VALUES ($1, $1, $2, '2098-02-01', '2098-06-15', $3)`, [codigo, tipo, estado]);

  siHayBase('el acumulado por oferta suma exactamente el total (invariante de 1375)', async () => {
    // La acumulacion por semestre ENTRE ofertas es Σ(porOferta). Se verifica el
    // invariante sobre datos reales: el total transversal es la suma de las
    // asignaciones agrupadas por periodo, sin importar cuantas ofertas haya.
    const { rows } = await client!.query(
      `SELECT COALESCE(SUM(horas_asignadas),0)::int AS total_directo,
              (SELECT COALESCE(SUM(h),0)::int FROM (
                 SELECT SUM(horas_asignadas) AS h
                   FROM "${S}".asignacion_docente ad
                   JOIN "${S}".grupo g ON g.id_grupo = ad.id_grupo
                  WHERE ad.estado = 'ASIGNADO'
                  GROUP BY g.id_periodo) t) AS total_por_oferta
         FROM "${S}".asignacion_docente WHERE estado='ASIGNADO'`,
    );
    expect(rows[0].total_directo).toBe(rows[0].total_por_oferta);
  });

  siHayBase('is_activo no existe: una sola fuente de verdad del ciclo', async () => {
    // Canario anti-regresión del patrón que costó EFDS-1536/1539: dos campos
    // que pueden contradecirse sobre el mismo concepto. Si alguien reintroduce
    // is_activo "por prudencia", esto falla.
    const { rows } = await client!.query(
      `SELECT count(*)::int AS n
         FROM information_schema.columns
        WHERE table_schema = '${S}'
          AND table_name   = 'periodo_programacion'
          AND column_name  = 'is_activo'`,
    );
    expect(rows[0].n).toBe(0);
  });

  siHayBase('el DTO deriva activo del estado: solo "activo" es activo (contrato intacto)', async () => {
    // Ejercita el servicio REAL —su SQL y su derivación—, no una copia de la regla.
    await sembrar('QA-1375-A', 'periodo_regular', 'activo');
    await sembrar('QA-1375-B', 'creditos_virtual', 'planeacion');
    await sembrar('QA-1375-C', 'interperiodo', 'cerrado');

    const propias = (await servicio().listar())
      .filter((o) => o.codigo.startsWith('QA-1375-'))
      .sort((x, y) => x.codigo.localeCompare(y.codigo));
    expect(propias.map((o) => [o.codigo, o.estado, o.activo])).toEqual([
      ['QA-1375-A', 'activo', true],
      ['QA-1375-B', 'planeacion', false],
      ['QA-1375-C', 'cerrado', false],
    ]);
  });

  siHayBase('un periodo nace en planeacion, nunca activo por defecto', async () => {
    const creado = await servicio().crear({
      codigo: 'QA-1375-NUEVO', nombre: 'Periodo de prueba', tipo: 'periodo_regular',
      fechaInicio: '2098-02-01', fechaFin: '2098-06-15',
    });
    expect(creado.activo).toBe(false);
    const { rows } = await client!.query(
      `SELECT estado FROM "${S}".periodo_programacion WHERE codigo = 'QA-1375-NUEVO'`);
    expect(rows[0].estado).toBe('planeacion');

    // Activar es explicito y sin condiciones.
    const activo = await servicio().activar(creado.idPeriodo);
    expect(activo.activo).toBe(true);
  });

  siHayBase('crear rechaza tipo invalido, fechas invertidas y codigo repetido', async () => {
    const base = { nombre: 'X', fechaInicio: '2098-02-01', fechaFin: '2098-06-15' };

    // Un fallo de SQL dentro de la transacción la aborta: cada rechazo de validación debe
    // ocurrir ANTES de tocar la base. El de código repetido va al final, tras sembrar el original.
    await expect(servicio().crear({ ...base, codigo: 'QA-T-1', tipo: 'inventado' as any })).rejects.toThrow();
    await expect(servicio().crear({
      ...base, codigo: 'QA-T-2', tipo: 'periodo_regular', fechaInicio: '2098-06-15', fechaFin: '2098-02-01',
    })).rejects.toThrow();
    await servicio().crear({ ...base, codigo: 'QA-T-3', tipo: 'periodo_regular' });
    await expect(servicio().crear({ ...base, codigo: 'QA-T-3', tipo: 'periodo_regular' })).rejects.toThrow();
  });

  siHayBase('estado viaja al DTO y activo nunca lo contradice (sobre TODA la tabla)', async () => {
    // Invariante, no conteo: sea cual sea el numero de periodos —la UI ya puede
    // crearlos—, cada fila debe cumplir dos cosas. Una, que su estado este en el
    // conjunto cerrado del CHECK. Dos, que activo sea exactamente la derivacion
    // de estado. Son los dos supuestos sobre los que la pantalla decide si
    // ofrece el boton Activar; si se rompen, ofrece activar lo que el backend
    // rechaza (cerrado) o esconde el boton donde si aplica (planeacion).
    await sembrar('QA-1375-P', 'periodo_regular', 'planeacion');
    await sembrar('QA-1375-Q', 'periodo_regular', 'activo');
    await sembrar('QA-1375-R', 'periodo_regular', 'cerrado');

    const todas = await servicio().listar();
    expect(todas.length).toBeGreaterThanOrEqual(3);

    const ESTADOS = ['planeacion', 'activo', 'cerrado'];
    for (const o of todas) {
      expect(ESTADOS).toContain(o.estado);
      expect(o.activo).toBe(o.estado === 'activo');
    }
  });

  siHayBase('varios periodos pueden estar activos a la vez', async () => {
    // La exclusividad NO es la regla: el interperiodo convive con los regulares.
    await sembrar('QA-1375-V1', 'periodo_regular', 'activo');
    await sembrar('QA-1375-V2', 'interperiodo', 'activo');
    const { rows } = await client!.query(
      `SELECT COUNT(*)::int AS n FROM "${S}".periodo_programacion WHERE estado = 'activo' AND codigo LIKE 'QA-1375-V%'`);
    expect(rows[0].n).toBe(2);
    const activos = (await servicio().listar()).filter((o) => o.codigo.startsWith('QA-1375-V') && o.activo);
    expect(activos).toHaveLength(2);
  });
});
