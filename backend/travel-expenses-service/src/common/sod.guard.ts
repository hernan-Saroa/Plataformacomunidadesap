import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SolicitudComisionEntity } from '../entities/solicitud-comision.entity';

const SOD_PARAM_KEY = 'sod_param_key';

export const SodProtected =
  (paramKey: string) => (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(SOD_PARAM_KEY, paramKey, descriptor.value);
    } else {
      Reflect.defineMetadata(SOD_PARAM_KEY, paramKey, target);
    }
  };

@Injectable()
export class SodGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramKey =
      Reflect.getMetadata(SOD_PARAM_KEY, context.getHandler()) || 'id';
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const solicitudId = request.params[paramKey];

    if (!user || !solicitudId) {
      return true;
    }

    const usuarioId = user.userId;
    if (!usuarioId) {
      return true;
    }

    const superAdminRoles = [
      'ADMIN',
      'SUPER_ADMIN',
      'ADMINISTRATIVO',
      'SUPER_ADMINISTRADOR',
      'super_administrador',
      'SUPERUSER',
      'superuser',
    ];

    const rawRoles = Array.isArray(user.roles) ? user.roles : [];
    const allRoles = [...rawRoles];
    if (user.role && typeof user.role === 'string') {
      allRoles.push(user.role);
    }
    const esSuperAdmin = allRoles.some((r: any) => {
      if (typeof r !== 'string') return false;
      const normalized = r.toUpperCase().replace(/\s+/g, '_');
      return (
        superAdminRoles.includes(normalized) ||
        superAdminRoles.includes(r.toUpperCase())
      );
    });

    if (esSuperAdmin) {
      return true;
    }

    const solicitud = await this.dataSource
      .getRepository(SolicitudComisionEntity)
      .createQueryBuilder('s')
      .where('s.id = :id', { id: solicitudId })
      .getOne();

    if (solicitud) {
      if (
        solicitud.comisionadoId === usuarioId ||
        solicitud.creadoPorUsuarioId === usuarioId
      ) {
        throw new ForbiddenException(
          'Infraccion de Segregacion de Funciones: Un comisionado o creador de solicitud no puede auto-auditarse',
        );
      }
    }

    return true;
  }
}
