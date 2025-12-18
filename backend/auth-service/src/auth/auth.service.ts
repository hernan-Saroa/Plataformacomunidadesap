import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { NewPersonDto } from './dto/new-person.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

    const payload = {
      sub: user.id_user,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET || 'dev-secret-esap',
    });

    return {
      accessToken,
      user: {
        id: user.id_user,
        username: user.username,
        roles: user.roles,
        person: user.person,
      },
    };
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

  async logout() {
    // En JWT puro, el logout es del lado del cliente (borrar token).
    // Aquí podrías registrar la acción o manejar blacklists si más adelante quieres.
    return { message: 'Logout exitoso (token invalidado en cliente)' };
  }
}
