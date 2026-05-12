import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PtaModule } from './pta/pta.module';
import { BancoDocentesModule } from './pta/banco-docentes/banco-docentes.module';
import { PlanTrabajoAcademicoEntity } from './pta/entities/plan-trabajo-academico.entity';
import { HistorialEstadoPtaEntity } from './pta/entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './pta/entities/pta-evidencia.entity';
import { SolicitudPtaEntity } from './pta/entities/solicitud-pta.entity';
import { PtaConfiguracionEntity } from './pta/entities/pta-configuracion.entity';
import { PtaUserDataEntity } from './pta/entities/pta-user-data.entity';
import { ProgramaEntity } from './pta/entities/programa.entity';
import { AsignaturaEntity } from './pta/entities/asignatura.entity';
import { TerritorialEntity } from './pta/entities/territorial.entity';
import { SedeEntity } from './pta/entities/sede.entity';
import { UsuarioEntity } from './pta/entities/usuario.entity';
import { PersonaEntity } from './pta/entities/persona.entity';
import { DocenteEntity } from './pta/entities/docente.entity';
import { AprobacionJefaturaEntity } from './pta/entities/aprobacion-jefatura.entity';
import { PtaEventoEntity } from './pta/entities/pta-evento.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      schema: process.env.DB_SCHEMA || 'academic_work_plan',
      entities: [
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
        UsuarioEntity,
        PersonaEntity,
        DocenteEntity,
        AprobacionJefaturaEntity,
        PtaEventoEntity,
      ],
      synchronize: process.env.TYPEORM_SYNC === 'true',
    }),
    AuthModule,
    PtaModule,
    BancoDocentesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
