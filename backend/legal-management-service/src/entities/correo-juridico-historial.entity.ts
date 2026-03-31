import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CorreoJuridico } from './correo-juridico.entity';

@Entity('correo_juridico_historial', { schema: 'legal_management' })
export class CorreoJuridicoHistorial {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'correo_juridico_id', type: 'uuid' })
    correoJuridicoId: string;

    @ManyToOne(() => CorreoJuridico, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'correo_juridico_id' })
    correoJuridico: CorreoJuridico;

    @Column({ name: 'tipo_evento', length: 50 })
    tipoEvento: string; // RECIBIDO, CLASIFICADO_IA, CLASIFICACION_MANUAL, ASOCIADO_PROCESO, LEIDO, ARCHIVADO, RESPONDIDO, REENVIADO

    @Column({ type: 'text' })
    descripcion: string;

    @Column({ name: 'detalle_json', type: 'jsonb', nullable: true })
    detalleJson: any;

    @Column({ length: 255, default: 'Sistema' })
    usuario: string;

    @CreateDateColumn({ name: 'fecha_creacion' })
    fechaCreacion: Date;
}
