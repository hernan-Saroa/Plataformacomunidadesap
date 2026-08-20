import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HealthController } from './health/health.controller';
import { HiringModule } from './modules/hiring/hiring.module';
import { EstudioPrevioModule } from './modules/estudio-previo/estudio-previo.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

import { Proceso } from './entities/proceso.entity';
import { Expediente } from './entities/expediente.entity';
import { ProcesoActividad } from './entities/proceso-actividad.entity';
import { CampoFormulario } from './entities/campo-formulario.entity';
import { Documento } from './entities/documento.entity';
import { Trazabilidad } from './entities/trazabilidad.entity';
import { Revision } from './entities/revision.entity';
import { Plantilla } from './entities/plantilla.entity';
import { Modalidad } from './entities/modalidad.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'esap_secure_password_2024'),
        database: config.get<string>('DB_NAME', 'esap_db'),
        schema: config.get<string>('DB_SCHEMA', 'hiring'),
        entities: [Proceso, Expediente, ProcesoActividad, CampoFormulario, Documento, Trazabilidad, Revision, Plantilla, Modalidad],
        // El esquema lo gobiernan las migraciones de db/migrations/hiring
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    HiringModule,
    EstudioPrevioModule,
  ],
  controllers: [HealthController],
  providers: [
    // Todo endpoint queda autenticado salvo que se marque con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
