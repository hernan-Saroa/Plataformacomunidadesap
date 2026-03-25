import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanIndividualController } from './plan-individual.controller';
import { PlanIndividualService } from './plan-individual.service';
import { PlanIndividual } from './entities/plan-individual.entity';
import { AuditoriaProgramada } from '../programa-anual/entities/auditoria-programada.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanIndividual, AuditoriaProgramada]),
    AuthModule,
  ],
  controllers: [PlanIndividualController],
  providers: [PlanIndividualService],
  exports: [PlanIndividualService, TypeOrmModule],
})
export class PlanIndividualModule {}

