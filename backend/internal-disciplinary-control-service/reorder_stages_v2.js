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
        console.log('🔄 Starting Stage Reorder Process...');

        // 1. Rename EVALUACION -> VALORACION
        console.log('1️⃣  Renaming EVALUACION -> VALORACION');
        await client.query(`
            UPDATE "internal_disciplinary_control"."stage_configuration"
            SET "etapa" = 'VALORACION' WHERE "etapa" = 'EVALUACION';
        `);
        await client.query(`
            UPDATE "internal_disciplinary_control"."disciplinary_processes"
            SET "etapaActual" = 'VALORACION' WHERE "etapaActual" = 'EVALUACION';
        `);

        // 2. Rename FALLO -> SEGUNDA INSTANCIA
        console.log('2️⃣  Renaming FALLO -> SEGUNDA INSTANCIA');
        await client.query(`
            UPDATE "internal_disciplinary_control"."stage_configuration"
            SET "etapa" = 'SEGUNDA INSTANCIA' WHERE "etapa" = 'FALLO';
        `);
        await client.query(`
            UPDATE "internal_disciplinary_control"."disciplinary_processes"
            SET "etapaActual" = 'SEGUNDA INSTANCIA' WHERE "etapaActual" = 'FALLO';
        `);

        // 3. Insert new EVALUACION stage (if not exists)
        console.log('3️⃣  Creating new EVALUACION stage');
        // Check if exists first to avoid duplicate key error if re-run
        const checkEval = await client.query(`SELECT 1 FROM "internal_disciplinary_control"."stage_configuration" WHERE "etapa" = 'EVALUACION'`);
        if (checkEval.rowCount === 0) {
            await client.query(`
                INSERT INTO "internal_disciplinary_control"."stage_configuration" 
                ("etapa", "diasHabiles", "activo", "descripcion")
                VALUES ('EVALUACION', 10, true, 'Evaluación de investigación');
            `);
            console.log('   ✅ Created EVALUACION');
        } else {
            console.log('   ℹ️ EVALUACION already exists');
        }

        console.log('✅ Reorder process completed successfully.');

    } catch (err) {
        console.error('❌ Error executing query:', err);
    } finally {
        await client.end();
    }
}

run();
