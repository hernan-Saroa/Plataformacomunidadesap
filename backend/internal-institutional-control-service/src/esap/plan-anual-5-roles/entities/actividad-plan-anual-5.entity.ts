import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { RolPlanAnual5 } from './rol-plan-anual-5.entity';
import { PlanAnual5Roles } from './plan-anual-5-roles.entity';
import { AdjuntoActividadPlanAnual5 } from './adjunto-actividad-plan-anual-5.entity';

@Entity('actividad_plan_anual_5', { schema: 'control_interno' })
export class ActividadPlanAnual5 {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'rol_id' })
  @Index()
  rolId: string;

  @ManyToOne(() => RolPlanAnual5, (rol) => rol.actividades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rol_id' })
  rol: RolPlanAnual5;

  @Column({ type: 'uuid', name: 'plan_id' })
  @Index()
  planId: string;

  @ManyToOne(() => PlanAnual5Roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanAnual5Roles;

  @Column({ type: 'varchar', length: 500, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fecha_inicio: Date;

  @Column({ type: 'date', name: 'fecha_fin' })
  fecha_fin: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pendiente',
  })
  @Index()
  estado: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';

  @Column({ type: 'integer', name: 'porcentaje_avance', default: 0 })
  porcentaje_avance: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'Media',
  })
  prioridad: 'Alta' | 'Media' | 'Baja';

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVOS CAMPOS - Migración 129
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'text', nullable: true })
  control: string;

  @Column({ type: 'text', nullable: true })
  evaluacion: string;

  @Column({ type: 'text', nullable: true })
  seguimiento: string;

  @Column({ type: 'boolean', name: 'requiere_verificacion_director', default: false })
  requiereVerificacionDirector: boolean;

  @Column({ type: 'boolean', name: 'verificada_por_director', default: false })
  verificadaPorDirector: boolean;

  @Column({ type: 'timestamp', name: 'fecha_verificacion', nullable: true })
  fechaVerificacion: Date;

  @Column({ type: 'text', name: 'observaciones_director', nullable: true })
  observacionesDirector: string;

  @Column({ type: 'jsonb', name: 'configuracion_evidencias', nullable: true })
  configuracionEvidencias: {
    adjuntosRequeridos: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
    observacionRequerida: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
    minimoAdjuntos?: number;
    tiposAdjuntosPermitidos?: string[];
    longitudMinimaObservacion?: number;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPOS PARA VINCULACIÓN CON AUDITORÍAS - Migración 148
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 50, name: 'tipo_calculo', default: 'manual' })
  tipoCalculo: 'manual' | 'auditorias' | 'planes_mejoramiento';

  @Column({ type: 'integer', name: 'total_auditorias_programadas', default: 0 })
  totalAuditoriasProgramadas: number;

  @Column({ type: 'integer', name: 'total_auditorias_finalizadas', default: 0 })
  totalAuditoriasFinalizadas: number;

  @Column({ type: 'jsonb', name: 'auditorias_por_tipo', nullable: true })
  auditoriasPorTipo: {
    regular?: { programadas: number; finalizadas: number; en_proceso: number; pendientes: number };
    territorial?: { programadas: number; finalizadas: number; en_proceso: number; pendientes: number };
    especial?: { programadas: number; finalizadas: number; en_proceso: number; pendientes: number };
    seguimiento?: { programadas: number; finalizadas: number; en_proceso: number; pendientes: number };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PUNTOS DE CONTROL, FRECUENCIA, RESPONSABLES Y FECHA DE CORTE
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'jsonb', name: 'puntos_control', default: [] })
  puntos_control: Array<{
    id: string;
    orden: number;
    nombre: string;
    descripcion?: string;
    fechaProgramada: string;
    fechaReal: string | null;
    responsable: string;
    estado: 'pendiente' | 'en-progreso' | 'completado' | 'omitido';
    observaciones?: string;
    evidencias?: any[];
  }>;

  @Column({ type: 'varchar', length: 20, name: 'frecuencia_puntos_control', nullable: true })
  frecuencia_puntos_control: string;

  @Column({ type: 'jsonb', name: 'responsables', default: [] })
  responsables: Array<{ id: string; nombre: string; cargo: string; email: string }>;

  @Column({ type: 'date', name: 'fecha_corte', nullable: true })
  fecha_corte: Date;

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTRADAS DE SEGUIMIENTO - vinculadas a puntos de control
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'jsonb', name: 'entradas_seguimiento', default: [] })
  entradas_seguimiento: Array<{
    id: string;
    puntoControlId: string;    // ID del punto de control al que pertenece
    fechaRegistro: string;     // ISO date string - se compara con fechaProgramada del corte
    registradoPor: string;     // nombre del usuario que registró
    usuarioId?: string;        // id del usuario
    texto?: string;            // observación escrita (opcional)
    archivos?: Array<{         // evidencias adjuntas (opcional)
      nombre: string;
      url: string;
      tipo: string;
      tamanio: number;
    }>;
    tipo: 'seguimiento' | 'hallazgo' | 'cierre';
  }>;

  // Relación con adjuntos
  @OneToMany(() => AdjuntoActividadPlanAnual5, (adjunto) => adjunto.actividad, { cascade: true })
  adjuntos: AdjuntoActividadPlanAnual5[];

  // Soft delete
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

