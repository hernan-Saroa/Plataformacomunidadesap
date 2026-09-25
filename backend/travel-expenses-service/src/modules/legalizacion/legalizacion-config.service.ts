import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ConfigLegalizacionEntity,
  ESTADOS_DISPARADOR,
  MODALIDADES_PAGO,
} from './entities/config-legalizacion.entity';
import {
  CONDICIONES_SOPORTE,
  ConfigLegalizacionDocumentoEntity,
} from './entities/config-legalizacion-documento.entity';

export interface ActualizarModalidadDto {
  estadoDisparador?: string;
  plazoDiasHabiles?: number;
  diasAvisoPorVencer?: number;
  horaCorte?: string;
  activo?: boolean;
}

export interface ItemChecklistConfigDto {
  codigo: string;
  tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL';
  condicion?: string | null;
  orden?: number;
}

/**
 * EFDS-1309 — Configuración de la legalización: disparador y plazo por
 * modalidad, y checklist de soportes por tipo de comisionado.
 *
 * Las validaciones repiten los CHECK de la migración 450 para devolver un 400
 * legible en vez de un error de base de datos.
 */
@Injectable()
export class LegalizacionConfigService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async obtener() {
    const modalidades = await this.dataSource
      .getRepository(ConfigLegalizacionEntity)
      .find({ order: { modalidadPago: 'ASC' } });

    const checklist = await this.dataSource.query(
      `SELECT ct.tipo_comisionado, t.codigo, t.nombre, d.tipo_requisito, d.condicion, d.orden, d.activo
         FROM travel_expenses.config_legalizacion_documentos d
         JOIN travel_expenses.config_tipo_comisionado ct ON ct.id = d.config_tipo_comisionado_id
         JOIN travel_expenses.tipos_documento_soporte t ON t.id = d.tipo_documento_soporte_id
        ORDER BY ct.tipo_comisionado, d.orden, t.nombre`,
    );
    return { modalidades, checklist };
  }

  async actualizarModalidad(modalidad: string, dto: ActualizarModalidadDto, usuarioId: string) {
    if (!(MODALIDADES_PAGO as readonly string[]).includes(modalidad)) {
      throw new BadRequestException(`Modalidad no válida: ${modalidad}.`);
    }
    if (dto.estadoDisparador !== undefined && !(ESTADOS_DISPARADOR as readonly string[]).includes(dto.estadoDisparador)) {
      throw new BadRequestException(
        `El disparador debe ser uno de: ${ESTADOS_DISPARADOR.join(', ')}.`,
      );
    }
    if (dto.plazoDiasHabiles !== undefined && !(Number.isInteger(dto.plazoDiasHabiles) && dto.plazoDiasHabiles > 0)) {
      throw new BadRequestException('El plazo debe ser un número entero de días hábiles mayor que cero.');
    }
    if (dto.diasAvisoPorVencer !== undefined && !(Number.isInteger(dto.diasAvisoPorVencer) && dto.diasAvisoPorVencer >= 0)) {
      throw new BadRequestException('Los días de aviso deben ser un entero mayor o igual a cero.');
    }
    if (dto.horaCorte !== undefined && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(dto.horaCorte)) {
      throw new BadRequestException('La hora de corte debe tener el formato HH:MM (24 horas).');
    }

    const repo = this.dataSource.getRepository(ConfigLegalizacionEntity);
    const actual = await repo.findOne({ where: { modalidadPago: modalidad as any } });
    if (!actual) throw new NotFoundException(`No hay configuración para la modalidad ${modalidad}.`);

    Object.assign(actual, {
      ...(dto.estadoDisparador !== undefined && { estadoDisparador: dto.estadoDisparador }),
      ...(dto.plazoDiasHabiles !== undefined && { plazoDiasHabiles: dto.plazoDiasHabiles }),
      ...(dto.diasAvisoPorVencer !== undefined && { diasAvisoPorVencer: dto.diasAvisoPorVencer }),
      ...(dto.horaCorte !== undefined && { horaCorte: dto.horaCorte }),
      ...(dto.activo !== undefined && { activo: Boolean(dto.activo) }),
      actualizadoPorId: usuarioId || null,
    });
    return repo.save(actual);
  }

  /**
   * Reemplaza el checklist de un tipo de comisionado. Lo que sale de la lista se
   * desactiva, no se borra: los soportes ya cargados de ese tipo siguen
   * existiendo y la historia de la configuración se conserva.
   */
  async reemplazarChecklist(tipoComisionado: string, items: ItemChecklistConfigDto[]) {
    if (!Array.isArray(items)) throw new BadRequestException('items debe ser una lista.');

    return this.dataSource.transaction(async (m) => {
      const tipo: Array<{ id: string }> = await m.query(
        `SELECT id FROM travel_expenses.config_tipo_comisionado WHERE tipo_comisionado = $1`,
        [tipoComisionado],
      );
      if (!tipo[0]) throw new NotFoundException(`Tipo de comisionado no configurado: ${tipoComisionado}.`);
      const configTipoId = tipo[0].id;

      const codigos = items.map((i) => i.codigo);
      if (new Set(codigos).size !== codigos.length) {
        throw new BadRequestException('Un mismo soporte aparece dos veces en el checklist.');
      }

      const catalogo: Array<{ id: string; codigo: string }> = codigos.length
        ? await m.query(
            `SELECT id, codigo FROM travel_expenses.tipos_documento_soporte WHERE codigo = ANY($1::text[])`,
            [codigos],
          )
        : [];
      const porCodigo = new Map(catalogo.map((c) => [c.codigo, c.id]));
      const desconocidos = codigos.filter((c) => !porCodigo.has(c));
      if (desconocidos.length) {
        throw new BadRequestException(`Soportes que no existen en el catálogo: ${desconocidos.join(', ')}.`);
      }

      for (const i of items) {
        if (i.tipoRequisito !== 'OBLIGATORIO' && i.tipoRequisito !== 'OPCIONAL') {
          throw new BadRequestException(`tipoRequisito inválido para ${i.codigo}: use OBLIGATORIO u OPCIONAL.`);
        }
        if (i.condicion != null && !(CONDICIONES_SOPORTE as readonly string[]).includes(i.condicion)) {
          throw new BadRequestException(`Condición inválida para ${i.codigo}: ${i.condicion}.`);
        }
      }

      await m.query(
        `UPDATE travel_expenses.config_legalizacion_documentos
            SET activo = FALSE
          WHERE config_tipo_comisionado_id = $1
            AND NOT (tipo_documento_soporte_id = ANY($2::uuid[]))`,
        [configTipoId, [...porCodigo.values()]],
      );

      const repo = m.getRepository(ConfigLegalizacionDocumentoEntity);
      for (const [idx, i] of items.entries()) {
        await m.query(
          `INSERT INTO travel_expenses.config_legalizacion_documentos
             (config_tipo_comisionado_id, tipo_documento_soporte_id, tipo_requisito, condicion, orden, activo)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           ON CONFLICT (config_tipo_comisionado_id, tipo_documento_soporte_id)
           DO UPDATE SET tipo_requisito = EXCLUDED.tipo_requisito,
                         condicion = EXCLUDED.condicion,
                         orden = EXCLUDED.orden,
                         activo = TRUE`,
          [configTipoId, porCodigo.get(i.codigo), i.tipoRequisito, i.condicion ?? null, i.orden ?? idx + 1],
        );
      }
      return repo.find({ where: { configTipoComisionadoId: configTipoId, activo: true }, order: { orden: 'ASC' } });
    });
  }
}
