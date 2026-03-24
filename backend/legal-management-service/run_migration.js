const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'Plataformacomunidadesap',
    password: 'root', // Assuming default or common local dev password, might need to fail if wrong
    port: 5432,
});

async function runMigration() {
    try {
        await client.connect();
        const res = await client.query(`ALTER TABLE legal_management.audiencias ADD COLUMN IF NOT EXISTS historial JSONB DEFAULT '[]'::jsonb;`);
        console.log('Migration successful:', res);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
