const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function run() {
    try {
        await client.connect();

        console.log('--- Configured Stages (internal_disciplinary_control.stage_configuration) ---');
        const query = `
            SELECT id, etapa, "diasHabiles", activo 
            FROM "internal_disciplinary_control"."stage_configuration"
            ORDER BY etapa;
        `;

        const res = await client.query(query);
        console.table(res.rows);

    } catch (err) {
        console.error('❌ Error executing query:', err);
    } finally {
        await client.end();
    }
}

run();
