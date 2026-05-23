import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RequerimientoOC } from './requerimiento-oc.entity';

@Entity({ name: 'comentarios_oc', schema: 'legal_management' })
export class ComentarioOC {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'requerimiento_id', type: 'uuid' })
    requerimientoId: string;

    @ManyToOne(() => RequerimientoOC, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requerimiento_id' })
    requerimiento: RequerimientoOC;

    @Column({ type: 'text' })
    contenido: string;

    @Column({ type: 'varchar', length: 30, default: 'general' })
    tipo: string;

    @Column({ name: 'autor_id', type: 'uuid', nullable: true })
    autorId?: string;

    @Column({ name: 'autor_nombre', type: 'varchar', length: 200, nullable: true })
    autorNombre?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
