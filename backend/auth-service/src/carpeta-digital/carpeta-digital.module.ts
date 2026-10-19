import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from '../users/person.entity';
import { CarpetaDigitalController } from './carpeta-digital.controller';
import { CarpetaDigital } from './carpeta-digital.entity';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { TipoDocumento } from './tipo-documento.entity';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';
import { RundCarpetaClient } from './rund-carpeta.client';
import { CarpetaDocumentVersionsService } from './carpeta-document-versions.service';
import { RundStateSnapshotService } from './rund-state-snapshot.service';
import { RundStateSnapshotController, RundStateSnapshotGuard } from './rund-state-snapshot.controller';
import { RundClientModule } from './rund.module';
import { PtaHistoricoClient } from './pta-historico.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CarpetaDigital,
      TipoDocumento,
      DocumentoCarpetaDigital,
      Person,
    ]),
    RundClientModule,
  ],
  controllers: [CarpetaDigitalController, RundStateSnapshotController],
  providers: [CarpetaDigitalService, DocumentTypeValidatorService, RundCarpetaClient, PtaHistoricoClient, CarpetaDocumentVersionsService, RundStateSnapshotService, RundStateSnapshotGuard],
  exports: [CarpetaDigitalService, DocumentTypeValidatorService],
})
export class CarpetaDigitalModule {}
