import { Client } from 'pg';

import { HorasPtaCalculator } from '../../pta/horas-pta.calculator';

/**
 * EFDS-1373 :: subtarea 7 :: PARIDAD con el calculador del PTA.
 *
 * El endpoint de cálculo del contrato expone `HorasPtaCalculator`, la misma
 * clase que usa el PTA en producción. Este es el test que protege la
 * integración: afirma, sobre TODO el catálogo real, que el calculador reproduce
 * exactamente el `horas_pta` almacenado. Si alguien tocara la lógica del
 * calculador, o si el catálogo derivara de otra fórmula, este canario lo delata
 * — y RN-06 declara esas horas inalterables porque alimentan el PTA.
 *
 * No es un ejemplo suelto: es el agregado sobre las 427 asignaturas. Un conteo
 * solo podría cuadrar por compensación, así que se listan las discrepancias.
 */

const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'esap_db',
};

describe('EFDS-1373 :: paridad calculador vs catálogo (agregado real)', () => {
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
        console.warn('  (sin base: paridad omitida)');
        return;
      }
      await fn();
    });

  siHayBase(
    'el calculador reproduce horas_pta para TODAS las asignaturas del catálogo',
    async () => {
      const { rows } = await client!.query(
        `SELECT a.codigo,
                a.creditos,
                a.horas_pta,
                a.tipo_excepcion,
                a.horas_fijas_pta,
                p.horas_base_por_credito,
                p.horas_pregrado_central
           FROM academic_work_plan.asignatura a
           JOIN academic_work_plan.programa  p ON p.id = a.id_programa
          WHERE a.horas_pta IS NOT NULL`,
      );
      expect(rows.length).toBeGreaterThan(400);

      const discrepancias = rows
        .map((r) => {
          const calc = HorasPtaCalculator.calcularHorasPTA(
            {
              creditos: Number(r.creditos ?? 0),
              tipoExcepcion: r.tipo_excepcion ?? null,
              horasFijasPta: r.horas_fijas_pta ?? null,
            },
            {
              horasBasePorCredito: Number(r.horas_base_por_credito ?? 16),
              horasPregradoCentral: r.horas_pregrado_central ?? null,
            },
          );
          return { codigo: r.codigo, catalogo: Number(r.horas_pta), calculado: calc };
        })
        .filter((r) => r.catalogo !== r.calculado);

      // Si hay discrepancias, mostrarlas: dicen exactamente qué asignatura y en
      // cuánto difiere, no solo que "no cuadra".
      if (discrepancias.length > 0) {
        console.error('Discrepancias calculador vs catálogo:', discrepancias.slice(0, 20));
      }
      expect(discrepancias).toHaveLength(0);
    },
  );

  siHayBase('las tres excepciones de horas fijas de la Circular 003 se respetan', async () => {
    // seminario_enfasis=384, opciones_grado_ap=20, seminario_opciones_apt=144.
    expect(
      HorasPtaCalculator.calcularHorasPTA(
        { creditos: 10, tipoExcepcion: 'seminario_enfasis', horasFijasPta: 384 },
        { horasBasePorCredito: 12 },
      ),
    ).toBe(384);
    expect(
      HorasPtaCalculator.calcularHorasPTA(
        { creditos: 2, tipoExcepcion: 'opciones_grado_ap', horasFijasPta: 20 },
        { horasBasePorCredito: 16 },
      ),
    ).toBe(20);
    expect(
      HorasPtaCalculator.calcularHorasPTA(
        { creditos: 3, tipoExcepcion: 'seminario_opciones_apt', horasFijasPta: 144 },
        { horasBasePorCredito: 12 },
      ),
    ).toBe(144);
  });
});
