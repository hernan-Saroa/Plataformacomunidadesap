import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('actuaciones', { schema: 'legal_management' })
export class Actuacion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id', type: 'uuid' })
    expedienteId: string;

    @ManyToOne(() => Expediente, (expediente) => expediente.actuaciones, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

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

    @Column({ default: 'MANUAL' })
    origen: string; // 'MANUAL', 'AUDIENCIA', 'AUTO', 'ACTA', 'EVIDENCIA', 'OFICIO'

    @Column({ name: 'referencia_id', type: 'uuid', nullable: true })
    referenciaId: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
