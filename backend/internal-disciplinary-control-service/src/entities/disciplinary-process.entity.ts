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
import { DisciplinaryNews } from './disciplinary-news.entity';
import { LegalAuto } from './legal-auto.entity';
import { DisciplinaryProfessional } from './disciplinary-professional.entity';
import { Evidence } from './evidence.entity';

export enum ProcessStage {
  EVALUACION = 'EVALUACION',
  INDAGACION_PREVIA = 'INDAGACION_PREVIA',
  INVESTIGACION = 'INVESTIGACION',
  JUZGAMIENTO = 'JUZGAMIENTO',
}

export enum ProcessStatus {
  ACTIVO = 'ACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  ARCHIVADO = 'ARCHIVADO',
  PRESCRITO = 'PRESCRITO',
}

@Entity('disciplinary_processes')
export class DisciplinaryProcess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  radicadoProceso: string; // P-###-YYYY

  @ManyToOne(() => DisciplinaryNews, (news) => news.processes, {
    eager: true,
  })
  @JoinColumn({ name: 'newsId' })
  news: DisciplinaryNews;

  @Column('uuid')
  newsId: string;

  @ManyToOne(() => DisciplinaryProfessional, { eager: true, nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'abogado_asignado_id' })
  abogadoAsignado: DisciplinaryProfessional;

  @Column({ name: 'abogado_asignado_id', nullable: true })
  abogadoAsignadoId: string;

  @Column({
    type: 'enum',
    enum: ProcessStage,
    default: ProcessStage.EVALUACION,
  })
  etapaActual: ProcessStage;

  @Column({ type: 'varchar', length: 50, nullable: true })
  kanbanStage: string;

  @Column({ type: 'text', nullable: true })
  kanbanNotice: string | null;

  @Column({
    type: 'enum',
    enum: ProcessStatus,
    default: ProcessStatus.ACTIVO,
  })
  estado: ProcessStatus;

  @Column({ type: 'timestamp', nullable: true })
  fechaPrescripcion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaVencimientoEtapa: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', array: true, nullable: true })
  pruebas: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relación con autos
  @OneToMany(() => LegalAuto, (auto) => auto.process)
  autos: LegalAuto[];

  // Relación con pruebas
  @OneToMany(() => Evidence, (evidence) => evidence.process)
  evidence: Evidence[];
}
