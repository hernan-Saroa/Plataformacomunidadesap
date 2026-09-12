import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SolicitudComisionEntity } from '../entities/solicitud-comision.entity';

const SOD_PARAM_KEY = 'second_level_sod_param_key';

/**
 * Marca el parametro de ruta que contiene el ID de la solicitud protegida.
 */
export const SecondLevelSodProtected =
  (paramKey = 'id') =>
  (target: any, key?: any, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(SOD_PARAM_KEY, paramKey, descriptor.value);
    } else {
      Reflect.defineMetadata(SOD_PARAM_KEY, paramKey, target);
    }
  };

/**
 * Guardia exclusiva para la segunda revision.
 *
 * El revisor no puede ser el comisionado, el creador, el analista asignado ni
 * el usuario que exporto a SIIF. SUPER_ADMIN conserva el bypass operativo.
 */
@Injectable()
export class SecondLevelSodGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramKey =
      Reflect.getMetadata(SOD_PARAM_KEY, context.getHandler()) || 'id';
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
    const participantesPrevios = [
      solicitud.comisionadoId,
      solicitud.creadoPorUsuarioId,
      solicitud.analistaAsignadoId,
      solicitud.usuarioExportadorId,
    ].filter((id): id is string => Boolean(id));

    if (participantesPrevios.includes(usuarioId)) {
      throw new ForbiddenException(
        'Violacion de Segregacion de Funciones: El revisor de segundo nivel debe ser diferente del analista que verifico la solicitud',
      );
    }

    return true;
  }
}
