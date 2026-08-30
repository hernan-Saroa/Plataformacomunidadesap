import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TravelExpensesModule } from './modules/travel-expenses/travel-expenses.module';
import { ConfigModule as ConfigParamModule } from './modules/config/config.module';
import { ComisionadoEntity } from './entities/comisionado.entity';
import { SolicitudComisionEntity } from './entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from './entities/documento-soporte.entity';
import { CampoFormularioEntity } from './entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from './entities/config/config-tipo-comisionado.entity';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './common/permissions.guard';

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
      schema: 'travel_expenses',
      entities: [
        ComisionadoEntity,
        SolicitudComisionEntity,
        DocumentoSoporteEntity,
        CampoFormularioEntity,
        ConfigTipoComisionadoEntity,
      ],
      synchronize: false,
      logging: true,
    }),
    AuthModule,
    TravelExpensesModule,
    ConfigParamModule,
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
