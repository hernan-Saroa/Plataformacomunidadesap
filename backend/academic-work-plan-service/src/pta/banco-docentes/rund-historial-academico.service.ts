import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { recordRundAccess, type RundAccessActor } from './rund-access-audit';
import {
  esEstadoPtaEnFirme,
  exigirPtaEnFirme,
  normalizarRegistrosHistorial,
  validarCedulaHistorial,
  validarPeriodoHistorial,
} from './rund-historial-academico';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RundHistorialEscrituraResultado {
  docente_id: string;
  periodo: string;
  recibidos: number;
  creados: number;
  actualizados: number;
}

export interface RundHistorialItem {
  id: string;
  docente_id: string | null;
  periodo: string;
  setup: string | null;
  territorial: string | null;
  programa: string;
  asignatura_codigo: string | null;
  asignatura: string;
  nucleo_tematico: string | null;
  pta_id: string | null;
  recibido_veces: number;
  registrado_por: string;
  ultimo_registrado_por: string;
  creado: string;
  actualizado: string;
}

/**
 * REQ-RUND-F016 (Flujo C.2) — el PTA escribe en el RUND el historial académico de un periodo.
 * Solo se acepta si el PTA está «En Firme»; es idempotente y queda asociado al docente por cédula.
 */
@Injectable()
export class RundHistorialAcademicoService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async escribir(cedulaEntrada: unknown, body: unknown, actor: RundAccessActor): Promise<RundHistorialEscrituraResultado> {
    const cedula = validarCedulaHistorial(cedulaEntrada);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_CUERPO_INVALIDO', message: 'El cuerpo de la solicitud debe ser un objeto JSON.' });
    }
    const datos = body as Record<string, unknown>;
    const periodo = validarPeriodoHistorial(datos.periodo);
    exigirPtaEnFirme(datos.estado_pta);
    const registros = normalizarRegistrosHistorial(cedula, periodo, datos.registros);
    const ptaId = datos.pta_id === undefined || datos.pta_id === null ? null : datos.pta_id;
    if (ptaId !== null && (typeof ptaId !== 'string' || !UUID.test(ptaId))) {
      throw new BadRequestException({ statusCode: 400, code: 'RUND_HISTORIAL_PTA_ID_INVALIDO', message: 'pta_id debe ser un UUID.' });
    }

    const docentes: Array<{ id: string; periodo: string | null; nucleo: string | null }> = await this.db.query(`
      SELECT d.id, d."periodoCarga" AS periodo, d."nucleoTematico" AS nucleo
      FROM academic_work_plan."Docente" d
      INNER JOIN auth.personas p ON p.id_person = d."personaId"
      WHERE regexp_replace(BTRIM(p.num_identificacion), '\\.', '', 'g') = $1
        AND COALESCE(d."eliminadoRund", false) = false
      ORDER BY CASE WHEN d."periodoCarga" = $2::text THEN 0 ELSE 1 END,
        CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END,
        d."updatedAt" DESC NULLS LAST, d.id ASC
    `, [cedula, periodo]);
    if (!docentes.length) {
      throw new NotFoundException({
        statusCode: 404, code: 'RUND_DOCENTE_NO_ENCONTRADO',
        message: 'No se encontró un perfil docente en RUND para esa cédula. El PTA puede gestionar el alta mediante el Flujo 1.',
        flujo_alta: 'FLUJO_1',
      });
    }

    let docente = docentes[0];
    if (ptaId) {
      // El estado que vale es el del PTA en base de datos: no basta con lo que declare el cliente.
      const [pta] = await this.db.query(
        `SELECT id, "docenteId" AS docente_id, periodo, estado FROM academic_work_plan."PlanTrabajoAcademico" WHERE id::text = $1`,
        [ptaId],
      );
      if (!pta) {
        throw new NotFoundException({ statusCode: 404, code: 'RUND_HISTORIAL_PTA_NO_ENCONTRADO', message: 'El PTA indicado en pta_id no existe.' });
      }
      if (!esEstadoPtaEnFirme(pta.estado)) {
        throw new UnprocessableEntityException({
          statusCode: 422, code: 'RUND_HISTORIAL_PTA_NO_EN_FIRME',
          message: 'El RUND solo recibe el historial académico de un PTA en estado «En Firme».',
        });
      }
      if (pta.periodo !== periodo) {
        throw new ConflictException({ statusCode: 409, code: 'RUND_HISTORIAL_PERIODO_NO_COINCIDE', message: 'El periodo enviado no coincide con el del PTA.' });
      }
      const delPta = docentes.find((d) => d.id === pta.docente_id);
      if (!delPta) {
        throw new ConflictException({ statusCode: 409, code: 'RUND_HISTORIAL_DOCENTE_NO_COINCIDE', message: 'La cédula no corresponde al docente de ese PTA.' });
      }
      docente = delPta;
    }

    const resultado = await this.db.transaction(async (m) => {
      let creados = 0;
      for (const r of registros) {
        const [fila] = await m.query(`
          INSERT INTO academic_work_plan."RundHistorialAcademico"
            (clave, "docenteId", cedula, periodo, setup, territorial, programa, "asignaturaCodigo", asignatura,
             "nucleoTematico", "ptaId", "estadoPta", "registradoPor", "ultimoRegistradoPor", roles, ip)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'EN_FIRME',$12,$12,$13::text[],$14)
          ON CONFLICT (clave) DO UPDATE SET
            "docenteId" = EXCLUDED."docenteId", territorial = EXCLUDED.territorial,
            "asignaturaCodigo" = COALESCE(EXCLUDED."asignaturaCodigo", academic_work_plan."RundHistorialAcademico"."asignaturaCodigo"),
            "nucleoTematico" = COALESCE(EXCLUDED."nucleoTematico", academic_work_plan."RundHistorialAcademico"."nucleoTematico"),
            "ptaId" = COALESCE(EXCLUDED."ptaId", academic_work_plan."RundHistorialAcademico"."ptaId"),
            "estadoPta" = 'EN_FIRME',
            "recibidoVeces" = academic_work_plan."RundHistorialAcademico"."recibidoVeces" + 1,
            "ultimoRegistradoPor" = EXCLUDED."ultimoRegistradoPor", roles = EXCLUDED.roles, ip = EXCLUDED.ip,
            "updatedAt" = now()
          RETURNING (xmax = 0) AS creado
        `, [r.clave, docente.id, cedula, periodo, r.setup, r.territorial, r.programa, r.asignaturaCodigo, r.asignatura,
          r.nucleoTematico ?? docente.nucleo ?? null, ptaId, actor.actorId, actor.roles, actor.ip ?? null]);
        if (fila?.creado) creados += 1;
      }
      // Misma transacción: si no se puede auditar, tampoco se guarda el historial.
      await recordRundAccess(m, {
        ...actor, fullAccess: false, endpoint: 'RUND_PTA_HISTORIAL_ESCRITURA_V1',
        docenteIds: [docente.id], fields: ['DOCUMENTO_IDENTIDAD'], result: 'ENMASCARADO',
      });
      return creados;
    });

    return { docente_id: docente.id, periodo, recibidos: registros.length, creados: resultado, actualizados: registros.length - resultado };
  }

  /** Lectura del historial almacenado de un docente (por cédula), sin devolver la cédula. */
  async consultar(cedulaEntrada: unknown, periodo: unknown, actor: RundAccessActor): Promise<RundHistorialItem[]> {
    const cedula = validarCedulaHistorial(cedulaEntrada);
    const periodoValido = periodo === undefined ? null : validarPeriodoHistorial(periodo);
    const filas: any[] = await this.db.query(`
      SELECT id, "docenteId" AS docente_id, periodo, setup, territorial, programa, "asignaturaCodigo" AS asignatura_codigo,
        asignatura, "nucleoTematico" AS nucleo_tematico, "ptaId" AS pta_id, "recibidoVeces" AS recibido_veces,
        "registradoPor" AS registrado_por, "ultimoRegistradoPor" AS ultimo_registrado_por,
        "createdAt" AS creado, "updatedAt" AS actualizado
      FROM academic_work_plan."RundHistorialAcademico"
      WHERE cedula = $1 AND ($2::text IS NULL OR periodo = $2::text)
      ORDER BY periodo DESC, programa ASC, asignatura ASC
    `, [cedula, periodoValido]);
    await recordRundAccess(this.db, {
      ...actor, fullAccess: false, endpoint: 'RUND_PTA_HISTORIAL_CONSULTA_V1',
      docenteIds: filas.map((f) => f.docente_id).filter(Boolean), fields: ['DOCUMENTO_IDENTIDAD'], result: 'ENMASCARADO',
    });
    return filas.map((f) => ({
      id: f.id, docente_id: f.docente_id ?? null, periodo: f.periodo, setup: f.setup ?? null, territorial: f.territorial ?? null,
      programa: f.programa, asignatura_codigo: f.asignatura_codigo ?? null, asignatura: f.asignatura,
      nucleo_tematico: f.nucleo_tematico ?? null, pta_id: f.pta_id ?? null, recibido_veces: Number(f.recibido_veces),
      registrado_por: f.registrado_por, ultimo_registrado_por: f.ultimo_registrado_por,
      creado: new Date(f.creado).toISOString(), actualizado: new Date(f.actualizado).toISOString(),
    }));
  }
}
