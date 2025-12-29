import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RequerimientoOC } from './requerimiento-oc.entity';

export type EstadoInsumo = 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADO' | 'RECHAZADO' | 'VENCIDO';

@Entity('solicitudes_insumos', { schema: 'legal_management' })
export class SolicitudInsumo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'requerimiento_id', type: 'uuid' })
    requerimientoId: string;

    @ManyToOne(() => RequerimientoOC, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requerimiento_id' })
    requerimiento: RequerimientoOC;

    @Column({ name: 'area_destino', length: 150 })
    areaDestino: string;

    @Column({ name: 'funcionario_destino', length: 200, nullable: true })
    funcionarioDestino: string;

    @Column({ name: 'email_destino', length: 150, nullable: true })
    emailDestino: string;

    @Column({ name: 'descripcion_solicitud', type: 'text' })
    descripcionSolicitud: string;

    @Column({ name: 'documentos_solicitados', type: 'text', nullable: true })
    documentosSolicitados: string;

    @Column({ name: 'fecha_solicitud', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaSolicitud: Date;

    @Column({ name: 'fecha_vencimiento_interna', type: 'timestamp' })
    fechaVencimientoInterna: Date;

    @Column({ name: 'fecha_respuesta', type: 'timestamp', nullable: true })
    fechaRespuesta: Date;

    @Column({ length: 25, default: 'PENDIENTE' })
    estado: EstadoInsumo;

    @Column({ name: 'documentos_entregados_url', type: 'text', nullable: true })
    documentosEntregadosUrl: string;

    @Column({ name: 'comentario_respuesta', type: 'text', nullable: true })
    comentarioRespuesta: string;

    @Column({ name: 'solicitado_por', length: 150, nullable: true })
    solicitadoPor: string;

    @Column({ name: 'respondido_por', length: 150, nullable: true })
    respondidoPor: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
