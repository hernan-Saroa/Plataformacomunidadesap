import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { MicrosoftLoginDto } from './dto/microsoft-login.dto';
import { NewPersonDto } from './dto/new-person.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginProtectionService } from './login-protection.service';

interface MicrosoftIdTokenClaims {
  aud?: string;
  tid?: string;
  oid?: string;
  preferred_username?: string;
  email?: string;
  upn?: string;
  name?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly loginProtectionService: LoginProtectionService,
  ) {}

  private readonly logger = new Logger(AuthService.name);
  private readonly passwordResetTtlMs = 10 * 60 * 1000; // 10 minutos

  async login(dto: LoginDto) {
    const identifier = dto.email || dto.username;
    if (!identifier) {
      throw new UnauthorizedException('Se requiere email o username');
    }

    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByUsername(identifier);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildLoginResponse(user);
  }

  async loginWithMicrosoft(dto: MicrosoftLoginDto) {
    const email = dto.email?.toLowerCase()?.trim();
    if (!email || !email.endsWith('@esap.edu.co')) {
      throw new UnauthorizedException('Solo se permiten cuentas institucionales @esap.edu.co');
    }

    const claims = this.extractAndValidateMicrosoftClaims(dto.idToken);
    const tokenEmail = this.extractEmailFromMicrosoftClaims(claims);
    if (!tokenEmail || tokenEmail !== email) {
      throw new UnauthorizedException('Token de Microsoft inválido');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('El usuario no existe en la plataforma');
    }

    await this.usersService.setMicrosoftToken(user.id_user, claims.oid);

    return this.buildLoginResponse(user);
  }

  async newPerson(dto: NewPersonDto) {
    const user = await this.usersService.createPersonAndUser(dto);
    return {
      id: user.id_user,
      username: user.username,
      roles: user.roles,
      person: user.person,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    await this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return { message: 'Password actualizado correctamente' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email inválido');
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('No existe un usuario asociado a ese correo');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.usersService.setResetToken(user.id_user, code);

    // Enviar el código por correo (vía notifications-service / SMTP).
    // Si falla el envío, eliminar el código generado para evitar códigos "huérfanos".
    try {
      await this.sendPasswordResetEmail(normalizedEmail, code);
    } catch (error: any) {
      await this.usersService.setResetToken(user.id_user, null);
      throw error;
    }

    return {
      message: 'Código generado y enviado',
      expiresInSeconds: Math.floor(this.passwordResetTtlMs / 1000),
    };
  }

  async verifyResetCode(email: string, code: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email inválido');
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('No existe un usuario asociado a ese correo');
    }

    const storedToken = this.normalizeResetCode(user.token);
    if (!storedToken) {
      throw new BadRequestException('No hay un código activo para este correo');
    }

    if (this.isResetTokenExpired(user.updated_at)) {
      await this.usersService.setResetToken(user.id_user, null);
      throw new BadRequestException('El código expiró, solicita uno nuevo');
    }

    const provided = this.normalizeResetCode(code);
    if (!provided || provided !== storedToken) {
      throw new BadRequestException('Código inválido');
    }

    return { message: 'Código verificado correctamente' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email inválido');
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('No existe un usuario asociado a ese correo');
    }

    const storedToken = this.normalizeResetCode(user.token);
    if (!storedToken) {
      throw new BadRequestException('No hay un código activo para este correo');
    }

    if (this.isResetTokenExpired(user.updated_at)) {
      await this.usersService.setResetToken(user.id_user, null);
      throw new BadRequestException('El código expiró, solicita uno nuevo');
    }

    const provided = this.normalizeResetCode(code);
    if (!provided || provided !== storedToken) {
      throw new BadRequestException('Código inválido');
    }

    await this.usersService.setPassword(user.id_user, newPassword);
    await this.usersService.setResetToken(user.id_user, null);
    this.loginProtectionService.clearFailedAttempts(
      this.loginProtectionService.buildAccountKeys(
        user.id_user,
        user.username,
        user.person?.email,
        normalizedEmail,
      ),
    );

    return { message: 'Password actualizado correctamente' };
  }

  async logout() {
    // En JWT puro, el logout es del lado del cliente (borrar token).
    // Aquí podrías registrar la acción o manejar blacklists si más adelante quieres.
    return { message: 'Logout exitoso (token invalidado en cliente)' };
  }

  private async buildLoginResponse(user: any) {
    if (user.roles.length === 0) {
      throw new UnauthorizedException('El usuario no tiene roles asignados');
    }

    // Optimización: Solo incluir códigos de roles en el JWT para reducir tamaño
    const rolesCodes = user.roles.map((r) => r.code);
    const rolesIds = user.roles.map((r) => r.id);

    const payload = {
      sub: user.id_user,
      username: user.username,
      email: user.person?.email || undefined,
      name:
        user.person?.full_name ||
        [user.person?.first_name, user.person?.last_name].filter(Boolean).join(' ') ||
        user.username,
      roles: rolesCodes,
      rolesIds: rolesIds,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });

    const modules: string[] = [];
    let super_admin: boolean = false;
    for (const role of user.roles) {
      if (role.code === 'SUPER_ADMIN') {
        super_admin = true;
      }
      for (const permission of role.permissions) {
        const code = permission.code.split('.')[0];
        if (!modules.includes(code)) {
          modules.push(code);
        }
      }
    }
    if (super_admin && modules.length === 0) {
      modules.push('all');
    }

    return {
      accessToken,
      user: {
        id: user.id_user,
        username: user.username,
        roles: user.roles,
        person: user.person,
        modules,
      },
    };
  }

  private extractAndValidateMicrosoftClaims(
    idToken: string,
  ): MicrosoftIdTokenClaims & { aud: string; tid: string; oid: string } {
    const claims = this.decodeMicrosoftIdToken(idToken);
    const expectedAudience = this.getRequiredEnvValue([
      'MICROSOFT_CLIENT_ID',
      'VITE_MICROSOFT_CLIENT_ID',
      'AZURE_CLIENT_ID',
    ]);
    const expectedTenantId = this.getRequiredEnvValue([
      'MICROSOFT_TENANT_ID',
      'VITE_MICROSOFT_TENANT_ID',
      'AZURE_TENANT_ID',
    ]);

    const tokenAudience = this.normalizeMicrosoftClaim(claims.aud);
    const tokenTenantId = this.normalizeMicrosoftClaim(claims.tid);

    if (tokenAudience !== expectedAudience) {
      this.logger.warn('Microsoft login rechazado por audience inválido');
      throw new UnauthorizedException('Token de Microsoft inválido');
    }

    if (tokenTenantId !== expectedTenantId) {
      this.logger.warn('Microsoft login rechazado por tenant inválido');
      throw new UnauthorizedException('Token de Microsoft inválido');
    }

    if (!claims.oid) {
      this.logger.warn(
        'Microsoft login rechazado porque el token no contiene oid',
      );
      throw new UnauthorizedException('Token de Microsoft inválido');
    }

    return {
      ...claims,
      aud: tokenAudience,
      tid: tokenTenantId,
      oid: claims.oid,
    };
  }

  private decodeMicrosoftIdToken(idToken: string): MicrosoftIdTokenClaims {
    try {
      const [, payload] = idToken.split('.');
      if (!payload) {
        throw new UnauthorizedException('Token de Microsoft inválido');
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        Math.ceil(normalized.length / 4) * 4,
        '=',
      );
      const decoded = Buffer.from(padded, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as Record<string, unknown>;

      return {
        aud: typeof parsed.aud === 'string' ? parsed.aud : undefined,
        tid: typeof parsed.tid === 'string' ? parsed.tid : undefined,
        oid: typeof parsed.oid === 'string' ? parsed.oid : undefined,
        preferred_username:
          typeof parsed.preferred_username === 'string'
            ? parsed.preferred_username
            : undefined,
        email: typeof parsed.email === 'string' ? parsed.email : undefined,
        upn: typeof parsed.upn === 'string' ? parsed.upn : undefined,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
      };
    } catch {
      throw new UnauthorizedException('Token de Microsoft inválido');
    }
  }

  private extractEmailFromMicrosoftClaims(
    claims: MicrosoftIdTokenClaims,
  ): string | null {
    const email = claims.preferred_username || claims.email || claims.upn || '';

    return email ? email.toLowerCase() : null;
  }

  private getRequiredEnvValue(names: string[]): string {
    for (const name of names) {
      const value = this.normalizeMicrosoftClaim(process.env[name]);
      if (value) return value;
    }

    throw new InternalServerErrorException(
      `Falta configurar una de estas variables de entorno: ${names.join(', ')}`,
    );
  }

  private normalizeMicrosoftClaim(value?: string): string {
    return (
      value
        ?.trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase() || ''
    );
  }

  private normalizeResetCode(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const digits = String(value).replace(/\D+/g, '');
    if (!digits) return null;
    return digits.padStart(6, '0').slice(-6);
  }

  private isResetTokenExpired(updatedAt?: Date): boolean {
    if (!updatedAt) return true;
    const ts = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > this.passwordResetTtlMs;
  }

  private resolveNotificationsBaseUrl(): string {
    const direct =
      process.env.NOTIFICATIONS_SERVICE_URL ||
      process.env.NOTIFICATION_SERVICE_URL;
    if (direct) {
      return direct.replace(/\/$/, '');
    }
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return 'http://localhost:3009';
    }
    return 'http://notifications-service:3009';
  }

  private async sendPasswordResetEmail(to: string, code: string): Promise<void> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send`;
    const expiresMinutes = Math.floor(this.passwordResetTtlMs / 60_000);

    const subject = 'Código de verificación - Recuperación de contraseña ESAP';
    const text = `Tu código de verificación es: ${code}\n\nVálido por ${expiresMinutes} minutos.\n\nSi no solicitaste este código, puedes ignorar este mensaje.`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, text }),
      });
    } catch (error: any) {
      this.logger.warn(
        `No se pudo conectar a notifications-service (${baseUrl}): ${error?.message || error}`,
      );
      throw new InternalServerErrorException(
        'No se pudo enviar el correo con el código de verificación',
      );
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (_) {
        errorBody = '';
      }
      this.logger.warn(
        `Error enviando email de recuperación: ${response.status} ${errorBody}`,
      );
      throw new InternalServerErrorException(
        'No se pudo enviar el correo con el código de verificación',
      );
    }
  }
}
