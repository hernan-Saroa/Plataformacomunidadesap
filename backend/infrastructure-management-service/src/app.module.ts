import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SedesModule } from './sedes/sedes.module.js';
import { EspaciosModule } from './espacios/espacios.module.js';
import { MantenimientoModule } from './mantenimiento/mantenimiento.module.js';
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
        password: config.get<string>('DB_PASS') ?? config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'esap_db'),
        schema: config.get<string>('DB_SCHEMA', 'infrastructure-management'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    SedesModule,
    EspaciosModule,
    MantenimientoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
