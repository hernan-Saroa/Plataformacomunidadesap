import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanAnual5RolesController } from './plan-anual-5-roles.controller';
import { PlanAnual5RolesService } from './plan-anual-5-roles.service';
import { PlanAnual5Roles } from './entities/plan-anual-5-roles.entity';
import { RolPlanAnual5 } from './entities/rol-plan-anual-5.entity';
import { ActividadPlanAnual5 } from './entities/actividad-plan-anual-5.entity';
import { AdjuntoActividadPlanAnual5 } from './entities/adjunto-actividad-plan-anual-5.entity';
import { HistorialPlanAnual } from './entities/historial-plan-anual.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanAnual5Roles,
      RolPlanAnual5,
      ActividadPlanAnual5,
      AdjuntoActividadPlanAnual5,
      HistorialPlanAnual,
    ]),
    NotificacionesModule,
  ],
  controllers: [PlanAnual5RolesController],
  providers: [PlanAnual5RolesService],
  exports: [PlanAnual5RolesService],
})
export class PlanAnual5RolesModule {}

