import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { GruposModule } from './grupos/grupos.module.js';
import { HorariosModule } from './horarios/horarios.module.js';
import { AsignacionesModule } from './asignaciones/asignaciones.module.js';
import { JwtStrategy } from './auth/jwt.strategy.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER', 'postgres'),
        // El repo usa DB_PASS (es lo que inyecta docker-compose y lo que lee el
        // PTA). Se acepta DB_PASSWORD como alias para no romper a quien ya lo
        // tenga puesto: leer solo DB_PASSWORD dejaba al servicio sin autenticar
        // dentro de Docker.
        password: config.get<string>('DB_PASS') ?? config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'esap_db'),
        autoLoadEntities: true,
        // Nunca true: este servicio LEE el catálogo de `academic_work_plan`, cuyo
        // dueño es otro microservicio. Dejar que TypeORM altere ese esquema sería
        // escribir sobre datos ajenos. El esquema propio se versiona en
        // db/migrations con SQL, como el resto del repo.
        synchronize: false,
      }),
    }),
    CatalogoModule,
    GruposModule,
    HorariosModule,
    AsignacionesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    // EFDS-1791: guard GLOBAL de token. El puerto 3013 se publica al host en los
    // tres entornos; sin esto la API quedaba accesible sin autenticar y el RBAC
    // se saltaba escribiendo una cabecera. El PTA ya tenia su equivalente.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
