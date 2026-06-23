import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PlanMejoramiento } from './plan-mejoramiento.entity';

/**
 * Registro de cierre de un plan de mejoramiento.
 * El cierre ocurre cuando el cumplimiento lo permite (EM-PT-002 act. 8).
 * El archivo del expediente se hace mediante índice electrónico (act. 9-10).
 *
 * Fuente normativa: EM-PT-002 v3 act. 8-10, RF-SG-11, RF-SG-12.
 */
@Entity('cierre_plan', { schema: 'control_interno' })
export class CierrePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid', unique: true })
  planId: string;

  @OneToOne(() => PlanMejoramiento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  /** ¿El plan está cerrado? */
  @Column({ type: 'boolean', default: false })
  cerrado: boolean;

  /** Fecha de cierre */
  @Column({ name: 'fecha_cierre', type: 'timestamp', nullable: true })
  fechaCierre?: Date;

  /** ID del responsable que cerró el plan (Jefe OCI o delegado) */
  @Column({ name: 'cerrado_por_id', type: 'varchar', length: 255, nullable: true })
  cerradoPorId?: string;

  /** Nombre del responsable que cerró (desnormalizado para trazabilidad) */
  @Column({ name: 'cerrado_por_nombre', type: 'varchar', length: 500, nullable: true })
  cerradoPorNombre?: string;

  /** Observaciones del cierre */
  @Column({ name: 'observaciones_cierre', type: 'text', nullable: true })
  observacionesCierre?: string;

  /** ¿Efectividad verificada en la siguiente auditoría? (EM-PT-002 act. 9) */
  @Column({ name: 'efectividad_verificada', type: 'boolean', default: false })
  efectividadVerificada: boolean;

  /** ¿Expediente archivado con índice electrónico? (EM-PT-002 act. 10) */
  @Column({ type: 'boolean', default: false })
  archivado: boolean;

  /** Referencia al índice electrónico del expediente */
  @Column({ name: 'indice_electronico_ref', type: 'varchar', length: 1000, nullable: true })
  indiceElectronicoRef?: string;

  /** Fecha de archivo */
  @Column({ name: 'fecha_archivo', type: 'timestamp', nullable: true })
  fechaArchivo?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
