import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContratosService } from './contratos.service';
import { ContratosController } from './contratos.controller';

import { Contrato } from '../../entities/contrato.entity';
import { TipologiaContrato } from '../../entities/tipologia-contrato.entity';
import { Plantilla } from '../../entities/plantilla.entity';
// El contrato se genera sobre un proceso adjudicado. Mientras la etapa 7 no
// exista, la adjudicación se comprueba contra la recepción cerrada: se leen las
// entidades y no el servicio de ofertas, para no atar esta actividad a la forma
// de la respuesta de aquella.
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      TipologiaContrato,
      Plantilla,
      RecepcionOfertas,
      Oferente,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [ContratosController],
  providers: [ContratosService],
  // La suscripción (EFDS-1162) y la legalización (EFDS-1164) preguntan aquí por
  // el contrato vigente en vez de repetir la consulta.
  exports: [ContratosService],
})
export class ContratosModule {}
