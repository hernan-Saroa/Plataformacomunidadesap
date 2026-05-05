import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { UsuarioEntity } from '../entities/usuario.entity';
import { TerritorialEntity } from '../entities/territorial.entity';
import { SedeEntity } from '../entities/sede.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocenteEntity, PersonaEntity, UsuarioEntity, TerritorialEntity, SedeEntity]),
  ],
  controllers: [BancoDocentesController],
  providers: [BancoDocentesService],
  exports: [BancoDocentesService],
})
export class BancoDocentesModule {}
