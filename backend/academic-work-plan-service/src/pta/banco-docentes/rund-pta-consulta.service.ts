import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { recordRundAccess, type RundAccessActor } from './rund-access-audit';

export interface RundPtaPerfil {
  docente_id: string;
  perfil: {
    nombre_completo: string | null;
    perfil_academico: string | null;
    perfil_academico_profesional: string | null;
    nivel_formacion: string | null;
  };
  categoria: string | null;
  territorial: { id: string | null; nombre: string | null; codigo: string | null };
  horas_programables: number;
  estado_vinculacion: string | null;
  tipo_vinculacion: string | null;
  periodo: string | null;
}

@Injectable()
export class RundPtaConsultaService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async consultar(cedula: string, periodo: unknown, actor: RundAccessActor): Promise<RundPtaPerfil> {
    // La cédula se conserva como texto: no pierde ceros ni precisión numérica.
    if (!/^\d{1,20}$/.test(cedula)) {
      throw new BadRequestException({ statusCode: 400, code: 'RUND_CEDULA_INVALIDA', message: 'La cédula debe contener entre 1 y 20 dígitos, sin separadores.' });
    }
    if (periodo !== undefined && (typeof periodo !== 'string' || !/^\d{4}-[12]$/.test(periodo))) {
      throw new BadRequestException({ statusCode: 400, code: 'RUND_PERIODO_INVALIDO', message: 'El periodo debe tener formato AAAA-1 o AAAA-2.' });
    }

    // Proyección limitada desde el origen. No depende de que el docente tenga
    // una cuenta de usuario, ni lee documento completo, salario o puntaje.
    const [row] = await this.db.query(`
      SELECT d.id AS docente_id,
        COALESCE(NULLIF(BTRIM(p.nom_largo), ''),
          NULLIF(CONCAT_WS(' ', p.nom_tercero, p.pri_apellido, p.seg_apellido), '')) AS nombre_completo,
        d."perfilAcademico" AS perfil_academico,
        d."perfilAcademicoPro" AS perfil_academico_profesional,
        d."nivelFormacion" AS nivel_formacion,
        d.escalafon AS categoria,
        COALESCE(NULLIF(d."territorialId", ''), p.id_seccional::text) AS territorial_id,
        sec.nom_seccional AS territorial_nombre, sec.cod_seccional AS territorial_codigo,
        COALESCE(d."horasAsignables", 0) AS horas_programables,
        d.estado AS estado_vinculacion, d."tipoVinculacion" AS tipo_vinculacion,
        d."periodoCarga" AS periodo
      FROM academic_work_plan."Docente" d
      INNER JOIN auth.personas p ON p.id_person = d."personaId"
      LEFT JOIN auth.seccionales sec
        ON sec.id_seccional::text = COALESCE(NULLIF(d."territorialId", ''), p.id_seccional::text)
      WHERE regexp_replace(BTRIM(p.num_identificacion), '\\.', '', 'g') = $1
      ORDER BY CASE WHEN d."periodoCarga" = $2::text THEN 0 ELSE 1 END,
        CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN d."periodoCarga" IS NOT NULL THEN 0 ELSE 1 END,
        d."updatedAt" DESC NULLS LAST, d.id ASC
      LIMIT 1
    `, [cedula, periodo ?? null]);

    await recordRundAccess(this.db, {
      ...actor,
      fullAccess: false,
      endpoint: 'RUND_PTA_CONSULTA_PERFIL_V1',
      docenteIds: row ? [row.docente_id] : [],
      fields: ['DOCUMENTO_IDENTIDAD'],
      result: 'ENMASCARADO',
    });

    if (!row) {
      throw new NotFoundException({
        statusCode: 404, code: 'RUND_DOCENTE_NO_ENCONTRADO',
        message: 'No se encontró un perfil docente en RUND. El PTA puede gestionar el alta mediante el Flujo 1.',
        flujo_alta: 'FLUJO_1',
      });
    }
    if (periodo !== undefined && row.periodo !== periodo) {
      throw new NotFoundException({
        statusCode: 404, code: 'RUND_DOCENTE_SIN_PERIODO',
        message: 'El docente existe en RUND, pero no tiene un registro para el periodo solicitado.',
        flujo_alta: null,
      });
    }

    // Lista permitida también en la salida: nuevos campos de BD nunca se
    // publican automáticamente, independientemente del rol del consumidor.
    return {
      docente_id: row.docente_id,
      perfil: {
        nombre_completo: row.nombre_completo ?? null,
        perfil_academico: row.perfil_academico ?? null,
        perfil_academico_profesional: row.perfil_academico_profesional ?? null,
        nivel_formacion: row.nivel_formacion ?? null,
      },
      categoria: row.categoria ?? null,
      territorial: { id: row.territorial_id ?? null, nombre: row.territorial_nombre ?? null, codigo: row.territorial_codigo ?? null },
      horas_programables: Number(row.horas_programables ?? 0),
      estado_vinculacion: row.estado_vinculacion ?? null,
      tipo_vinculacion: row.tipo_vinculacion ?? null,
      periodo: row.periodo ?? null,
    };
  }
}
