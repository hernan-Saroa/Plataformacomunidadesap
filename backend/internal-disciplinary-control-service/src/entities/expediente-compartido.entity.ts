import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';

export enum TipoCompartido {
  LINK = 'LINK',
  QR = 'QR',
  EMAIL = 'EMAIL',
}

export enum EstadoCompartido {
  ACTIVO = 'ACTIVO',
  EXPIRADO = 'EXPIRADO',
  INACTIVO = 'INACTIVO',
}

@Entity('expediente_compartido')
export class ExpedienteCompartido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_acceso', unique: true })
  tokenAcceso: string;

  @ManyToOne(() => DisciplinaryProcess, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'proceso_id' })
  proceso: DisciplinaryProcess;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({
    name: 'tipo_compartido',
    type: 'enum',
    enum: TipoCompartido,
    default: TipoCompartido.LINK,
  })
  tipoCompartido: TipoCompartido;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoCompartido,
    default: EstadoCompartido.ACTIVO,
  })
  estado: EstadoCompartido;

  @Column({ name: 'requiere_clave', default: false })
  requiereClave: boolean;

  @Column({ name: 'clave_hash', type: 'varchar', nullable: true })
  claveHash: string | null;

  @Column({ name: 'tiempo_expiracion_horas', type: 'int', nullable: true })
  tiempoExpiracionHoras: number | null;

  @Column({ name: 'fecha_expiracion', type: 'timestamp', nullable: true })
  fechaExpiracion: Date | null;

  @Column({ name: 'email_destinatario', type: 'varchar', nullable: true })
  emailDestinatario: string | null;

  @Column({ name: 'mensaje_adicional', type: 'text', nullable: true })
  mensajeAdicional: string | null;

  @Column({ name: 'creado_por', type: 'varchar', nullable: true })
  creadoPor: string | null;

  @Column({ name: 'contador_accesos', type: 'int', default: 0 })
  contadorAccesos: number;

  @Column({ name: 'ultimo_acceso', type: 'timestamp', nullable: true })
  ultimoAcceso: Date | null;

  @Column({ name: 'ip_ultimo_acceso', type: 'varchar', nullable: true })
  ipUltimoAcceso: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'es_publico', default: false })
  esPublico: boolean;

  @Column({ name: 'permite_descarga', default: true })
  permiteDescarga: boolean;
}
