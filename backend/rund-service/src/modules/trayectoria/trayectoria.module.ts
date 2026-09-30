import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormacionAcademicaEntity } from '../../entities/formacion-academica.entity';
import { ExperienciaDocenteEntity } from '../../entities/experiencia-docente.entity';
import { ProduccionIntelectualEntity } from '../../entities/produccion-intelectual.entity';
import { TrayectoriaService } from './trayectoria.service';
import { TrayectoriaController } from './trayectoria.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormacionAcademicaEntity,
      ExperienciaDocenteEntity,
      ProduccionIntelectualEntity,
    ]),
    AuthModule,
  ],
  controllers: [TrayectoriaController],
  providers: [TrayectoriaService],
  exports: [TrayectoriaService],
})
export class TrayectoriaModule {}
