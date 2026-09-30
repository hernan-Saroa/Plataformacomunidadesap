import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocenteEntity } from '../../entities/docente.entity';
import { SoporteDocumentalEntity } from '../../entities/soporte-documental.entity';
import { SituacionAdministrativaEntity } from '../../entities/situacion-administrativa.entity';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasController } from './estadisticas.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocenteEntity,
      SoporteDocumentalEntity,
      SituacionAdministrativaEntity,
    ]),
    AuthModule,
  ],
  controllers: [EstadisticasController],
  providers: [EstadisticasService],
  exports: [EstadisticasService],
})
export class EstadisticasModule {}
