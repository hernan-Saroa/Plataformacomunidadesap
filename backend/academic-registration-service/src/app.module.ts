import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraduationCertificatesModule } from './graduation-certificates/graduation-certificates.module';
import { Graduate } from './graduation-certificates/graduate.entity';
import { GraduationCertificateRequest } from './graduation-certificates/graduation-certificate-request.entity';
import { GraduationCertificate } from './graduation-certificates/graduation-certificate.entity';
import { CertificateValidation } from './graduation-certificates/certificate-validation.entity';
import { CertificateDownload } from './graduation-certificates/certificate-download.entity';
import { Signer } from './graduation-certificates/signer.entity';
import { TemplateConfig } from './graduation-certificates/template-config.entity';
import { TemplateConfigChange } from './graduation-certificates/template-config-change.entity';
import { GraduateFile } from './graduation-certificates/graduate-file.entity';
import { GraduationRequestReviewFile } from './graduation-certificates/graduation-request-review-file.entity';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

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
        Graduate,
        GraduationCertificateRequest,
        GraduationCertificate,
        CertificateValidation,
        CertificateDownload,
        Signer,
        TemplateConfig,
        TemplateConfigChange,
        GraduateFile,
        GraduationRequestReviewFile,
      ],
      synchronize: false, // Using existing schema from migrations
    }),
    GraduationCertificatesModule,
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
