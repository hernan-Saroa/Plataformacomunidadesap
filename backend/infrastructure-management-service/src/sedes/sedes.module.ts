import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sede } from './sede.entity.js';
import { BloqueEdificio } from './bloque.entity.js';
import { SedesService } from './sedes.service.js';
import { SedesController } from './sedes.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sede, BloqueEdificio])],
  controllers: [SedesController],
  providers: [SedesService],
  exports: [SedesService, TypeOrmModule],
})
export class SedesModule {}
