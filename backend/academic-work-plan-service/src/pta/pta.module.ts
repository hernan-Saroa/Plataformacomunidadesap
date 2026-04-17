import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PtaController } from './pta.controller';
import { PtaService } from './pta.service';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';
import { HistorialEstadoPtaEntity } from './entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './entities/pta-evidencia.entity';
import { SolicitudPtaEntity } from './entities/solicitud-pta.entity';
import { PtaConfiguracionEntity } from './entities/pta-configuracion.entity';
import { PtaUserDataEntity } from './entities/pta-user-data.entity';
import { ProgramaEntity } from './entities/programa.entity';
import { AsignaturaEntity } from './entities/asignatura.entity';
import { TerritorialEntity } from './entities/territorial.entity';
import { SedeEntity } from './entities/sede.entity';
import { DocenteEntity } from './entities/docente.entity';
import { PersonaEntity } from './entities/persona.entity';
import { UsuarioEntity } from './entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanTrabajoAcademicoEntity,
      HistorialEstadoPtaEntity,
      PtaEvidenciaEntity,
      SolicitudPtaEntity,
      PtaConfiguracionEntity,
      PtaUserDataEntity,
      ProgramaEntity,
      AsignaturaEntity,
      TerritorialEntity,
      SedeEntity,
      DocenteEntity,
      PersonaEntity,
      UsuarioEntity,
    ]),
  ],
  controllers: [PtaController],
  providers: [PtaService],
})
export class PtaModule {}
