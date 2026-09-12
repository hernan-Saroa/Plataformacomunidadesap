import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SolicitudComisionEntity } from '../entities/solicitud-comision.entity';

const AUTH_SOD_PARAM_KEY = 'authorization_sod_param_key';

/**
 * Marca el parámetro de ruta que contiene el ID de la solicitud protegida para autorización.
 */
export const AuthorizationSodProtected =
  (paramKey = 'id') =>
  (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(AUTH_SOD_PARAM_KEY, paramKey, descriptor.value);
    } else {
      Reflect.defineMetadata(AUTH_SOD_PARAM_KEY, paramKey, target);
    }
  };

/**
 * RF-AUT-001 — Guardia de Segregación de Funciones (SoD) para la Autorización Corporativa (Etapa 6).
 *
 * El usuario de la Subdirección no puede ser el comisionado (pasajero)
 * ni el usuario creador del expediente (enlace).
 * Los roles SUPER_ADMIN / ADMIN conservan bypass operativo.
 */
@Injectable()
export class AuthorizationSodGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramKey =
      Reflect.getMetadata(AUTH_SOD_PARAM_KEY, context.getHandler()) || 'id';
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const solicitudId = request.params[paramKey];

    if (!user || !solicitudId || !user.userId) {
      return true;
    }

    const rawRoles = Array.isArray(user.roles) ? user.roles : [];
    const allRoles = [...rawRoles];
    if (user.role && typeof user.role === 'string') {
      allRoles.push(user.role);
    }

    const esSuperAdmin = allRoles.some((role: any) => {
      if (typeof role !== 'string') return false;
      const normalized = role.toUpperCase().replace(/\s+/g, '_');
      return [
        'ADMIN',
        'SUPER_ADMIN',
        'ADMINISTRATIVO',
        'SUPER_ADMINISTRADOR',
        'SUPERUSER',
      ].includes(normalized);
    });

    if (esSuperAdmin) {
      return true;
    }

    const solicitud = await this.dataSource
      .getRepository(SolicitudComisionEntity)
      .createQueryBuilder('s')
      .where('s.id = :id', { id: solicitudId })
      .getOne();

    if (!solicitud) {
      return true;
    }

    const usuarioId = user.userId;
    if (
      solicitud.comisionadoId === usuarioId ||
      solicitud.creadoPorUsuarioId === usuarioId
    ) {
      throw new ForbiddenException(
        'Violación de Segregación de Funciones: El autorizador corporativo debe ser diferente del comisionado y del enlace solicitante',
      );
    }

    return true;
  }
}
