
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

    // 1. Check estado column type
    const colRes = await client.query(`
    SELECT column_name, udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'internal_disciplinary_control' 
    AND table_name = 'disciplinary_news' 
    AND column_name = 'estado'
  `);
    console.log('Estado Column Type:', colRes.rows[0]);

    // 2. Check enum values if it is an enum
    const udtName = colRes.rows[0]?.udt_name;
    if (udtName && udtName !== 'varchar') {
        const enumRes = await client.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = $1
     `, [udtName]);
        console.log('Enum Values:', enumRes.rows.map(r => r.enumlabel));
    }

    // 3. Check historialAuditoria existence
    const histRes = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'internal_disciplinary_control' 
    AND table_name = 'disciplinary_news' 
    AND column_name = 'historialAuditoria'
  `);
    console.log('Historial Column exists:', histRes.rowCount > 0);

    await client.end();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
