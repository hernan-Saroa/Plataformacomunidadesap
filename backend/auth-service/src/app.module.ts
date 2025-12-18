import { Module as NestModule } from '@nestjs/common';
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
import { RegistroCalificado } from './programas/registro-calificado.entity';
import { AcreditacionPrograma } from './programas/acreditacion.entity';
import { ProgramasModule } from './programas/programas.module';

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
        RegistroCalificado,
        AcreditacionPrograma,
      ],
      synchronize: false, // Desactivado para evitar conflictos con tablas existentes
    }),
    UsersModule,
    AuthModule,
    ProgramasModule,
  ],
})
export class AppModule {}
