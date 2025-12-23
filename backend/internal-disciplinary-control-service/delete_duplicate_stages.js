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

        console.log('🗑️ Deleting duplicate accented stages...');

        // Stages to delete (accented versions that are not being used)
        const duplicates = [
            'RECEPCIÓN',
            'VALORACIÓN',
            'INDAGACIÓN',
            'INVESTIGACIÓN'
        ];

        const query = `
            DELETE FROM "internal_disciplinary_control"."stage_configuration"
            WHERE "etapa" = ANY($1)
            RETURNING etapa;
        `;

        const res = await client.query(query, [duplicates]);

        if (res.rowCount > 0) {
            console.log(`✅ Successfully deleted ${res.rowCount} duplicate stages:`);
            console.table(res.rows.map(r => r.etapa));
        } else {
            console.log('ℹ️ No duplicates found to delete.');
        }

    } catch (err) {
        console.error('❌ Error executing query:', err);
    } finally {
        await client.end();
    }
}

run();
