import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenciasController } from './evidencias.controller';
import { EvidenciasService } from './evidencias.service';
import { EvidenciaDocumento } from './entities/evidencia-documento.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { HistorialAuditoria } from '../auditorias/entities/historial-auditoria.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EvidenciaDocumento, HistorialAuditoria]),
    NotificacionesModule,
    AuthModule,
  ],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
  exports: [EvidenciasService],
})
export class EvidenciasModule {}
