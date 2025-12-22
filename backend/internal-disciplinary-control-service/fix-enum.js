
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
    await client.connect();

    // 1. Get enum type name
    const colRes = await client.query(`
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'internal_disciplinary_control' 
    AND table_name = 'disciplinary_news' 
    AND column_name = 'estado'
  `);

    const udtName = colRes.rows[0]?.udt_name;
    console.log('Enum Type Name:', udtName);

    if (!udtName) {
        console.error('Could not find enum type name');
        process.exit(1);
    }

    try {
        // 2. Add value
        // Note: SCHEMA must be included if the type is in a specific schema
        // udtName usually doesn't include schema in information_schema
        const schema = 'internal_disciplinary_control';
        const fullTypeName = `"${schema}"."${udtName}"`;

        console.log(`Adding ARCHIVADA to ${fullTypeName}...`);
        await client.query(`ALTER TYPE ${fullTypeName} ADD VALUE IF NOT EXISTS 'ARCHIVADA'`);
        console.log('Successfully added ARCHIVADA to enum.');
    } catch (err) {
        console.error('Error altering type:', err);
    }

    await client.end();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
