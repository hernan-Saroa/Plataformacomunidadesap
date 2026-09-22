import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspacioFisico } from './espacio.entity.js';
import { BloqueEdificio } from '../sedes/bloque.entity.js';
import { EspaciosService } from './espacios.service.js';
import { EspaciosController } from './espacios.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EspacioFisico, BloqueEdificio])],
  controllers: [EspaciosController],
  providers: [EspaciosService],
  exports: [EspaciosService, TypeOrmModule],
})
export class EspaciosModule {}
