import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { GruposModule } from './grupos/grupos.module.js';
import { HorariosModule } from './horarios/horarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
