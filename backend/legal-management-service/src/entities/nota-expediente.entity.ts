import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('notas_expediente', { schema: 'legal_management' })
export class NotaExpediente {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente, { nullable: false })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ type: 'text' })
    contenido: string;

    @Column({ default: 'general' })
    tipo: string; // importante, seguimiento, informacion, general, alerta

    @Column({ name: 'autor_id', type: 'uuid', nullable: true })
    autorId: string | null;

    @Column({ name: 'autor_nombre', nullable: true })
    autorNombre: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
