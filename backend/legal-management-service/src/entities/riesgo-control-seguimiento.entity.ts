import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type ResultadoSeguimientoControl = 'APLICADO' | 'APLICADO_PARCIALMENTE' | 'NO_APLICADO';

export interface EvidenciaSeguimiento {
    nombre: string;
    archivo: string;
    url: string;
    tipo: string;
    tamano: number;
}

/**
 * Seguimiento cuatrimestral de un control existente de un riesgo.
 * Único por (riesgo, control, vigencia, cuatrimestre): para cambiarlo se edita el existente.
 */
@Entity('riesgo_control_seguimientos', { schema: 'legal_management' })
@Index('uq_riesgo_control_seguimiento_corte', ['riesgoId', 'controlId', 'vigencia', 'cuatrimestre'], { unique: true })
export class RiesgoControlSeguimiento {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'riesgo_id', type: 'uuid' })
    riesgoId: string;

    @Column({ name: 'control_id', type: 'varchar', length: 100 })
    controlId: string;

    @Column({ type: 'int' })
    vigencia: number;

    @Column({ type: 'smallint' })
    cuatrimestre: number;

    @Column({ name: 'fecha_ejecucion', type: 'date' })
    fechaEjecucion: string;

    @Column({ type: 'text' })
    comentarios: string;

    @Column({ type: 'varchar', length: 30 })
    resultado: ResultadoSeguimientoControl;

    @Column({ type: 'smallint' })
    efectividad: number;

    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    evidencias: EvidenciaSeguimiento[];

    @Column({ type: 'varchar', length: 200 })
    responsable: string;

    @Column({ name: 'responsable_id', type: 'uuid', nullable: true })
    responsableId: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
