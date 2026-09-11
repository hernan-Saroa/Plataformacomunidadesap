import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity.js';
import { MantenimientoService } from './mantenimiento.service.js';
import { MantenimientoController } from './mantenimiento.controller.js';
import { Sede } from '../sedes/sede.entity.js';
import { CatalogoItem } from './catalogo-item.entity.js';
import { SolicitudEvidencia } from './solicitud-evidencia.entity.js';
import { StorageService } from './storage.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudMantenimiento, Sede, CatalogoItem, SolicitudEvidencia])],
  controllers: [MantenimientoController],
  providers: [MantenimientoService, StorageService],
  exports: [MantenimientoService, StorageService, TypeOrmModule],
})
export class MantenimientoModule {}
