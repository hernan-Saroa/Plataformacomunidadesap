import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('autos', { schema: 'legal_management' })
export class Auto {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id', type: 'uuid' })
    expedienteId: string;

    @ManyToOne(() => Expediente, (exp) => exp.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column()
    numero: string;

    @Column()
    tipo: string;

    @Column({ name: 'fecha_auto', type: 'timestamp' })
    fechaAuto: Date;

    @Column({ default: 'Juzgado Interno Disciplinario' })
    juzgado: string;

    @Column({ type: 'text', nullable: true })
    resumen: string;

    @Column({ default: 'Pendiente' })
    estado: string; // Pendiente, Notificado, Archivado

    @Column({ name: 'fecha_notificacion', type: 'timestamp', nullable: true })
    fechaNotificacion: Date;

    @Column({ name: 'archivo_url' })
    archivoUrl: string;

    @Column({ name: 'archivo_nombre' })
    archivoNombre: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
