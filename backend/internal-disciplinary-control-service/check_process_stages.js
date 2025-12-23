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

        const query = `
            SELECT 
                "etapaActual", 
                COUNT(*) as count, 
                STRING_AGG("radicadoProceso", ', ') as radicados
            FROM "internal_disciplinary_control"."disciplinary_processes"
            GROUP BY "etapaActual"
            ORDER BY "etapaActual";
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
