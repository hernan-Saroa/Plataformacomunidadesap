import { ConflictException } from '@nestjs/common';
import { Client } from 'pg';

import { AlcanceService } from '../acceso/alcance.service.js';
import { PublicacionService } from '../publicacion/publicacion.service.js';
import { PeriodosService } from './periodos.service.js';
import { parsearPeriodo } from './periodo-ref.js';

/**
 * EFDS-2328 :: periodo único de plataforma.
 *
 * Canario AGREGADO sobre la base real, TODO dentro de una transacción que se
 * revierte: el periodo de plataforma de prueba (tabla del PTA) nunca queda
 * escrito ni lo ve otra conexión.
 *
 * Afirma las reglas aprobadas:
 *   · se programa en planeación y en curso; solo lo cerrado se bloquea;
 *   · "cerrar" cierra la PROGRAMACIÓN, no el periodo de la plataforma;
 *   · un periodo de plataforma cerrado también bloquea;
 *   · la tabla de equivalencias reapunta V1 → 2026-1 con oferta créditos
 *     virtuales, y deja el interperiodo fuera.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';

describe('EFDS-2328 :: periodo unico de plataforma (agregado real, en transaccion)', () => {
  let client: Client | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const ds = () => ({ query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) }) as any;

  /** Corre `fn` dentro de una transacción que SIEMPRE se revierte. */
  const enTransaccion = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('BEGIN');
      try { await fn(); } finally { await client.query('ROLLBACK'); }
    });

  const periodoPlataforma = async (codigo: string, anio: number, semestre: number, estado: string, ini: string, fin: string) =>
    (await client!.query(
      `INSERT INTO academic_work_plan.periodo_academico (codigo, anio, semestre, fecha_inicio, fecha_fin, estado)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text AS id`, [codigo, anio, semestre, ini, fin, estado])).rows[0].id;

  enTransaccion('planeacion y en curso son programables; el listado lo dice y no hay fila de extension', async () => {
    const id = await periodoPlataforma('2099-1', 2099, 1, 'planeacion', '2099-02-01', '2099-06-15');
    const r = await new PeriodosService(ds()).listar(new Set());
    const p = r.periodos.find((x) => x.idPeriodo === id)!;
    expect(p).toMatchObject({ modelo: 'plataforma', codigo: '2099-1', estadoPlataforma: 'planeacion', programable: true });
    expect(p.programacion.estado).toBe('abierta');
    expect(r.permisos.activar).toBe(false); // sin permiso de administración
    expect((await new AlcanceService(ds()).periodoPorId(id))?.cerrado).toBe(false);
  });

  enTransaccion('cerrar cierra solo la programacion: el periodo de plataforma sigue igual', async () => {
    const id = await periodoPlataforma('2099-1', 2099, 1, 'en_curso', '2099-02-01', '2099-06-15');
    const pub = new PublicacionService(ds());
    await pub.cerrar(id, null); // sin franjas: nada pendiente

    const pa = await client!.query(`SELECT estado FROM academic_work_plan.periodo_academico WHERE id=$1::bigint`, [id]);
    expect(pa.rows[0].estado).toBe('en_curso'); // NO se tocó el periodo de la plataforma
    const ext = await client!.query(`SELECT estado FROM "${S}".programacion_periodo WHERE id_periodo_academico=$1::bigint`, [id]);
    expect(ext.rows[0].estado).toBe('cerrada');

    expect((await new AlcanceService(ds()).periodoPorId(id))?.cerrado).toBe(true);
    const listado = await new PeriodosService(ds()).listar(new Set(['programacion-academica.all']));
    expect(listado.periodos.find((x) => x.idPeriodo === id)).toMatchObject({ programable: false, esActivo: true });
    expect(listado.permisos.activar).toBe(true);
    await expect(pub.cerrar(id, null)).rejects.toBeInstanceOf(ConflictException);
  });

  enTransaccion('un periodo de plataforma cerrado bloquea aunque la programacion este abierta', async () => {
    const id = await periodoPlataforma('2099-1', 2099, 1, 'cerrado', '2099-02-01', '2099-06-15');
    expect((await new AlcanceService(ds()).periodoPorId(id))?.cerrado).toBe(true);
  });

  enTransaccion('las equivalencias reapuntan V1 a 2026-1 como creditos virtuales y dejan fuera el interperiodo', async () => {
    const v1 = await client!.query(`SELECT id_periodo FROM "${S}".periodo_programacion WHERE codigo='2026-V1'`);
    const int = await client!.query(`SELECT id_periodo FROM "${S}".periodo_programacion WHERE codigo='2026-INT'`);
    if (!v1.rows.length || !int.rows.length) { console.warn('  (sin 2026-V1/2026-INT: omitido)'); return; }
    const existe = await client!.query(`SELECT id::text AS id FROM academic_work_plan.periodo_academico WHERE codigo='2026-1'`);
    const id20261 = existe.rows[0]?.id ?? await periodoPlataforma('2026-1', 2026, 1, 'planeacion', '2026-02-01', '2026-06-15');

    const g = await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado) VALUES (2,$1,961,'PROGRAMADO') RETURNING id_grupo`,
      [v1.rows[0].id_periodo]);
    const gi = await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado) VALUES (2,$1,962,'PROGRAMADO') RETURNING id_grupo`,
      [int.rows[0].id_periodo]);

    await client!.query(`SELECT "${S}".reapuntar_grupos_por_equivalencia()`);
    const r = await client!.query(
      `SELECT id_grupo, id_periodo_academico::text AS pa, tipo_oferta FROM "${S}".grupo WHERE id_grupo IN ($1,$2)`,
      [g.rows[0].id_grupo, gi.rows[0].id_grupo]);
    const por = Object.fromEntries(r.rows.map((x: any) => [x.id_grupo, x]));
    expect(por[g.rows[0].id_grupo]).toMatchObject({ pa: id20261, tipo_oferta: 'creditos_virtual' });
    expect(por[gi.rows[0].id_grupo]).toMatchObject({ pa: null, tipo_oferta: null }); // interperiodo: fuera

    // El grupo reapuntado se cierra con el periodo de PLATAFORMA, no con el legado.
    const alcance = new AlcanceService(ds());
    const res = await alcance.resolver('grupo', g.rows[0].id_grupo);
    expect(res.periodo?.idPeriodo).toBe(id20261);
  });

  it('el idPeriodo se reconoce por su forma, nunca por el codigo', () => {
    expect(parsearPeriodo('12')).toEqual({ modelo: 'plataforma', id: '12' });
    expect(parsearPeriodo('da57f6bd-d47c-4c8d-aa0f-b6c57e657719')?.modelo).toBe('legado');
    expect(parsearPeriodo('2026-1')).toBeNull();
    expect(parsearPeriodo('0')).toBeNull();
    expect(parsearPeriodo("1; DROP TABLE x")).toBeNull();
  });
});
