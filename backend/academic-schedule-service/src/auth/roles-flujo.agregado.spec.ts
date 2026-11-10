import { Client } from 'pg';

/**
 * Migración 064: los roles que completan el flujo de Programación Académica y los
 * permisos del superusuario. Solo lectura sobre la base real (si no hay base, se omite).
 */
const conexion = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'esap_secure_password_2024',
  database: process.env.DB_NAME || 'esap_db',
};

describe('064 :: roles del flujo de concertación y superusuario (base real)', () => {
  let client: Client | null = null;
  beforeAll(async () => {
    try { client = new Client(conexion); await client.connect(); }
    catch { client = null; console.warn('  (sin base: omitido)'); }
  });
  afterAll(async () => { if (client) await client.end().catch(() => {}); });

  const permisosDe = async (rol: string): Promise<string[]> => (await client!.query(
    `SELECT p.code FROM auth.role r JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active
       JOIN auth.permission p ON p.id_permission = rp.id_permission WHERE r.code = $1 ORDER BY p.code`, [rol])).rows.map((r) => r.code);
  const caso = (nombre: string, fn: () => Promise<void>) => it(nombre, async () => { if (client) await fn(); });

  caso('SUPER_ADMIN tiene TODOS los permisos de Programación Académica y del portal del docente', async () => {
    const todos = (await client!.query(
      `SELECT code FROM auth.permission WHERE (code LIKE 'programacion-academica.%' OR code LIKE 'portal-transaccional.programacion-academica.%')
          AND COALESCE(is_active, TRUE)`)).rows.map((r) => r.code);
    expect(todos.length).toBeGreaterThanOrEqual(10);
    expect(await permisosDe('SUPER_ADMIN')).toEqual(expect.arrayContaining(todos));
  });

  caso('cada revisor resuelve la revisión de SU nivel, ve el módulo y no programa, asigna ni publica', async () => {
    for (const nivel of ['pregrado', 'posgrado']) {
      const permisos = await permisosDe(`REVISOR_DOCENCIA_${nivel.toUpperCase()}`);
      expect(permisos).toContain(`pta.review.academica.${nivel}`);
      expect(permisos).toContain('programacion-academica.docentes.disponibilidad');
      expect(permisos.filter((p) => /^programacion-academica\.(all|publicar|catalogo\.|asignacion-docente\.)/.test(p))).toEqual([]);
      expect(permisos).not.toContain(`pta.review.academica.${nivel === 'pregrado' ? 'posgrado' : 'pregrado'}`);
    }
  });

  caso('el aprobador resuelve la aprobación de la docencia en los dos niveles y ve el módulo', async () => {
    const permisos = await permisosDe('APROBADOR_DOCENCIA');
    expect(permisos).toEqual(expect.arrayContaining([
      'pta.approve.academica.pregrado', 'pta.approve.academica.posgrado', 'programacion-academica.docentes.disponibilidad',
    ]));
  });

  caso('los demás roles del flujo siguen con lo suyo', async () => {
    expect(await permisosDe('PROGRAMADOR_DOCENTE_PREGRADO')).toContain('programacion-academica.asignacion-docente.pregrado');
    expect(await permisosDe('PROGRAMADOR_PREGRADO')).toContain('programacion-academica.catalogo.pregrado');
    expect(await permisosDe('ADMIN_PROGRAMACION')).toContain('programacion-academica.all');
    expect(await permisosDe('DOCENTE')).toContain('portal-transaccional.programacion-academica.view');
    expect(await permisosDe('JEFATURA_TERRITORIAL')).toContain('pta.approve.academica.territorial.pregrado');
  });
});
