import { Module as NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { Person } from './users/person.entity';
import { Role } from './users/role.entity';
import { Permission } from './users/permission.entity';
import { Module } from './users/module.entity';
import { Geopolitica } from './users/geopolitica.entity';
import { Sede } from './users/sede.entity';
import { Seccional } from './users/seccional.entity';
import { ProgramaAcademico } from './programas/programa.entity';
import { Asignatura } from './programas/asignatura.entity';
import { ProgramasModule } from './programas/programas.module';
import { PortalModule } from './portal/portal.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@NestModule({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      schema: process.env.DB_SCHEMA,
      entities: [
        User,
        Person,
        Role,
        Permission,
        Module,
        Geopolitica,
        Sede,
        Seccional,
        ProgramaAcademico,
        Asignatura,
      ],
      synchronize: false, // Desactivado para evitar conflictos con tablas existentes
    }),
    UsersModule,
    AuthModule,
    ProgramasModule,
    PortalModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
