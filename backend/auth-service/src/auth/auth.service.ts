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


    if (user.roles.length === 0) {
      throw new UnauthorizedException('El usuario no tiene roles asignados');
    }

    // Optimización: Solo incluir códigos de roles en el JWT para reducir tamaño
    // Los permisos completos se envían en el body de la respuesta, no en el token
    const rolesCodes = user.roles.map((r) => r.code);
    const rolesIds = user.roles.map((r) => r.id);

    const payload = {
      sub: user.id_user,
      username: user.username,
      roles: rolesCodes, // Solo códigos: ['SUPER_ADMIN', 'AUDITOR'] en lugar de objetos completos
      rolesIds: rolesIds, // IDs para consultas en backend
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
        modules: modules,
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
