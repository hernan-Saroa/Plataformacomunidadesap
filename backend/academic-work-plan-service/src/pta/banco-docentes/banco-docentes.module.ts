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

@Module({
  imports: [
    TypeOrmModule.forFeature([DocenteEntity, PersonaEntity, UsuarioEntity, PtaConfiguracionEntity, BancoDocenteInvitacionEntity, RundAprobacionLogEntity, RundCampoEstadoEntity, RundSoporteCampoEntity]),
  ],
  controllers: [BancoDocentesController],
  providers: [
    BancoDocentesService,
    DocumentTypeValidatorService,
    BancoDocentesRolesGuard,
    RundDocumentStorageService,
    RundDocumentosService,
  ],
  exports: [BancoDocentesService, DocumentTypeValidatorService, RundDocumentosService],
})
export class BancoDocentesModule {}
