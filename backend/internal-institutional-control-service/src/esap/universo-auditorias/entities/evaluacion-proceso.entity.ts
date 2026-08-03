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
@Index(['procesoId', 'vigencia', 'fechaCorte', 'dependenciaResponsable'], { unique: true })
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

  @Column({ name: 'dependencia_responsable', type: 'text', nullable: false })
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
  // SECCIÓN 2: REQUERIMIENTOS ESPECIALES (J, K) — legacy, se mantienen
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'requerimiento_comite', type: 'boolean', default: false })
  requerimientoComite: boolean;

  @Column({ name: 'requerimiento_entes_reg', type: 'boolean', default: false })
  requerimientoEntesReg: boolean;

  // ═══════════════════════════════════════════════════════════════════════
  // SECCIÓN 3: INFORMACIÓN DE AUDITORÍA ANTERIOR (L, N) — legacy
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'fecha_ultima_auditoria', type: 'date', nullable: true })
  fechaUltimaAuditoria?: Date;

  @Column({ name: 'resultado_ultima_auditoria', type: 'varchar', length: 100, nullable: true })
  resultadoUltimaAuditoria?: string;

  // ═══════════════════════════════════════════════════════════════════════
  // SCORE DE RIESGO C+E-M — legacy, se mantiene
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ type: 'integer', default: 0 })
  criticidad: number;

  @Column({ type: 'integer', default: 0 })
  exposicion: number;

  @Column({ type: 'integer', default: 0 })
  mitigantes: number;

  @Column({ name: 'score_riesgo', type: 'integer', default: 0 })
  scoreRiesgo: number;

  // ═══════════════════════════════════════════════════════════════════════
  // CRITERIOS DE PRIORIZACIÓN DAFP (RE-E-GE-034) — migración 179
  // Fórmula: Ponderación = RI×0.4 + Tiempo×0.1 + AD×0.1 + Obj×0.1 + Hall×0.3
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'tiempo_ultima_auditoria', type: 'integer', default: 0 })
  tiempoUltimaAuditoria: number; // 1=≤1año … 5=>4años/Nunca

  @Column({ name: 'temas_alta_direccion', type: 'integer', default: 0 })
  temasAltaDireccion: number; // 2=Bajo … 5=Muy relevante

  @Column({ name: 'objetivos_estrategicos', type: 'integer', default: 0 })
  objetivosEstrategicos: number; // 2=1obj … 5=4+obj

  @Column({ name: 'hallazgos_anteriores', type: 'integer', default: 0 })
  hallazgosAnteriores: number; // 1=Sin … 5=7+

  // ═══════════════════════════════════════════════════════════════════════
  // RESULTADOS DAFP CALCULADOS — migración 179
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'ponderacion_final_dafp', type: 'decimal', precision: 4, scale: 2, default: 0 })
  ponderacionFinalDafp: number;

  @Column({ name: 'nivel_criticidad_dafp', type: 'varchar', length: 20, nullable: true })
  nivelCriticidadDafp?: string; // 'Extremo' | 'Alto' | 'Moderado' | 'Bajo'

  @Column({ name: 'ciclo_rotacion_dafp', type: 'varchar', length: 20, nullable: true })
  cicloRotacionDafp?: string; // 'Cada año' | 'Cada 2 años' | 'Cada 3 años'

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS AUTOMÁTICOS DAFP — legacy
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'ponderacion_riesgo', type: 'varchar', length: 20, nullable: true })
  ponderacionRiesgo?: string;

  @Column({ name: 'dias_transcurridos', type: 'integer', nullable: true })
  diasTranscurridos?: number;

  @Column({ name: 'plan_rotacion', type: 'varchar', length: 20, nullable: true })
  planRotacion?: string;

  @Column({ name: 'dias_rotacion', type: 'integer', default: 360 })
  diasRotacion: number;

  @Column({ name: 'decision_rotacion', type: 'varchar', length: 20, nullable: true })
  decisionRotacion?: string;

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
  // PRIORIZACIÓN AUDITABLE (columna Aud. — calculado + override manual)
  // ═══════════════════════════════════════════════════════════════════════

  @Column({ name: 'auditable_calculado', type: 'boolean', default: false })
  auditableCalculado: boolean;

  /** null = usar auditableCalculado; true/false = decisión manual en tabla */
  @Column({ name: 'auditable_manual', type: 'boolean', nullable: true })
  auditableManual?: boolean | null;

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
