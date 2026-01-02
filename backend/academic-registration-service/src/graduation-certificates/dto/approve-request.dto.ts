export interface ApproveRequestDto {
  reviewNotes: string;
  reviewerName?: string;
  reviewerId?: string;
  fullName?: string;
  idNumber?: string;
  email?: string;
  phone?: string;
  programName?: string;
  programType?: string;
  degreeTitle?: string;
  graduationDate?: string | Date;
  campus?: string;
  seccionalName?: string;
}
