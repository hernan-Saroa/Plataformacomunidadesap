import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { MantenimientoService } from './mantenimiento.service.js';
import { MantenimientoController } from './mantenimiento.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudMantenimiento])],
  controllers: [MantenimientoController],
  providers: [MantenimientoService],
  exports: [MantenimientoService, TypeOrmModule],
})
export class MantenimientoModule {}
