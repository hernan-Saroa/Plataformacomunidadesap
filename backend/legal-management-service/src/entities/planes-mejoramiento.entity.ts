import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PlanHallazgo } from './plan-hallazgo.entity';

// ENTIDAD PRINCIPAL: PLAN MEJORAMIENTO
@Entity('planes_mejoramiento', { schema: 'legal_management' })
export class PlanMejoramiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  codigo: string;

  @Column({ nullable: true })
  titulo: string;

  @Column('text', { nullable: true })
  descripcion: string;

  @Column({ nullable: true })
  origen: string; // 'RIESGO', 'HALLAZGO_AUDITORIA', 'AUTOEVALUACION'

  @Column({ name: 'origen_id', nullable: true })
  origenId: string;

  @Column({ name: 'responsable_id', nullable: true })
  responsableId: string; // FK to auth users

  @Column({ name: 'responsable_nombre', nullable: true })
  responsableNombre: string; // Text name when no abogado is linked

  @Column({ name: 'fecha_inicio', nullable: true })
  fechaInicio: Date; // Keep as Date object for TypeORM

  @Column({ name: 'fecha_fin_estimada', nullable: true })
  fechaFinEstimada: Date;

  @Column({ name: 'fecha_cierre_real', nullable: true })
  fechaCierreReal: Date;

  @Column('decimal', { name: 'avance_porcentaje', precision: 5, scale: 2, default: 0 })
  avancePorcentaje: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  presupuesto: number;

  @Column({ default: 'ABIERTO' })
  estado: string; // 'ABIERTO', 'EN_EJECUCION', 'VENCIDO', 'CERRADO'

  @Column({ name: 'documento_origen', nullable: true })
  documentoOrigen: string;

  @Column({ name: 'area_responsable', nullable: true })
  areaResponsable: string;

  @Column({ name: 'fecha_recepcion', nullable: true })
  fechaRecepcion: Date;

  @Column({ name: 'fecha_respuesta', nullable: true })
  fechaRespuesta: Date;

  @Column({ nullable: true })
  severidad: string; // 'CRITICO', 'ALTO', 'MEDIO', 'BAJO'

  @Column({ name: 'archived_at', type: 'timestamp with time zone', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'archived_by', type: 'varchar', length: 255, nullable: true })
  archivedBy: string | null;

  @Column({ name: 'archive_reason', type: 'text', nullable: true })
  archiveReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @OneToMany(() => PlanEvidencia, (evidencia) => evidencia.plan)
  evidencias: PlanEvidencia[];

  @OneToMany(() => PlanSeguimiento, (seguimiento) => seguimiento.plan)
  seguimientos: PlanSeguimiento[];

  @OneToMany(() => PlanComentario, (comentario) => comentario.plan)
  comentarios: PlanComentario[];

  @OneToMany(() => PlanHallazgo, (hallazgo) => hallazgo.plan)
  hallazgos: PlanHallazgo[];
}

// ENTIDAD: EVIDENCIA
@Entity('planes_evidencias', { schema: 'legal_management' })
export class PlanEvidencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => PlanMejoramiento, (plan) => plan.evidencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  @Column({ nullable: true })
  titulo: string;

  @Column({ name: 'url_archivo', nullable: true })
  urlArchivo: string;

  @Column({ name: 'tipo_archivo', nullable: true })
  tipoArchivo: string;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// ENTIDAD: SEGUIMIENTO
@Entity('planes_seguimientos', { schema: 'legal_management' })
export class PlanSeguimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => PlanMejoramiento, (plan) => plan.seguimientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  @Column('text', { name: 'descripcion_avance', nullable: true })
  descripcionAvance: string;

  @Column('decimal', { name: 'porcentaje_reportado', precision: 5, scale: 2, nullable: true })
  porcentajeReportado: number;

  @CreateDateColumn({ name: 'fecha_reporte' })
  fechaReporte: Date;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string;
}

// ENTIDAD: COMENTARIO
@Entity('planes_comentarios', { schema: 'legal_management' })
export class PlanComentario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => PlanMejoramiento, (plan) => plan.comentarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanMejoramiento;

  @Column('text', { nullable: true })
  mensaje: string;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
