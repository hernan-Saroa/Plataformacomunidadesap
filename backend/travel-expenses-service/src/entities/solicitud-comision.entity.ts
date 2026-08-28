import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ComisionadoEntity } from './comisionado.entity';
import { DocumentoSoporteEntity } from './documento-soporte.entity';

@Entity({ schema: 'travel_expenses', name: 'solicitudes_comision' })
@Index('idx_solicitudes_consecutivo_unico', ['consecutivoUnico'], { unique: true })
@Index('idx_solicitudes_comisionado_fechas', ['comisionadoId', 'fechaInicio', 'fechaFin'])
export class SolicitudComisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'consecutivo_unico', type: 'varchar', length: 50, unique: true })
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
  @Index('idx_solicitudes_comisionado_fechas')
  fechaFin: Date;

  @Column({ name: 'objeto_comision', type: 'varchar', length: 250 })
  objetoComision: string;

  @Column({ name: 'prioridad', type: 'varchar', length: 10 })
  prioridad: string;

  @Column({ name: 'rubro_presupuestal', type: 'varchar', length: 100 })
  rubroPresupuestal: string;

  @Column({ name: 'requiere_tiquetes', type: 'boolean', default: false })
  requiereTiquetes: boolean;

  @Column({ name: 'monto_viaticos', type: 'numeric', precision: 12, scale: 2, default: 0 })
  montoViaticos: number;

  @Column({ name: 'monto_gastos_viaje', type: 'numeric', precision: 12, scale: 2, default: 0 })
  montoGastosViaje: number;

  @Column({ name: 'dias_comision', type: 'int', default: 1 })
  diasComision: number;

  @Column({ name: 'estado_solicitud', type: 'varchar', length: 50, default: 'RADICADA' })
  estadoSolicitud: string;

  @Column({ name: 'radicado_fuera_jornada', type: 'boolean', default: false })
  radicadoFueraJornada: boolean;

  @Column({ name: 'extemporanea', type: 'boolean', default: false })
  extemporanea: boolean;

  @Column({ name: 'creado_por_usuario_id', type: 'uuid' })
  creadoPorUsuarioId: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @OneToMany(() => DocumentoSoporteEntity, (doc) => doc.solicitud)
  documentosSoporte: DocumentoSoporteEntity[];
}
