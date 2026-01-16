import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { RequerimientoOC } from './requerimiento-oc.entity';

@Entity('respuesta_borrador_oc', { schema: 'legal_management' })
export class RespuestaBorradorOC {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'requerimiento_id', type: 'uuid' })
    requerimientoId: string;

    @OneToOne(() => RequerimientoOC)
    @JoinColumn({ name: 'requerimiento_id' })
    requerimiento: RequerimientoOC;

    @Column({ name: 'destinatario_nombre', length: 200, nullable: true })
    destinatarioNombre: string;

    @Column({ name: 'destinatario_email', length: 200, nullable: true })
    destinatarioEmail: string;

    @Column({ name: 'destinatario_cargo', length: 150, nullable: true })
    destinatarioCargo: string;

    @Column({ name: 'tipo_respuesta', length: 50, nullable: true })
    tipoRespuesta: string;

    @Column({ type: 'text', nullable: true })
    contenido: string;

    @Column({ name: 'documentos_adjuntos', type: 'jsonb', default: [] })
    documentosAdjuntos: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
