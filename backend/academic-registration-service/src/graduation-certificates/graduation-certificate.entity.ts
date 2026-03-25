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
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateDownload } from './certificate-download.entity';

@Entity({ schema: 'academic_registration', name: 'graduation_certificates' })
export class GraduationCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con solicitud
  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ name: 'graduate_id', type: 'uuid', nullable: true })
  graduateId: string;

  // Número de certificado
  @Column({ name: 'certificate_number', length: 100, unique: true })
  certificateNumber: string;

  // Código de verificación único (QR)
  @Column({ name: 'verification_code', length: 50, unique: true })
  verificationCode: string;

  // Información del graduado
  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'id_number', length: 50 })
  idNumber: string;

  // Información académica
  @Column({ name: 'program_name', length: 255 })
  programName: string;

  @Column({ name: 'program_type', length: 50 })
  programType: string;

  @Column({ name: 'degree_title', length: 255 })
  degreeTitle: string;

  @Column({ name: 'graduation_date', type: 'date' })
  graduationDate: Date;

  @Column({ name: 'diploma_number', length: 100, nullable: true })
  diplomaNumber: string;

  @Column({ name: 'acta_number', length: 100, nullable: true })
  actaNumber: string;

  // Información adicional
  @Column({ length: 100, nullable: true })
  campus: string;

  @Column({ name: 'seccional_name', length: 150, nullable: true })
  seccionalName: string;

  // Datos del firmante
  @Column({ name: 'signer_name', length: 255 })
  signerName: string;

  @Column({ name: 'signer_position', length: 255 })
  signerPosition: string;

  @Column({ name: 'signature_url', type: 'text', nullable: true })
  signatureUrl: string;

  // Archivo PDF
  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl: string;

  @Column({ name: 'pdf_filename', length: 255, nullable: true })
  pdfFilename: string;

  // Estado del certificado
  @Column({ length: 50, default: 'VALID' })
  status: string; // VALID, REVOKED, EXPIRED

  // Fechas
  @Column({ name: 'issue_date', type: 'date', default: () => 'CURRENT_DATE' })
  issueDate: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ name: 'revocation_date', type: 'timestamp', nullable: true })
  revocationDate: Date;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason: string;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 255, nullable: true })
  createdBy: string;

  // Relaciones
  @ManyToOne(
    () => GraduationCertificateRequest,
    (request) => request.certificates,
  )
  @JoinColumn({ name: 'request_id' })
  request: GraduationCertificateRequest;

  @ManyToOne(() => Graduate, (graduate) => graduate.certificates)
  @JoinColumn({ name: 'graduate_id' })
  graduate: Graduate;

  @OneToMany(
    () => CertificateValidation,
    (validation) => validation.certificate,
  )
  validations: CertificateValidation[];

  @OneToMany(() => CertificateDownload, (download) => download.certificate)
  downloads: CertificateDownload[];
}
