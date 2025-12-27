import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('evidencias')
export class Evidencia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente)
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ name: 'aportado_por', nullable: true })
    aportadoPor: string;

    @Column({ name: 'fecha_presentacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaPresentacion: Date;

    @Column({ name: 'archivo_nombre', nullable: true })
    archivoNombre: string;

    @Column({ name: 'archivo_url', type: 'text', nullable: true })
    archivoUrl: string;

    @Column({ name: 'archivo_tamano', nullable: true })
    archivoTamano: number;

    @Column({ nullable: true })
    tipo: string;

    @Column({ nullable: true })
    prioridad: string;

    @Column({ default: 'En Revisión' })
    estado: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
