import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MicrosoftLoginDto } from './dto/microsoft-login.dto';
import { NewPersonDto } from './dto/new-person.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { RequestSignatureOtpDto } from './dto/request-signature-otp.dto';
import { VerifySignatureOtpDto } from './dto/verify-signature-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import {
  LoginProtectionService,
  LoginRateLimitState,
} from './login-protection.service';
import { UsersService } from '../users/users.service';

// NOTA: El versionamiento lo maneja el API Gateway.
// Frontend llama: /auth/api/v1/login -> API Gateway envía -> /login
// Este controlador maneja rutas de autenticación sin prefijo adicional.

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly loginProtectionService: LoginProtectionService,
  ) {}

  @Public()
  @Get('')
  index() {
    return 'Hello from Api Auth Service';
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const identifier = this.extractLoginIdentifier(dto);
    const ipAddress = this.extractClientIp(req);
    const rateLimitState = this.loginProtectionService.consumeRateLimit(
      ipAddress,
    );
    const loginUser = await this.findLoginUser(identifier);
    const accountKeys = this.loginProtectionService.buildAccountKeys(
      loginUser?.id_user,
      loginUser?.username,
      loginUser?.person?.email,
      identifier,
    );
    const accountLockState =
      this.loginProtectionService.getAccountLockState(accountKeys);

    this.applyRateLimitHeaders(
      res,
      rateLimitState,
      accountLockState.retryAfterSeconds || rateLimitState.retryAfterSeconds,
    );

    if (rateLimitState.blocked) {
      throw new HttpException(
        'Demasiados intentos de inicio de sesion. Intenta nuevamente mas tarde o restablece tu contrasena.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (accountLockState.locked) {
      throw new HttpException(
        'La cuenta esta temporalmente bloqueada por seguridad. Intenta nuevamente mas tarde o restablece tu contrasena.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const response = await this.authService.login(dto);
      this.loginProtectionService.clearFailedAttempts(accountKeys);
      this.applyRateLimitHeaders(res, rateLimitState);
      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const failedState =
          this.loginProtectionService.registerFailedAttempt(accountKeys);

        if (failedState.locked) {
          this.applyRateLimitHeaders(
            res,
            rateLimitState,
            failedState.retryAfterSeconds,
          );
          throw new HttpException(
            'La cuenta esta temporalmente bloqueada por seguridad. Intenta nuevamente mas tarde o restablece tu contrasena.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      this.applyRateLimitHeaders(res, rateLimitState);
      throw error;
    }
  }

  @Public()
  @Post('login/microsoft')
  @HttpCode(200)
  loginMicrosoft(@Body() dto: MicrosoftLoginDto) {
    return this.authService.loginWithMicrosoft(dto);
  }

  @Post('new-person')
  newPerson(@Body() dto: NewPersonDto) {
    return this.authService.newPerson(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.userId;
    return this.authService.changePassword(userId, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Public()
  @Post('verify-reset-code')
  @HttpCode(200)
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('signature-otp/request')
  @HttpCode(200)
  requestSignatureOtp(@Req() req, @Body() dto: RequestSignatureOtpDto) {
    return this.authService.requestSignatureOtp(req.user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('signature-otp/verify')
  @HttpCode(200)
  verifySignatureOtp(@Req() req, @Body() dto: VerifySignatureOtpDto) {
    return this.authService.verifySignatureOtp(req.user, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  // opcional: para probar el token
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return req.user;
  }

  // ✅ Endpoint requerido por el frontend para validar sesión
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  verify(@Req() req) {
    return req.user;
  }

  private extractLoginIdentifier(dto: LoginDto): string {
    return dto.email || dto.username || '';
  }

  private extractClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    return req.ip || req.socket.remoteAddress || 'unknown-ip';
  }

  private async findLoginUser(identifier: string) {
    if (!identifier) {
      return null;
    }

    return identifier.includes('@')
      ? this.usersService.findByEmail(identifier)
      : this.usersService.findByUsername(identifier);
  }

  private applyRateLimitHeaders(
    res: Response,
    state: LoginRateLimitState,
    retryAfterSeconds?: number,
  ): void {
    res.setHeader('X-RateLimit-Limit', String(state.limit));
    res.setHeader('X-RateLimit-Remaining', String(state.remaining));
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(state.resetAt / 1000)),
    );

    if (retryAfterSeconds && retryAfterSeconds > 0) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return;
    }

    res.removeHeader('Retry-After');
  }
}
