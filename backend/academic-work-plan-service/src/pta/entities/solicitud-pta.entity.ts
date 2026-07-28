import { Column, Entity, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'SolicitudPTA' })
export class SolicitudPtaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'docenteId', type: 'text' })
  docenteId: string;

  @Column({ name: 'docenteNombre', type: 'text' })
  docenteNombre: string;

  @Column({ name: 'docenteEmail', type: 'text', nullable: true })
  docenteEmail: string | null;

  /** "creacion" conserva el flujo histórico; "edicion_componentes" actúa sobre
   * el mismo PTA y nunca habilita la creación de un plan adicional. */
  @Column({ name: 'tipoSolicitud', type: 'text', default: 'creacion' })
  tipoSolicitud: string;

  @Column({ name: 'ptaId', type: 'uuid', nullable: true })
  ptaId: string | null;

  /** Componentes funcionales seleccionados por el docente:
   * docencia, investigacion, extension y/o complementarias. */
  @Column({ name: 'componentes', type: 'jsonb', nullable: true })
  componentes: string[] | null;

  /** Estado consolidado que tenía el PTA antes de autorizar su reapertura. */
  @Column({ name: 'estadoPtaAnterior', type: 'text', nullable: true })
  estadoPtaAnterior: string | null;

  @Column({ name: 'caso', type: 'text' })
  caso: string;

  @Column({ name: 'razon', type: 'text' })
  razon: string;

  @Column({ name: 'justificacion', type: 'text' })
  justificacion: string;

  @Column({ name: 'casoLibre', type: 'text', nullable: true })
  casoLibre: string | null;

  @Column({ name: 'archivos', type: 'jsonb', nullable: true })
  archivos: any | null;

  @Column({ name: 'estado', type: 'text', default: 'pendiente' })
  estado: string;

  @Column({ name: 'resueltoPor', type: 'text', nullable: true })
  resueltoPor: string | null;

  @Column({ name: 'resolucionFecha', type: 'timestamptz', nullable: true })
  resolucionFecha: Date | null;

  @Column({ name: 'resolucionMotivo', type: 'text', nullable: true })
  resolucionMotivo: string | null;

  @Column({ name: 'resolucionAccion', type: 'text', nullable: true })
  resolucionAccion: string | null;

  @Column({ name: 'territorialNueva', type: 'text', nullable: true })
  territorialNueva: string | null;

  @Column({ name: 'horasPtaOriginal', type: 'int', nullable: true })
  horasPtaOriginal: number | null;

  @Column({ name: 'horasPtaNuevo', type: 'int', nullable: true })
  horasPtaNuevo: number | null;

  @Column({ name: 'notificacionLeida', type: 'boolean', default: false })
  notificacionLeida: boolean;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
