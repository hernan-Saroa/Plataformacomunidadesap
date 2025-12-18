import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { NewPersonDto } from './dto/new-person.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// NOTA: El versionamiento lo maneja el API Gateway.
// Frontend llama: /auth/api/v1/login -> API Gateway envía -> /login
// Este controlador maneja rutas de autenticación sin prefijo adicional.

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('')
  index() {
    return 'Hello from Api Auth Service';
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
}
