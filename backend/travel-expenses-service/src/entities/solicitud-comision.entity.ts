import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ComisionadoEntity } from './comisionado.entity';
import { DocumentoSoporteEntity } from './documento-soporte.entity';
import { EstadoSolicitud, ESTADOS_SOLICITUD } from './estado-solicitud.enum';
import { UsuarioEntity } from './usuario.entity';

@Entity({ schema: 'travel_expenses', name: 'solicitudes_comision' })
@Index('idx_solicitudes_consecutivo_unico', ['consecutivoUnico'], {
  unique: true,
})
@Index('idx_solicitudes_comisionado_fechas', [
  'comisionadoId',
  'fechaInicio',
  'fechaFin',
])
@Index('idx_solicitudes_siif_exportado', ['siifExportado'])
export class SolicitudComisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'consecutivo_unico',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  @Index('idx_solicitudes_consecutivo_unico')
  consecutivoUnico: string;

  @Column({ name: 'comisionado_id', type: 'uuid' })
  comisionadoId: string;

  @ManyToOne(() => ComisionadoEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'comisionado_id' })
  comisionado: ComisionadoEntity;

  @Column({ name: 'destino_ciudad', type: 'varchar', length: 100 })
  destinoCiudad: string;

  @Column({ name: 'destino_departamento', type: 'varchar', length: 100 })
  destinoDepartamento: string;

  @Column({ name: 'fecha_inicio', type: 'timestamp' })
  @Index('idx_solicitudes_comisionado_fechas')
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'timestamp' })
  fechaFin: Date;

  @Column({ name: 'objeto_comision', type: 'varchar', length: 250 })
  objetoComision: string;

  @Column({ name: 'prioridad', type: 'varchar', length: 10 })
  prioridad: string;

  @Column({ name: 'rubro_presupuestal', type: 'varchar', length: 100 })
  rubroPresupuestal: string;

  @Column({ name: 'requiere_tiquetes', type: 'boolean', default: false })
  requiereTiquetes: boolean;

  @Column({
    name: 'monto_viaticos',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoViaticos: number;

  @Column({
    name: 'monto_gastos_viaje',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  montoGastosViaje: number;

  @Column({ name: 'dias_comision', type: 'int', default: 1 })
  diasComision: number;

  @Column({
    name: 'estado_solicitud',
    type: 'varchar',
    length: 50,
    enum: ESTADOS_SOLICITUD,
    default: EstadoSolicitud.PENDIENTE,
  })
  estadoSolicitud: EstadoSolicitud;

  @Column({ name: 'radicado_fuera_jornada', type: 'boolean', default: false })
  radicadoFueraJornada: boolean;

  @Column({ name: 'extemporanea', type: 'boolean', default: false })
  extemporanea: boolean;

  @Column({ name: 'motivo_devolucion', type: 'text', nullable: true })
  motivoDevolucion: string | null;

  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision: Date | null;

  @Column({
    name: 'tipo_comision',
    type: 'varchar',
    length: 50,
    default: 'TERRESTRE',
  })
  tipoComision: string;

  @Column({ name: 'es_internacional', type: 'boolean', default: false })
  esInternacional: boolean;

  @Column({
    name: 'salario_basico',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  salarioBasico: number;

  @Column({
    name: 'costo_estimado_tiquete',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  costoEstimadoTiquete: number;

  @Column({ name: 'creado_por_usuario_id', type: 'uuid' })
  creadoPorUsuarioId: string;

  @Column({ name: 'analista_asignado_id', type: 'uuid', nullable: true })
  analistaAsignadoId: string | null;

  @Column({ name: 'id_dependencia', type: 'bigint', nullable: true })
  idDependencia: number | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'analista_asignado_id' })
  analistaAsignado: UsuarioEntity;

  @Column({ name: 'siif_exportado', type: 'boolean', default: false })
  siifExportado: boolean;

  @Column({ name: 'fecha_exportacion_siif', type: 'timestamp', nullable: true })
  fechaExportacionSiif: Date | null;

  @Column({ name: 'usuario_exportador_id', type: 'uuid', nullable: true })
  usuarioExportadorId: string | null;

  @Column({ name: 'revisor_control_id', type: 'uuid', nullable: true })
  revisorControlId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'revisor_control_id' })
  revisorControl: UsuarioEntity;

  @Column({ name: 'fecha_segunda_revision', type: 'timestamp', nullable: true })
  fechaSegundaRevision: Date | null;

  @Column({
    name: 'observaciones_segunda_revision',
    type: 'text',
    nullable: true,
  })
  observacionesSegundaRevision: string | null;

  @Column({ name: 'consulta_rut_facturador', type: 'boolean', default: false })
  consultaRutFacturador: boolean;

  @Column({ name: 'autorizador_id', type: 'uuid', nullable: true })
  autorizadorId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'autorizador_id' })
  autorizador: UsuarioEntity;

  @Column({ name: 'fecha_autorizacion', type: 'timestamp', nullable: true })
  fechaAutorizacion: Date | null;

  @Column({
    name: 'observaciones_autorizacion',
    type: 'text',
    nullable: true,
  })
  observacionesAutorizacion: string | null;

  @Column({ name: 'autorizador_direccion_id', type: 'uuid', nullable: true })
  autorizadorDireccionId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'autorizador_direccion_id' })
  autorizadorDireccion: UsuarioEntity;

  @Column({ name: 'fecha_autorizacion_direccion', type: 'timestamp', nullable: true })
  fechaAutorizacionDireccion: Date | null;

  @Column({ name: 'decision_direccion', type: 'varchar', length: 20, nullable: true })
  decisionDireccion: string | null;

  @Column({ name: 'justificacion_direccion', type: 'text', nullable: true })
  justificacionDireccion: string | null;

  @Column({ name: 'es_delegado_direccion', type: 'boolean', default: false })
  esDelegadoDireccion: boolean;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @Column({ name: 'fecha_cancelacion', type: 'timestamp', nullable: true })
  fechaCancelacion: Date | null;

  @Column({ name: 'cancelado_por_usuario_id', type: 'uuid', nullable: true })
  canceladoPorUsuarioId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelado_por_usuario_id' })
  canceladoPorUsuario: UsuarioEntity;

  @Column({ name: 'responsable_cancelacion', type: 'varchar', length: 255, nullable: true })
  responsableCancelacion: string | null;

  @Column({ name: 'pendiente_reintegro', type: 'boolean', default: false })
  pendienteReintegro: boolean;

  // ========== Etapa 7: Presupuesto y RP (RF-PRE-001) ==========
  @Column({ name: 'enviado_presupuesto', type: 'boolean', default: false })
  enviadoPresupuesto: boolean;

  @Column({ name: 'fecha_envio_presupuesto', type: 'timestamp with time zone', nullable: true })
  fechaEnvioPresupuesto: Date | null;

  @Column({ name: 'enviado_presupuesto_por_id', type: 'uuid', nullable: true })
  enviadoPresupuestoPorId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enviado_presupuesto_por_id' })
  enviadoPresupuestoPor: UsuarioEntity;

  @Column({ name: 'observaciones_envio_presupuesto', type: 'text', nullable: true })
  observacionesEnvioPresupuesto: string | null;

  @Column({ name: 'numero_rp', type: 'varchar', length: 100, nullable: true })
  numeroRp: string | null;

  @Column({ name: 'fecha_rp', type: 'date', nullable: true })
  fechaRp: Date | null;

  @Column({
    name: 'valor_comprometido',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  valorComprometido: number | null;

  @Column({ name: 'rubro_rp', type: 'varchar', length: 100, nullable: true })
  rubroRp: string | null;

  @Column({ name: 'rubro_presupuestal_rp', type: 'varchar', length: 100, nullable: true })
  rubroPresupuestalRp: string | null;

  @Column({ name: 'soporte_rp_path', type: 'varchar', length: 255, nullable: true })
  soporteRpPath: string | null;

  @Column({ name: 'codigo_rp', type: 'varchar', length: 150, nullable: true })
  codigoRp: string | null;

  @Column({ name: 'usuario_presupuesto_id', type: 'uuid', nullable: true })
  usuarioPresupuestoId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_presupuesto_id' })
  usuarioPresupuesto: UsuarioEntity;

  @Column({ name: 'fecha_registro_rp', type: 'timestamp with time zone', nullable: true })
  fechaRegistroRp: Date | null;

  @Column({ name: 'expedido_rp_por_id', type: 'uuid', nullable: true })
  expedidoRpPorId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expedido_rp_por_id' })
  expedidoRpPor: UsuarioEntity;

  @Column({ name: 'fecha_expedicion_rp', type: 'timestamp with time zone', nullable: true })
  fechaExpedicionRp: Date | null;

  @Column({ name: 'observaciones_rp', type: 'text', nullable: true })
  observacionesRp: string | null;

  // ========== Etapa 7: Modalidad de Pago (RF-PRE-003) ==========
  @Column({ name: 'modalidad_pago', type: 'varchar', length: 50, default: 'AVANCE' })
  modalidadPago: string;

  @Column({ name: 'dias_habiles_previos', type: 'int', default: 0 })
  diasHabilesPrevios: number;

  @Column({ name: 'fecha_calculo_modalidad', type: 'timestamp', nullable: true })
  fechaCalculoModalidad: Date | null;

  // ========== Etapa 8: Tesorería y Obligación SIIF (RF-PAG-001) ==========
  @Column({ name: 'numero_obligacion', type: 'varchar', length: 100, nullable: true })
  numeroObligacion: string | null;

  @Column({ name: 'fecha_obligacion', type: 'date', nullable: true })
  fechaObligacion: Date | null;

  @Column({ name: 'valor_obligacion', type: 'numeric', precision: 12, scale: 2, nullable: true })
  valorObligacion: number | null;

  @Column({ name: 'observaciones_obligacion', type: 'text', nullable: true })
  observacionesObligacion: string | null;

  @Column({ name: 'soporte_obligacion_path', type: 'varchar', length: 255, nullable: true })
  soporteObligacionPath: string | null;

  @Column({ name: 'obligado_por_id', type: 'uuid', nullable: true })
  obligadoPorId: string | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'obligado_por_id' })
  obligadoPor: UsuarioEntity;

  @Column({ name: 'fecha_registro_obligacion', type: 'timestamp with time zone', nullable: true })
  fechaRegistroObligacion: Date | null;

  // ========== Etapa 8: Notificación Automática a SST (RF-PAG-002) ==========
  @Column({ name: 'notificado_sst', type: 'boolean', default: false })
  notificadoSst: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @OneToMany(() => DocumentoSoporteEntity, (doc) => doc.solicitud)
  documentosSoporte: DocumentoSoporteEntity[];
}

