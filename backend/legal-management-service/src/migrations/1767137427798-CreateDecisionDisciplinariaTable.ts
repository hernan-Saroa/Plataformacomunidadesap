import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDecisionDisciplinariaTable1767137427798 implements MigrationInterface {
    name = 'CreateDecisionDisciplinariaTable1767137427798'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "legal_management"."decisiones_disciplinarias" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo_decision" character varying NOT NULL, "tipo_fallo" character varying NOT NULL, "sancion" character varying, "consideraciones" text NOT NULL, "fundamentos_juridicos" text, "responsable" character varying NOT NULL, "cargo_responsable" character varying, "fecha" date NOT NULL DEFAULT ('now'::text)::date, "expediente_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dcb7b6988f0a85dbb60585bc89b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "legal_management"."decisiones_disciplinarias" ADD CONSTRAINT "FK_f8e1c8a8347b53fbb8f915357c1" FOREIGN KEY ("expediente_id") REFERENCES "legal_management"."expedientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "legal_management"."decisiones_disciplinarias" DROP CONSTRAINT "FK_f8e1c8a8347b53fbb8f915357c1"`);
        await queryRunner.query(`DROP TABLE "legal_management"."decisiones_disciplinarias"`);
    }
}
