import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';

export type ModalidadEjecutorTerritorial =
  | 'CUADRILLA_CENTRAL_COMISION'
  | 'PROVEEDOR_LOCAL_CONTRATADO'
  | 'PERSONAL_PLANTA_TERRITORIAL';

@Entity({ name: 'solicitud_ejecucion_territorial', schema: 'infrastructure-management' })
export class SolicitudEjecucionTerritorial {
  @PrimaryColumn('uuid', { name: 'id_solicitud' })
  idSolicitud: string;

  @OneToOne(() => SolicitudMantenimiento, (s) => s.ejecucionTerritorial, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud', referencedColumnName: 'idSolicitud' })
  solicitud: SolicitudMantenimiento;

  @Column({
    type: 'varchar',
    length: 40,
    name: 'modalidad_ejecutor_territorial',
    default: 'CUADRILLA_CENTRAL_COMISION',
  })
  @Index('idx_sol_ejec_terr_modalidad')
  modalidadEjecutorTerritorial: ModalidadEjecutorTerritorial;

  @Column({ type: 'varchar', length: 200, name: 'proveedor_local_nombre', nullable: true })
  proveedorLocalNombre?: string | null;

  @Column({ type: 'varchar', length: 50, name: 'proveedor_local_nit', nullable: true })
  proveedorLocalNit?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'orden_compra_contrato_local', nullable: true })
  ordenCompraContratoLocal?: string | null;

  @Column({ type: 'boolean', name: 'vobo_cierre_dt_aprobado', nullable: true })
  @Index('idx_sol_ejec_terr_vobo')
  voboCierreDtAprobado?: boolean | null;

  @Column({ type: 'uuid', name: 'vobo_cierre_dt_usuario_id', nullable: true })
  voboCierreDtUsuarioId?: string | null;

  @Column({ type: 'varchar', length: 150, name: 'vobo_cierre_dt_usuario', nullable: true })
  voboCierreDtUsuario?: string | null;

  @Column({ type: 'timestamptz', name: 'vobo_cierre_dt_fecha', nullable: true })
  voboCierreDtFecha?: Date | null;

  @Column({ type: 'text', name: 'vobo_cierre_dt_observaciones', nullable: true })
  voboCierreDtObservaciones?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
