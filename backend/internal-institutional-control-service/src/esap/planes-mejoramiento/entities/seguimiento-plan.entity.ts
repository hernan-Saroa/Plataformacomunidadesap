import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * SeguimientoPlan — Registra cada corte de seguimiento periódico
 * (trimestral / semestral) del plan de mejoramiento.
 *
 * EM-PT-002 act. 5 — Seguimiento periódico.
 * EM-PT-002 act. 7 — Informe de seguimiento.
 */
@Entity('seguimiento_plan')
@Index('IDX_seguimiento_plan_planId', ['planId'])
export class SeguimientoPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  /** TRIMESTRAL | SEMESTRAL */
  @Column({ name: 'periodicidad', type: 'varchar', length: 20 })
  periodicidad: 'TRIMESTRAL' | 'SEMESTRAL';

  /** INTERNO | ENTE_EXTERNO */
  @Column({ name: 'tipo_control', type: 'varchar', length: 20 })
  tipoControl: 'INTERNO' | 'ENTE_EXTERNO';

  /** Fecha de corte del seguimiento */
  @Column({ name: 'fecha_corte', type: 'timestamp' })
  fechaCorte: Date;

  /** ID del responsable (Jefe OCI / equipo auditor) */
  @Column({ name: 'responsable_id', type: 'varchar', length: 255 })
  responsableId: string;

  /** Nombre del responsable */
  @Column({ name: 'responsable_nombre', type: 'varchar', length: 255, nullable: true })
  responsableNombre: string;

  /** Resumen ejecutivo del seguimiento */
  @Column({ name: 'resumen', type: 'text', nullable: true })
  resumen: string;

  /** Referencia al informe de ley y seguimiento generado */
  @Column({ name: 'informe_ref', type: 'varchar', length: 500, nullable: true })
  informeRef: string;

  /** Número total de acciones evaluadas en este corte */
  @Column({ name: 'total_acciones_evaluadas', type: 'int', default: 0 })
  totalAccionesEvaluadas: number;

  /** Acciones que cumplen (cumplimiento = 2) */
  @Column({ name: 'acciones_cumplen', type: 'int', default: 0 })
  accionesCumplen: number;

  /** Acciones cumplimiento parcial (cumplimiento = 1) */
  @Column({ name: 'acciones_parcial', type: 'int', default: 0 })
  accionesParcial: number;

  /** Acciones que no cumplen (cumplimiento = 0) */
  @Column({ name: 'acciones_no_cumplen', type: 'int', default: 0 })
  accionesNoCumplen: number;

  /** Alertas generadas en este corte */
  @Column({ name: 'alertas_generadas', type: 'int', default: 0 })
  alertasGeneradas: number;

  /** ¿El seguimiento fue generado automáticamente por el job? */
  @Column({ name: 'automatico', type: 'boolean', default: false })
  automatico: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
