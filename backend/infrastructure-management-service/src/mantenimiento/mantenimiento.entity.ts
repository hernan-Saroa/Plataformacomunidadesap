import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EspacioFisico } from '../espacios/espacio.entity.js';
import { Sede } from '../sedes/sede.entity.js';

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

  @Column({ type: 'uuid', nullable: true, name: 'id_categoria' })
  idCategoria: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_radicacion' })
  fechaRadicacion: Date;

  @Column({ type: 'uuid', nullable: true, name: 'usuario_solicitante_id' })
  usuarioSolicitanteId: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'usuario_solicitante_email' })
  usuarioSolicitanteEmail: string;

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
}
