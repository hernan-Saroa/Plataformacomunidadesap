import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramaAcademico } from './programa.entity';
import { RegistroCalificado } from './registro-calificado.entity';
import { AcreditacionPrograma } from './acreditacion.entity';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramaAcademico, RegistroCalificado, AcreditacionPrograma])],
  providers: [ProgramasService],
  controllers: [ProgramasController],
})
export class ProgramasModule {}
