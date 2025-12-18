import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AprobacionesService } from './aprobaciones.service';
import { AprobacionesController } from './aprobaciones.controller';
import { Aprobacion } from './entities/aprobacion.entity';
import { PlanesMejoramientoModule } from '../planes-mejoramiento/planes-mejoramiento.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Aprobacion]),
    forwardRef(() => PlanesMejoramientoModule),
  ],
  controllers: [AprobacionesController],
  providers: [AprobacionesService],
  exports: [AprobacionesService, TypeOrmModule],
})
export class AprobacionesModule {}

