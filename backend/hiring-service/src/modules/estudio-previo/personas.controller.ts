import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RolesGuard } from '../../auth/roles.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';



const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 200;

/**
 * Personas de auth.personas para los campos del estudio previo que nombran a
 * un funcionario.
 *
 * Escrito a mano y no reutilizando el de auditorías porque ese vive en
 * internal-institutional-control-service: llamarlo desde contratación acoplaría
 * dos módulos que no tienen relación. Lo correcto sería que auth-service
 * expusiera un endpoint transversal —auth.personas es suyo—, pero eso toca un
 * servicio compartido y corresponde a otra HU.
 */
@ApiTags('Personas')
@Controller('personas')
export class PersonasController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Personas para los selectores del estudio previo' })
  async listar(@Query('q') q?: string, @Query('limit') limit?: string) {
    const solicitado = limit ? parseInt(limit, 10) : LIMITE_POR_DEFECTO;
    const tope = Number.isNaN(solicitado) || solicitado <= 0
      ? LIMITE_POR_DEFECTO
      : Math.min(solicitado, LIMITE_MAXIMO);

    const busqueda = (q ?? '').trim();

    // Parámetros ligados, nunca interpolados: el término viene del navegador.
    const filas = await this.dataSource.query(
      `SELECT p.id_person       AS id,
              COALESCE(p.nom_largo, p.nom_tercero) AS nombre,
              p.dir_email       AS email
         FROM auth.personas p
        WHERE COALESCE(p.nom_largo, p.nom_tercero) IS NOT NULL
          AND ($1 = '' OR COALESCE(p.nom_largo, p.nom_tercero) ILIKE '%' || $1 || '%')
        ORDER BY nombre
        LIMIT $2`,
      [busqueda, tope],
    );

    return filas;
  }
}
