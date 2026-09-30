import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DocentesModule } from './modules/docentes/docentes.module';
import { TrayectoriaModule } from './modules/trayectoria/trayectoria.module';
import { SituacionesAdminModule } from './modules/situaciones-admin/situaciones-admin.module';
import { SoportesModule } from './modules/soportes/soportes.module';
import { TarjetaDigitalModule } from './modules/tarjeta-digital/tarjeta-digital.module';
import { EstadisticasModule } from './modules/estadisticas/estadisticas.module';

import { DocenteEntity } from './entities/docente.entity';
import { FormacionAcademicaEntity } from './entities/formacion-academica.entity';
import { ExperienciaDocenteEntity } from './entities/experiencia-docente.entity';
import { ProduccionIntelectualEntity } from './entities/produccion-intelectual.entity';
import { SituacionAdministrativaEntity } from './entities/situacion-administrativa.entity';
import { SoporteDocumentalEntity } from './entities/soporte-documental.entity';
import { TarjetaRundLogEntity } from './entities/tarjeta-rund-log.entity';
import { InvitacionDocenteEntity } from './entities/invitacion-docente.entity';

import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.DB_PASS || 'password',
      database: process.env.DB_NAME || 'esap_db',
      schema: 'rund',
      entities: [
        DocenteEntity,
        FormacionAcademicaEntity,
        ExperienciaDocenteEntity,
        ProduccionIntelectualEntity,
        SituacionAdministrativaEntity,
        SoporteDocumentalEntity,
        TarjetaRundLogEntity,
        InvitacionDocenteEntity,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    DocentesModule,
    TrayectoriaModule,
    SituacionesAdminModule,
    SoportesModule,
    TarjetaDigitalModule,
    EstadisticasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
