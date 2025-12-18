
import { DataSource } from "typeorm";
import { DisciplinaryProcess } from "./src/entities/disciplinary-process.entity";
import { DisciplinaryProfessional } from "./src/entities/disciplinary-professional.entity";
import { DisciplinaryNews } from "./src/entities/disciplinary-news.entity";
import { LegalAuto } from "./src/entities/legal-auto.entity";
import { Evidence } from "./src/entities/evidence.entity";

async function check() {
    const AppDataSource = new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "password",
        database: process.env.DB_NAME || "esap_db",
        entities: [DisciplinaryProcess, DisciplinaryProfessional, DisciplinaryNews, LegalAuto, Evidence],
        synchronize: false,
    });

    await AppDataSource.initialize();

    await AppDataSource.initialize();

    console.log("=== RAW SQL: PROCESOS ===");
    const rawProcs = await AppDataSource.query(`
        SELECT p.radicado_proceso, p.abogado_asignado_id, prof.nombre_completo 
        FROM internal_disciplinary_control.disciplinary_processes p
        LEFT JOIN internal_disciplinary_control.disciplinary_professional prof ON p.abogado_asignado_id = prof.id
    `);
    console.table(rawProcs);

    console.log("=== RAW SQL: PROFESIONALES ===");
    const rawProfs = await AppDataSource.query(`SELECT id, nombre_completo, estado FROM internal_disciplinary_control.disciplinary_professional`);
    console.table(rawProfs);

    await AppDataSource.destroy();
}

check().catch(console.error);
