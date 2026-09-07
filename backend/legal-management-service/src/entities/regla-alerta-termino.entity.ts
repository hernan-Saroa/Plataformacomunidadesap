import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('terminos_reglas_alerta', { schema: 'legal_management' })
export class ReglaAlertaTermino {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'horas_anticipacion', type: 'int' })
    horasAnticipacion: number;

    @Column({ type: 'boolean', default: true })
    @Index()
    activa: boolean;

    @Column({ name: 'enviar_email', type: 'boolean', default: true })
    enviarEmail: boolean;

    @Column({ name: 'notificar_in_app', type: 'boolean', default: true })
    notificarInApp: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    descripcion: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
    updatedAt: Date;
}
