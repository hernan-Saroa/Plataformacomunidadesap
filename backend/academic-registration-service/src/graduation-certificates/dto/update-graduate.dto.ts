export interface UpdateGraduateDto {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  idNumber?: string;
  idIssueDate?: string | Date;
  email?: string;
  phone?: string;
  programId?: string;
  programName?: string;
  programType?: string;
  enrollmentDate?: string | Date;
  graduationDate?: string | Date;
  ceremonyDate?: string | Date;
  degreeTitle?: string;
  diplomaNumber?: string;
  actaNumber?: string;
  resolutionNumber?: string;
  status?: string;
  isVerified?: boolean;
  campus?: string;
  seccionalName?: string;
}
