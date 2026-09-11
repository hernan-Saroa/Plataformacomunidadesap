import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { MantenimientoService } from './mantenimiento.service.js';
import { MantenimientoController } from './mantenimiento.controller.js';
import { Sede } from '../sedes/sede.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudMantenimiento, Sede])],
  controllers: [MantenimientoController],
  providers: [MantenimientoService],
  exports: [MantenimientoService, TypeOrmModule],
})
export class MantenimientoModule {}
