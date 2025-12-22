import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DisciplinaryProcess } from './disciplinary-process.entity';

export enum NewsOrigin {
  ANONIMO = 'ANONIMO',
  QUEJOSO = 'QUEJOSO',
  OFICIO = 'OFICIO',
  REMISION = 'REMISION',
}

export enum NewsStatus {
  RADICADA = 'RADICADA',
  EN_VALORACION = 'EN_VALORACION',
  ASIGNADA = 'ASIGNADA',
  DEVUELTA = 'DEVUELTA',
  ARCHIVADA = 'ARCHIVADA',
}

export interface PersonInfo {
  nombre: string;
  cedula?: string;
  email?: string;
  cargo?: string;
  telefono?: string;
  direccion?: string;
  dependencia?: string;
  entidad?: string;
}

@Entity('disciplinary_news')
export class DisciplinaryNews {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  radicado: string; // ND-2025-001

  @CreateDateColumn()
  fechaRecepcion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaQueja?: Date;

  @Column({
    type: 'enum',
    enum: NewsOrigin,
  })
  origen: NewsOrigin;

  @Column()
  territorial: string;

  @Column()
  dependenciaDenunciado: string;

  @Column({ type: 'jsonb', nullable: true })
  denunciante: PersonInfo;

  @Column({ type: 'jsonb', nullable: true })
  disciplinable: PersonInfo;

  @Column({ type: 'text' })
  hechos: string;

  @Column({ type: 'text', array: true, nullable: true })
  conductas?: string[];

  @Column({
    type: 'enum',
    enum: NewsStatus,
    default: NewsStatus.RADICADA,
  })
  estado: NewsStatus;

  @Column({ type: 'text', array: true, nullable: true })
  adjuntos: string[];

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'RECEPCION' })
  kanbanStage: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  historialAuditoria: any[];

  // Relación con procesos disciplinarios
  @OneToMany(
    () => DisciplinaryProcess,
    (process) => process.news,
  )
  processes: DisciplinaryProcess[];
}
