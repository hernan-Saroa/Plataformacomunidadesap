import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriasController } from './auditorias.controller';
import { AuditoriasService } from './auditorias.service';
import { Auditoria } from './entities/auditoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auditoria]),
  ],
  controllers: [AuditoriasController],
  providers: [AuditoriasService],
  exports: [AuditoriasService, TypeOrmModule],
})
export class AuditoriasModule {}












