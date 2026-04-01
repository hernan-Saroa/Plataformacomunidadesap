import type { GraduationCertificateTemplateTexts } from '../certificate-template-texts';

export interface UpdateTemplateTextsDto
  extends Partial<GraduationCertificateTemplateTexts> {
  updatedBy?: string;
}
