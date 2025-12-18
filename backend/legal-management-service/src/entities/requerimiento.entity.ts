import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrganismoControl } from './organismo-control.entity';

@Entity({ schema: 'requerimientos_oc', name: 'requerimientos' })
export class Requerimiento {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'radicado_externo', length: 50 })
    radicadoExterno: string;

    @Column({ name: 'radicado_interno', length: 20, unique: true })
    radicadoInterno: string;

    @Column({ name: 'entidad_id' })
    entidadId: number;

    // Relación Many-to-One con OrganismoControl
    @ManyToOne(() => OrganismoControl, (organismo) => organismo.requerimientos, { eager: true })
    @JoinColumn({ name: 'entidad_id' })
    entidad: OrganismoControl;

    @Column({ type: 'text' })
    asunto: string;

    @Column({ name: 'tipo_requerimiento', type: 'varchar' }) // Enum handling simplified to varchar for broader compatibility, or we can enforce enum
    tipoRequerimiento: string; // 'INFORMACION', 'AUDITORIA', 'HALLAZGO', 'AJUSTE'

    @Column({ name: 'fecha_recepcion', type: 'date' })
    fechaRecepcion: string; // TypeORM maps date to string usually for checks

    @Column({ name: 'fecha_vencimiento', type: 'date' })
    fechaVencimiento: string;

    @Column({ default: 'EN_PREPARACION' })
    estado: string;

    @Column({ name: 'prioridad_calculada', default: 'NORMAL' })
    prioridadCalculada: string;

    @Column({ name: 'archivo_adjunto_url', nullable: true })
    archivoAdjuntoUrl: string;

    @Column({ name: 'usuario_asignado_id', nullable: true })
    usuarioAsignadoId: number;

    @CreateDateColumn({ name: 'auditoria_created_at' })
    auditoriaCreatedAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
