import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('actuaciones', { schema: 'legal_management' })
export class Actuacion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Changed to simple string column to support both GUIDs (Judicial) and Radicados (Disciplinario)
    // FK constraint was removed in DB to allow this polymorphism
    @Column({ name: 'expediente_id', type: 'varchar', length: 255 })
    expedienteId: string;

    // Data populated manually if needed, no ORM relation
    expediente?: Expediente;

    @Column({ name: 'tipo_actuacion', default: 'ACTUACION' })
    tipoActuacion: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ name: 'fecha_actuacion', type: 'timestamp' })
    fechaActuacion: Date;

    @Column({ name: 'documento_url', nullable: true })
    documentoUrl: string;

    @Column({ name: 'documento_nombre', nullable: true })
    documentoNombre: string;

    @Column({ name: 'usuario_responsable', default: 'Sistema' })
    usuarioResponsable: string;

    // Id del usuario (auth."user") asignado como responsable de la actuación, usado para
    // notificarle que tiene una nueva actividad pendiente. `usuarioResponsable` arriba solo
    // guarda el nombre para mostrar y no basta para resolver a quién notificar.
    @Column({ name: 'responsable_id', type: 'varchar', length: 255, nullable: true })
    responsableId?: string;

    @Column({ default: 'MANUAL' })
    origen: string; // 'MANUAL', 'AUDIENCIA', 'AUTO', 'ACTA', 'EVIDENCIA', 'OFICIO'

    @Column({ name: 'referencia_id', type: 'uuid', nullable: true })
    referenciaId: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
