import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { SolicitudValoracionInsumo } from './solicitud-valoracion-insumo.entity.js';

@Entity({ name: 'solicitud_valoracion', schema: 'infrastructure-management' })
@Index('idx_solicitud_valoracion_solicitud', ['idSolicitudMantenimiento'])
@Index('idx_solicitud_valoracion_tecnico', ['idTecnicoValorador'])
export class SolicitudValoracion {
  @PrimaryGeneratedColumn('uuid', { name: 'id_valoracion' })
  idValoracion: string;

  @Column({ type: 'uuid', name: 'id_solicitud_mantenimiento' })
  idSolicitudMantenimiento: string;

  @ManyToOne(() => SolicitudMantenimiento, (s) => s.valoraciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud_mantenimiento', referencedColumnName: 'idSolicitud' })
  solicitud: SolicitudMantenimiento;

  @Column({ type: 'uuid', name: 'id_tecnico_valorador', nullable: true })
  idTecnicoValorador?: string;

  @Column({ type: 'varchar', length: 20, name: 'tecnico_codigo', nullable: true })
  tecnicoCodigo?: string;

  @Column({ type: 'varchar', length: 200, name: 'tecnico_nombre' })
  tecnicoNombre: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_al_finalizar' })
  estadoAlFinalizar: 'EN_PROGRESO' | 'EN_ESPERA_DE_INSUMOS';

  @Column({ type: 'text' })
  diagnostico: string;

  @Column({ type: 'text', name: 'alcance_identificado' })
  alcanceIdentificado: string;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    name: 'tiempo_estimado_horas',
  })
  tiempoEstimadoHoras: number;

  @Column({ type: 'varchar', length: 10, name: 'nivel_riesgo' })
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';

  @Column({
    type: 'boolean',
    name: 'requiere_apagado_electrico',
    default: false,
  })
  requiereApagadoElectrico: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'simple-json', default: () => "'[]'", name: 'evidencias' })
  evidencias: Array<Record<string, any>>;

  @Column({ type: 'timestamptz', name: 'fecha_inicio_valoracion' })
  fechaInicioValoracion: Date;

  @Column({ type: 'timestamptz', name: 'fecha_fin_valoracion' })
  fechaFinValoracion: Date;

  @Column({
    type: 'boolean',
    name: 'es_version_corregida_por_encargado',
    default: false,
  })
  esVersionCorregidaPorEncargado: boolean;

  @Column({ type: 'uuid', name: 'id_usuario_corrector', nullable: true })
  idUsuarioCorrector?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToMany(
    () => SolicitudValoracionInsumo,
    (ins) => ins.valoracion,
    { cascade: true, nullable: true },
  )
  insumos?: SolicitudValoracionInsumo[];
}
