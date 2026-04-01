/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENTIDAD: Evaluación de Proceso Auditable
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Permite múltiples evaluaciones DAFP por proceso.
 * Cada evaluación tiene: vigencia, fecha corte, riesgos, score, decisión final.
 * 
 * FK: proceso_id → proceso_auditable.id
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProcesoAuditable } from './proceso-auditable.entity';

export enum DecisionFinal {
  INCLUIR_PLAN_ANUAL = 'INCLUIR PLAN ANUAL',
  AUDITORIA_POSTERIOR = 'AUDITORÍA POSTERIOR',
}

export enum PonderacionRiesgo {
  EXTREMO = 'EXTREMO',
  ALTO = 'ALTO',
  MODERADO = 'MODERADO',
  BAJO = 'BAJO',
  MUY_BAJO = 'MUY BAJO',
}

@Entity('evaluacion_proceso', { schema: 'control_interno' })
@Index(['procesoId', 'vigencia', 'fechaCorte'], { unique: true })
@Index(['vigencia'])
@Index(['decisionFinal'])
export class EvaluacionProceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ═══════════════════════════════════════════════════════════════════════
  // RELACIÓN CON PROCESO MAESTRO
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'proceso_id', type: 'uuid', nullable: false })
  procesoId: string;

  @ManyToOne(() => ProcesoAuditable, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proceso_id' })
  proceso: ProcesoAuditable;

  // ═══════════════════════════════════════════════════════════════════════
  // ENCABEZADO DE LA EVALUACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ type: 'integer', nullable: false })
  vigencia: number; // Año de la evaluación (ej: 2026)

  @Column({ name: 'fecha_corte', type: 'date', nullable: false })
  fechaCorte: Date;

  @Column({ name: 'dependencia_responsable', type: 'varchar', length: 255, nullable: false })
  dependenciaResponsable: string;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 1: NÚMERO DE RIESGOS INHERENTES (D, E, F, G, H)
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'riesgos_extremos', type: 'integer', default: 0 })
  riesgosExtremos: number;

  @Column({ name: 'riesgos_altos', type: 'integer', default: 0 })
  riesgosAltos: number;

  @Column({ name: 'riesgos_moderados', type: 'integer', default: 0 })
  riesgosModerados: number;

  @Column({ name: 'riesgos_bajos', type: 'integer', default: 0 })
  riesgosBajos: number;

  @Column({ name: 'total_riesgos', type: 'integer', default: 0 })
  totalRiesgos: number;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 2: REQUERIMIENTOS ESPECIALES (J, K)
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'requerimiento_comite', type: 'boolean', default: false })
  requerimientoComite: boolean;

  @Column({ name: 'requerimiento_entes_reg', type: 'boolean', default: false })
  requerimientoEntesReg: boolean;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: INFORMACIÓN DE AUDITORÍA ANTERIOR (L, N)
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'fecha_ultima_auditoria', type: 'date', nullable: true })
  fechaUltimaAuditoria?: Date;

  @Column({ name: 'resultado_ultima_auditoria', type: 'varchar', length: 100, nullable: true })
  resultadoUltimaAuditoria?: string; // 'Adecuado', 'Con observaciones', 'Con debilidades', 'Sin auditoría previa'

  // ═══════════════════════════════════════════════════════════════════════
  // SCORE DE RIESGO C+E-M (modelo simplificado 0-15)
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ type: 'integer', default: 0 })
  criticidad: number; // 0-5

  @Column({ type: 'integer', default: 0 })
  exposicion: number; // 0-5

  @Column({ type: 'integer', default: 0 })
  mitigantes: number; // 0-5

  @Column({ name: 'score_riesgo', type: 'integer', default: 0 })
  scoreRiesgo: number; // C + E - M (0-15)

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS AUTOMÁTICOS DAFP
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'ponderacion_riesgo', type: 'varchar', length: 20, nullable: true })
  ponderacionRiesgo?: string; // 'EXTREMO', 'ALTO', 'MODERADO', 'BAJO', 'MUY BAJO'

  @Column({ name: 'dias_transcurridos', type: 'integer', nullable: true })
  diasTranscurridos?: number;

  @Column({ name: 'plan_rotacion', type: 'varchar', length: 20, nullable: true })
  planRotacion?: string; // '1 año', '2 años', '3 años', '4 años'

  @Column({ name: 'dias_rotacion', type: 'integer', default: 360 })
  diasRotacion: number;

  @Column({ name: 'decision_rotacion', type: 'varchar', length: 20, nullable: true })
  decisionRotacion?: string; // 'Incluir', 'Omitir', 'Pendiente'

  // ═══════════════════════════════════════════════════════════════════════
  // DECISIÓN FINAL
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'decision_final', type: 'varchar', length: 50, nullable: true })
  decisionFinal?: string; // 'INCLUIR PLAN ANUAL', 'AUDITORÍA POSTERIOR'

  @Column({ name: 'motivo_decision', type: 'text', nullable: true })
  motivoDecision?: string;

  @Column({ name: 'prioridad_regla', type: 'integer', nullable: true })
  prioridadRegla?: number; // 1-5, qué regla DAFP aplicó

  // ═══════════════════════════════════════════════════════════════════════
  // METADATOS
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'creado_por', type: 'varchar', length: 255, nullable: true })
  creadoPor?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
