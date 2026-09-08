import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspacioFisico } from './espacio.entity.js';
import { EspaciosService } from './espacios.service.js';
import { EspaciosController } from './espacios.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EspacioFisico])],
  controllers: [EspaciosController],
  providers: [EspaciosService],
  exports: [EspaciosService, TypeOrmModule],
})
export class EspaciosModule {}
