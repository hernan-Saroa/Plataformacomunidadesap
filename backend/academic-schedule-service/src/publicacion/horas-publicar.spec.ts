import { Client } from 'pg';

import { PublicacionService } from './publicacion.service.js';

/**
 * §1.3 :: el tope de horas al publicar.
 *
 * Invariante: no se publica un periodo con un grupo cuyas horas programadas
 * (Σ semanal × semanas del ciclo) superen en más de 30% las requeridas por el
 * catálogo (asignatura.horas_clase). El margen ×1.3 se justifica en el contraste
 * contra el histórico (mediana 1.06×, solo 58% dentro de ±25%); aquí se prueba
 * que atrapa el exceso grueso y deja pasar lo que cuadra.
 *
 * Asignatura 2 = 64h de plan. Ciclo de 16 semanas:
 *   · 6h/semana × 16 = 96h  > 64×1.3 (83.2)  → bloquea.
 *   · 5h/semana × 16 = 80h ≤ 83.2            → publica.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
// 2028-02-07 (lun) a 2028-05-28 = 112 dias → 16 semanas exactas.
const FI = '2028-02-07', FF = '2028-05-28';

describe('§1.3 :: tope de horas al publicar (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  let idPeriodo = '';
  let idGrupo = '';

  const servicio = () => new PublicacionService({
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
  } as any);

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      const cod = `QA-H13-${Date.now().toString().slice(-6)}`;
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo,nombre,tipo,fecha_inicio,fecha_fin,estado)
         VALUES ($1,'QA horas','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`, [cod]);
      idPeriodo = p.rows[0].id_periodo;
      const g = await client.query(
        `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado,fecha_inicio,fecha_fin)
         VALUES (2,$1,911,'PROGRAMADO',$2::date,$3::date) RETURNING id_grupo`, [idPeriodo, FI, FF]);
      idGrupo = g.rows[0].id_grupo;
      hayBase = true;
    } catch { client = null; hayBase = false; }
  });

  afterAll(async () => {
    if (client && idPeriodo) {
      await client.query(`DELETE FROM "${S}".grupo WHERE id_periodo=$1`, [idPeriodo]).catch(() => {});
      await client.query(`DELETE FROM "${S}".periodo_programacion WHERE id_periodo=$1`, [idPeriodo]).catch(() => {});
    }
    if (client) await client.end();
  });

  const siHayBase = (n: string, fn: () => Promise<void>) =>
    it(n, async () => { if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; } await fn(); });

  const franja = (ini: string, fin: string) => client!.query(
    `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,estado)
     VALUES ($1,'LUNES',$2::time,$3::time,'presencial','PROGRAMADO')`, [idGrupo, ini, fin]);

  siHayBase('bloquea al publicar si el grupo excede el plan en mas de 30%', async () => {
    await franja('08:00', '14:00'); // 6h/sem × 16 = 96h > 83.2
    await expect(servicio().publicar(idPeriodo)).rejects.toThrow(/exceden las horas del plan/i);
  });

  siHayBase('publica cuando las horas cuadran dentro del margen', async () => {
    await client!.query(`DELETE FROM "${S}".franja_horaria WHERE id_grupo=$1`, [idGrupo]);
    await franja('08:00', '13:00'); // 5h/sem × 16 = 80h ≤ 83.2
    const est = await servicio().publicar(idPeriodo);
    expect(est.publicada).toBe(1);
    expect(est.programado).toBe(0);
  });

  siHayBase('un grupo SIN ciclo no se valida por horas (no bloquea)', async () => {
    // Otro grupo del mismo periodo, sin fechas de ciclo: no se puede calcular
    // semanas, asi que no entra en el tope. Se deja en TOMADA para no re-publicar.
    const g2 = await client!.query(
      `INSERT INTO "${S}".grupo (id_asignatura,id_periodo,numero_grupo,estado)
       VALUES (2,$1,912,'PROGRAMADO') RETURNING id_grupo`, [idPeriodo]);
    await client!.query(
      `INSERT INTO "${S}".franja_horaria (id_grupo,dia_semana,hora_inicio,hora_fin,tipo_sesion,estado)
       VALUES ($1,'MARTES','06:00'::time,'23:00'::time,'mediada_tecnologia','PROGRAMADO')`, [g2.rows[0].id_grupo]);
    // 17h en un dia, pero sin ciclo → no bloquea. Publicar no lanza por horas.
    const est = await servicio().publicar(idPeriodo);
    expect(est.pendientesCierre).toBeGreaterThanOrEqual(0); // publicó sin error de horas
  });
});
