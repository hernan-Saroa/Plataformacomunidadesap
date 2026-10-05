import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReintegrosController } from './reintegros.controller';
import { ReintegrosService } from './reintegros.service';
import { ReintegroComisionEntity } from '../../entities/reintegro-comision.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReintegroComisionEntity,
      SolicitudComisionEntity,
      SolicitudHistorialEstadoEntity,
    ]),
    CommonModule,
  ],
  controllers: [ReintegrosController],
  providers: [ReintegrosService],
  exports: [ReintegrosService],
})
export class ReintegrosModule {}
