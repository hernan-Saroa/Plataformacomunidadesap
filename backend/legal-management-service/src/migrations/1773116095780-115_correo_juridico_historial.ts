import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CorreoJuridicoHistorial1773116095780 implements MigrationInterface {
    name = 'CorreoJuridicoHistorial1773116095780';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'correo_juridico_historial',
                schema: 'legal_management',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'correo_juridico_id',
                        type: 'uuid',
                    },
                    {
                        name: 'tipo_evento',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'descripcion',
                        type: 'text',
                    },
                    {
                        name: 'detalle_json',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'usuario',
                        type: 'varchar',
                        length: '255',
                        default: "'Sistema'",
                    },
                    {
                        name: 'fecha_creacion',
                        type: 'timestamp',
                        default: 'NOW()',
                    },
                ],
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'legal_management.correo_juridico_historial',
            new TableForeignKey({
                columnNames: ['correo_juridico_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'correo_juridico',
                referencedSchema: 'legal_management',
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createIndex(
            'legal_management.correo_juridico_historial',
            new TableIndex({
                name: 'idx_correo_historial_correo_id',
                columnNames: ['correo_juridico_id'],
            }),
        );

        await queryRunner.createIndex(
            'legal_management.correo_juridico_historial',
            new TableIndex({
                name: 'idx_correo_historial_tipo_evento',
                columnNames: ['tipo_evento'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('legal_management.correo_juridico_historial', true);
    }
}
