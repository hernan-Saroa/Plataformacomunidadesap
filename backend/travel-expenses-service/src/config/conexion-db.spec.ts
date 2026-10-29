import { conexionDb } from './conexion-db';

/**
 * Viáticos: sin base configurada el servicio no arranca, en vez de conectarse en
 * silencio a la base "postgres" (sin el esquema travel_expenses). Ese era el
 * origen de "relation travel_expenses.solicitudes_comision does not exist" en el
 * barrido de legalización (EFDS-1309) con un .env hecho desde la plantilla.
 */
describe('travel-expenses: configuración de la base', () => {
  it('lee los nombres DB_* (los que inyecta docker-compose)', () => {
    expect(conexionDb({ DB_HOST: 'db', DB_PORT: '5432', DB_USER: 'u', DB_PASS: 'p', DB_NAME: 'esap_db' }))
      .toEqual({ host: 'db', port: 5432, username: 'u', password: 'p', database: 'esap_db' });
  });

  it('acepta los nombres DATABASE_* de la plantilla anterior', () => {
    expect(conexionDb({ DATABASE_HOST: 'localhost', DATABASE_PORT: '55432', DATABASE_USER: 'postgres', DATABASE_PASSWORD: 'x', DATABASE_NAME: 'esap_db' }))
      .toEqual({ host: 'localhost', port: 55432, username: 'postgres', password: 'x', database: 'esap_db' });
  });

  it('DB_* manda sobre DATABASE_* y el puerto por defecto es 5432', () => {
    const c = conexionDb({ DB_HOST: 'a', DATABASE_HOST: 'b', DB_USER: 'u', DB_NAME: 'esap_db', DATABASE_NAME: 'otra' });
    expect([c.host, c.database, c.port]).toEqual(['a', 'esap_db', 5432]);
  });

  it('sin DB_NAME no arranca, y dice qué falta (no cae en la base "postgres")', () => {
    expect(() => conexionDb({ DB_HOST: 'localhost', DB_USER: 'postgres' })).toThrow(/DB_NAME \(o DATABASE_NAME\)/);
    expect(() => conexionDb({})).toThrow(/DB_HOST.*DB_USER.*DB_NAME/);
    expect(() => conexionDb({ DB_HOST: 'h', DB_USER: 'u', DB_NAME: 'n', DB_PORT: 'abc' })).toThrow(/puerto válido/);
  });
});
