import { Controller, Get, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RolesGuard } from '../../auth/roles.guard';
import { Puede } from '../../auth/puede.guard';



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
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Personas para los selectores del estudio previo' })
  async listar(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('dependencia') dependencia?: string,
    @Query('cargo') cargo?: string,
  ) {
    const solicitado = limit ? parseInt(limit, 10) : LIMITE_POR_DEFECTO;
    const tope = Number.isNaN(solicitado) || solicitado <= 0
      ? LIMITE_POR_DEFECTO
      : Math.min(solicitado, LIMITE_MAXIMO);

    const busqueda = (q ?? '').trim();

    // La dependencia llega por nombre y no por id porque así la guarda el
    // estudio previo (ver SelectorDependencia): el jefe del área se busca
    // entre quienes gestión de personas tiene asignados a esa dependencia.
    const area = (dependencia ?? '').trim();

    // El cargo llega por id: a diferencia de la dependencia no se guarda en el
    // estudio previo, solo acota a quién se ofrece. Lo que no sea un número se
    // ignora en vez de romper la consulta.
    const idCargo = /^\d+$/.test((cargo ?? '').trim()) ? (cargo as string).trim() : '';

    // Parámetros ligados, nunca interpolados: el término viene del navegador.
    const filas = await this.dataSource.query(
      `SELECT p.id_person       AS id,
              COALESCE(p.nom_largo, p.nom_tercero) AS nombre,
              p.dir_email       AS email,
              c.nom_cargo       AS cargo
         FROM auth.personas p
         LEFT JOIN auth.dependencias d ON d.id_dependencia = p.id_dependencia
         LEFT JOIN auth.cargos c ON c.id_cargo = p.id_cargo
        WHERE COALESCE(p.nom_largo, p.nom_tercero) IS NOT NULL
          AND ($1 = '' OR COALESCE(p.nom_largo, p.nom_tercero) ILIKE '%' || $1 || '%')
          AND ($3 = '' OR d.nom_dependencia = $3)
          AND ($4 = '' OR p.id_cargo = $4::bigint)
        ORDER BY nombre
        LIMIT $2`,
      [busqueda, tope, area, idCargo],
    );

    return filas;
  }

  /**
   * Cargos con los que se acota al jefe del área antes de elegirlo.
   *
   * Los de la dependencia según gestión de personas (auth.dependencias_cargos)
   * más los que de hecho tiene alguien de ella: si a una persona le asignaron
   * un cargo que no quedó en la relación, filtrar por la relación sola la
   * dejaría imposible de elegir. Sin dependencia, todos los activos.
   */
  @Get('cargos')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Cargos para filtrar los selectores de persona del estudio previo' })
  async cargos(@Query('dependencia') dependencia?: string) {
    const area = (dependencia ?? '').trim();

    return this.dataSource.query(
      `SELECT c.id_cargo::text AS id, c.nom_cargo AS nombre
         FROM auth.cargos c
        WHERE c.activo
          AND (
            $1 = ''
            OR EXISTS (
              SELECT 1
                FROM auth.dependencias_cargos dc
                JOIN auth.dependencias d ON d.id_dependencia = dc.id_dependencia
               WHERE dc.id_cargo = c.id_cargo AND dc.activo AND d.nom_dependencia = $1
            )
            OR EXISTS (
              SELECT 1
                FROM auth.personas p
                JOIN auth.dependencias d ON d.id_dependencia = p.id_dependencia
               WHERE p.id_cargo = c.id_cargo AND d.nom_dependencia = $1
            )
          )
        ORDER BY c.nom_cargo`,
      [area],
    );
  }
}
