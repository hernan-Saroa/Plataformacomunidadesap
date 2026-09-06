import { DataSource } from 'typeorm';

import { clasificarSituacion } from './situacion-administrativa.clasificador';

/**
 * EFDS-1372 — El clasificador sobre TODOS los docentes del RUND, no sobre ejemplos.
 *
 * Los casos puntuales verifican que un texto conocido se clasifique bien; este
 * verifica el AGREGADO. Si el numero no cuadra, hay un caso mal
 * clasificado que ninguna prueba de ejemplo revelaría: el texto que nadie miró.
 *
 * Es el mismo modo de falla que ya apareció tres veces en este módulo —ids sin
 * normalizar en EFDS-1535, NORTE DE SANTANDER en la carga, la tilde de
 * "Sabático"—: no hay error, simplemente no coincide, y el silencio parece
 * correcto.
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

/**
 * Confirmado contra los datos: 1 año sabático + 5 comisión de estudios +
 * 3 comisión de servicios = 9.
 *
 * ⚠️ El primer conteo dio 8 por un descuido propio: la consulta de verificación
 * buscaba 'sabatic' y el dato real es 'Sabático', CON TILDE. El mismo modo de
 * falla de EFDS-1535 y del alias de NORTE DE SANTANDER — no hay error, no
 * coincide, y el silencio parece correcto. El agregado es lo que lo destapó.
 */
const NO_ASIGNABLES_ESPERADOS = 9;
const TOTAL_DOCENTES_ESPERADO = 263;

describe('EFDS-1372 :: clasificador sobre los 263 docentes reales', () => {
  let ds: DataSource | null = null;
  let filas: Array<{ documento: string; nombre: string; situacion: string | null; categoria: string | null }> = [];
  let hayDatos = false;

  beforeAll(async () => {
    try {
      ds = await new DataSource(CONFIG).initialize();
      filas = await ds.query(
        `SELECT p.num_identificacion AS documento,
                p.nom_largo          AS nombre,
                d."situacionAdministrativa" AS situacion,
                d."situacionCategoria"     AS categoria
           FROM academic_work_plan."Docente" d
           INNER JOIN auth.personas p ON p.id_person = d."personaId"`,
      );
      hayDatos = filas.length > 0;
    } catch {
      hayDatos = false;
    }
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  const siHayDatos = (nombre: string, fn: () => void) =>
    it(nombre, () => {
      if (!hayDatos) { console.warn('Sin docentes cargados: prueba omitida.'); return; }
      fn();
    }, 30000);

  siHayDatos('EFDS-1372 :: están cargados los 263 docentes del RUND', () => {
    expect(filas.length).toBe(TOTAL_DOCENTES_ESPERADO);
  });

  siHayDatos('EFDS-1372 :: el clasificador marca exactamente 9 docentes no asignables', () => {
    const noAsignables = filas
      .map((f) => ({ ...f, r: clasificarSituacion(f.situacion, new Date(), (f as any).categoria) }))
      .filter((f) => !f.r.asignable);

    // Si esto falla, el mensaje dice CUÁLES quedaron mal, no solo el número.
    const detalle = noAsignables
      .map((f) => `${f.documento} · ${f.r.categoria ?? 'SIN CLASIFICAR'} · ${f.situacion}`)
      .join('\n');

    expect(`${noAsignables.length}\n${detalle}`).toContain(`${NO_ASIGNABLES_ESPERADOS}\n`);
    expect(noAsignables.length).toBe(NO_ASIGNABLES_ESPERADOS);
  });

  siHayDatos('EFDS-1372 :: los 9 son 1 año sabático y 8 comisiones, ninguno sin clasificar', () => {
    const porCategoria: Record<string, number> = {};
    for (const f of filas) {
      const r = clasificarSituacion(f.situacion, new Date(), (f as any).categoria);
      if (r.asignable) continue;
      porCategoria[r.categoria ?? 'SIN_CLASIFICAR'] = (porCategoria[r.categoria ?? 'SIN_CLASIFICAR'] ?? 0) + 1;
    }

    expect(porCategoria).toEqual({ ano_sabatico: 1, comision: 8 });
    // Ninguno debe caer en el fail-closed: eso significaría un texto no previsto.
    expect(porCategoria.SIN_CLASIFICAR).toBeUndefined();
  });

  // El 11% de la planta: bloquearlos por error sería el fallo más caro.
  siHayDatos('EFDS-1372 :: los 32 en periodo de prueba quedan asignables', () => {
    const enPrueba = filas.filter((f) => /periodo de prueba/i.test(f.situacion || ''));

    expect(enPrueba.length).toBe(32);
    expect(enPrueba.every((f) => clasificarSituacion(f.situacion, new Date(), (f as any).categoria).asignable)).toBe(true);
  });

  // Cierra el hueco que dejaría un texto nuevo: hoy TODOS deben ser reconocibles.
  siHayDatos('EFDS-1372 :: ningún docente del RUND cae en el fail-closed por texto no previsto', () => {
    const sinClasificar = filas
      .map((f) => ({ ...f, r: clasificarSituacion(f.situacion, new Date(), (f as any).categoria) }))
      .filter((f) => f.r.categoria === null && f.situacion);

    const detalle = sinClasificar.map((f) => `${f.documento}: "${f.situacion}"`).join('\n');
    expect(detalle).toBe('');
  });
});
