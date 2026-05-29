const { Client } = require('pg');

async function run() {
  const hostClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  const dockerClient = new Client({
    host: 'localhost',
    port: 8080,
    user: 'postgres',
    password: 'password',
    database: 'esap_db',
  });

  try {
    await hostClient.connect();
    await dockerClient.connect();

    console.log('Connected to both databases.');

    // Ensure schema and table exist in Docker
    await dockerClient.query('CREATE SCHEMA IF NOT EXISTS auth;');
    await dockerClient.query(`
      CREATE TABLE IF NOT EXISTS auth.migrations_db_log (
        filename TEXT PRIMARY KEY,
        executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
      );
    `);

    // Get rows from host
    const { rows: hostRows } = await hostClient.query('SELECT filename, executed_at FROM auth.migrations_db_log;');
    console.log(`Fetched ${hostRows.length} migration log rows from host.`);

    let insertedCount = 0;
    for (const row of hostRows) {
      try {
        await dockerClient.query(
          'INSERT INTO auth.migrations_db_log (filename, executed_at) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING;',
          [row.filename, row.executed_at]
        );
        insertedCount++;
      } catch (err) {
        console.error(`Failed to insert ${row.filename}:`, err.message);
      }
    }

    console.log(`Successfully synced ${insertedCount} migration log rows to Docker.`);
  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    await hostClient.end();
    await dockerClient.end();
  }
}

run();
