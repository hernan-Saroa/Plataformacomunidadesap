import { Client } from 'pg';

import { resolverSituacion, extraerVigencia, sigueVigente, sinDatoAsignable, AVISO_SIN_SITUACION } from './situacion-docente.js';

/**
 * EFDS-1372 :: subtarea 8 :: resolución de situación administrativa.
 *
 * Unitarios de la regla + un CANARIO AGREGADO sobre datos reales: el agregado es
 * lo que destapó los 4 cargos directivos que el fail-closed bloqueaba por error.
 * Verificar el conjunto, no ejemplos sueltos.
 */

const HOY = new Date('2026-09-03T12:00:00');

describe('EFDS-1372 :: resolverSituacion (regla, sobre el campo estructurado)', () => {
  it('AC :: año sabático vigente ⇒ no asignable, con la vigencia extraída del texto', () => {
    const r = resolverSituacion('Año Sabático', 'En Año Sabático hasta 1-10-2026 Resol.2052', HOY);
    expect(r.asignable).toBe(false);
    expect(r.vigenteHasta).toBe('2026-10-01');
    expect(r.motivo).toContain('2026-10-01');
  });

  it('AC :: año sabático YA VENCIDO ⇒ vuelve a ser asignable', () => {
    const r = resolverSituacion('Año Sabático', 'En Año Sabático hasta 1-10-2025', HOY);
    expect(r.asignable).toBe(true);
  });

  it('AC :: comisión (estudios o servicios) ⇒ no asignable', () => {
    expect(resolverSituacion('Comisión de Estudios', null, HOY).asignable).toBe(false);
    expect(resolverSituacion('Comisión de Servicios', null, HOY).asignable).toBe(false);
  });

  it('AC :: cargo directivo ⇒ ASIGNABLE aunque el texto solo traiga el nombre del cargo', () => {
    // La lección de los 4 directivos: decidir por texto los mandaba al fail-closed.
    const r = resolverSituacion('Cargo Directivo', 'Subdirectora Nacional Académica', HOY);
    expect(r.asignable).toBe(true);
  });

  it('AC :: servicio activo y periodo de prueba ⇒ asignables', () => {
    expect(resolverSituacion('Servicio Activo', null, HOY).asignable).toBe(true);
    expect(resolverSituacion('En Periodo de Prueba', null, HOY).asignable).toBe(true);
  });

  it('AC :: categoría desconocida ⇒ fail-closed (no asignable)', () => {
    expect(resolverSituacion('Estado Que Nadie Previó', null, HOY).asignable).toBe(false);
  });

  it('el texto se normaliza (tildes, espacios Y guiones bajos): servicio_activo es servicio activo', () => {
    for (const t of ['servicio_activo', 'Servicio_Activo', 'servicio  activo', 'SERVICIO ACTIVO', 'periodo_de_prueba', 'cargo_directivo']) {
      expect(resolverSituacion(t, null, HOY)).toMatchObject({ asignable: true, motivo: null });
    }
    // Y lo que bloquea sigue bloqueando con la misma grafía.
    expect(resolverSituacion('ano_sabatico', 'hasta 1-10-2026', HOY).asignable).toBe(false);
    expect(resolverSituacion('comision_de_servicios', null, HOY).asignable).toBe(false);
  });

  describe('sin situación registrada (decisión de Tomás: asignable CON AVISO)', () => {
    const conParametro = (valor: string | undefined, fn: () => void) => {
      const antes = process.env.PROG_SIN_DATO_ASIGNABLE;
      if (valor === undefined) delete process.env.PROG_SIN_DATO_ASIGNABLE; else process.env.PROG_SIN_DATO_ASIGNABLE = valor;
      try { fn(); } finally { if (antes === undefined) delete process.env.PROG_SIN_DATO_ASIGNABLE; else process.env.PROG_SIN_DATO_ASIGNABLE = antes; }
    };

    it('por defecto: asignable, sin motivo y con el aviso exacto', () => {
      conParametro(undefined, () => {
        expect(sinDatoAsignable()).toBe(true);
        for (const vacio of [null, undefined, '', '   ']) {
          expect(resolverSituacion(vacio, null, HOY)).toMatchObject({
            categoria: 'sin_dato', asignable: true, motivo: null,
            aviso: 'Sin situación administrativa registrada en el RUND',
          });
        }
        expect(AVISO_SIN_SITUACION).toBe('Sin situación administrativa registrada en el RUND');
      });
    });

    it('con PROG_SIN_DATO_ASIGNABLE=false vuelve a bloquear, sin aviso', () => {
      conParametro('false', () => {
        expect(resolverSituacion(null, null, HOY)).toMatchObject({ asignable: false, aviso: null });
        expect(resolverSituacion(null, null, HOY).motivo).toMatch(/Falta informaci/);
      });
    });

    it('quien SÍ tiene situación no lleva aviso', () => {
      expect(resolverSituacion('Servicio Activo', null, HOY).aviso).toBeNull();
      expect(resolverSituacion('Año Sabático', 'hasta 1-10-2026', HOY).aviso).toBeNull();
    });
  });

  it('extraerVigencia y sigueVigente', () => {
    expect(extraerVigencia('hasta 17/07/2025')).toBe('2025-07-17');
    expect(extraerVigencia('sin fecha')).toBeNull();
    expect(sigueVigente('2026-10-01', HOY)).toBe(true);
    expect(sigueVigente('2025-01-01', HOY)).toBe(false);
    expect(sigueVigente(null, HOY)).toBe(true);
  });
});

