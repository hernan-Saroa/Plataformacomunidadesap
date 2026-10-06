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

@Module({
  imports: [
    TypeOrmModule.forFeature([BancoDocenteEntity, PersonaEntity, UsuarioEntity, PtaConfiguracionEntity, BancoDocenteInvitacionEntity, RundAprobacionLogEntity, RundCampoEstadoEntity, RundSoporteCampoEntity]),
  ],
  controllers: [BancoDocentesController, RundPtaConsultaController, RundExtraccionController, RundValidacionController],
  providers: [
    BancoDocentesService,
    DocumentTypeValidatorService,
    BancoDocentesRolesGuard,
    RundDocumentStorageService,
    RundDocumentosService,
    RundPtaConsultaService,
    RundPtaJwtGuard,
    RundExtraccionService,
    RundExtraccionNotificationsService,
    RundValidacionService,
  ],
  exports: [BancoDocentesService, DocumentTypeValidatorService, RundDocumentosService, RundValidacionService],
})
export class BancoDocentesModule {}
