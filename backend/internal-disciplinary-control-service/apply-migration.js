
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'disciplinario_db',
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT) || 5432,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const migrationFile = path.resolve(__dirname, '../../db/migrations/023_create_auto_versions.sql');
        if (!fs.existsSync(migrationFile)) {
            console.error('Migration file not found:', migrationFile);
            return;
        }
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Running migration:', migrationFile);
        await client.query(sql);
        console.log('Migration executed successfully.');

    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
