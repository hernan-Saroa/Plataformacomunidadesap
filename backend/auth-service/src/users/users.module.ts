import { Module as NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Person } from './person.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Module } from './module.entity';
import { Geopolitica } from './geopolitica.entity';
import { Sede } from './sede.entity';
import { Seccional } from './seccional.entity';
import { Dependencia } from './dependencia.entity';
import { Cargo } from './cargo.entity';
import { DependenciaCargo } from './dependencia-cargo.entity';
import { UsersService } from './users.service';
import { RolesService } from './roles.service';
import { ModulesService } from './modules.service';
import { EstructuraOrganizacionalService } from './estructura-organizacional.service';
import { BackofficeDashboardService } from './backoffice-dashboard.service';
import { RundClientModule } from '../carpeta-digital/rund.module';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { ModulesController } from './modules.controller';
import { EstructuraOrganizacionalController } from './estructura-organizacional.controller';
import { BackofficeDashboardController } from './backoffice-dashboard.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DatosMaestrosModule } from './datos-maestros.module';
import { RundIdentityController, RundIdentityGuard, RundIdentityService } from './rund-identity.controller';
import { RundCatalogosController, RundCatalogosService } from './rund-catalogos.controller';
import { RundBancoController, RundBancoService } from './rund-banco.controller';
import { RundIdentityValidationController, RundIdentityValidationService } from './rund-identity-validation.controller';
import { RundBulkPreviewController, RundBulkPreviewService } from './rund-bulk-preview.controller';
import { RundIdentityOperationController, RundIdentityOperationService } from './rund-identity-operation.controller';
import { RundIdentityApplyController, RundIdentityApplyService } from './rund-identity-apply.controller';
import { RundIdentityCompensationController, RundIdentityCompensationService } from './rund-identity-compensation.controller';
import { RundIdentityAbortClient } from './rund-identity-abort.client';
import { RundIdentityMailValidationController, RundIdentityMailValidationService } from './rund-identity-mail-validation.controller';

@NestModule({
  imports: [
    RundClientModule,
    TypeOrmModule.forFeature([
      User,
      Person,
      Role,
      Permission,
      Module,
      Geopolitica,
      Sede,
      Seccional,
      Dependencia,
      Cargo,
      DependenciaCargo,
    ]),
    DatosMaestrosModule,
  ],
  providers: [UsersService, RolesService, ModulesService, EstructuraOrganizacionalService, RolesGuard, BackofficeDashboardService,
    RundIdentityGuard, RundIdentityService, RundCatalogosService, RundBancoService, RundIdentityValidationService, RundIdentityOperationService, RundIdentityApplyService,
    RundIdentityCompensationService, RundIdentityAbortClient, RundIdentityMailValidationService, RundBulkPreviewService],
  controllers: [
    RolesController,
    UsersController,
    ModulesController,
    EstructuraOrganizacionalController,
    BackofficeDashboardController,
    RundIdentityController,
    RundCatalogosController,
    RundBancoController,
    RundIdentityValidationController,
    RundBulkPreviewController,
    RundIdentityOperationController,
    RundIdentityApplyController,
    RundIdentityCompensationController,
    RundIdentityMailValidationController,
  ],
  exports: [UsersService, RolesService, ModulesService, EstructuraOrganizacionalService],
})
export class UsersModule {}
