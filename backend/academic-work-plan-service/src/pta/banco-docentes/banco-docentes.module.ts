import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { UsuarioEntity } from '../entities/usuario.entity';
import { PtaConfiguracionEntity } from '../entities/pta-configuracion.entity';
import { BancoDocenteInvitacionEntity } from '../entities/banco-docente-invitacion.entity';
import { RundAprobacionLogEntity } from '../entities/rund-aprobacion-log.entity';
import { RundCampoEstadoEntity } from '../entities/rund-campo-estado.entity';
import { RundSoporteCampoEntity } from '../entities/rund-soporte-campo.entity';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RundDocumentStorageService } from './rund-document-storage.service';
import { RundDocumentosService } from './rund-documentos.service';
import { RundPtaConsultaController, RundPtaJwtGuard } from './rund-pta-consulta.controller';
import { RundPtaConsultaService } from './rund-pta-consulta.service';
import { RundExtraccionService } from './rund-extraccion.service';
import { RundExtraccionController } from './rund-extraccion.controller';
import { RundExtraccionNotificationsService } from './rund-extraccion-notifications.service';
import { RundNucleosController } from './rund-nucleos.controller';
import { RundNucleosService } from './rund-nucleos.service';
import { RundPhotosService } from './rund-photos.service';
import { RundPhotosController } from './rund-photos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocenteEntity, PersonaEntity, UsuarioEntity, PtaConfiguracionEntity, BancoDocenteInvitacionEntity, RundAprobacionLogEntity, RundCampoEstadoEntity, RundSoporteCampoEntity]),
  ],
  controllers: [RundPhotosController, RundNucleosController, BancoDocentesController, RundPtaConsultaController, RundExtraccionController],
  providers: [
    RundPhotosService,
    BancoDocentesService,
    DocumentTypeValidatorService,
    BancoDocentesRolesGuard,
    RundDocumentStorageService,
    RundDocumentosService,
    RundPtaConsultaService,
    RundPtaJwtGuard,
    RundExtraccionService,
    RundExtraccionNotificationsService,
    RundNucleosService,
  ],
  exports: [BancoDocentesService, DocumentTypeValidatorService, RundDocumentosService, RundNucleosService],
})
export class BancoDocentesModule {}
