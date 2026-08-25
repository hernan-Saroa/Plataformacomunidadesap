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
import { TemplateSigner } from './template-signer.entity';
import { TemplateConfigController } from './template-config.controller';
import { TemplateConfigService } from './template-config.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { TechnicalBonusAssignment } from './technical-bonus-assignment.entity';
import { TechnicalBonusTemplate } from './technical-bonus-template.entity';
import { LaborOracleIntegrationController } from './labor-oracle-integration.controller';
import { LaborOracleIntegrationService } from './labor-oracle-integration.service';
import { CertificateCorrectionRequest } from './certificate-correction-request.entity';
import { CertificateCorrectionRequestsController } from './certificate-correction-requests.controller';
import { LaborFunctionProfile } from './labor-function-profile.entity';
import { LaborFunction } from './labor-function.entity';
import { LaborFunctionsController } from './labor-functions.controller';
import { LaborFunctionsService } from './labor-functions.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CertificateRequest,
      Certificate,
      CertificateValidation,
      CertificateTemplate,
      Signer,
      TemplateConfig,
      TemplateConfigChange,
      TemplateSigner,
      TechnicalBonusAssignment,
      TechnicalBonusTemplate,
      CertificateCorrectionRequest,
      LaborFunctionProfile,
      LaborFunction,
    ]),
  ],
  controllers: [
    CertificatesController,
    TemplateConfigController,
    LaborOracleIntegrationController,
    CertificateCorrectionRequestsController,
    LaborFunctionsController,
  ],
  providers: [
    CertificatesService,
    CertificateGeneratorService,
    TemplateConfigService,
    LaborCertificatePdfService,
    LaborOracleIntegrationService,
    LaborFunctionsService,
  ],
  exports: [
    CertificatesService,
    TemplateConfigService,
    LaborOracleIntegrationService,
    LaborFunctionsService,
  ],
})
export class CertificatesModule {}
