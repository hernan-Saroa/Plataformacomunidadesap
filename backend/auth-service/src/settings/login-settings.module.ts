import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './system-setting.entity';
import { FestivoColombia } from './festivo-colombia.entity';
import { LoginSettingsService } from './login-settings.service';
import { LoginSettingsController } from './login-settings.controller';
import { AjustesGeneralesService } from './ajustes-generales.service';
import { AjustesGeneralesController } from './ajustes-generales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, FestivoColombia])],
  controllers: [LoginSettingsController, AjustesGeneralesController],
  providers: [LoginSettingsService, AjustesGeneralesService],
  exports: [LoginSettingsService, AjustesGeneralesService],
})
export class LoginSettingsModule {}
