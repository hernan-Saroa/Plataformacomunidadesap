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
        console.log('🔄 Renaming Stage: INDAGACION -> INDAGACION PREVIA');

        const newName = 'INDAGACION PREVIA';

        // 1. Update Configuration (The source of the "Stage" column in UI)
        // We look for 'INDAGACION' (unaccented) which is the one causing issues
        const updateConfig = `
            UPDATE "internal_disciplinary_control"."stage_configuration"
            SET "etapa" = $1
            WHERE "etapa" = 'INDAGACION';
        `;
        const resConfig = await client.query(updateConfig, [newName]);
        console.log(`✅ Stage Configuration updated: ${resConfig.rowCount} row(s)`);

        // 2. Update Processes
        // We update both 'INDAGACION' and 'INDAGACION_PREVIA' (from the old enum default)
        // to match the new configuration name exactly.
        const updateProcesses = `
            UPDATE "internal_disciplinary_control"."disciplinary_processes"
            SET "etapaActual" = $1
            WHERE "etapaActual" IN ('INDAGACION', 'INDAGACION_PREVIA');
        `;
        const resProcess = await client.query(updateProcesses, [newName]);
        console.log(`✅ Disciplinary Processes updated: ${resProcess.rowCount} row(s)`);

    } catch (err) {
        console.error('❌ Error executing query:', err);
    } finally {
        await client.end();
    }
}

run();
