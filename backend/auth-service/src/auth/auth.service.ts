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
import { RequestSignatureOtpDto } from './dto/request-signature-otp.dto';

interface MicrosoftIdTokenClaims {
  aud?: string;
  tid?: string;
  oid?: string;
  preferred_username?: string;
  email?: string;
  upn?: string;
  name?: string;
}

interface AuthenticatedJwtUser {
  userId: string;
  username?: string;
  email?: string;
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
  private readonly signatureOtpTtlMs = 5 * 60 * 1000; // 5 minutos

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

  async requestSignatureOtp(
    jwtUser: AuthenticatedJwtUser,
    dto: RequestSignatureOtpDto,
  ) {
    const user = await this.usersService.findById(jwtUser.userId, {
      allowInternalId: true,
    });
    if (!user.is_active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const email = this.resolveAuthenticatedEmail(jwtUser, user);
    if (!email) {
      throw new BadRequestException(
        'No hay un correo electrónico asociado al usuario autenticado',
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.usersService.setResetToken(user.id_user, code);

    try {
      await this.sendSignatureOtpEmail(
        email,
        code,
        this.resolveAuthenticatedName(jwtUser, user, dto.userName),
        this.normalizeSignatureActionDetail(dto.actionDetail),
      );
    } catch (error: any) {
      await this.usersService.setResetToken(user.id_user, null);
      throw error;
    }

    return {
      message: 'Código OTP generado y enviado',
      email,
      expiresInSeconds: Math.floor(this.signatureOtpTtlMs / 1000),
    };
  }

  async verifySignatureOtp(jwtUser: AuthenticatedJwtUser, code: string) {
    const user = await this.usersService.findById(jwtUser.userId, {
      allowInternalId: true,
    });
    const email = this.resolveAuthenticatedEmail(jwtUser, user);
    if (!email) {
      throw new BadRequestException(
        'No hay un correo electrónico asociado al usuario autenticado',
      );
    }

    const storedToken = this.normalizeResetCode(user.token);
    if (!storedToken) {
      throw new BadRequestException('No hay un código OTP activo para validar');
    }

    if (this.isSignatureOtpExpired(user.updated_at)) {
      await this.usersService.setResetToken(user.id_user, null);
      throw new BadRequestException('El código OTP expiró, solicita uno nuevo');
    }

    const provided = this.normalizeResetCode(code);
    if (!provided || provided !== storedToken) {
      throw new BadRequestException('Código OTP inválido');
    }

    await this.usersService.setResetToken(user.id_user, null);
    const fechaFirma = new Date().toISOString();

    return {
      message: 'Código OTP verificado correctamente',
      email,
      fechaFirma,
      metodo: 'OTP_EMAIL',
      id: `OTP-${user.id_user.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  async refreshSession(jwtUser: AuthenticatedJwtUser) {
    if (!jwtUser?.userId) {
      throw new UnauthorizedException('Sesion invalida');
    }

    const user = await this.usersService.findAuthUserById(jwtUser.userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Sesion invalida');
    }

    return this.buildLoginResponse(user);
  }

  async getVerifiedUser(jwtUser: AuthenticatedJwtUser) {
    if (!jwtUser?.userId) {
      throw new UnauthorizedException('Sesion invalida');
    }

    const user = await this.usersService.findAuthUserById(jwtUser.userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Sesion invalida');
    }

    const response = await this.buildLoginResponse(user);
    return response.user;
  }

  /**
   * Refresh a partir de la cookie HttpOnly — acepta tokens expirados dentro
   * de una ventana de gracia de 24 h para poder renovarlos.
   */
  async refreshUserToken(rawCookieHeader: string) {
    const cookiePart = (rawCookieHeader || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('esap_access_token='));

    if (!cookiePart) {
      throw new UnauthorizedException('No hay sesion activa');
    }

    const token = decodeURIComponent(cookiePart.split('=').slice(1).join('='));

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Token invalido');
    }

    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Token invalido');
    }

    const user = await this.usersService.findAuthUserById(userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Sesion invalida');
    }

    return this.buildLoginResponse(user);
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

    // Los microservicios autorizan con el JWT; por eso incluimos permisos
    // para roles normales y mantenemos SUPER_ADMIN compacto.
    const rolesCodes = user.roles.map((r) => r.code);
    const permissionCodes: string[] = Array.from(
      new Set(
        user.roles.flatMap((role) =>
          Array.isArray(role.permissions)
            ? role.permissions
                .map((permission) => permission?.code)
                .filter((code): code is string => Boolean(code))
            : [],
        ),
      ),
    );

    const isSuperAdmin = rolesCodes.includes('SUPER_ADMIN');

    const payload = {
      sub: user.id_user,
      username: user.username,
      email: user.person?.email || undefined,
      name:
        user.person?.full_name ||
        [user.person?.first_name, user.person?.last_name].filter(Boolean).join(' ') ||
        user.username,
      roles: rolesCodes,
      permissions: isSuperAdmin ? undefined : permissionCodes,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });

    // Permissions that, when present, also unlock an additional module in the sidebar.
    // Key = permission code (exact), Value = extra module code to grant.
    const CROSS_MODULE_GRANTS: Record<string, string> = {
      'gestion-legal.reportes.manage': 'reports',
      'control-interno.reportes.manage': 'reports',
      'control-disciplinario.reportes.manage': 'reports',
    };

    const modules: string[] = [];
    let super_admin: boolean = false;
    for (const role of user.roles) {
      if (role.code === 'SUPER_ADMIN') {
        super_admin = true;
      }
      for (const permission of role.permissions || []) {
        const code = permission.code.split('.')[0].toLowerCase().replace(/_/g, '-');
        if (!modules.includes(code)) {
          modules.push(code);
        }
        // Grant extra modules for cross-module permissions
        const extraModule = CROSS_MODULE_GRANTS[permission.code.toLowerCase()];
        if (extraModule && !modules.includes(extraModule)) {
          modules.push(extraModule);
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
        permissions: permissionCodes,
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

  private isSignatureOtpExpired(updatedAt?: Date): boolean {
    if (!updatedAt) return true;
    const ts = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > this.signatureOtpTtlMs;
  }

  private resolveAuthenticatedEmail(jwtUser: AuthenticatedJwtUser, user: any): string {
    return (
      jwtUser.email ||
      user.person?.email ||
      (typeof user.username === 'string' && user.username.includes('@')
        ? user.username
        : '')
    )
      .trim()
      .toLowerCase();
  }

  private resolveAuthenticatedName(
    jwtUser: AuthenticatedJwtUser,
    user: any,
    fallback?: string,
  ): string {
    return (
      fallback ||
      jwtUser.name ||
      user.person?.full_name ||
      [user.person?.first_name, user.person?.last_name].filter(Boolean).join(' ') ||
      user.username ||
      'usuario'
    ).trim();
  }

  private normalizeSignatureActionDetail(value?: string): string {
    return value?.trim().replace(/\s+/g, ' ').slice(0, 255) || 'Firma electrónica';
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

  private async sendSignatureOtpEmail(
    to: string,
    code: string,
    userName: string,
    actionDetail: string,
  ): Promise<void> {
    const expiresMinutes = Math.floor(this.signatureOtpTtlMs / 60_000);
    const subject = `Código OTP de firma electrónica - ${actionDetail}`;
    const text = `Hola ${userName}, tu código OTP para ${actionDetail} es: ${code}. Este código vence en ${expiresMinutes} minutos.`;
    const html = `
      <div style="font-family: Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #dbe7f5;">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #1e5da8 100%); padding: 20px 24px; color: #ffffff;">
              <div style="font-size: 18px; font-weight: 700;">Firma Electrónica ESAP</div>
              <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Token de seguridad OTP</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 700; color: #111827;">
              Código para firma electrónica
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              Hola ${this.escapeHtml(userName)}, usa el siguiente código para completar:
              <br><strong>${this.escapeHtml(actionDetail)}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 4px 24px 22px 24px; text-align: center;">
              <div style="display: inline-block; background: #eff6ff; color: #1e5da8; font-weight: 800; font-size: 28px; letter-spacing: 6px; padding: 14px 36px; border-radius: 10px; border: 2px solid #bfdbfe;">
                ${code}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280; line-height: 1.5;">
              Este código vence en ${expiresMinutes} minutos. Si no solicitaste esta firma, puedes ignorar este mensaje.
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
              ESAP - Escuela Superior de Administración Pública
            </td>
          </tr>
        </table>
      </div>
    `;

    await this.sendEmail(to, subject, text, html);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char];
    });
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    const url = `${baseUrl}/api/v1/emails/send`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, text, html }),
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
        `Error enviando email de verificación: ${response.status} ${errorBody}`,
      );
      throw new InternalServerErrorException(
        'No se pudo enviar el correo con el código de verificación',
      );
    }
  }
}
