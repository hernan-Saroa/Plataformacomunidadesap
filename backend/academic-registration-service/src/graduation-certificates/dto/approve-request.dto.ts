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
  numRegistro?: string;
  numFolio?: string;
  numLibro?: string;
}

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'OBSERVATION';
export type ReviewerDecision = Exclude<ReviewDecision, 'OBSERVATION'>;

export interface SubmitReviewDecisionDto extends ApproveRequestDto {
  decision: ReviewerDecision;
  reason?: string;
  reviewerEmail?: string;
}

export interface ResolveReviewApprovalDto {
  decision: ReviewDecision;
  reason?: string;
  approverName?: string;
  approverId?: string;
  approverEmail?: string;
}
