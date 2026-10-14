import { Client } from 'pg';

import { aplicarDecision, aplicarPendientesAlCrear, reiniciarCacheProgramacion } from './docencia-programacion';

/**
 * EFDS-2315 :: aplicar la docencia concertada, con el SQL REAL.
 *
 * Agregado sobre la base real, en una transacción que se revierte. Las pruebas
 * con dobles (docencia-programacion.spec.ts) no ven errores de SQL; esta sí:
 * corre `aplicarDecision` contra docente, PTA y `PtaComponentApproval` reales.
 *
 * `pta_id` es uuid en unos ambientes (327, entidad) y text en otros (340): se
 * prueban los dos. Si la tabla no existe en esta base (local), se crea DENTRO de
 * la transacción con esa forma y se revierte. La persona se LEE de auth (no se
 * escribe en el esquema de otro servicio).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};

const ID_CONCERTACION = '00000000-0000-4000-8000-00000000a2f5';
const ID_PTA = '00000000-0000-4000-8000-00000000b2f5';

describe('EFDS-2315 :: aplicar la decisión al PTA (agregado real, en transacción)', () => {
  const envAntes = { ...process.env };
  let client: Client | null = null;
  let hayBase = false;
  let persona: { id_person: string; num_identificacion: string } | null = null;

  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); hayBase = true; } catch { hayBase = false; }
    if (hayBase) {
      persona = (await client!.query(
        `SELECT id_person::text, num_identificacion FROM auth.personas WHERE num_identificacion IS NOT NULL LIMIT 1`)).rows[0] ?? null;
    }
  });
  afterAll(async () => { process.env = envAntes; if (client) await client.end().catch(() => {}); });
  beforeEach(() => {
    reiniciarCacheProgramacion();
    process.env.PROG_CONCERTACION_HABILITADA = 'true';
    // Programación Académica encendida con corte 2050-1 (lo único externo que se simula).
    (global as any).fetch = jest.fn(async () => ({
      ok: true, json: async () => ({ success: true, data: { habilitada: true, desdePeriodo: '2050-1' } }),
    }));
  });

  const q = { query: (sql: string, p?: any[]) => client!.query(sql, p).then((r) => r.rows) };

  const caso = (nombre: string, tipoPtaId: 'uuid' | 'text', fn: () => Promise<void>) =>
    it(`${nombre} [pta_id ${tipoPtaId}]`, async () => {
      if (!hayBase || !client || !persona) { console.warn('  (sin base o sin personas: omitido)'); return; }
      await client.query('BEGIN');
      try {
        const existe = (await client.query(`SELECT to_regclass('academic_work_plan."PtaComponentApproval"') IS NOT NULL AS e`)).rows[0].e;
        if (existe) {
          const real = (await client.query(`SELECT data_type FROM information_schema.columns
             WHERE table_schema='academic_work_plan' AND table_name='PtaComponentApproval' AND column_name='pta_id'`)).rows[0].data_type;
          if (real !== tipoPtaId) { console.warn(`  (la tabla real usa ${real}: se omite la variante ${tipoPtaId})`); return; }
        } else {
          // Forma de 340 (sin la FK, porque en local PlanTrabajoAcademico.id no tiene PK).
          await client.query(`CREATE TABLE academic_work_plan."PtaComponentApproval" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pta_id ${tipoPtaId} NOT NULL, componente VARCHAR(100) NOT NULL,
            estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', aprobador_id VARCHAR(100), aprobador_nombre VARCHAR(200),
            aprobador_rol VARCHAR(100), comentarios TEXT, respuesta_docente TEXT, fecha_aprobacion TIMESTAMP,
            scope VARCHAR(50), scope_id VARCHAR(100), created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(), CONSTRAINT uq_pta_componente_prueba UNIQUE (pta_id, componente))`);
        }
        await client.query(
          `INSERT INTO academic_work_plan."Docente" ("personaId", dedicacion, "territorialId", "tipoVinculacion", "updatedAt")
           VALUES ($1::uuid, 'TIEMPO_COMPLETO', 'DT-009', 'PLANTA', NOW())`, [persona.id_person]);
        await client.query(
          `INSERT INTO academic_work_plan.docencia_concertada
             (id_concertacion, documento_docente, periodo, nivel, horas, huella, asignaturas, firmas, registrada_por)
           VALUES ($1, $2, '2050-1', 'pregrado', 96, $3, $4::jsonb, '[]'::jsonb, 'prueba')`,
          [ID_CONCERTACION, persona.num_identificacion, 'c'.repeat(64), JSON.stringify([{
            idGrupo: 'g', asignaturaId: '1', programaId: '1', codigo: 'ASIG-00001', nombre: 'Constitución', pensum: null,
            creditos: 3, semestre: 1, modalidad: 'Presencial', fechaInicio: '2050-02-03', fechaFin: '2050-05-30', horas: 96 }])]);
        await fn();
      } finally { await client.query('ROLLBACK'); }
    });

  const crearPta = async (estado: string, asignaturas: any[] = []) => {
    const idDocente = (await client!.query(
      `SELECT id FROM academic_work_plan."Docente" WHERE "personaId" = $1::uuid ORDER BY "createdAt" DESC LIMIT 1`, [persona!.id_person])).rows[0].id;
    await client!.query(
      `INSERT INTO academic_work_plan."PlanTrabajoAcademico" (id, "docenteId", periodo, estado, "datosEstructurados", "updatedAt")
       VALUES ($1, $2, '2050-1', $3, $4::jsonb, NOW())`, [ID_PTA, idDocente, estado, JSON.stringify({ asignaturas })]);
    return idDocente;
  };
  const fila = async () => (await client!.query(
    `SELECT estado_aplicacion, id_pta, aplicada_en IS NOT NULL AS aplicada FROM academic_work_plan.docencia_concertada WHERE id_concertacion = $1`,
    [ID_CONCERTACION])).rows[0];
  const aprobaciones = async () => (await client!.query(
    `SELECT componente, estado, scope, scope_id FROM academic_work_plan."PtaComponentApproval" WHERE pta_id::text = $1`, [ID_PTA])).rows;

  for (const tipo of ['uuid', 'text'] as const) {
    caso('PTA en borrador: se aplica, con la Docencia aprobada por la concertación', tipo, async () => {
      await crearPta('BORRADOR', [{ asignatura_id: '9', asignatura_nombre: 'Manual' }]);
      expect(await aplicarDecision(q, ID_CONCERTACION)).toBe('aplicada');
      expect(await fila()).toEqual({ estado_aplicacion: 'aplicada', id_pta: ID_PTA, aplicada: true });
      expect(await aprobaciones()).toEqual([{ componente: 'academica_pregrado', estado: 'aprobado', scope: 'programacion', scope_id: ID_CONCERTACION }]);
      const ds = (await client!.query(`SELECT "datosEstructurados" AS ds FROM academic_work_plan."PlanTrabajoAcademico" WHERE id = $1`, [ID_PTA])).rows[0].ds;
      expect(ds.asignaturas).toEqual([expect.objectContaining({ origen: 'programacion', asignatura_id: '1', total_horas: 96 })]);
      // Idempotente: aplicar de nuevo no duplica la aprobación.
      expect(await aplicarDecision(q, ID_CONCERTACION)).toBe('aplicada');
      expect(await aprobaciones()).toHaveLength(1);
    });

    caso('PTA firmado: no se toca, queda pendiente', tipo, async () => {
      await crearPta('EN_FIRME');
      expect(await aplicarDecision(q, ID_CONCERTACION)).toBe('pendiente_pta_firmado');
      expect(await fila()).toEqual({ estado_aplicacion: 'pendiente_pta_firmado', id_pta: ID_PTA, aplicada: false });
      expect(await aprobaciones()).toEqual([]);
    });

    const ubicar = (idSeccional: string) => client!.query(
      `UPDATE academic_work_plan.docencia_concertada
          SET asignaturas = jsonb_set(asignaturas, '{0,territorialId}', to_jsonb($2::text))
        WHERE id_concertacion = $1`, [ID_CONCERTACION, idSeccional]);

    caso('asignatura de una Dirección Territorial: no se aplica (academica_territorial no la aprueba la concertación)', tipo, async () => {
      await crearPta('BORRADOR');
      await ubicar('10'); // Seccional Huila
      expect(await aplicarDecision(q, ID_CONCERTACION)).toBe('pendiente_docencia_territorial');
      expect(await aprobaciones()).toEqual([]);
    });

    caso('asignatura de Sede Central: se aplica, con su territorial_id', tipo, async () => {
      await crearPta('BORRADOR');
      await ubicar('1'); // Sede Central
      expect(await aplicarDecision(q, ID_CONCERTACION)).toBe('aplicada');
      const ds = (await client!.query(`SELECT "datosEstructurados" AS ds FROM academic_work_plan."PlanTrabajoAcademico" WHERE id = $1`, [ID_PTA])).rows[0].ds;
      expect(ds.asignaturas[0].territorial_id).toBe('1');
    });

    caso('sin PTA: pendiente; al crearlo se precarga', tipo, async () => {
      expect(await aplicarDecision(q, ID_CONCERTACION)).toBe('pendiente_sin_pta');
      expect(await fila()).toEqual({ estado_aplicacion: 'pendiente_sin_pta', id_pta: null, aplicada: false });
      const idDocente = await crearPta('BORRADOR');
      await aplicarPendientesAlCrear(q, { id: ID_PTA, periodo: '2050-1', docenteId: idDocente, estado: 'BORRADOR', datosEstructurados: { asignaturas: [] } });
      expect((await fila()).estado_aplicacion).toBe('aplicada');
      expect(await aprobaciones()).toHaveLength(1);
    });
  }
});
