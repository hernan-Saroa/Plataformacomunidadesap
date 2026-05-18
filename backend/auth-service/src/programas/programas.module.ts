import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramaAcademico } from './programa.entity';
import { Asignatura } from './asignatura.entity';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramaAcademico, Asignatura])],
  providers: [ProgramasService],
  controllers: [ProgramasController],
})
export class ProgramasModule {}
