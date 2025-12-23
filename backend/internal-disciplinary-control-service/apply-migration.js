
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Client } = require('pg');
const fs = require('fs');


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

        const migrationArg = process.argv[2];
        if (!migrationArg) {
            console.error('Please provide a migration file path or SQL string');
            return;
        }

        // Check if argument is a file path
        let sql;
        if (migrationArg.endsWith('.sql')) {
            const migrationFile = path.resolve(process.cwd(), migrationArg); // Resolve from CWD
            if (!fs.existsSync(migrationFile)) {
                console.error('Migration file not found:', migrationFile);
                return;
            }
            sql = fs.readFileSync(migrationFile, 'utf8');
            console.log('Running migration file:', migrationFile);
        } else {
            // Treat as raw SQL
            sql = migrationArg;
            console.log('Running raw SQL');
        }
        await client.query(sql);
        console.log('Migration executed successfully.');

    } catch (err) {
        console.error('CRITICAL MIGRATION ERROR:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
