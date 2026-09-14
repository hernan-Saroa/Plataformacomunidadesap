import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { AuditoriasModule } from '../auditorias/auditorias.module';
import { VersionProgramaAnual } from './entities/version-programa-anual.entity';
import { ProgramaAnualVersionesController } from './programa-anual-versiones.controller';
import { ProgramaAnualVersionesService } from './programa-anual-versiones.service';

@Module({
  imports: [TypeOrmModule.forFeature([VersionProgramaAnual]), AuditoriasModule, AuthModule],
  controllers: [ProgramaAnualVersionesController],
  providers: [ProgramaAnualVersionesService],
})
export class ProgramaAnualVersionesModule {}
