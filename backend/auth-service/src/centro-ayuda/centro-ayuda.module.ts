import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { CentroAyudaActivoGuard } from './centro-ayuda-activo.guard';
import { CentroAyudaController } from './centro-ayuda.controller';
import { CentroAyudaRecurso } from './centro-ayuda-recurso.entity';
import { CentroAyudaSeccion } from './centro-ayuda-seccion.entity';
import { CentroAyudaService } from './centro-ayuda.service';
import { OnlyOfficeService } from './onlyoffice.service';

@Module({
  imports: [TypeOrmModule.forFeature([CentroAyudaRecurso, CentroAyudaSeccion])],
  controllers: [CentroAyudaController],
  providers: [CentroAyudaService, OnlyOfficeService, PermisosGuard, CentroAyudaActivoGuard],
})
export class CentroAyudaModule {}
