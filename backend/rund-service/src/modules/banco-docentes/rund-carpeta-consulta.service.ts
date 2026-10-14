import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { recordRundAccess, RundAccessActor } from './rund-access-audit';
import { RUND_SENSITIVE_FIELDS } from './banco-docentes-sensitive-data';

/** Contrato de consulta de Carpeta Digital: RUND resuelve sus tablas y versiones. */
@Injectable()
export class RundCarpetaConsultaService {
  constructor(private readonly db: DataSource) {}

  async profiles(personaId: string, actor: RundAccessActor) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personaId)) throw new BadRequestException('Se requiere el UUID de persona.');
    const perfiles = await this.db.query(`SELECT id,"personaId" AS persona_id,"periodoCarga" AS periodo_carga,estado
      FROM rund."Docente" WHERE "personaId"=$1 ORDER BY "periodoCarga" DESC NULLS LAST,id LIMIT 201`,[personaId]);
    if (perfiles.length > 200) throw new BadRequestException('La persona excede el límite del catálogo completo.');
    await recordRundAccess(this.db,{...actor,endpoint:'CARPETA_DIGITAL_PERFILES_RUND',resourceId:personaId,
      docenteIds:perfiles.map(p=>p.id),fields:['PERFILES_DOCUMENTALES']});
    return { propietario:'rund',persona_id:personaId.toLowerCase(),complete:true,perfiles };
  }

  async get(kind: string, id: string, actor: RundAccessActor) {
    if (!['documento', 'soporte'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Documento no válido.');
    const table = kind === 'documento' ? 'RundDocumentoPerfil' : 'RundSoporteCampo';
    const rows = await this.db.query(`SELECT d."personaId" AS persona_id FROM rund."${table}" s
      JOIN rund."Docente" d ON d.id = s.docente_id WHERE s.id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Documento no encontrado.');
    const docs = await this.list(rows[0].persona_id, actor);
    const doc = docs.find(doc => doc.id === `rund-service:${kind}:${id}`);
    if (!doc) throw new NotFoundException('Documento vigente no encontrado.');
    return doc;
  }

  async list(personaId: string, actor: RundAccessActor) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personaId)) {
      throw new BadRequestException('Se requiere el UUID de la persona.');
    }
    // Todos los periodos de la persona, sin resolver por cédula, email ni nombres.
    // El soporte de una versión reemplazada no duplica el documento vigente.
    const rows = await this.db.query(
      `SELECT dp.id, dp.docente_id, dp.rund_soporte_id, dp.nombre_archivo,
              dp.categoria_codigo AS categoria, dp.bloque, dp.tipo_soporte,
              dp.tamano_bytes, dp.mime_type, dp.version, dp.documento_logico_id,
              dp.descripcion, dp."createdAt", d."periodoCarga" AS periodo_carga, sp.estado AS estado_revision,
              sp.observacion, sp.fecha_vencimiento,
              (SELECT COUNT(*)::int FROM rund."RundDocumentoPerfil" v
                WHERE v.documento_logico_id = dp.documento_logico_id) AS total_versiones
         FROM rund."RundDocumentoPerfil" dp
         JOIN rund."Docente" d ON d.id = dp.docente_id
         LEFT JOIN LATERAL (SELECT s.estado, s.observacion, s.fecha_vencimiento
           FROM rund."RundSoporteCampo" s WHERE s.documento_perfil_id = dp.id
           ORDER BY s."createdAt" DESC, s.id DESC LIMIT 1) sp ON true
        WHERE d."personaId" = $1 AND dp.estado = 'ACTIVO'
        ORDER BY dp."createdAt" DESC, dp.id`, [personaId],
    );
    const supports = await this.db.query(
      `SELECT s.id, s.docente_id, s.bloque, s.tipo_soporte, s.nombre_archivo,
              s.estado AS estado_revision, s.observacion, s.fecha_vencimiento,
              s.documento_carpeta_id, s."createdAt", d."periodoCarga" AS periodo_carga
         FROM rund."RundSoporteCampo" s
         JOIN rund."Docente" d ON d.id = s.docente_id
        WHERE d."personaId" = $1 AND s.documento_perfil_id IS NULL
          AND (NULLIF(TRIM(s.nombre_archivo),'') IS NOT NULL OR NULLIF(TRIM(s.documento_carpeta_id),'') IS NOT NULL)
        ORDER BY s."createdAt" DESC, s.id`, [personaId],
    );
    await recordRundAccess(this.db, { ...actor, endpoint: 'CARPETA_DIGITAL_LISTADO_SERVICIO_RUND',
      resourceId: personaId, docenteIds: [...rows, ...supports].map(row => row.docente_id),
      fields: rows.length || supports.length ? RUND_SENSITIVE_FIELDS : [],
    });
    return [
      ...rows.map(row => this.project(row, personaId, actor.fullAccess, true)),
      ...supports.map(row => this.project(row, personaId, actor.fullAccess, false)),
    ];
  }

  async stats(input: unknown, actor: RundAccessActor) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (!Array.isArray(input) || !input.length || input.length > 200 || input.some(id => typeof id !== 'string' || !uuid.test(id))
      || new Set(input).size !== input.length) throw new BadRequestException('Se requieren entre 1 y 200 UUID únicos de persona.');
    const rows = await this.db.query(`WITH current_documents AS (
      SELECT d."personaId" AS persona_id, sp.estado
      FROM rund."RundDocumentoPerfil" dp JOIN rund."Docente" d ON d.id=dp.docente_id
      LEFT JOIN LATERAL (SELECT s.estado FROM rund."RundSoporteCampo" s WHERE s.documento_perfil_id=dp.id
        ORDER BY s."createdAt" DESC,s.id DESC LIMIT 1) sp ON true
      WHERE d."personaId"=ANY($1::uuid[]) AND dp.estado='ACTIVO'
      UNION ALL SELECT d."personaId",s.estado FROM rund."RundSoporteCampo" s
      JOIN rund."Docente" d ON d.id=s.docente_id WHERE d."personaId"=ANY($1::uuid[]) AND s.documento_perfil_id IS NULL
        AND (NULLIF(TRIM(s.nombre_archivo),'') IS NOT NULL OR NULLIF(TRIM(s.documento_carpeta_id),'') IS NOT NULL)
    ) SELECT persona_id,estado,count(*)::text AS total FROM current_documents GROUP BY persona_id,estado`, [input]);
    const counts = new Map(input.map(persona_id => [persona_id, { persona_id, total_documentos: 0,
      documentos_completos: 0, documentos_pendientes: 0, documentos_rechazados: 0, documentos_vencidos: 0 }]));
    for (const row of rows) {
      const value = counts.get(row.persona_id), total = Number(row.total), state = this.state(row.estado);
      value.total_documentos += total;
      value[state === 'validado' ? 'documentos_completos' : state === 'rechazado' ? 'documentos_rechazados'
        : state === 'vencido' ? 'documentos_vencidos' : 'documentos_pendientes'] += total;
    }
    await recordRundAccess(this.db, { ...actor, endpoint: 'CARPETA_DIGITAL_ESTADISTICAS_SERVICIO_RUND', fields: ['ESTADOS_DOCUMENTALES'] });
    return { propietario: 'rund', complete: true, personas: [...counts.values()] };
  }

  private state(value: unknown) {
    const state = String(value || '').toLowerCase().trim();
    return ['aceptado', 'aprobado', 'ok', 'validado'].includes(state) ? 'validado'
      : ['rechazado', 'devuelto'].includes(state) ? 'rechazado' : state === 'vencido' ? 'vencido' : 'pendiente';
  }

  private project(row: any, personaId: string, fullAccess: boolean, versioned: boolean) {
    const estado = this.state(row.estado_revision);
    const url = versioned
      ? `/rund/api/v1/pta/banco-docentes/${encodeURIComponent(row.docente_id)}/documentos/${row.id}/contenido`
      : row.documento_carpeta_id || null;
    return {
      id: `rund-service:${versioned ? 'documento' : 'soporte'}:${row.id}`,
      carpeta_id: `carpeta:${personaId}`, persona_id: personaId,
      origen: 'rund-service', servicio_propietario: 'rund', persistido: true,
      rund_perfil_id: row.docente_id, rund_perfil_propietario: 'rund', periodo_carga: row.periodo_carga ?? null,
      rund_documento_id: versioned ? row.id : null,
      rund_soporte_id: versioned ? row.rund_soporte_id : row.id,
      rund_docente_id: fullAccess ? row.docente_id : null,
      documento_logico_id: versioned ? row.documento_logico_id : null,
      nombre: fullAccess ? row.nombre_archivo || 'Documento del perfil.pdf' : 'Documento del perfil',
      categoria: 'rund', categoria_rund: versioned ? row.categoria : null,
      bloque_rund: row.bloque || null, tipo_soporte_rund: row.tipo_soporte || null,
      tipo_documento_id: row.tipo_soporte ? `rund_${String(row.tipo_soporte).toLowerCase()}` : null,
      tipo_archivo: versioned ? 'pdf' : 'archivo', tamano_bytes: Number(row.tamano_bytes || 0),
      estado, comentarios: fullAccess ? row.observacion || row.descripcion || null : null,
      url_archivo: fullAccess ? url : null, contenido_restringido: !fullAccess,
      fecha_subida: row.createdAt || null, fecha_vencimiento: row.fecha_vencimiento || null,
      fecha_validacion: null, validado_por: null,
      version_actual: versioned ? Number(row.version) : null,
      total_versiones: versioned ? Number(row.total_versiones) : null,
      versionado_disponible: versioned,
    };
  }
}