/**
 * CANARIO AGREGADO — sobre el RUND real, si hay base disponible.
 *
 * Afirma que el resolver, aplicado a TODA la planta, produce exactamente la
 * partición conocida: 9 no asignables (1 sabático + 5 comisión de estudios +
 * 3 comisión de servicios) y el resto asignable. El conteo por sí solo podría
 * cuadrar por compensación, así que además exige que las categorías del lado NO
 * asignable sean precisamente esas tres.
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-1372 :: canario agregado sobre el RUND real', () => {
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

  afterAll(async () => {
    if (client) await client.end();
  });

  const siHayBase = (nombre: string, fn: () => Promise<void>) =>
    it(nombre, async () => {
      if (!hayBase || !client) {
        console.warn('  (sin base: canario omitido)');
        return;
      }
      await fn();
    });

  siHayBase(
    'sobre la planta completa, exactamente 9 no asignables y son sabático + comisión',
    async () => {
      // Acotado a la planta con situación registrada en el RUND. Desde el Lote 1
      // conviven 80 catedráticos extraídos del histórico que NO traen situación
      // administrativa: son no asignables por fail-closed y por falta de dato,
      // no por sabático ni comisión. Se verifican aparte, en el canario de abajo.
      const { rows } = await client!.query(
        `SELECT "situacionCategoria" AS categoria, "situacionAdministrativa" AS descripcion
           FROM academic_work_plan."Docente"
          WHERE "tipoVinculacion" <> 'Cátedra'`,
      );
      expect(rows.length).toBeGreaterThan(0);

      const noAsignables = rows
        .map((r) => ({ ...r, res: resolverSituacion(r.categoria, r.descripcion, HOY) }))
        .filter((r) => !r.res.asignable);

      // El total exacto.
      expect(noAsignables).toHaveLength(9);

      // Y cada uno cae del lado correcto: solo sabático y comisión, para que el 9
      // no cuadre por un falso positivo compensando un falso negativo.
      const categorias = new Set(noAsignables.map((r) => r.res.categoria));
      expect([...categorias].sort()).toEqual(['ano_sabatico', 'comision']);

      // Y los cargos directivos NO están entre los bloqueados (la lección de los 4).
      const directivosBloqueados = noAsignables.filter((r) =>
        String(r.categoria).toLowerCase().includes('directivo'),
      );
      expect(directivosBloqueados).toHaveLength(0);
    },
  );

  siHayBase(
    'los 80 catedraticos del historico: asignables con aviso por falta de dato',
    async () => {
      const { rows } = await client!.query(
        `SELECT d."situacionCategoria" AS categoria, d."situacionAdministrativa" AS descripcion
           FROM academic_work_plan."Docente" d
           JOIN auth.personas p ON p.id_person = d."personaId"
          WHERE d."tipoVinculacion" = 'Cátedra'
            -- qa.docente se siembra como cátedra para probar el portal (migración
            -- 033); no es un catedrático del histórico, así que se excluye.
            AND p.num_identificacion <> '1020304053'`,
      );
      expect(rows).toHaveLength(80);

      // Todos caen en «sin dato» (nadie les inventó una situación) y, con el parámetro
      // encendido, son asignables SIEMPRE con el aviso: la decanatura sabe que el RUND
      // no trae su situación.
      const resueltos = rows.map((r) => resolverSituacion(r.categoria, r.descripcion, HOY));
      expect([...new Set(resueltos.map((r) => r.categoria))]).toEqual(['sin_dato']);
      expect(resueltos.every((r) => r.asignable && r.motivo === null && r.aviso === AVISO_SIN_SITUACION)).toBe(true);
    },
  );
});
