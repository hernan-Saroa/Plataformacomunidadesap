import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HorariosController } from './horarios.controller.js';
import { HorariosService } from './horarios.service.js';
import { FranjaHorariaEntity } from './franja-horaria.entity.js';
import { GrupoEntity } from '../grupos/grupo.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([FranjaHorariaEntity, GrupoEntity])],
  controllers: [HorariosController],
  providers: [HorariosService],
})
export class HorariosModule {}
