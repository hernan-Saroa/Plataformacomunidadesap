import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramaAnualController } from './programa-anual.controller';
import { ProgramaAnualService } from './programa-anual.service';
import { ProgramaAnual } from './entities/programa-anual.entity';
import { AuditoriaProgramada } from './entities/auditoria-programada.entity';
import { ProcesoAuditable } from '../universo-auditorias/entities/proceso-auditable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProgramaAnual, AuditoriaProgramada, ProcesoAuditable]),
  ],
  controllers: [ProgramaAnualController],
  providers: [ProgramaAnualService],
  exports: [ProgramaAnualService, TypeOrmModule],
})
export class ProgramaAnualModule {}

