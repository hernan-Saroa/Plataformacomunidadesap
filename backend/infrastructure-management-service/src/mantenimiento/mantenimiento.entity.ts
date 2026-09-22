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
import { EspacioFisico } from '../espacios/espacio.entity.js';
import { Sede } from '../sedes/sede.entity.js';
import { SolicitudEvidencia } from './solicitud-evidencia.entity.js';
import { SolicitudValoracion } from './solicitud-valoracion.entity.js';

@Entity({ name: 'solicitud_mantenimiento', schema: 'infrastructure-management' })
export class SolicitudMantenimiento {
  @PrimaryGeneratedColumn('uuid', { name: 'id_solicitud' })
  idSolicitud: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  consecutivo: string;

  @Column({ type: 'uuid', nullable: true, name: 'id_espacio' })
  idEspacio: string;

  @Column({ type: 'uuid', name: 'id_sede' })
  idSede: string;

  @Column({ type: 'varchar', length: 50, name: 'tipo_mantenimiento' })
  tipoMantenimiento: string;

  @Column({ type: 'varchar', length: 30, default: 'MEDIA' })
  prioridad: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 150, name: 'solicitante_email' })
  solicitanteEmail: string;

  @Column({ type: 'varchar', length: 150, name: 'solicitante_nombre' })
  solicitanteNombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'responsable_asignado' })
  responsableAsignado: string;

  @Column({ type: 'date', nullable: true, name: 'fecha_programada' })
  fechaProgramada: string;

  @Column({ type: 'date', nullable: true, name: 'fecha_ejecucion' })
  fechaEjecucion: string;

  @Column({ type: 'varchar', length: 30, default: 'RECIBIDA' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, name: 'costo_estimado' })
  costoEstimado: number;

  @Column({ type: 'uuid', nullable: true, name: 'id_area_solicitante' })
  idAreaSolicitante: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'nombre_area_solicitante' })
  nombreAreaSolicitante: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  piso: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  salon: string;

  @Column({ type: 'text', nullable: true, name: 'ubicacion_detalle' })
  ubicacionDetalle: string;

  @Column({ type: 'varchar', length: 20, default: 'FISICA', name: 'tipo_atencion' })
  tipoAtencion: string;

  @Column({ type: 'varchar', length: 30, default: 'UMI', name: 'area_responsable_actual' })
  areaResponsableActual: 'UMI' | 'TI' | 'PENDIENTE_CLASIFICACION';

  @Column({ type: 'simple-json', default: () => "'[]'", name: 'remisiones' })
  remisiones: Array<Record<string, any>>;

  @Column({ type: 'int', nullable: true, name: 'id_categoria' })
  idCategoria: number;

  @Column({ type: 'int', nullable: true, name: 'id_subcategoria' })
  idSubcategoria: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_radicacion' })
  fechaRadicacion: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_limite_atencion' })
  fechaLimiteAtencion?: Date;

  @Column({ type: 'simple-json', default: () => "'[]'", name: 'asignaciones' })
  asignaciones?: Array<Record<string, any>>;

  @Column({ type: 'text', nullable: true, name: 'motivo_rechazo' })
  motivoRechazo?: string;

  @Column({ type: 'uuid', nullable: true, name: 'usuario_solicitante_id' })
  usuarioSolicitanteId: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'usuario_solicitante_email' })
  usuarioSolicitanteEmail?: string;

  @Column({ type: 'text', nullable: true, name: 'evidencia_inicial_url' })
  evidenciaInicialUrl?: string;

  // ----- EFDS-1735 RF-INF-006 Valoración en Campo -----
  @Column({
    type: 'varchar',
    length: 20,
    name: 'estado_valoracion',
    default: 'NO_APLICA',
  })
  estadoValoracion: 'NO_APLICA' | 'EN_CURSO' | 'FINALIZADA';

  @Column({ type: 'timestamptz', name: 'fecha_inicio_valoracion', nullable: true })
  fechaInicioValoracion?: Date;

  @Column({ type: 'timestamptz', name: 'fecha_fin_valoracion', nullable: true })
  fechaFinValoracion?: Date;

  @Column({ type: 'varchar', length: 10, name: 'riesgo_valoracion', nullable: true })
  riesgoValoracion?: 'BAJO' | 'MEDIO' | 'ALTO';

  @Column({
    type: 'boolean',
    name: 'requiere_apagado_electrico',
    default: false,
  })
  requiereApagadoElectrico: boolean;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    name: 'total_estimado_insumos_cop',
    default: 0,
  })
  totalEstimadoInsumosCop: number;

  @Column({ type: 'boolean', name: 'espera_insumos_flag', default: false })
  esperaInsumosFlag: boolean;

  @Column({
    type: 'timestamptz',
    name: 'fecha_limite_original_antes_extension',
    nullable: true,
  })
  fechaLimiteOriginalAntesExtension?: Date;

  @Column({
    type: 'smallint',
    name: 'dias_extendidos_por_insumos',
    default: 0,
  })
  diasExtendidosPorInsumos: number;

  // ----- EFDS-1736 RF-INF-007 Cierre Técnico Ejecución y Evidencia -----
  @Column({ type: 'timestamptz', name: 'fecha_cierre_tecnico', nullable: true })
  fechaCierreTecnico?: Date;

  @Column({ type: 'uuid', name: 'usuario_cierre_tecnico_id', nullable: true })
  usuarioCierreTecnicoId?: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'responsable_cierre_display',
    nullable: true,
  })
  responsableCierreDisplay?: string;

  @Column({
    type: 'simple-json',
    default: () => "'[]'",
    name: 'evidencias_cierre',
  })
  evidenciasCierre?: Array<Record<string, any>>;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    name: 'costo_final_efectivo_cop',
    default: 0,
  })
  costoFinalEfectivoCop: number;

  @Column({ type: 'text', name: 'trabajo_realizado', nullable: true })
  trabajoRealizado?: string;

  @Column({ type: 'text', name: 'observaciones_cierre', nullable: true })
  observacionesCierre?: string;

  @Column({
    type: 'boolean',
    name: 'requiere_seguimiento',
    default: false,
  })
  requiereSeguimiento: boolean;

  // ----- EFDS-1737 RF-INF-008 Conformidad del Área Solicitante -----
  @Column({
    type: 'timestamptz',
    name: 'fecha_conformidad',
    nullable: true,
  })
  fechaConformidad?: Date;

  @Column({
    type: 'uuid',
    name: 'usuario_conformidad_id',
    nullable: true,
  })
  usuarioConformidadId?: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'responsable_conformidad_display',
    nullable: true,
  })
  responsableConformidadDisplay?: string;

  @Column({
    type: 'varchar',
    length: 40,
    name: 'resultado_conformidad',
    nullable: true,
  })
  resultadoConformidad?:
    | 'CONFIRMADA'
    | 'SIN_RESPUESTA'
    | 'RECHAZADA_Y_REABIERTA';

  @Column({
    type: 'text',
    name: 'observaciones_conformidad',
    nullable: true,
  })
  observacionesConformidad?: string;

  @Column({
    type: 'timestamptz',
    name: 'fecha_limite_conformidad',
    nullable: true,
  })
  fechaLimiteConformidad?: Date;

  @Column({
    type: 'smallint',
    name: 'conteo_reaperturas_conformidad',
    default: 0,
  })
  conteoReaperturasConformidad: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => EspacioFisico, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_espacio' })
  espacio: EspacioFisico;

  @ManyToOne(() => Sede, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede;

  @OneToMany(() => SolicitudEvidencia, (e) => e.solicitud, { nullable: true })
  evidencias?: SolicitudEvidencia[];

  @OneToMany(() => SolicitudValoracion, (v) => v.solicitud, { nullable: true })
  valoraciones?: SolicitudValoracion[];
}
