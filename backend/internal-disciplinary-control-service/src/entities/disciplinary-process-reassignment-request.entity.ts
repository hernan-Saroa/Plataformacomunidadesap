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
import { DisciplinaryProfessional } from './disciplinary-professional.entity';

export enum ReassignmentRequestStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

export enum ReassignmentPriority {
  NORMAL = 'NORMAL',
  URGENTE = 'URGENTE',
}

@Entity('disciplinary_process_reassignment_requests')
export class DisciplinaryProcessReassignmentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DisciplinaryProcess, {
    eager: true,
  })
  @JoinColumn({ name: 'processId' })
  process: DisciplinaryProcess;

  @Column('uuid')
  processId: string;

  @ManyToOne(() => DisciplinaryProfessional, {
    eager: true,
  })
  @JoinColumn({ name: 'currentProfessionalId' })
  currentProfessional: DisciplinaryProfessional;

  @Column('uuid')
  currentProfessionalId: string;

  @ManyToOne(() => DisciplinaryProfessional, {
    eager: true,
  })
  @JoinColumn({ name: 'newProfessionalId' })
  newProfessional: DisciplinaryProfessional;

  @Column('uuid')
  newProfessionalId: string;

  @Column({ type: 'text' })
  justification: string;

  @Column({
    type: 'enum',
    enum: ReassignmentPriority,
    default: ReassignmentPriority.NORMAL,
  })
  priority: ReassignmentPriority;

  @Column({
    type: 'enum',
    enum: ReassignmentRequestStatus,
    default: ReassignmentRequestStatus.PENDIENTE,
  })
  status: ReassignmentRequestStatus;

  @Column({ type: 'text', nullable: true })
  jefeObservations: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'varchar', length: 100 })
  requestedBy: string; // Nombre del usuario que solicita

  @Column({ type: 'varchar', length: 50, nullable: true })
  requestedById: string; // ID del usuario que solicita

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}