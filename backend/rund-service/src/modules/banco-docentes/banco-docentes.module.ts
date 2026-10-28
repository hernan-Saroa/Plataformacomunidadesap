import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { UsuarioEntity } from '../../entities/usuario.entity';
import { PtaConfiguracionEntity } from '../../entities/pta-configuracion.entity';
import { BancoDocenteInvitacionEntity } from '../../entities/banco-docente-invitacion.entity';
import { RundAprobacionLogEntity } from '../../entities/rund-aprobacion-log.entity';
import { RundCampoEstadoEntity } from '../../entities/rund-campo-estado.entity';
import { RundSoporteCampoEntity } from '../../entities/rund-soporte-campo.entity';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RundDocumentStorageService } from './rund-document-storage.service';
import { RundDocumentosService } from './rund-documentos.service';
import { RundPtaConsultaController, RundPtaJwtGuard } from './rund-pta-consulta.controller';
import { RundPtaConsultaService } from './rund-pta-consulta.service';
import { RundExtraccionService } from './rund-extraccion.service';
import { RundExtraccionController } from './rund-extraccion.controller';
import { RundValidacionController } from './rund-validacion.controller';
import { RundValidacionService } from './rund-validacion.service';
import { RundExtraccionNotificationsService } from './rund-extraccion-notifications.service';
import { AuthModule } from '../../auth/auth.module';
import { RundCarpetaInternalController, RundCarpetaInternalGuard } from './rund-carpeta-internal.controller';
import { RundCarpetaConsultaService } from './rund-carpeta-consulta.service';
import { RundAuthStateSyncService } from './rund-auth-state-sync.service';
import { RundAuthStateSyncWorker } from './rund-auth-state-sync.worker';
import { AuthIdentityModule } from '../../common/auth-identity.client';
import { AuthBancoModule } from '../../common/auth-banco.client';
import { RundCatalogosModule } from '../../common/rund-catalogos.client';
import { AuthIdentityCorrectionModule } from '../../common/auth-identity-correction.client';
import { RundOcrIdentityCorrection } from './rund-ocr-identity-correction';
import { RundNucleosController } from './rund-nucleos.controller';
import { RundNucleosService } from './rund-nucleos.service';

@Module({
  imports: [
    AuthModule,
    AuthIdentityModule,
    AuthBancoModule,
    RundCatalogosModule,
    AuthIdentityCorrectionModule,
    TypeOrmModule.forFeature([BancoDocenteEntity, PersonaEntity, UsuarioEntity, PtaConfiguracionEntity, BancoDocenteInvitacionEntity, RundAprobacionLogEntity, RundCampoEstadoEntity, RundSoporteCampoEntity]),
  ],
  controllers: [RundNucleosController, BancoDocentesController, RundPtaConsultaController, RundExtraccionController, RundValidacionController, RundCarpetaInternalController],
  providers: [
    RundAuthStateSyncService,
    RundAuthStateSyncWorker,
    RundCarpetaInternalGuard,
    RundCarpetaConsultaService,
    BancoDocentesService,
    DocumentTypeValidatorService,
    BancoDocentesRolesGuard,
    RundDocumentStorageService,
    RundDocumentosService,
    RundPtaConsultaService,
    RundPtaJwtGuard,
    RundExtraccionService,
    RundOcrIdentityCorrection,
    RundExtraccionNotificationsService,
    RundValidacionService,
    RundNucleosService,
  ],
  exports: [BancoDocentesService, DocumentTypeValidatorService, RundDocumentosService, RundValidacionService, RundNucleosService],
})
export class BancoDocentesModule {}
