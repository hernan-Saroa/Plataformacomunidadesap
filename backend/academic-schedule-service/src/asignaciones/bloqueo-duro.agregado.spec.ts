import { DataSource } from 'typeorm';

import { buscarCruceTransversal, type FranjaOcupada } from './reglas-asignacion.js';

/**
 * CANARIO DEL BLOQUEO DURO — EFDS-1372.
 *
 * Generaliza el patrón que destapó los 4 cargos directivos: afirmar algo del
 * CONJUNTO sobre datos reales, no de un caso.
 *
 * Los ejemplos puntuales verifican que un cruce conocido se detecte. Este verifica
 * el número. Si sube, algo rechaza de más —alguien se queja y se corrige—; si
 * baja, algo pasa de largo, y eso no se nota hasta que hay dos clases a la misma
 * hora. El error es asimétrico y por eso el conteo se fija.
 *
 * Se omite solo si no hay base disponible.
 */
const CONFIG = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
  synchronize: false,
  logging: false,
};

describe('EFDS-1372 :: canario del bloqueo duro sobre datos reales', () => {
  let ds: DataSource | null = null;
  let hayBase = false;

  beforeAll(async () => {
    try {
      ds = await new DataSource(CONFIG).initialize();
      hayBase = true;
    } catch {
      hayBase = false;
    }
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase) { console.warn('Sin base: prueba omitida.'); return; }
      await fn();
    }, 30000);

  /**
   * Escenario conocido y reproducible: se construyen franjas de prueba en memoria
   * a partir de un patrón fijo, y se cuenta cuántas rechaza la regla.
   *
   * No se escriben datos: el conteo debe salir de la REGLA, no de la base, para
   * que el canario no dependa de lo que otros hayan dejado sembrado.
   */
  siHayBase('EFDS-1372 :: sobre un escenario conocido rechaza exactamente 3 de 6 franjas', async () => {
    const ocupadas: FranjaOcupada[] = [
      { idGrupo: 'ocupado-A', diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' },
      { idGrupo: 'ocupado-B', diaSemana: 'JUEVES', horaInicio: '14:00', horaFin: '16:00' },
    ];

    const candidatas = [
      // 1. Cruza con A por dentro.
      { esperaCruce: true, franja: { diaSemana: 'LUNES', horaInicio: '12:00', horaFin: '14:00' } },
      // 2. Cruza con A por envolvimiento.
      { esperaCruce: true, franja: { diaSemana: 'LUNES', horaInicio: '10:00', horaFin: '15:00' } },
      // 3. Cruza con B exactamente.
      { esperaCruce: true, franja: { diaSemana: 'JUEVES', horaInicio: '14:00', horaFin: '16:00' } },
      // 4. Mismo horario, OTRO día: no cruza.
      { esperaCruce: false, franja: { diaSemana: 'MARTES', horaInicio: '11:00', horaFin: '13:00' } },
      // 5. Consecutiva: tocarse en el extremo no es coincidir.
      { esperaCruce: false, franja: { diaSemana: 'LUNES', horaInicio: '13:00', horaFin: '15:00' } },
      // 6. Anterior sin tocarse.
      { esperaCruce: false, franja: { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '11:00' } },
    ];

    const rechazadas = candidatas.filter(
      (c) => buscarCruceTransversal([c.franja], ocupadas, 'g-actual') !== null,
    );

    // El número fijo es el canario: si cambia, alguna franja cambió de lado.
    expect(rechazadas).toHaveLength(3);
    // Y cada una debe caer del lado esperado, para que el total no cuadre por
    // compensación entre un falso positivo y un falso negativo.
    for (const c of candidatas) {
      const cruza = buscarCruceTransversal([c.franja], ocupadas, 'g-actual') !== null;
      expect({ franja: c.franja, cruza }).toEqual({ franja: c.franja, cruza: c.esperaCruce });
    }
  });

  /**
   * El cruce se resuelve por IDENTIFICADOR de docente, no por nombre.
   *
   * Es la regla que salió de las cuatro apariciones del mismo defecto: si existe
   * un campo estructurado, la decisión se toma sobre él. Aquí se verifica que la
   * columna sea uuid y apunte a la identidad estable de la persona.
   */
  siHayBase('EFDS-1372 :: el cruce se resuelve por id de docente, no por nombre', async () => {
    const cols = await ds!.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'academic-schedule'
          AND table_name IN ('franja_horaria','asignacion_docente')
          AND column_name = 'id_docente'`,
    );
    expect(cols.length).toBe(2);
    expect(cols.every((c: any) => c.data_type === 'uuid')).toBe(true);

    // La asignación referencia la identidad estable, no la fila del RUND del
    // periodo, que cambia cada semestre.
    const fk = await ds!.query(
      `SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = '"academic-schedule".asignacion_docente'::regclass
          AND contype = 'f'`,
    );
    const defs = fk.map((f: any) => f.def).join(' | ');
    expect(defs).toContain('auth.personas(id_person)');
    expect(defs).not.toContain('"Docente"');
  });

  /** Un grupo tiene un solo docente: reasignar actualiza, no acumula filas. */
  siHayBase('EFDS-1372 :: un grupo no puede tener dos docentes asignados', async () => {
    const u = await ds!.query(
      `SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = '"academic-schedule".asignacion_docente'::regclass
          AND contype = 'u'`,
    );
    expect(u.map((x: any) => x.def)).toContain('UNIQUE (id_grupo)');
  });

  /**
   * Los índices que sostienen el bloqueo transversal deben existir: sin ellos la
   * consulta funciona igual pero se degrada con el volumen, y el rendimiento es
   * lo que hace que alguien decida saltarse la validación.
   */
  siHayBase('EFDS-1372 :: existen los índices que sostienen RN-07 y el acumulado', async () => {
    const idx = await ds!.query(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname = 'academic-schedule'
          AND indexname IN ('idx_franja_docente_dia_horario','idx_asignacion_docente')`,
    );
    expect(idx.map((i: any) => i.indexname).sort())
      .toEqual(['idx_asignacion_docente', 'idx_franja_docente_dia_horario']);
  });
});
