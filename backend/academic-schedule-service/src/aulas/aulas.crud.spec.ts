import { Client } from 'pg';

import { AulasService } from './aulas.service.js';

/**
 * EFDS-1942 :: CRUD de aulas y capacidad.
 *
 * Canarios AGREGADOS sobre la base real (si está disponible). Afirman sobre lo
 * INVARIANTE, no sobre conteos totales que cambian cada vez que alguien usa la
 * funcionalidad:
 *   · la capacidad jamás es negativa en el catálogo;
 *   · la guarda de borrado se sostiene SIN FK (aula_codigo es texto): un aula que
 *     una franja referencia no se puede eliminar;
 *   · el ciclo crear→editar→eliminar de un aula sin franjas es limpio y
 *     reversible (no deja rastro), ejercitando el SERVICIO real, no una copia.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-1942 :: CRUD de aulas (agregado real)', () => {
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

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await fn();
    });

  const servicioReal = () => {
    const dataSource = {
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    };
    return new AulasService(dataSource as any);
  };

  siHayBase('la capacidad nunca es negativa en el catálogo (invariante del dato)', async () => {
    const { rows } = await client!.query(
      `SELECT COUNT(*)::int AS n FROM "academic-schedule".aula WHERE capacidad < 0`);
    expect(rows[0].n).toBe(0);
  });

  siHayBase('crear→editar→eliminar es un ciclo limpio para un aula sin franjas', async () => {
    const servicio = servicioReal();
    const codigo = `QA-CRUD-${Date.now().toString().slice(-7)}`;
    try {
      const creada = await servicio.crear({ codigo, nombre: 'Aula QA', capacidad: 30, tipo: 'aula' });
      expect(creada.capacidad).toBe(30);
      // Creada a mano ⇒ NO provisional: es infraestructura real, no dato C-4.
      expect(creada.provisional).toBe(false);

      const editada = await servicio.actualizar(codigo, { capacidad: 45, nombre: 'Aula QA (renombrada)' });
      expect(editada.capacidad).toBe(45);
      expect(editada.nombre).toBe('Aula QA (renombrada)');

      const r = await servicio.eliminar(codigo);
      expect(r.eliminado).toBe(true);
      const { rows } = await client!.query(
        `SELECT 1 FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
      expect(rows).toHaveLength(0);
    } finally {
      // Red de seguridad si una aserción cortó antes del delete.
      await client!.query(`DELETE FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
    }
  });

  siHayBase('NO se elimina un aula referenciada por una franja (guarda sin FK)', async () => {
    // Se toma un código de aula que hoy referencia alguna franja. Si no hubiera
    // ninguna, la guarda no se puede ejercitar y se omite en vez de dar un falso
    // verde.
    const { rows } = await client!.query(
      `SELECT aula_codigo, COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria
        WHERE aula_codigo IS NOT NULL
        GROUP BY aula_codigo LIMIT 1`);
    if (rows.length === 0) { console.warn('  (sin franjas con aula: guarda no ejercitada)'); return; }

    const codigo = rows[0].aula_codigo;
    const servicio = servicioReal();
    await expect(servicio.eliminar(codigo)).rejects.toThrow(/franja/i);

    // Y sigue existiendo: la guarda no borró nada.
    const aun = await client!.query(
      `SELECT 1 FROM "academic-schedule".aula WHERE codigo = $1`, [codigo]);
    expect(aun.rows).toHaveLength(1);
  });

  siHayBase('crear rechaza capacidad negativa, tipo inválido y código repetido', async () => {
    const servicio = servicioReal();
    await expect(servicio.crear({ codigo: 'QA-NEG', nombre: 'X', capacidad: -5, tipo: 'aula' })).rejects.toThrow();
    await expect(servicio.crear({ codigo: 'QA-TIPO', nombre: 'X', tipo: 'salon' as any })).rejects.toThrow();
    // '101' existe desde la migración 019.
    await expect(servicio.crear({ codigo: '101', nombre: 'X' })).rejects.toThrow();
  });
});
