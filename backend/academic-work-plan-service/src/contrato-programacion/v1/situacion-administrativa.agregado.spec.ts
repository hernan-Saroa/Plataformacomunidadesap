import { DataSource } from 'typeorm';

import { clasificarSituacion, sigueVigente } from './situacion-administrativa.clasificador';

/**
 * EFDS-1372 — El clasificador sobre TODOS los docentes del banco, no sobre ejemplos.
 *
 * Los casos puntuales verifican que un texto conocido se clasifique bien; este
 * verifica la REGLA sobre cada docente real. Antes afirmaba conteos fijos (263
 * docentes, 9 no asignables, 32 en periodo de prueba): cambiaban con cada carga del
 * RUND sin que ninguna regla cambiara, y entonces no probaban nada. Ahora, para cada
 * docente, sea cual sea la carga:
 *   · todo texto de situación se reconoce (ninguno cae en el fail-closed por un texto
 *     no previsto, el modo de falla de la tilde de "Sabático" y de NORTE DE SANTANDER);
 *   · año sabático y comisión bloquean mientras sigan vigentes, y solo entonces;
 *   · periodo de prueba no bloquea;
 *   · sin texto ni categoría no se afirma nada: no asignable (fail-closed).
 * El mensaje de cada falla dice QUÉ docentes, no solo cuántos.
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

const sinTildes = (t: string | null) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

describe('EFDS-1372 :: clasificador sobre todos los docentes del banco', () => {
  let ds: DataSource | null = null;
  let filas: Array<{ documento: string; situacion: string | null; categoria: string | null }> = [];
  let hayDatos = false;
  const hoy = new Date();

  beforeAll(async () => {
    try {
      ds = await new DataSource(CONFIG).initialize();
      filas = await ds.query(
        // Se excluyen los docentes sintéticos de HORA CÁTEDRA (EFDS-1374,
        // migración 014), marcados "(DESARROLLO)": son aprovisionamiento, no RUND.
        `SELECT p.num_identificacion AS documento,
                d."situacionAdministrativa" AS situacion,
                d."situacionCategoria"     AS categoria
           FROM academic_work_plan."Docente" d
           INNER JOIN auth.personas p ON p.id_person = d."personaId"
          WHERE p.nom_largo NOT LIKE '%(DESARROLLO)%'`,
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

  const clasificados = () => filas.map((f) => ({ ...f, r: clasificarSituacion(f.situacion, hoy, f.categoria) }));
  const lista = (xs: Array<{ documento: string; situacion: string | null; r: { categoria: string | null; asignable: boolean } }>) =>
    xs.map((f) => `${f.documento} · ${f.r.categoria ?? 'SIN CLASIFICAR'} · asignable=${f.r.asignable} · "${f.situacion ?? ''}"`).join('\n');

  siHayDatos('EFDS-1372 :: ningún texto de situación cae en el fail-closed por no estar previsto', () => {
    expect(lista(clasificados().filter((f) => f.r.categoria === null && String(f.situacion ?? '').trim()))).toBe('');
  });

  siHayDatos('EFDS-1372 :: año sabático y comisión bloquean mientras estén vigentes, y solo entonces', () => {
    const mal = clasificados().filter((f) => {
      const t = sinTildes(`${f.categoria ?? ''} ${f.situacion ?? ''}`);
      const esperada = /sabatic/.test(t) ? 'ano_sabatico' : /comision/.test(t) ? 'comision' : null;
      if (!esperada) return false;
      return f.r.categoria !== esperada || f.r.asignable === sigueVigente(f.r.vigenteHasta, hoy);
    });
    expect(lista(mal)).toBe('');
  });

  // El periodo de prueba es una parte grande de la planta: bloquearlo por error sería el fallo más caro.
  siHayDatos('EFDS-1372 :: periodo de prueba no bloquea', () => {
    expect(lista(clasificados().filter((f) => /periodo de prueba/.test(sinTildes(f.situacion)) && !f.r.asignable))).toBe('');
  });

  siHayDatos('EFDS-1372 :: sin texto ni categoría no se afirma nada: no asignable', () => {
    const sinDato = clasificados().filter((f) => !String(f.situacion ?? '').trim() && !String(f.categoria ?? '').trim());
    expect(lista(sinDato.filter((f) => f.r.asignable))).toBe('');
  });

  siHayDatos('EFDS-1372 :: un docente asignable nunca queda con categoría de sabático o comisión vigente', () => {
    const mal = clasificados().filter((f) =>
      f.r.asignable && ['ano_sabatico', 'comision'].includes(String(f.r.categoria)) && sigueVigente(f.r.vigenteHasta, hoy));
    expect(lista(mal)).toBe('');
  });
});
