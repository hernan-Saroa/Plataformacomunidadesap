import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { RequerimientoOC } from './requerimiento-oc.entity';

export type TipoHallazgo = 'ADMINISTRATIVO' | 'FISCAL' | 'DISCIPLINARIO' | 'PENAL';
export type EstadoHallazgo = 'ABIERTO' | 'EN_CURSO' | 'EN_REVISION' | 'CERRADO' | 'RECHAZADO';
export type PeriodicidadReporte = 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

@Entity('hallazgos', { schema: 'legal_management' })
export class Hallazgo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'requerimiento_id', type: 'uuid', nullable: true })
    requerimientoId: string;

    @ManyToOne(() => RequerimientoOC, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'requerimiento_id' })
    requerimiento: RequerimientoOC;

    @Column({ name: 'codigo_hallazgo', length: 50, unique: true })
    codigoHallazgo: string;

    @Column({ name: 'numero_interno', length: 50, nullable: true })
    numeroInterno: string;

    @Column({ name: 'tipo_hallazgo', length: 30, default: 'ADMINISTRATIVO' })
    tipoHallazgo: TipoHallazgo;

    @Column({ length: 300 })
    titulo: string;

    @Column({ type: 'text' })
    descripcion: string;

    @Column({ name: 'causa_raiz', type: 'text', nullable: true })
    causaRaiz: string;

    @Column({ type: 'text', nullable: true })
    efecto: string;

    @Column({ name: 'area_responsable', length: 150, nullable: true })
    areaResponsable: string;

    @Column({ name: 'funcionario_responsable', length: 200, nullable: true })
    funcionarioResponsable: string;

    @Column({ name: 'accion_correctiva', type: 'text' })
    accionCorrectiva: string;

    @Column({ name: 'fecha_compromiso', type: 'date' })
    fechaCompromiso: Date;

    @Column({ name: 'indicador_cumplimiento', type: 'text', nullable: true })
    indicadorCumplimiento: string;

    @Column({ name: 'meta_indicador', length: 100, nullable: true })
    metaIndicador: string;

    @Column({ length: 30, default: 'ABIERTO' })
    estado: EstadoHallazgo;

    @Column({ name: 'porcentaje_avance', default: 0 })
    porcentajeAvance: number;

    @Column({ name: 'fecha_ultimo_reporte', type: 'timestamp', nullable: true })
    fechaUltimoReporte: Date;

    @Column({ name: 'fecha_proximo_reporte', type: 'date', nullable: true })
    fechaProximoReporte: Date;

    @Column({ name: 'periodicidad_reporte', length: 20, default: 'TRIMESTRAL' })
    periodicidadReporte: PeriodicidadReporte;

    @Column({ name: 'documento_plan_url', type: 'text', nullable: true })
    documentoPlanUrl: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'created_by', length: 150, nullable: true })
    createdBy: string;
}
