import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';

export interface LoginSettings {
  credentialLoginEnabled: boolean;
}

const LOGIN_SETTINGS_KEY = 'login_settings';

@Injectable()
export class LoginSettingsService {
  private readonly logger = new Logger(LoginSettingsService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  /**
   * Obtiene la configuración de login.
   * Si no existe el registro, retorna el default (credentialLoginEnabled = true).
   */
  async getLoginSettings(): Promise<LoginSettings> {
    try {
      const setting = await this.settingsRepo.findOne({
        where: { key: LOGIN_SETTINGS_KEY },
      });

      if (!setting || !setting.value) {
        return { credentialLoginEnabled: true };
      }

      const parsed = JSON.parse(setting.value);
      return {
        credentialLoginEnabled:
          typeof parsed.credentialLoginEnabled === 'boolean'
            ? parsed.credentialLoginEnabled
            : true,
      };
    } catch (error) {
      this.logger.warn(
        'Error al leer login_settings, usando valores por defecto',
        error,
      );
      return { credentialLoginEnabled: true };
    }
  }

  /**
   * Actualiza la configuración de login.
   * Crea el registro si no existe (upsert).
   */
  async updateLoginSettings(data: LoginSettings): Promise<LoginSettings> {
    const value = JSON.stringify({
      credentialLoginEnabled: data.credentialLoginEnabled,
    });

    let setting = await this.settingsRepo.findOne({
      where: { key: LOGIN_SETTINGS_KEY },
    });

    if (setting) {
      setting.value = value;
      setting.updatedAt = new Date();
    } else {
      setting = this.settingsRepo.create({
        key: LOGIN_SETTINGS_KEY,
        value,
        updatedAt: new Date(),
      });
    }

    await this.settingsRepo.save(setting);

    this.logger.log(
      `Login settings actualizados: credentialLoginEnabled=${data.credentialLoginEnabled}`,
    );

    return data;
  }
}
