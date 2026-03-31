import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HallazgosService } from './hallazgos.service';
import { HallazgosController } from './hallazgos.controller';
import { Hallazgo } from './entities/hallazgo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { HistorialAuditoria } from '../auditorias/entities/historial-auditoria.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hallazgo, Auditoria, HistorialAuditoria]),
    AuthModule,
  ],
  controllers: [HallazgosController],
  providers: [HallazgosService],
  exports: [HallazgosService, TypeOrmModule],
})
export class HallazgosModule {}












