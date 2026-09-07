import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelExpensesController } from './travel-expenses.controller';
import { TravelExpensesService } from './travel-expenses.service';
import { ComisionadoEntity } from '../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../entities/documento-soporte.entity';
import { UsuarioEntity } from '../../entities/usuario.entity';
import { ConfigModule } from '../config/config.module';
import { CommonModule } from '../../common/common.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComisionadoEntity,
      SolicitudComisionEntity,
      DocumentoSoporteEntity,
      UsuarioEntity,
    ]),
    ConfigModule,
    CommonModule,
    AssignmentsModule,
  ],
  controllers: [TravelExpensesController],
  providers: [TravelExpensesService],
  exports: [TravelExpensesService],
})
export class TravelExpensesModule {}
