const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'password',
        database: process.env.DB_NAME || 'esap_db',
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const migrationPath = path.join(__dirname, '../../db/migrations/113_change_expediente_id_string.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration 113...');
        await client.query(migrationSql);
        console.log('Migration 113 applied successfully.');

    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        await client.end();
    }
}

runMigration();
