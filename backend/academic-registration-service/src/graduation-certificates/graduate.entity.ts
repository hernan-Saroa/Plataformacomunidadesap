import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GraduationCertificate } from './graduation-certificate.entity';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';
import { GraduateFile } from './graduate-file.entity';

@Entity({ schema: 'academic_registration', name: 'graduates' })
export class Graduate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Información personal
  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'first_name', length: 255, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 255, nullable: true })
  lastName: string;

  @Column({ name: 'id_number', length: 50 })
  idNumber: string;

  @Column({ name: 'id_issue_date', type: 'date', nullable: true })
  idIssueDate: Date;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  // Información académica
  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @Column({ name: 'program_name', length: 255 })
  programName: string;

  @Column({ name: 'program_type', length: 50 })
  programType: string; // 'Pregrado', 'Especialización', 'Maestría'

  // Fechas importantes
  @Column({ name: 'enrollment_date', type: 'date', nullable: true })
  enrollmentDate: Date;

  @Column({ name: 'graduation_date', type: 'date' })
  graduationDate: Date;

  @Column({ name: 'ceremony_date', type: 'date', nullable: true })
  ceremonyDate: Date;

  // Información del título
  @Column({ name: 'degree_title', length: 255 })
  degreeTitle: string;

  @Column({ name: 'diploma_number', length: 100, unique: true, nullable: true })
  diplomaNumber: string;

  // Legacy API alias; the PostgreSQL identifier is standardized in English.
  @Column({
    name: 'registry_reference',
    length: 100,
    nullable: true,
    comment:
      'Composite registry, folio and book reference used by issued certificates',
  })
  actaNumber: string;

  @Column({ name: 'resolution_number', length: 100, nullable: true })
  resolutionNumber: string;

  // These property names remain stable for HTTP, Oracle and spreadsheet clients.
  @Column({
    name: 'graduation_record_number',
    length: 100,
    nullable: true,
    comment:
      'Graduation record number received from the academic source system',
  })
  numActa: string;

  @Column({
    name: 'folio_number',
    length: 100,
    nullable: true,
    comment: 'Academic registry folio number',
  })
  numFolio: string;

  @Column({
    name: 'book_number',
    length: 100,
    nullable: true,
    comment: 'Academic registry book number',
  })
  numLibro: string;

  @Column({
    name: 'registry_number',
    length: 100,
    nullable: true,
    comment: 'Academic registry number',
  })
  numRegistro: string;

  // Estado y validación
  @Column({ length: 50, default: 'ACTIVE' })
  status: string; // ACTIVE, REVOKED, SUSPENDED

  @Column({ name: 'is_verified', type: 'boolean', default: true })
  isVerified: boolean;

  // Ubicación
  @Column({ length: 100, nullable: true })
  campus: string;

  @Column({
    name: 'regional_office_name',
    length: 255,
    nullable: true,
    comment: 'Regional office assigned to the graduate',
  })
  seccionalName: string;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 255, nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', length: 255, nullable: true })
  updatedBy: string;

  // Relaciones
  @OneToMany(() => GraduationCertificateRequest, (request) => request.graduate)
  certificateRequests: GraduationCertificateRequest[];

  @OneToMany(() => GraduationCertificate, (certificate) => certificate.graduate)
  certificates: GraduationCertificate[];

  @OneToMany(() => GraduateFile, (file) => file.graduate)
  files: GraduateFile[];

  filesCount?: number;
}
