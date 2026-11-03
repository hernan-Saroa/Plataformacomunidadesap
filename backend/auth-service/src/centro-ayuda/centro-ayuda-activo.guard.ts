import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export const CODIGO_MODULO_CENTRO_AYUDA = 'centro-ayuda';

/**
 * Apaga los endpoints del Centro de Ayuda cuando el módulo se desactiva en
 * Gestión de módulos (auth.module.is_active). Si el módulo no está registrado
 * se deja pasar: la migración 675 siempre lo crea.
 */
@Injectable()
export class CentroAyudaActivoGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(): Promise<boolean> {
    const [modulo]: { is_active: boolean }[] = await this.dataSource.query(
      'SELECT is_active FROM auth.module WHERE code = $1 LIMIT 1',
      [CODIGO_MODULO_CENTRO_AYUDA],
    );
    if (modulo && modulo.is_active === false) {
      throw new ForbiddenException('El Centro de Ayuda está desactivado en Gestión de módulos.');
    }
    return true;
  }
}
