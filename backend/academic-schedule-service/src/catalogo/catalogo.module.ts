import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramaCatalogoEntity,
      AsignaturaCatalogoEntity,
      UbicacionSemestralCatalogoEntity,
    ]),
  ],
  controllers: [CatalogoController],
  providers: [CatalogoService, ProgramacionPermissionsService],
})
export class CatalogoModule {}
