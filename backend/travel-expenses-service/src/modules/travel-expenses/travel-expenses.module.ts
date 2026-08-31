import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelExpensesController } from './travel-expenses.controller';
import { TravelExpensesService } from './travel-expenses.service';
import { ComisionadoEntity } from '../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComisionadoEntity,
      SolicitudComisionEntity,
      DocumentoSoporteEntity,
    ]),
  ],
  controllers: [TravelExpensesController],
  providers: [TravelExpensesService],
  exports: [TravelExpensesService],
})
export class TravelExpensesModule {}
