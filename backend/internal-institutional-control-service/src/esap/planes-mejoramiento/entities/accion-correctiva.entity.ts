import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PlanMejoramiento } from './plan-mejoramiento.entity';
import { RegistroSeguimiento } from './registro-seguimiento.entity';
import { EvidenciaAccion } from './evidencia-accion.entity';

export enum AccionCorrectivaEstado {
  PROGRAMADA = 'programada',
  EN_PROGRESO = 'en-progreso',
  IMPLEMENTADA = 'implementada',
  VENCIDA = 'vencida',
  COMPLETADA = 'completada',
}

export enum AccionCorrectivaTipo {
  CORRECTIVA = 'correctiva',
  PREVENTIVA = 'preventiva',
  MEJORA = 'mejora',
}

/**
 * Estado de la acción de mejora en el contexto del seguimiento.
 * Fuente: EM-FO-002 v3 — columna "Estado" del formato.
 */
export enum EstadoAccionSeguimiento {
  ABIERTA = 'abierta',
  CERRADA = 'cerrada',
}

@Entity('accion_correctiva', { schema: 'control_interno' })
export class AccionCorrectiva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => PlanMejoramiento, (plan) => plan.acciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  @Column({ name: 'hallazgo_id', type: 'uuid', nullable: true })
  hallazgoId?: string | null;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: AccionCorrectivaTipo.CORRECTIVA,
  })
  tipo: AccionCorrectivaTipo;

  @Column({ type: 'varchar', length: 255 })
  responsable: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: Date;

  @Column({ type: 'text', nullable: true })
  recursos?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  indicador?: string;

  @Column({ name: 'meta_indicador', type: 'varchar', length: 500, nullable: true })
  metaIndicador?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: AccionCorrectivaEstado.PROGRAMADA,
  })
  estado: AccionCorrectivaEstado;

  @Column({ name: 'porcentaje_avance', type: 'int', default: 0 })
  porcentajeAvance: number;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  evidencias: Array<{
    id: string;
    nombre: string;
    tipo: string;
    url: string;
    fecha: string;
    validado: boolean;
    validadoPor?: string;
    fechaValidacion?: string;
  }>;

  /** Verificación OCI (Cierre): cumplida | parcial | incumplida | sin_verificar */
  @Column({ name: 'estado_verificacion_oci', type: 'varchar', length: 20, nullable: true, default: 'sin_verificar' })
  estadoVerificacionOci?: string | null;

  @Column({ name: 'evidencia_verificada', type: 'text', nullable: true })
  evidenciaVerificada?: string | null;

  @Column({ name: 'observacion_oci', type: 'text', nullable: true })
  observacionOci?: string | null;

  @Column({ name: 'fecha_verificacion_oci', type: 'timestamp', nullable: true })
  fechaVerificacionOci?: Date | null;

  @Column({ name: 'verificada_por_id', type: 'bigint', nullable: true })
  verificadaPorId?: number | null;

  @OneToMany(() => RegistroSeguimiento, (registro) => registro.accion, { cascade: true })
  registrosSeguimiento: RegistroSeguimiento[];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGUIMIENTO / EVALUACIÓN — EM-FO-002 v3 (columnas literales del formato)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Cantidad de acciones programadas (meta). Ref: EM-FO-002 */
  @Column({ name: 'cantidad_acciones_programadas', type: 'int', nullable: true })
  cantidadAccionesProgramadas?: number;

  /** Cantidad de acciones implementadas. Ref: EM-FO-002 */
  @Column({ name: 'cantidad_acciones_implementadas', type: 'int', nullable: true })
  cantidadAccionesImplementadas?: number;

  /** Cumplimiento calculado: 2=Cumple, 1=Parcial, 0=No cumple. EM-FO-002 */
  @Column({ name: 'cumplimiento_emfo', type: 'int', nullable: true })
  cumplimientoEmfo?: number;

  /** Estado de la acción: Abierta / Cerrada. EM-FO-002 */
  @Column({
    name: 'estado_accion_seguimiento',
    type: 'varchar',
    length: 20,
    default: 'abierta',
  })
  estadoAccionSeguimiento: string;

  /** Responsable del seguimiento (Jefe OCI o quien tenga las funciones) */
  @Column({ name: 'responsable_seguimiento', type: 'varchar', length: 500, nullable: true })
  responsableSeguimiento?: string;

  /** Observaciones de cumplimiento */
  @Column({ name: 'observacion_cumplimiento', type: 'text', nullable: true })
  observacionCumplimiento?: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // EFECTIVIDAD — EM-FO-002 v3 (verificada en la siguiente auditoría)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Criterio 1: "Evaluar la aplicación de controles…" (SI/NO) */
  @Column({ name: 'evaluar_aplicacion_controles', type: 'boolean', nullable: true })
  evaluarAplicacionControles?: boolean;

  /** Criterio 2: "Validar que la situación no se volvió a presentar" (SI/NO) */
  @Column({ name: 'validar_situacion_no_repitio', type: 'boolean', nullable: true })
  validarSituacionNoRepitio?: boolean;

  /** Efectividad calculada: 2=Efectiva, 1=Parcial, 0=Inefectiva. EM-FO-002 */
  @Column({ name: 'efectividad_emfo', type: 'int', nullable: true })
  efectividadEmfo?: number;

  /** ¿La efectividad ha sido verificada en la siguiente auditoría? EM-PT-002 act. 9 */
  @Column({ name: 'efectividad_verificada', type: 'boolean', default: false })
  efectividadVerificada: boolean;

  /** Observaciones de efectividad */
  @Column({ name: 'observacion_efectividad', type: 'text', nullable: true })
  observacionEfectividad?: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // RELACIÓN CON EVIDENCIAS FORMALES (tabla separada)
  // ═══════════════════════════════════════════════════════════════════════════

  @OneToMany(() => EvidenciaAccion, (evidencia) => evidencia.accion, { cascade: true })
  evidenciasAccion: EvidenciaAccion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}











