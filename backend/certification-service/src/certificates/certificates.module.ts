import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateGeneratorService } from './certificate-generator.service';
import { CertificateRequest } from './certificate-request.entity';
import { Certificate } from './certificate.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateTemplate } from './certificate-template.entity';
import { Signer } from './signer.entity';
import { TemplateConfig } from './template-config.entity';
import { TemplateConfigChange } from './template-config-change.entity';
import { Firmante } from './firmante.entity';
import { TemplateConfigController } from './template-config.controller';
import { TemplateConfigService } from './template-config.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { TechnicalBonusAssignment } from './technical-bonus-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CertificateRequest,
      Certificate,
      CertificateValidation,
      CertificateTemplate,
      Signer,
      TemplateConfig,
      TemplateConfigChange,
      Firmante,
      TechnicalBonusAssignment,
    ]),
  ],
  controllers: [CertificatesController, TemplateConfigController],
  providers: [
    CertificatesService,
    CertificateGeneratorService,
    TemplateConfigService,
    LaborCertificatePdfService,
  ],
  exports: [CertificatesService, TemplateConfigService],
})
export class CertificatesModule {}
