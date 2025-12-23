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
        console.log('Connecting to database...');
        await client.connect();

        console.log('Converting etapaActual to VARCHAR...');

        // 1. Alter column to VARCHAR
        await client.query(`
            ALTER TABLE "internal_disciplinary_control"."disciplinary_processes" 
            ALTER COLUMN "etapaActual" TYPE VARCHAR(255);
        `);
        console.log('✅ Column etapaActual converted to VARCHAR.');

        // 2. Drop the old enum type (optional but clean)
        // We use a try-catch specifically here in case it's used elsewhere or doesn't exist
        try {
            await client.query(`
                DROP TYPE IF EXISTS "internal_disciplinary_control"."disciplinary_processes_etapaactual_enum";
            `);
            console.log('✅ Enum type dropped.');
        } catch (e) {
            console.warn('⚠️ Warning dropping enum type (might be in use):', e.message);
        }

    } catch (err) {
        console.error('❌ Error executing migration:', err);
    } finally {
        await client.end();
    }
}

run();
