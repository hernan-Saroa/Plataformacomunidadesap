import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

@Entity('comentarios', { schema: 'legal_management' })
export class Comentario {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'expediente_id' })
    expedienteId: string;

    @ManyToOne(() => Expediente, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'expediente_id' })
    expediente: Expediente;

    @Column({ type: 'text' })
    contenido: string;

    @Column({ name: 'usuario_id', nullable: true })
    usuarioId: string;

    @Column({ name: 'usuario_nombre' })
    usuarioNombre: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
