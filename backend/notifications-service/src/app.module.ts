import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailsModule } from './emails/emails.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { databaseConfig } from './database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    EmailsModule,
    NotificationsModule,
    ConfiguracionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
