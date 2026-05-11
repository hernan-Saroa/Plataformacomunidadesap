import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramaAcademico } from './programa.entity';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramaAcademico])],
  providers: [ProgramasService],
  controllers: [ProgramasController],
})
export class ProgramasModule {}
