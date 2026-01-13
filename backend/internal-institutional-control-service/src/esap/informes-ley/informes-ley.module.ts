import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InformesLeyController } from './informes-ley.controller';
import { InformesLeyService } from './informes-ley.service';
import { InformeLey } from './entities/informe-ley.entity';
import { EntregaInformeLey } from './entities/entrega-informe-ley.entity';
import { PlantillaInformeLey } from './entities/plantilla-informe-ley.entity';
import { WorkflowAprobacionInforme } from './entities/workflow-aprobacion-informe.entity';
import { PasoWorkflowInforme } from './entities/paso-workflow-informe.entity';
import { DatosAutomaticosInforme } from './entities/datos-automaticos-informe.entity';
import { HistorialGeneracionInforme } from './entities/historial-generacion-informe.entity';
import { PlantillasService } from './services/plantillas.service';
import { DatosAutomaticosService } from './services/datos-automaticos.service';
import { InformeGeneratorService } from './services/informe-generator.service';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { PlanMejoramiento } from '../planes-mejoramiento/entities/plan-mejoramiento.entity';
import { Hallazgo } from '../hallazgos/entities/hallazgo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InformeLey,
      EntregaInformeLey,
      PlantillaInformeLey,
      WorkflowAprobacionInforme,
      PasoWorkflowInforme,
      DatosAutomaticosInforme,
      HistorialGeneracionInforme,
      Auditoria,
      PlanMejoramiento,
      Hallazgo,
    ]),
  ],
  controllers: [InformesLeyController],
  providers: [
    InformesLeyService,
    PlantillasService,
    DatosAutomaticosService,
    InformeGeneratorService,
  ],
  exports: [
    InformesLeyService,
    PlantillasService,
    DatosAutomaticosService,
    InformeGeneratorService,
    TypeOrmModule,
  ],
})
export class InformesLeyModule {}












