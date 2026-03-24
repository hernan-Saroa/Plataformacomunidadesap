const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'esap_db',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = "UPDATE legal_management.correos_juridicos SET ai_suggested_category = NULL, categoria = NULL, tipo = 'CORREO' WHERE tipo = 'OFICIO' OR categoria = 'OFICIO';";
        console.log('Executing SQL:', sql);

        const res = await client.query(sql);
        console.log(`Reset complete. Affected rows: ${res.rowCount}`);
    } catch (err) {
        console.error('Error executing reset:', err);
    } finally {
        await client.end();
    }
}

run();
