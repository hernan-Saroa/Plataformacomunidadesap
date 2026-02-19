import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TareasAuditoriaService } from './tareas-auditoria.service';
import { TareasAuditoriaController } from './tareas-auditoria.controller';
import { TareaAuditoria } from './entities/tarea-auditoria.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { HistorialAuditoria } from '../auditorias/entities/historial-auditoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TareaAuditoria, Auditoria, HistorialAuditoria]),
  ],
  controllers: [TareasAuditoriaController],
  providers: [TareasAuditoriaService],
  exports: [TareasAuditoriaService, TypeOrmModule],
})
export class TareasAuditoriaModule {}
