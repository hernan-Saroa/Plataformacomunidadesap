import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('tareas_expediente', { schema: 'legal_management' })
export class TareaExpediente {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente, { nullable: false })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ nullable: true })
    titulo: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ name: 'fecha_vencimiento', type: 'timestamp', nullable: true })
    fechaVencimiento: Date;

    @Column({ default: 'media' })
    prioridad: string; // alta, media, baja

    @Column({ default: 'pendiente' })
    estado: string; // pendiente, en_proceso, completada, cancelada

    @Column({ name: 'responsable_id', type: 'uuid', nullable: true })
    responsableId: string | null;

    @Column({ name: 'responsable_nombre', nullable: true })
    responsableNombre: string;

    @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaCreacion: Date;

    @Column({ name: 'fecha_completada', type: 'timestamp', nullable: true })
    fechaCompletada: Date;

    @Column({ name: 'creado_por', nullable: true })
    creadoPor: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
