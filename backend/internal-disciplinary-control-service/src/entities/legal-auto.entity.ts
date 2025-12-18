import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';
import { AutoVersion } from './auto-version.entity';

export enum AutoType {
  AUTO_APERTURA = 'AUTO_APERTURA',
  AUTO_ARCHIVO = 'AUTO_ARCHIVO',
  PLIEGO_CARGOS = 'PLIEGO_CARGOS',
  AUTO_APERTURA_INDAGACION = 'AUTO_APERTURA_INDAGACION',
  RESOLUCION = 'RESOLUCION',
}

export enum AutoStatus {
  BORRADOR = 'BORRADOR',
  REVISION_JEFE = 'REVISION_JEFE',
  APROBADO = 'APROBADO',
  DEVUELTO = 'DEVUELTO',
  FIRMADO = 'FIRMADO',
  NOTIFICADO = 'NOTIFICADO',
}

@Entity('legal_autos')
export class LegalAuto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DisciplinaryProcess, (process) => process.autos, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'processId' })
  process: DisciplinaryProcess;

  @Column('uuid')
  processId: string;

  @Column({
    type: 'enum',
    enum: AutoType,
  })
  tipo: AutoType;

  @Column({ type: 'text' })
  contenido: string; // HTML/Rich Text

  @Column({
    type: 'enum',
    enum: AutoStatus,
    default: AutoStatus.BORRADOR,
  })
  estado: AutoStatus;

  @Column({ type: 'text', nullable: true })
  firmaUrl: string; // URL del PDF firmado

  @Column({ type: 'timestamp', nullable: true })
  notificationDate: Date;

  @Column({ type: 'text', nullable: true })
  notificationEvidence: string; // URL del archivo de prueba de notificación

  @Column({ type: 'text', nullable: true })
  comentarios: string;

  @Column({ type: 'text', nullable: true })
  rejection_comments: string;

  @Column('uuid', { nullable: true })
  aprobadoPorId: string; // ID del jefe que aprobó

  @CreateDateColumn()
  createdAt: Date;



  @Column({ type: 'int', default: 1 })
  currentVersion: number;

  @OneToMany(() => AutoVersion, (version) => version.auto)
  versions: AutoVersion[];

  @UpdateDateColumn()
  updatedAt: Date;
}
