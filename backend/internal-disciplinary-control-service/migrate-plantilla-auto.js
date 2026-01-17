const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'esap_db',
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT) || 5432,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');

        const migrationFile = path.resolve(__dirname, 'create_plantilla_auto_table.sql');

        if (!fs.existsSync(migrationFile)) {
            console.error('❌ Archivo de migración no encontrado:', migrationFile);
            return;
        }

        console.log('📄 Ejecutando migración:', migrationFile);
        const sql = fs.readFileSync(migrationFile, 'utf8');

        await client.query(sql);
        console.log('✅ Migración ejecutada exitosamente');

        // Verificar que la tabla se creó
        const result = await client.query(`
            SELECT COUNT(*) as total_registros
            FROM internal_disciplinary_control.plantilla_auto
        `);

        console.log(`📊 Tabla plantilla_auto creada con ${result.rows[0].total_registros} registros`);

    } catch (err) {
        console.error('❌ ERROR CRÍTICO EN MIGRACIÓN:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

console.log('🚀 Iniciando migración de tabla plantilla_auto...');
runMigration();