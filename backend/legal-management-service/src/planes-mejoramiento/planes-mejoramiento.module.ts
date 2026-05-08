import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanesMejoramientoController } from '../controllers/planes-mejoramiento.controller';
import { PlanesMejoramientoService } from '../services/planes-mejoramiento.service';
import { PlanMejoramiento, PlanEvidencia, PlanSeguimiento, PlanComentario } from '../entities/planes-mejoramiento.entity';
import { PlanHallazgo } from '../entities/plan-hallazgo.entity';
import { Riesgo } from '../entities/riesgo.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PlanMejoramiento,
            PlanEvidencia,
            PlanSeguimiento,
            PlanComentario,
            PlanHallazgo,
            Riesgo
        ])
    ],
    controllers: [PlanesMejoramientoController],
    providers: [PlanesMejoramientoService],
})
export class PlanesMejoramientoModule { }
