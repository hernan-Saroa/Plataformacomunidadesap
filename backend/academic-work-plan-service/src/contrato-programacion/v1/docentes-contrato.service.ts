import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { DocenteProgramacionDto } from './dto/docente-programacion.dto';
import { clasificarSituacion } from './situacion-administrativa.clasificador';

/**
 * Consulta del docente por documento — contrato PROG↔PTA v1 (EFDS-1372, AC-01).
 *
 * ⚠️ SOLO LECTURA (RN-09). El RUND lo administra la Subdirección Nacional de
 * Servicios Académicos; aquí únicamente se expone. Este servicio no declara
 * ningún método de escritura, y el controlador no publica ninguna ruta que
 * modifique: la garantía es estructural, no una validación que alguien pueda
 * olvidar.
 */
@Injectable()
export class DocentesContratoService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Busca por número de documento y devuelve la vista de programación.
   *
   * Se consulta con SQL y no con el repositorio de `DocenteEntity` a propósito:
   * el dato vive repartido entre `Docente` y `auth.personas`, y armarlo aquí
   * evita acoplar el contrato a la forma interna de las entidades del PTA.
   */
  async buscarPorDocumento(documento: string): Promise<DocenteProgramacionDto> {
    const limpio = String(documento ?? '').trim();
    if (!limpio) {
      throw new BadRequestException('Debe indicar el número de documento del docente.');
    }

    const filas = await this.dataSource.query(
      `SELECT
         p.num_identificacion              AS documento,
         p.nom_largo                       AS nombre_completo,
         d."correoInstitucional"           AS correo,
         d."territorialId"                 AS territorial_codigo,
         dt.nombre                         AS territorial_nombre,
         d."tipoVinculacion"               AS vinculacion,
         d."dedicacion"                    AS dedicacion,
         d."dedicacionHorasSemana"         AS dedicacion_horas_semana,
         d."escalafon"                     AS escalafon,
         d."regimenNormativo"              AS regimen_normativo,
         d."horasAsignables"               AS horas_pta,
         d."fechaInicioVinculacion"        AS vinculacion_desde,
         d."fechaFinVinculacion"           AS vinculacion_hasta,
         d."situacionAdministrativa"       AS situacion,
         d."estado"                        AS estado,
         d."nivelFormacion"                AS nivel_formacion,
         d."nucleoTematico"                AS nucleo_tematico
       FROM academic_work_plan."Docente" d
       INNER JOIN auth.personas p ON p.id_person = d."personaId"
       LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.codigo = d."territorialId"
       WHERE p.num_identificacion = $1
       ORDER BY d."updatedAt" DESC NULLS LAST
       LIMIT 1`,
      [limpio],
    );

    if (!filas || filas.length === 0) {
      // Un documento inexistente es un caso de uso normal --el programador se
      // equivoca al teclear--, no una falla: 404 con mensaje, nunca 500.
      throw new NotFoundException(
        `No existe un docente con documento ${limpio} en el RUND.`,
      );
    }

    const f = filas[0];
    const fechaISO = (v: any): string | null => {
      if (!v) return null;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };

    return {
      documento: f.documento,
      nombreCompleto: f.nombre_completo,
      correoInstitucional: f.correo ?? null,
      territorial: f.territorial_codigo
        ? { codigo: f.territorial_codigo, nombre: f.territorial_nombre ?? f.territorial_codigo }
        : null,
      vinculacion: f.vinculacion ?? null,
      dedicacion: f.dedicacion ?? null,
      dedicacionHorasSemana: f.dedicacion_horas_semana ?? null,
      escalafon: f.escalafon ?? null,
      regimenNormativo: f.regimen_normativo ?? null,
      // Se expone tal cual: los topes dependen del régimen y el consumidor debe
      // leerlos juntos. Aquí no se deriva ningún tope.
      horasPta: Number(f.horas_pta ?? 0),
      vinculacion_desde: fechaISO(f.vinculacion_desde),
      // Nulo significa vinculación indefinida, no fecha faltante (RN-10).
      vinculacion_hasta: fechaISO(f.vinculacion_hasta),
      situacion: clasificarSituacion(f.situacion),
      estado: f.estado ?? null,
      nivelFormacion: f.nivel_formacion ?? null,
      nucleoTematico: f.nucleo_tematico ?? null,
    };
  }
}
