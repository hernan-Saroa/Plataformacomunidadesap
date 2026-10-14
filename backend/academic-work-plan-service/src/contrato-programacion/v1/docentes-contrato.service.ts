import { BadRequestException, Injectable } from '@nestjs/common';

import type { DocenteProgramacionDto } from './dto/docente-programacion.dto';
import { RundDocentesClient } from '../../integracion-rund/rund-docentes.client';
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
  constructor(private readonly rund: RundDocentesClient) {}

  /**
   * Busca por número de documento y devuelve la vista de programación.
   *
   * El RUND vive en rund-service (dueño del dato): aquí se pide por su API interna y
   * se le aplica la lógica propia de este contrato (clasificación de la situación
   * administrativa y forma del DTO), que no se mueve al servicio de datos.
   */
  async buscarPorDocumento(documento: string): Promise<DocenteProgramacionDto> {
    const limpio = String(documento ?? '').trim();
    if (!limpio) {
      throw new BadRequestException('Debe indicar el número de documento del docente.');
    }

    // 404 si no existe; falla cerrado si rund-service no responde.
    const f = await this.rund.porDocumento(limpio);
    const fechaISO = (v: any): string | null => {
      if (!v) return null;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    };

    return {
      documento: f.documento,
      nombreCompleto: f.nombreCompleto,
      correoInstitucional: f.correoInstitucional ?? null,
      territorial: f.territorialCodigo
        ? { codigo: f.territorialCodigo, nombre: f.territorialNombre ?? f.territorialCodigo }
        : null,
      vinculacion: f.tipoVinculacion ?? null,
      dedicacion: f.dedicacion ?? null,
      dedicacionHorasSemana: f.dedicacionHorasSemana ?? null,
      escalafon: f.escalafon ?? null,
      regimenNormativo: f.regimenNormativo ?? null,
      // Se expone tal cual: los topes dependen del régimen y el consumidor debe
      // leerlos juntos. Aquí no se deriva ningún tope.
      horasPta: Number(f.horasAsignables ?? 0),
      vinculacion_desde: fechaISO(f.fechaInicioVinculacion),
      // Nulo significa vinculación indefinida, no fecha faltante (RN-10).
      vinculacion_hasta: fechaISO(f.fechaFinVinculacion),
      // La categoria es el campo estructurado y manda; la descripcion aporta la
      // vigencia, que vive dentro de la frase.
      situacion: clasificarSituacion(f.situacionAdministrativa, new Date(), f.situacionCategoria),
      estado: f.estado ?? null,
      nivelFormacion: f.nivelFormacion ?? null,
      nucleoTematico: f.nucleoTematico ?? null,
    };
  }
}
