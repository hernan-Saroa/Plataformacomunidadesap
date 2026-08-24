import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CertificatesModule } from './certificates/certificates.module';
import { CertificateRequest } from './certificates/certificate-request.entity';
import { Certificate } from './certificates/certificate.entity';
import { CertificateValidation } from './certificates/certificate-validation.entity';
import { CertificateTemplate } from './certificates/certificate-template.entity';
import { Signer } from './certificates/signer.entity';
import { TemplateConfig } from './certificates/template-config.entity';
import { TemplateConfigChange } from './certificates/template-config-change.entity';
import { TemplateSigner } from './certificates/template-signer.entity';
import { TechnicalBonusAssignment } from './certificates/technical-bonus-assignment.entity';
import { TechnicalBonusTemplate } from './certificates/technical-bonus-template.entity';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CertificateCorrectionRequest } from './certificates/certificate-correction-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      schema: process.env.DB_SCHEMA,
      entities: [
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
      ],
      synchronize: false, // Using existing schema
    }),
    CertificatesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
