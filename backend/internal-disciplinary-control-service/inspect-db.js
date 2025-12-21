
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

async function runHelper() {
    try {
        await client.connect();
        console.log('Connected.');

        // Check columns
        const res = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_schema = 'internal_disciplinary_control' 
      AND table_name = 'disciplinary_news';
    `);
        console.table(res.rows);

        await client.end();
    } catch (err) {
        console.error(err);
        await client.end();
    }
}

runHelper();
