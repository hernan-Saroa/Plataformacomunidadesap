/**
 * Conexión a la base del servicio de viáticos.
 *
 * El código lee DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME (es lo que
 * inyecta docker-compose). La plantilla .env.example traía solo los nombres
 * DATABASE_*; con un .env hecho desde ella, DB_NAME quedaba sin definir y el
 * driver de Postgres se conectaba EN SILENCIO a la base con el nombre del
 * usuario ('postgres'), donde no existe el esquema travel_expenses. El síntoma:
 * "relation travel_expenses.solicitudes_comision does not exist" cada 15 min
 * en el barrido de legalización (EFDS-1309).
 *
 * Ahora acepta los dos nombres (DB_* primero) y, si falta lo esencial, no
 * arranca: dice qué variable falta.
 */
export interface ConexionDb {
  host: string;
  port: number;
  username: string;
  password: string | undefined;
  database: string;
}

const primero = (env: NodeJS.ProcessEnv, ...nombres: string[]): string | undefined => {
  for (const n of nombres) {
    const v = env[n];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
};

export function conexionDb(env: NodeJS.ProcessEnv = process.env): ConexionDb {
  const host = primero(env, 'DB_HOST', 'DATABASE_HOST');
  const port = primero(env, 'DB_PORT', 'DATABASE_PORT') ?? '5432';
  const username = primero(env, 'DB_USER', 'DATABASE_USER');
  const password = primero(env, 'DB_PASS', 'DB_PASSWORD', 'DATABASE_PASSWORD');
  const database = primero(env, 'DB_NAME', 'DATABASE_NAME');

  const faltan = [
    !host && 'DB_HOST (o DATABASE_HOST)',
    !username && 'DB_USER (o DATABASE_USER)',
    !database && 'DB_NAME (o DATABASE_NAME)',
  ].filter(Boolean);
  if (faltan.length) {
    throw new Error(
      `travel-expenses-service: falta configurar la base de datos: ${faltan.join(', ')}. `
        + 'Sin DB_NAME, Postgres se conecta a la base "postgres", que no tiene el esquema travel_expenses.',
    );
  }
  const puerto = Number(port);
  if (!Number.isInteger(puerto) || puerto <= 0) {
    throw new Error(`travel-expenses-service: DB_PORT no es un puerto válido: "${port}".`);
  }
  return { host: host!, port: puerto, username: username!, password, database: database! };
}
