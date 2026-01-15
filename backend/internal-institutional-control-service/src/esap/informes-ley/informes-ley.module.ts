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
import { WorkflowAprobacionService } from './services/workflow-aprobacion.service';
import { DafValidatorService } from './services/daf-validator.service';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { PlanMejoramiento } from '../planes-mejoramiento/entities/plan-mejoramiento.entity';
import { Hallazgo } from '../hallazgos/entities/hallazgo.entity';
import { PlanAnual5RolesModule } from '../plan-anual-5-roles/plan-anual-5-roles.module';

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
    PlanAnual5RolesModule, // Importar módulo del Plan Anual para vincular informes
  ],
  controllers: [InformesLeyController],
  providers: [
    InformesLeyService,
    PlantillasService,
    DatosAutomaticosService,
    InformeGeneratorService,
    WorkflowAprobacionService,
    DafValidatorService,
  ],
  exports: [
    InformesLeyService,
    PlantillasService,
    DatosAutomaticosService,
    InformeGeneratorService,
    WorkflowAprobacionService,
    TypeOrmModule,
  ],
})
export class InformesLeyModule {}












