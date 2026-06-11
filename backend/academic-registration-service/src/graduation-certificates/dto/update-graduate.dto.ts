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
  numActa?: string;
  numFolio?: string;
  numLibro?: string;
  numRegistro?: string;
  status?: string;
  isVerified?: boolean;
  campus?: string;
  seccionalName?: string;
}

export interface CreateGraduateDto extends UpdateGraduateDto {
  createdBy?: string;
}

export interface BulkCreateGraduateError {
  rowNumber: number;
  idNumber?: string;
  programName?: string;
  message: string;
}

export interface BulkCreateGraduatesDto {
  graduates: CreateGraduateDto[];
  createdBy?: string;
}
