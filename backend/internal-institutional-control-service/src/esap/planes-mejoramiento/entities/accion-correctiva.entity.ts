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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}











