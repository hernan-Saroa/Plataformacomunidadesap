import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AnalistaEntity } from '../../entities/analista.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalistaEntity,
      SolicitudComisionEntity,
      SolicitudHistorialEstadoEntity,
    ]),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
