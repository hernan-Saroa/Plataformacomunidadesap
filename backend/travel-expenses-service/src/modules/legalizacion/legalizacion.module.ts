import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/common.module';
import { ConfigLegalizacionEntity } from './entities/config-legalizacion.entity';
import { ConfigLegalizacionDocumentoEntity } from './entities/config-legalizacion-documento.entity';
import { LegalizacionComisionEntity } from './entities/legalizacion-comision.entity';
import { LegalizacionSoporteEntity } from './entities/legalizacion-soporte.entity';
import { LegalizacionController } from './legalizacion.controller';
import { LegalizacionService } from './legalizacion.service';
import { LegalizacionConfigService } from './legalizacion-config.service';
import { LegalizacionDisparadorService } from './legalizacion-disparador.service';
import { LegalizacionVencimientosService } from './legalizacion-vencimientos.service';
import { LegalizacionCanarioService } from './legalizacion-canario.service';
import { LegalizacionCron } from './legalizacion.cron';

/** Entidades del módulo, para registrarlas en el TypeOrmModule.forRoot de AppModule. */
export const LEGALIZACION_ENTITIES = [
  ConfigLegalizacionEntity,
  ConfigLegalizacionDocumentoEntity,
  LegalizacionComisionEntity,
  LegalizacionSoporteEntity,
];

/**
 * EFDS-1309 — Etapa 9: legalización de comisiones (soportes del comisionado).
 *
 * Toda la lógica de la etapa vive aquí. Se conecta con el flujo existente solo
 * escuchando 'commission.disbursement_ready', que el servicio de viáticos ya
 * emite: no modifica la Etapa 8.
 */
@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature(LEGALIZACION_ENTITIES), CommonModule],
  controllers: [LegalizacionController],
  providers: [
    LegalizacionService,
    LegalizacionConfigService,
    LegalizacionDisparadorService,
    LegalizacionVencimientosService,
    LegalizacionCanarioService,
    LegalizacionCron,
  ],
  exports: [LegalizacionDisparadorService, LegalizacionCanarioService],
})
export class LegalizacionModule {}
