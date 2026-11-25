import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Smmlv } from '../../entities/smmlv.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { PERMISO_CONFIG_ADMINISTRAR, tienePermiso } from '../../auth/permisos';

/**
 * Salario mínimo por año.
 *
 * Es lo único que quedó de Umbrales: la modalidad y el valor llegan con la
 * línea del PAA, así que los rangos por modalidad ya no deciden nada. El
 * salario sigue haciendo falta para llevar a pesos lo que la norma fija en
 * SMMLV: la cuantía del Comité, el tope MiPyme y el margen de adición.
 */
@Injectable()
export class SalarioMinimoService {
  constructor(private readonly dataSource: DataSource) {}

  /** Del más reciente al más antiguo, con si quien consulta puede registrar. */
  async listar(acceso?: HiringAccess) {
    const salarios = await this.dataSource.getRepository(Smmlv).find({ order: { anio: 'DESC' } });
    return {
      // Lo decide el backend, que ya tiene los permisos del token: la pantalla
      // no ofrece lo que la API rechazaría.
      puedeEditar: tienePermiso(acceso, PERMISO_CONFIG_ADMINISTRAR),
      salarios,
    };
  }

  async guardar(anio: number, valor: number) {
    if (valor <= 0) {
      throw new BadRequestException('El salario mínimo debe ser mayor que cero');
    }
    const repo = this.dataSource.getRepository(Smmlv);
    const existente = await repo.findOne({ where: { anio } });
    return repo.save({ ...(existente ?? {}), anio, valor, confirmado: true });
  }
}
