import type { GraduationCertificateTemplateTexts } from '../certificate-template-texts';

export interface UpdateTemplateTextsDto
  extends Partial<GraduationCertificateTemplateTexts> {
  updatedBy?: string;
  electronicSignatureEnabled?: boolean;
  signerName?: string;
  signatureImageDataUrl?: string;
  signatureFilename?: string;
  headerLogoDataUrl?: string;
  headerLogoFilename?: string;
  footerLogoDataUrl?: string;
  footerLogoFilename?: string;
}
