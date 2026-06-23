import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './system-setting.entity';
import { LoginSettingsService } from './login-settings.service';
import { LoginSettingsController } from './login-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  controllers: [LoginSettingsController],
  providers: [LoginSettingsService],
  exports: [LoginSettingsService],
})
export class LoginSettingsModule {}
