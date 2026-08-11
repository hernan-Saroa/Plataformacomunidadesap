import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Graduate } from './graduate.entity';
import { GraduationCertificate } from './graduation-certificate.entity';
import { GraduationRequestReviewFile } from './graduation-request-review-file.entity';

export type GraduationReviewTimelineEntry = {
  type: string;
  label: string;
  notes?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  createdAt: string;
};

@Entity({
  schema: 'academic_registration',
  name: 'graduation_certificate_requests',
})
export class GraduationCertificateRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Número de solicitud
  @Column({ name: 'request_number', length: 100, unique: true })
  requestNumber: string;

  // Tipo de solicitante
  @Column({ name: 'requester_type', length: 50 })
  requesterType: string; // 'GRADUATE', 'COMPANY'

  // Información del graduado
  @Column({ name: 'graduate_id', type: 'uuid', nullable: true })
  graduateId: string;

  @Column({ name: 'id_number', length: 50 })
  idNumber: string;

  @Column({ name: 'id_issue_date', type: 'date', nullable: true })
  idIssueDate: Date;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'graduate_last_name', length: 255, nullable: true })
  graduateLastName: string;

  @Column({ name: 'graduate_email', length: 255, nullable: true })
  graduateEmail: string;

  @Column({ name: 'graduate_phone', length: 50, nullable: true })
  graduatePhone: string;

  // Información del programa
  @Column({ name: 'program_name', length: 255 })
  programName: string;

  @Column({ name: 'graduation_date', type: 'date', nullable: true })
  graduationDate: Date | null;

  // Información del solicitante
  @Column({ name: 'requester_name', length: 255, nullable: true })
  requesterName: string;

  @Column({ name: 'requester_email', length: 255 })
  requesterEmail: string;

  @Column({ name: 'requester_phone', length: 50, nullable: true })
  requesterPhone: string;

  @Column({ name: 'company_name', length: 255, nullable: true })
  companyName: string;

  // Keep companyNit as the public Colombian-domain alias while standardizing
  // the physical database identifier.
  @Column({
    name: 'company_tax_id',
    length: 50,
    nullable: true,
    comment: 'Company tax identifier supplied by the requester',
  })
  companyNit: string;

  @Column({ name: 'contact_person', length: 255, nullable: true })
  contactPerson: string;

  // Tipo de certificado
  @Column({ name: 'certificate_type', length: 50, default: 'STANDARD' })
  certificateType: string; // STANDARD, OFFICIAL, INTERNATIONAL

  // Validación
  @Column({ name: 'validation_code', length: 10, nullable: true })
  validationCode: string;

  @Column({ name: 'validation_expires_at', type: 'timestamp', nullable: true })
  validationExpiresAt: Date;

  @Column({ name: 'is_validated', type: 'boolean', default: false })
  isValidated: boolean;

  // Estado
  @Column({ length: 50, default: 'PENDING' })
  status: string; // PENDING, VALIDATED, PROCESSING, COMPLETED, REJECTED, EXPIRED

  // Observaciones
  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // Revisión manual (casos no encontrados)
  @Column({ name: 'manual_review', type: 'boolean', default: false })
  manualReview: boolean;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'reviewed_by', length: 100, nullable: true })
  reviewedBy: string;

  @Column({ name: 'reviewer_name', length: 255, nullable: true })
  reviewerName: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'review_resolution', length: 50, nullable: true })
  reviewResolution: string;

  @Column({ name: 'approval_status', type: 'varchar', length: 50, nullable: true })
  approvalStatus: string | null;

  @Column({ name: 'review_recommendation', type: 'varchar', length: 50, nullable: true })
  reviewRecommendation: string | null;

  @Column({ name: 'review_recommendation_reason', type: 'text', nullable: true })
  reviewRecommendationReason: string | null;

  @Column({ name: 'review_payload', type: 'jsonb', nullable: true })
  reviewPayload: Record<string, unknown> | null;

  @Column({ name: 'review_submitted_at', type: 'timestamp', nullable: true })
  reviewSubmittedAt: Date | null;

  @Column({ name: 'review_submitted_by', type: 'varchar', length: 100, nullable: true })
  reviewSubmittedBy: string | null;

  @Column({ name: 'review_submitted_by_name', type: 'varchar', length: 255, nullable: true })
  reviewSubmittedByName: string | null;

  @Column({ name: 'approver_decision', type: 'varchar', length: 50, nullable: true })
  approverDecision: string | null;

  @Column({ name: 'approver_notes', type: 'text', nullable: true })
  approverNotes: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'varchar', length: 100, nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approver_name', type: 'varchar', length: 255, nullable: true })
  approverName: string | null;

  @Column({ name: 'head_decision', type: 'varchar', length: 50, nullable: true })
  headDecision: string | null;

  @Column({ name: 'head_notes', type: 'text', nullable: true })
  headNotes: string | null;

  @Column({ name: 'head_reviewed_at', type: 'timestamp', nullable: true })
  headReviewedAt: Date | null;

  @Column({ name: 'head_reviewed_by', type: 'varchar', length: 100, nullable: true })
  headReviewedBy: string | null;

  @Column({ name: 'head_reviewer_name', type: 'varchar', length: 255, nullable: true })
  headReviewerName: string | null;

  @Column({ name: 'review_timeline', type: 'jsonb', default: () => "'[]'::jsonb" })
  reviewTimeline: GraduationReviewTimelineEntry[];

  @Column({ name: 'requester_support_original_name', type: 'varchar', length: 255, nullable: true })
  requesterSupportOriginalName: string | null;

  @Column({ name: 'requester_support_stored_name', type: 'varchar', length: 255, nullable: true })
  requesterSupportStoredName: string | null;

  @Column({ name: 'requester_support_mime_type', type: 'varchar', length: 150, nullable: true })
  requesterSupportMimeType: string | null;

  @Column({ name: 'requester_support_size_bytes', type: 'integer', nullable: true })
  requesterSupportSizeBytes: number | null;

  @Column({ name: 'requester_support_uploaded_at', type: 'timestamp', nullable: true })
  requesterSupportUploadedAt: Date | null;

  // Fechas
  @CreateDateColumn({ name: 'request_date' })
  requestDate: Date;

  @Column({ name: 'validation_date', type: 'timestamp', nullable: true })
  validationDate: Date;

  @Column({ name: 'completion_date', type: 'timestamp', nullable: true })
  completionDate: Date;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relaciones
  @ManyToOne(() => Graduate, (graduate) => graduate.certificateRequests)
  @JoinColumn({ name: 'graduate_id' })
  graduate: Graduate;

  @OneToMany(() => GraduationCertificate, (certificate) => certificate.request)
  certificates: GraduationCertificate[];

  @OneToMany(() => GraduationRequestReviewFile, (file) => file.request)
  reviewFiles: GraduationRequestReviewFile[];
}
