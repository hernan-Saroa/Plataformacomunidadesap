import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Graduate } from './graduate.entity';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';
import { GraduationCertificate } from './graduation-certificate.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { Signer } from './signer.entity';
import { TemplateConfig } from './template-config.entity';
import { TemplateConfigChange } from './template-config-change.entity';
import { GraduateFile } from './graduate-file.entity';
import { GraduationRequestReviewFile } from './graduation-request-review-file.entity';
import { GraduateProgram } from './graduate-program.entity';
import { GraduationCertificatesController } from './graduation-certificates.controller';
import { GraduatesController } from './graduates.controller';
import { GraduateProgramsController } from './graduate-programs.controller';
import { GraduationCertificatesService } from './graduation-certificates.service';
import { GraduateProgramsService } from './graduate-programs.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { GraduateOracleIntegrationController } from './graduate-oracle-integration.controller';
import { GraduateOracleIntegrationService } from './graduate-oracle-integration.service';
import { GraduateMysqlIntegrationService } from './graduate-mysql-integration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Graduate,
      GraduationCertificateRequest,
      GraduationCertificate,
      CertificateValidation,
      Signer,
      TemplateConfig,
      TemplateConfigChange,
      GraduateFile,
      GraduationRequestReviewFile,
      GraduateProgram,
    ]),
  ],
  controllers: [
    GraduationCertificatesController,
    GraduatesController,
    GraduateProgramsController,
    GraduateOracleIntegrationController,
  ],
  providers: [
    GraduationCertificatesService,
    PdfGeneratorService,
    GraduateMysqlIntegrationService,
    GraduateOracleIntegrationService,
    GraduateProgramsService,
  ],
  exports: [
    GraduationCertificatesService,
    GraduateMysqlIntegrationService,
    GraduateOracleIntegrationService,
  ],
})
export class GraduationCertificatesModule {}
