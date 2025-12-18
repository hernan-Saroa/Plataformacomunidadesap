const { Client } = require('pg');
require('dotenv').config();

// Ajustar credenciales manualmente si dotenv no las carga bien desde el root vs carpeta
const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'esap_db',
});

const fs = require('fs');
const path = require('path');

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const sqlPath = path.join(__dirname, '../../db/init/02_actuaciones_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await client.query(sql);
        console.log('Schema applied successfully');
    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        await client.end();
    }
}

run();
