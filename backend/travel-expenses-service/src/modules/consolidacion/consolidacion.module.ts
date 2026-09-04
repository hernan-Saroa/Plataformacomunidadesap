import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsolidacionController } from './consolidacion.controller';
import { ConsolidacionService } from './consolidacion.service';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { RutaRestringidaEntity } from '../../entities/tickets/ruta-restringida.entity';
import { ExcepcionTiqueteEntity } from '../../entities/tickets/excepcion-tiquete.entity';
import { SaldoTiqueteEntity } from '../../entities/tickets/saldo-tiquete.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { ConfigModule } from '../config/config.module';

/**
 * Módulo de consolidación y cierre del expediente de comisión (RF-LIQ-004).
 *
 * Agrupa el servicio transaccional de envío a revisión del Grupo de Viáticos
 * y la previsualización de integridad que alimenta el "Paso 4: Resumen de
 * Expediente y Envío" del frontend.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudComisionEntity,
      DocumentoSoporteEntity,
      RutaRestringidaEntity,
      ExcepcionTiqueteEntity,
      SaldoTiqueteEntity,
      SolicitudHistorialEstadoEntity,
    ]),
    ConfigModule,
  ],
  controllers: [ConsolidacionController],
  providers: [ConsolidacionService],
  exports: [ConsolidacionService],
})
export class ConsolidacionModule {}
