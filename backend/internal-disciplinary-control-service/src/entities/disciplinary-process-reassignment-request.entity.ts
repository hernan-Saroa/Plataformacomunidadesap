import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
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
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_id' })
  process: DisciplinaryProcess;

  @Column({ name: 'process_id', type: 'uuid' })
  processId: string;

  @ManyToOne(() => DisciplinaryProfessional, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'current_professional_id' })
  currentProfessional: DisciplinaryProfessional;

  @Column({ name: 'current_professional_id', type: 'uuid' })
  currentProfessionalId: string;

  @ManyToOne(() => DisciplinaryProfessional, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'new_professional_id' })
  newProfessional: DisciplinaryProfessional;

  @Column({ name: 'new_professional_id', type: 'uuid' })
  newProfessionalId: string;

  @Column({ name: 'justification', type: 'text' })
  justification: string;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: ReassignmentPriority,
    default: ReassignmentPriority.NORMAL,
  })
  priority: ReassignmentPriority;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ReassignmentRequestStatus,
    default: ReassignmentRequestStatus.PENDIENTE,
  })
  status: ReassignmentRequestStatus;

  @Column({ name: 'jefe_observations', type: 'text', nullable: true })
  jefeObservations: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'requested_by', type: 'varchar', length: 100 })
  requestedBy: string; // Nombre del usuario que solicita

  @Column({ name: 'requested_by_id', type: 'varchar', length: 50, nullable: true })
  requestedById: string; // ID del usuario que solicita

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}