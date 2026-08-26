import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('terminos_alertas_enviadas', { schema: 'legal_management' })
export class AlertaTerminoEnviada {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'termino_id', type: 'uuid' })
    @Index()
    terminoId: string;

    // NULL representa el envío de la anticipación personalizada del propio término
    // (horas_anticipacion_alerta_personalizada), no ligado a ninguna regla nombrada.
    @Column({ name: 'regla_id', type: 'uuid', nullable: true })
    reglaId: string | null;

    @CreateDateColumn({ name: 'fecha_envio', type: 'timestamp with time zone' })
    fechaEnvio: Date;
}
