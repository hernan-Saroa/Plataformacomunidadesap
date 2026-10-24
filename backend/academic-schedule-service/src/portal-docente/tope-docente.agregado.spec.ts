import { Client } from 'pg';

import { AsignacionesService } from '../asignaciones/asignaciones.service.js';
import { AcumuladoService, TOPE_CATEDRA } from '../asignaciones/acumulado.service.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { PortalDocenteService } from './portal-docente.service.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { crearAsignatura, darArea } = require('../../test/catalogo-qa.cjs');

/**
 * RN-04 :: NINGÚN docente queda por encima de su tope, por NINGUNO de los dos caminos.
 *
 * Los dos caminos que le dan franjas a un docente:
 *   · el portal: el docente TOMA la franja (`PortalDocenteService.tomar`);
 *   · el backoffice: la jefatura/programación LE ASIGNA el grupo (`AsignacionesService.asignar`).
 * Los dos deben usar el MISMO tope (304 h para cátedra, `horasAsignables` en otro
 * caso) y el MISMO cálculo de horas (el contrato, con el reparto por días). Antes
 * el portal no validaba nada al tomar, y el backoffice usaba `horasAsignables`
 * (0 para un catedrático) en vez de las 304 h que muestra el acumulado.
 *
 * Agregado sobre la base real, en UNA transacción que se revierte. El contrato
 * PROG↔PTA (horas por asignatura) se simula a 200 h por grupo.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};
const S = 'academic-schedule';
const DOCUMENTO = '1020304053'; // qa.docente (Docente del RUND de pruebas)

// Flujo ANTERIOR (EFDS-1938): el docente toma y suelta. Sigue en el código detrás del
// interruptor PROG_PORTAL_TOMA_FRANJAS (EFDS-2348); esta suite lo prueba encendido.
const tomaAntes = process.env.PROG_PORTAL_TOMA_FRANJAS;
beforeAll(() => { process.env.PROG_PORTAL_TOMA_FRANJAS = 'true'; });
afterAll(() => {
  if (tomaAntes === undefined) delete process.env.PROG_PORTAL_TOMA_FRANJAS;
  else process.env.PROG_PORTAL_TOMA_FRANJAS = tomaAntes;
});

describe('RN-04 :: el tope del docente se respeta en el portal y en el backoffice (agregado real)', () => {
  let client: Client | null = null;
  let hayBase = false;
  // Asignatura propia del fixture (la base local puede no tener catálogo cargado).
  let idAsig = '';
  let horasPorGrupo = 200;
  const ids = { persona: '', grupo1: '', grupo2: '', grupo3: '', franja1: '', franja2: '', franja3: '' };

  const dataSource: any = {
    query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    createQueryRunner: () => ({
      connect: async () => {},
      startTransaction: async () => { await client!.query('SAVEPOINT qr'); },
      commitTransaction: async () => { await client!.query('RELEASE SAVEPOINT qr'); },
      rollbackTransaction: async () => { await client!.query('ROLLBACK TO SAVEPOINT qr'); },
      release: async () => {},
      query: (sql: string, params?: any[]) => client!.query(sql, params).then((r) => r.rows),
    }),
  };
  const contrato: any = { calcularImpacto: async () => ({ horasImpacto: horasPorGrupo }) };
  const docencia = () => new DocenciaService(dataSource, contrato);
  const portal = () => new PortalDocenteService(dataSource, new AcumuladoService(dataSource, docencia()), docencia());
  const backoffice = () => new AsignacionesService(dataSource, contrato, docencia());

  const tomada = async (idFranja: string) =>
    (await client!.query(`SELECT estado, id_docente::text AS id_docente FROM "${S}".franja_horaria WHERE id_franja = $1`, [idFranja])).rows[0];

  beforeAll(async () => {
    try {
      client = new Client(conexion);
      await client.connect();
      await client.query('BEGIN');
      const asig = await crearAsignatura(client);
      idAsig = asig.idAsignatura;
      ids.persona = (await client.query(`SELECT id_person::text AS id FROM auth.personas WHERE num_identificacion = $1`, [DOCUMENTO])).rows[0].id;
      // EFDS-2341: el docente es del área de la asignatura (nadie se asigna fuera de su área).
      await darArea(client, { idNucleo: asig.idNucleo, idPersonas: [ids.persona] });
      // El docente de prueba, limpio y catedrático: tope = 304 h, sin otras franjas.
      await client.query(`UPDATE "${S}".franja_horaria SET id_docente = NULL WHERE id_docente = $1`, [ids.persona]);
      await client.query(
        `UPDATE academic_work_plan."Docente" SET "tipoVinculacion" = 'Cátedra', "horasAsignables" = 0,
                "situacionCategoria" = 'Servicio Activo',
                "fechaInicioVinculacion" = NULL, "fechaFinVinculacion" = NULL WHERE "personaId" = $1`, [ids.persona]);
      const p = await client.query(
        `INSERT INTO "${S}".periodo_programacion (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
         VALUES ($1,'Periodo QA tope','periodo_regular','2028-02-01','2028-06-15','activo') RETURNING id_periodo`,
        [`QA-TOPE-${Date.now().toString().slice(-7)}`]);
      // 1 y 2: publicadas (las toma el docente en el portal). 3: sin publicar (la asigna el backoffice).
      for (const [clave, numero, dia, estado] of [['1', 951, 'LUNES', 'PUBLICADA'], ['2', 952, 'MARTES', 'PUBLICADA'], ['3', 953, 'MIERCOLES', 'PROGRAMADO']] as const) {
        const g = await client.query(
          `INSERT INTO "${S}".grupo (id_asignatura, id_periodo, numero_grupo, estado, fecha_inicio, fecha_fin)
           VALUES (${idAsig}, $1, $2, 'PROGRAMADO', '2028-02-03', '2028-05-30') RETURNING id_grupo`, [p.rows[0].id_periodo, numero]);
        const f = await client.query(
          `INSERT INTO "${S}".franja_horaria (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, estado)
           VALUES ($1,$2,'06:00'::time,'08:00'::time,'mediada_tecnologia',$3) RETURNING id_franja`, [g.rows[0].id_grupo, dia, estado]);
        (ids as any)[`grupo${clave}`] = g.rows[0].id_grupo;
        (ids as any)[`franja${clave}`] = f.rows[0].id_franja;
      }
      hayBase = true;
    } catch (e) {
      // Solo la FALTA DE BASE se omite; un fixture que falla se grita y no deja la conexión abierta.
      const conectado = !!(client as any)?._connected;
      if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
      client = null; hayBase = false;
      if (conectado) throw e;
      console.warn('  (sin base: omitido)', (e as Error).message);
    }
  });
  afterAll(async () => {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (client) await client.end().catch(() => {});
  });

  const caso = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) { console.warn('  (sin base: omitido)'); return; }
      await client.query('SAVEPOINT caso');
      try { await fn(); } finally { await client.query('ROLLBACK TO SAVEPOINT caso').catch(() => {}); }
    });

  caso('el tope de cátedra son 304 h, el mismo que muestra el acumulado', async () => {
    horasPorGrupo = 200;
    const a = await new AcumuladoService(dataSource, docencia()).consumo(DOCUMENTO, null);
    expect(a.tope).toBe(TOPE_CATEDRA);
    expect(TOPE_CATEDRA).toBe(304);
  });

  caso('PORTAL: tomar hasta el tope se permite y pasarse se rechaza (409), sin tocar la franja', async () => {
    horasPorGrupo = 200;
    await expect(portal().tomar(ids.persona, ids.franja1, null)).resolves.toEqual({ tomada: true }); // 200 ≤ 304
    await expect(portal().tomar(ids.persona, ids.franja2, null)).rejects.toThrow(/tope/i);          // 400 > 304
    expect(await tomada(ids.franja2)).toEqual({ estado: 'PUBLICADA', id_docente: null });
  });

  caso('PORTAL: justo en el tope (304 h) se permite; no es "por encima"', async () => {
    horasPorGrupo = 304;
    await expect(portal().tomar(ids.persona, ids.franja1, null)).resolves.toEqual({ tomada: true });
  });

  caso('PORTAL: re-tomar una franja devuelta PROPIA no se bloquea (no suma carga), aunque ya esté sobre el tope', async () => {
    horasPorGrupo = 400; // ya por encima de 304 h
    await client!.query(
      `UPDATE "${S}".franja_horaria SET estado = 'DEVUELTA', id_docente = $2, comentario_jefatura = 'corrija' WHERE id_franja = $1`,
      [ids.franja1, ids.persona]);
    await expect(portal().tomar(ids.persona, ids.franja1, null)).resolves.toEqual({ tomada: true });
    // Pero una franja NUEVA sí se bloquea: ahí sí aumenta su carga.
    await expect(portal().tomar(ids.persona, ids.franja2, null)).rejects.toThrow(/tope/i);
  });

  caso('PORTAL: sin su registro de docente en el RUND no hay tope que verificar: falla cerrado (403)', async () => {
    const sinRegistro = '00000000-0000-0000-0000-00000000f0f0';
    await expect(portal().tomar(sinRegistro, ids.franja1, null)).rejects.toThrow(/RUND/);
    expect((await tomada(ids.franja1)).estado).toBe('PUBLICADA');
  });

  caso('BACKOFFICE: asignar un grupo que lo pasaría del tope se rechaza con la misma regla', async () => {
    horasPorGrupo = 200;
    await portal().tomar(ids.persona, ids.franja1, null); // ya tiene 200 h por el portal
    const r = await backoffice().asignar({ idGrupo: ids.grupo3, documento: DOCUMENTO } as any, null);
    expect(r.asignado).toBe(false);
    expect((r as any).motivos.map((m: any) => m.regla)).toContain('RN-04/RN-05');
    expect((r as any).motivos.find((m: any) => m.regla === 'RN-04/RN-05').mensaje).toMatch(/304 h/);
  });

  caso('AMBOS caminos coinciden: el docente no queda por encima del tope por ninguno', async () => {
    horasPorGrupo = 200;
    // Por el backoffice le caben 200 h; por el portal ya no le cabe la primera.
    const r = await backoffice().asignar({ idGrupo: ids.grupo3, documento: DOCUMENTO } as any, null);
    expect(r.asignado).toBe(true);
    await expect(portal().tomar(ids.persona, ids.franja1, null)).rejects.toThrow(/tope/i);
    const total = await docencia().total(ids.persona, 'Cátedra', null);
    expect(total).toBeLessThanOrEqual(TOPE_CATEDRA);
  });
});
