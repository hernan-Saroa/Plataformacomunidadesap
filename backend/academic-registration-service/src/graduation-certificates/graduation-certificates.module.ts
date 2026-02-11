import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Graduate } from './graduate.entity';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';
import { GraduationCertificate } from './graduation-certificate.entity';
import { CertificateValidation } from './certificate-validation.entity';
import { CertificateDownload } from './certificate-download.entity';
import { Signer } from './signer.entity';
import { TemplateConfig } from './template-config.entity';
import { TemplateConfigChange } from './template-config-change.entity';
import { GraduateFile } from './graduate-file.entity';
import { GraduationCertificatesController } from './graduation-certificates.controller';
import { GraduatesController } from './graduates.controller';
import { GraduationCertificatesService } from './graduation-certificates.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Graduate,
      GraduationCertificateRequest,
      GraduationCertificate,
      CertificateValidation,
      CertificateDownload,
      Signer,
      TemplateConfig,
      TemplateConfigChange,
      GraduateFile,
    ]),
  ],
  controllers: [GraduationCertificatesController, GraduatesController],
  providers: [GraduationCertificatesService, PdfGeneratorService],
  exports: [GraduationCertificatesService],
})
export class GraduationCertificatesModule {}
