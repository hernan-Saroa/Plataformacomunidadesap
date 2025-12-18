import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TipoAuditoria {
  GESTION = 'Gestión',
  CONTROL_INTERNO = 'Control Interno',
  ACADEMICA = 'Académica',
  RRHH = 'RRHH',
  FINANCIERA = 'Financiera',
  TI = 'TI',
  CUMPLIMIENTO = 'Cumplimiento',
  OPERACIONAL = 'Operacional',
}

export enum FaseAuditoria {
  PLANEACION = 'planeacion',
  EN_CURSO = 'en-curso',
  REVISION = 'revision',
  COMPLETADA = 'completada',
}

export enum PrioridadAuditoria {
  ALTA = 'Alta',
  MEDIA = 'Media',
  BAJA = 'Baja',
}

@Entity('auditoria', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['tipo'])
@Index(['fase'])
@Index(['prioridad'])
@Index(['territorial'])
@Index(['fechaInicio', 'fechaFin'])
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  codigo: string; // AUD-YYYY-###

  @Column({ type: 'varchar', length: 500, nullable: false })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipo: TipoAuditoria;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: FaseAuditoria.PLANEACION,
  })
  fase: FaseAuditoria;

  @Column({ type: 'varchar', length: 255, nullable: false })
  territorial: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  sede: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  responsable: string;

  @Column({ type: 'date', name: 'fecha_inicio', nullable: false })
  fechaInicio: Date;

  @Column({ type: 'date', name: 'fecha_fin', nullable: false })
  fechaFin: Date;

  @Column({ type: 'integer', default: 0 })
  progreso: number; // 0-100

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: PrioridadAuditoria.MEDIA,
  })
  prioridad: PrioridadAuditoria;

  @Column({ type: 'integer', default: 0 })
  hallazgos: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

