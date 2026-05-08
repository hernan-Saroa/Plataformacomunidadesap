import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Abogado } from './abogado.entity';

export type TipoRiesgo = 'GESTION' | 'CORRUPCION' | 'SEGURIDAD_DIGITAL' | 'FISCAL';
export type ZonaRiesgo = 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO';
export type EtapaRiesgo = 'IDENTIFICADO' | 'ANALIZADO' | 'VALORADO' | 'TRATAMIENTO' | 'MONITOREO' | 'CERRADO' | 'MATERIALIZADO';
export type EstadoRiesgo = 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO' | 'CERRADO';

@Entity('riesgos', { schema: 'legal_management' })
export class Riesgo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 30, unique: true })
    codigo: string;

    @Column({ length: 255 })
    nombre: string;

    @Column({ type: 'text' })
    descripcion: string;

    @Column({ length: 100 })
    proceso: string;

    @Column({ name: 'tipo_riesgo', length: 30 })
    tipoRiesgo: TipoRiesgo;

    @Column({ length: 30, default: 'IDENTIFICADO' })
    etapa: EtapaRiesgo;

    // Valoración Inherente
    @Column({ name: 'probabilidad_inherente', default: 3 })
    probabilidadInherente: number;

    @Column({ name: 'impacto_inherente', default: 3 })
    impactoInherente: number;

    @Column({ name: 'zona_inherente', length: 20, default: 'MODERADO' })
    zonaInherente: ZonaRiesgo;

    // Valoración Residual
    @Column({ name: 'probabilidad_residual', default: 3 })
    probabilidadResidual: number;

    @Column({ name: 'impacto_residual', default: 3 })
    impactoResidual: number;

    @Column({ name: 'zona_residual', length: 20, default: 'MODERADO' })
    zonaResidual: ZonaRiesgo;

    // Análisis (JSON arrays)
    @Column({ type: 'jsonb', default: [] })
    causas: string[];

    @Column({ type: 'jsonb', default: [] })
    consecuencias: string[];

    // Controles y Plan de Tratamiento (JSON)
    @Column({ name: 'controles_existentes', type: 'jsonb', default: [] })
    controlesExistentes: {
        id: string;
        descripcion: string;
        efectividad: number;
    }[];

    @Column({ name: 'plan_tratamiento', type: 'jsonb', default: [] })
    planTratamiento: {
        accion: string;
        responsable: string;
        fechaLimite: Date;
        estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA';
        avance: number;
    }[];

    // Responsable
    @Column({ length: 200 })
    responsable: string;

    @Column({ name: 'responsable_id', type: 'uuid', nullable: true })
    responsableId: string;

    // Provisión Contable
    @Column({ name: 'cuantia_estimada', type: 'decimal', precision: 15, scale: 2, default: 0 })
    cuantiaEstimada: number;

    @Column({ name: 'provision_contable', type: 'decimal', precision: 15, scale: 2, default: 0 })
    provisionContable: number;

    @Column({ name: 'porcentaje_provision', default: 0 })
    porcentajeProvision: number;

    @Column({ name: 'fecha_calculo_provision', type: 'timestamp', nullable: true })
    fechaCalculoProvision: Date;

    // Asociación con Proceso (desde submódulos)
    // Valores válidos: DEFENSA_JUDICIAL, JUZGAMIENTO, ASESORIA_JURIDICA, COACTIVOS, ORGANOS_CONTROL
    @Column({ name: 'modulo_origen', type: 'varchar', length: 50, nullable: true })
    moduloOrigen: string | null;

    @Column({ name: 'proceso_id', type: 'uuid', nullable: true })
    procesoId: string | null;

    @Column({ name: 'proceso_radicado', type: 'varchar', length: 100, nullable: true })
    procesoRadicado: string | null;

    // Estado
    @Column({ length: 20, default: 'ACTIVO' })
    estado: EstadoRiesgo;

    // Motivo del archivado
    @Column({ name: 'motivo_archivo', type: 'text', nullable: true })
    motivoArchivo: string | null;

    // Auditoría
    @Column({ name: 'created_by', length: 200, nullable: true })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
