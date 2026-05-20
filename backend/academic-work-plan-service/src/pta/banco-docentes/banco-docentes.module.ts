import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { UsuarioEntity } from '../entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocenteEntity, PersonaEntity, UsuarioEntity]),
  ],
  controllers: [BancoDocentesController],
  providers: [BancoDocentesService],
  exports: [BancoDocentesService],
})
export class BancoDocentesModule {}
