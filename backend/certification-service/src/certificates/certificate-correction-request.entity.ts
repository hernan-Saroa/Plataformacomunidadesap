import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Certificate } from './certificate.entity';

export type CertificateCorrectionStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export type CertificateCorrectionEvidence = {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  relativePath: string;
};

export type CertificateCorrectionTraceEvent = {
  id: string;
  type:
    | 'REQUEST_CREATED'
    | 'REVIEW_STARTED'
    | 'CERTIFICATE_SENT'
    | 'CERTIFICATE_RESENT'
    | 'REQUEST_REJECTED';
  title: string;
  description: string;
  status: CertificateCorrectionStatus;
  occurred_at: string;
  actor_name: string;
  actor_email?: string | null;
  actor_role: 'SOLICITANTE' | 'COORDINADOR';
  metadata?: Record<string, unknown>;
};

@Entity('certificate_correction_requests')
export class CertificateCorrectionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  request_number: string;

  @Column({ type: 'uuid' })
  certificate_id: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: CertificateCorrectionStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  requester_name: string;

  @Column({ type: 'varchar', length: 255 })
  requester_email: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  submitted_evidence: CertificateCorrectionEvidence[];

  @Column({ type: 'jsonb' })
  certificate_snapshot: Record<string, unknown>;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewed_by_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewed_by_email: string | null;

  @Column({ type: 'timestamp', nullable: true })
  review_started_at: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution_description: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  resolution_evidence: CertificateCorrectionEvidence[];

  @Column({ type: 'jsonb', nullable: true })
  corrected_data: Record<string, unknown> | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  traceability: CertificateCorrectionTraceEvent[];

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Certificate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'certificate_id' })
  certificate: Certificate;
}
