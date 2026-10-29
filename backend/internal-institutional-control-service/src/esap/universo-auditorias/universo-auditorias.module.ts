import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversoAuditoriasController } from './universo-auditorias.controller';
import { UniversoAuditoriasService } from './universo-auditorias.service';
import { ProcesoAuditable } from './entities/proceso-auditable.entity';
import { EvaluacionProceso } from './entities/evaluacion-proceso.entity';
import { TipoProceso } from './entities/tipo-proceso.entity';
import { EvaluacionProcesoController } from './evaluacion-proceso.controller';
import { EvaluacionProcesoService } from './evaluacion-proceso.service';
import { AuthModule } from '../../auth/auth.module';
import { AuditoriasModule } from '../auditorias/auditorias.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcesoAuditable, EvaluacionProceso, TipoProceso]),
    AuthModule,
    // Para archivar las auditorías de un proceso que sale del Universo (EFDS-2281)
    AuditoriasModule,
  ],
  controllers: [UniversoAuditoriasController, EvaluacionProcesoController],
  providers: [
    UniversoAuditoriasService,
    EvaluacionProcesoService,
  ],
  exports: [
    UniversoAuditoriasService,
    EvaluacionProcesoService,
    TypeOrmModule,
  ],
})
export class UniversoAuditoriasModule {}
