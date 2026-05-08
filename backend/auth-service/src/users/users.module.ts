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
import { UsersService } from './users.service';
import { RolesService } from './roles.service';
import { ModulesService } from './modules.service';
import { EstructuraOrganizacionalService } from './estructura-organizacional.service';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { ModulesController } from './modules.controller';
import { EstructuraOrganizacionalController } from './estructura-organizacional.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DatosMaestrosModule } from './datos-maestros.module';

@NestModule({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Person,
      Role,
      Permission,
      Module,
      Geopolitica,
      Sede,
      Seccional,
    ]),
    DatosMaestrosModule,
  ],
  providers: [UsersService, RolesService, ModulesService, EstructuraOrganizacionalService, RolesGuard],
  controllers: [
    RolesController,
    UsersController,
    ModulesController,
    EstructuraOrganizacionalController,
  ],
  exports: [UsersService, RolesService, ModulesService, EstructuraOrganizacionalService],
})
export class UsersModule {}
