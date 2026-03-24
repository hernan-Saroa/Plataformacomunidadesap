import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReunionApertura } from '../auditorias/entities/reunion-apertura.entity';
import { ReunionCierre } from '../auditorias/entities/reunion-cierre.entity';
import { EtapasAuditoriaController } from './etapas-auditoria.controller';
import { EtapasAuditoriaService } from './etapas-auditoria.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReunionApertura, ReunionCierre]),
    AuthModule,
  ],
  controllers: [EtapasAuditoriaController],
  providers: [EtapasAuditoriaService],
  exports: [EtapasAuditoriaService, TypeOrmModule],
})
export class EtapasAuditoriaModule {}
