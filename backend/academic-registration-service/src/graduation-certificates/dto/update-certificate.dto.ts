export interface UpdateCertificateDto {
  fullName?: string;
  idNumber?: string;
  programName?: string;
  programType?: string;
  degreeTitle?: string;
  graduationDate?: string | Date;
  diplomaNumber?: string;
  actaNumber?: string;
  campus?: string;
  seccionalName?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  status?: string;
}
