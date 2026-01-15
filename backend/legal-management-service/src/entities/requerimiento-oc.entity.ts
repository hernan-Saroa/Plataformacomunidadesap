import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { OrganismoControlOC } from './organismo-control-legal.entity';
import { Abogado } from './abogado.entity';
import { DocumentoOC } from './documento-oc.entity';

export type TipoRequerimiento = 'SOLICITUD_INFORMACION' | 'APERTURA_AUDITORIA' | 'NOTIFICACION_HALLAZGO' | 'PLAN_MEJORAMIENTO' | 'OTRO';
export type UnidadTiempo = 'HORAS' | 'DIAS_CALENDARIO' | 'DIAS_HABILES';
export type EstadoRequerimiento = 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO' | 'CERRADO' | 'VENCIDO';
export type Prioridad = 'CRITICA' | 'ALTA' | 'NORMAL' | 'BAJA';

@Entity('requerimientos_oc', { schema: 'legal_management' })
export class RequerimientoOC {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'radicado_externo', length: 100 })
    radicadoExterno: string;

    @Column({ name: 'radicado_interno', length: 30, unique: true })
    radicadoInterno: string;

    @Column({ name: 'organismo_id', nullable: true })
    organismoId: number;

    @ManyToOne(() => OrganismoControlOC, (org: OrganismoControlOC) => org.requerimientos, { eager: true })
    @JoinColumn({ name: 'organismo_id' })
    organismo: OrganismoControlOC;

    @Column({ name: 'tipo_requerimiento', length: 50 })
    tipoRequerimiento: TipoRequerimiento;

    @Column({ type: 'text' })
    asunto: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ name: 'fecha_recepcion', type: 'timestamp' })
    fechaRecepcion: Date;

    @Column({ name: 'unidad_tiempo', length: 20, default: 'DIAS_HABILES' })
    unidadTiempo: UnidadTiempo;

    @Column({ name: 'plazo_otorgado', default: 15 })
    plazoOtorgado: number;

    @Column({ name: 'fecha_vencimiento', type: 'timestamp' })
    fechaVencimiento: Date;

    @Column({ name: 'funcionario_responsable', length: 200, nullable: true })
    funcionarioResponsable: string;

    @Column({ name: 'area_responsable', length: 150, nullable: true })
    areaResponsable: string;

    @Column({ name: 'abogado_asignado_id', type: 'uuid', nullable: true })
    abogadoAsignadoId: string;

    @ManyToOne(() => Abogado, { eager: true, nullable: true })
    @JoinColumn({ name: 'abogado_asignado_id' })
    abogadoAsignado: Abogado;

    @Column({ length: 30, default: 'RECIBIDO' })
    estado: EstadoRequerimiento;

    @Column({ length: 15, default: 'NORMAL' })
    prioridad: Prioridad;

    @Column({ name: 'archivo_adjunto_url', type: 'text', nullable: true })
    archivoAdjuntoUrl: string;

    @Column({ name: 'oficio_respuesta_url', type: 'text', nullable: true })
    oficioRespuestaUrl: string;

    @Column({ name: 'acuse_recibo_url', type: 'text', nullable: true })
    acuseReciboUrl: string;

    @Column({ name: 'fecha_respuesta', type: 'timestamp', nullable: true })
    fechaRespuesta: Date;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ name: 'created_by', length: 150, nullable: true })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => DocumentoOC, (doc: DocumentoOC) => doc.requerimiento)
    documentos: DocumentoOC[];

    // Campos calculados (no en BD)
    documentosCount?: number;
    diasRestantes?: number;
    docRequerimientos?: number;
    docRespuestas?: number;
    docSoportes?: number;
    docInternos?: number;
}
