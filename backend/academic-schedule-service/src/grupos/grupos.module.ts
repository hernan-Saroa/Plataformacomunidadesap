import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GruposController } from './grupos.controller.js';
import { GruposService } from './grupos.service.js';
import { GrupoEntity } from './grupo.entity.js';
import { AsignaturaCatalogoEntity } from '../catalogo/entities/asignatura.readonly.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([GrupoEntity, AsignaturaCatalogoEntity])],
  controllers: [GruposController],
  providers: [GruposService],
  exports: [GruposService],
})
export class GruposModule {}
