import {
  Body,
  Controller,
  Get,
  Put,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoginSettingsService } from './login-settings.service';
import { UpdateLoginSettingsDto } from './dto/update-login-settings.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('login-settings')
export class LoginSettingsController {
  constructor(private readonly loginSettingsService: LoginSettingsService) {}

  /**
   * GET /login-settings
   * Público: el LoginPage necesita consultarlo sin JWT.
   */
  @Public()
  @Get()
  async getLoginSettings() {
    return this.loginSettingsService.getLoginSettings();
  }

  /**
   * PUT /login-settings
   * Protegido: solo SUPER_ADMIN puede cambiar la configuración.
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  async updateLoginSettings(
    @Body() dto: UpdateLoginSettingsDto,
    @Req() req: Request,
  ) {
    // Verificar que el usuario es SUPER_ADMIN
    const user = (req as any).user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const roles: any[] = user.roles || [];
    const isSuperAdmin = roles.some(
      (role: any) =>
        (typeof role === 'string' && role === 'SUPER_ADMIN') ||
        (typeof role === 'object' && role?.code === 'SUPER_ADMIN'),
    );

    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Solo el Super Administrador puede cambiar esta configuración',
      );
    }

    return this.loginSettingsService.updateLoginSettings({
      credentialLoginEnabled: dto.credentialLoginEnabled,
    });
  }
}
