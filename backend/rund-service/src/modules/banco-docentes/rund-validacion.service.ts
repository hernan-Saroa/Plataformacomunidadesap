import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';

function coalesceString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Campos del RUND que se validan documentalmente y el bloque al que pertenecen. */
export const CAMPOS_SOPORTE_RUND: ReadonlyArray<{ campo: string; tipo: string }> = [
  { campo: 'DOCUMENTO_IDENTIDAD', tipo: 'IDENTIDAD' },
  { campo: 'TIPO_DOCUMENTO', tipo: 'IDENTIDAD' },
  { campo: 'NOMBRE_COMPLETO', tipo: 'IDENTIDAD' },
  { campo: 'FECHA_NACIMIENTO', tipo: 'IDENTIDAD' },
  { campo: 'GENERO', tipo: 'IDENTIDAD' },
  { campo: 'CORREO_INSTITUCIONAL', tipo: 'CONTACTO' },
  { campo: 'VINCULACION', tipo: 'VINCULACION' },
  { campo: 'TERRITORIAL', tipo: 'VINCULACION' },
  { campo: 'DEDICACION', tipo: 'VINCULACION' },
  { campo: 'CATEGORIA_ESCALAFON', tipo: 'ESCALAFON' },
  { campo: 'INICIO_VINCULACION', tipo: 'VINCULACION' },
  { campo: 'FIN_VINCULACION', tipo: 'VINCULACION' },
  { campo: 'ACTO_ADMINISTRATIVO', tipo: 'VINCULACION' },
  { campo: 'PUNTAJE_SALARIAL', tipo: 'ESCALAFON' },
  { campo: 'SITUACION_ADMINISTRATIVA', tipo: 'SITUACION' },
  { campo: 'NIVEL_FORMACION', tipo: 'FORMACION' },
  { campo: 'TITULO_PREGRADO', tipo: 'FORMACION' },
  { campo: 'TITULO_ESPECIALIZACION', tipo: 'FORMACION' },
  { campo: 'TITULO_MAESTRIA', tipo: 'FORMACION' },
  { campo: 'TITULO_DOCTORADO', tipo: 'FORMACION' },
  { campo: 'TITULO_POSDOCTORADO', tipo: 'FORMACION' },
  { campo: 'NUCLEO_TEMATICO', tipo: 'VINCULACION' },
  { campo: 'PERFIL_ACADEMICO', tipo: 'FORMACION' },
  { campo: 'ULTIMA_EVALUACION', tipo: 'EVALUACION' },
];

const CATEGORIA_A_BLOQUE: Record<string, string> = {
  personal: 'IDENTIDAD',
  contacto: 'CONTACTO',
  academico: 'FORMACION',
  formacion: 'FORMACION',
  laboral: 'VINCULACION',
  vinculacion: 'VINCULACION',
  certificados: 'ESCALAFON',
  escalafon: 'ESCALAFON',
  administrativo: 'SITUACION',
  situacion: 'SITUACION',
  otros: 'EVALUACION',
  evaluacion: 'EVALUACION',
};

const ESTADO_CARPETA_A_VALIDACION: Record<string, string> = {
  validado: 'Aceptado',
  aprobado: 'Aceptado',
  aceptado: 'Aceptado',
  pendiente: 'Pendiente',
  rechazado: 'Rechazado',
  vencido: 'Rechazado',
  'sin cargar': 'Sin cargar',
  'no aplica': 'No aplica',
};

/**
 * Validación documental por campo del RUND (rund.validacion_documental) y su
 * sincronización desde Carpeta Digital. Antes vivía en el servicio PTA.
 */
@Injectable()
export class RundValidacionService {
  constructor(
    @InjectRepository(BancoDocenteEntity)
    private readonly docenteRepo: Repository<BancoDocenteEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Acepta el id del docente o el de su persona (id_person o id de usuario en auth). */
  private async resolverDocente(docenteKey: string): Promise<BancoDocenteEntity> {
    let docente = await this.docenteRepo.findOne({ where: [{ id: docenteKey }, { personaId: docenteKey }] });

    if (!docente) {
      const personId = await this.resolverPersonaEnAuth(docenteKey);
      if (personId) {
        docente = await this.docenteRepo.findOne({ where: [{ id: personId }, { personaId: personId }] });
      }
    }

    if (!docente) throw new NotFoundException(`Docente ${docenteKey} no encontrado`);
    return docente;
  }

  private async resolverPersonaEnAuth(key: string): Promise<string | null> {
    try {
      const rows: Array<{ person_id: string | null }> = await this.dataSource.query(
        `SELECT p.id_person::text AS person_id
         FROM auth.personas p
         LEFT JOIN auth."user" u ON u.id_person = p.id_person
         WHERE p.id_person::text = $1 OR u.id_user::text = $1
         LIMIT 1`,
        [key],
      );
      return coalesceString(rows?.[0]?.person_id);
    } catch {
      // Algunos ambientes de auth usan id_tercero en lugar de id_person: sin resolución, el llamador recibe 404.
      return null;
    }
  }

  async getRundDocente(docenteKey: string) {
    const docente = await this.resolverDocente(docenteKey);

    let filas: any[] = await this.dataSource.query(
      `SELECT * FROM rund.validacion_documental WHERE docente_id = $1`,
      [docente.id],
    );

    if (filas.length === 0) {
      for (const item of CAMPOS_SOPORTE_RUND) {
        await this.dataSource.query(
          `INSERT INTO rund.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo],
        );
      }
      filas = await this.dataSource.query(`SELECT * FROM rund.validacion_documental WHERE docente_id = $1`, [docente.id]);
    }

    const total = filas.length;
    const aceptados = filas.filter((r) => r.estado_documento === 'Aceptado').length;

    return {
      docenteId: docente.id,
      personaId: docente.personaId,
      completitud: total > 0 ? Math.round((aceptados / total) * 100) : 0,
      validaciones: filas.map((r) => ({
        id: r.id,
        campo_rund: r.campo_rund,
        tipo_documento_soporte: r.tipo_documento_soporte,
        estado_documento: r.estado_documento,
        fecha_carga: r.fecha_carga,
        fecha_validacion: r.fecha_validacion,
        validado_por: r.validado_por,
        observacion: r.observacion,
      })),
    };
  }

  async syncRundDocuments(docenteKey: string, documentos: any[]) {
    const docente = await this.resolverDocente(docenteKey);
    await this.getRundDocente(docente.id);

    for (const doc of documentos || []) {
      const categoria = String(doc.categoria || '').toLowerCase().trim();
      const estadoOrigen = String(doc.estado || '').toLowerCase().trim();
      const bloque = CATEGORIA_A_BLOQUE[categoria];
      const estado = ESTADO_CARPETA_A_VALIDACION[estadoOrigen] || 'Sin cargar';
      if (!bloque) continue;

      await this.dataSource.query(
        `UPDATE rund.validacion_documental
         SET estado_documento = $1,
             id_documento_carpeta = $2,
             fecha_carga = COALESCE($3, fecha_carga),
             fecha_validacion = COALESCE($4, fecha_validacion),
             validado_por = COALESCE($5, validado_por),
             observacion = COALESCE($6, observacion),
             updated_at = now()
         WHERE docente_id = $7 AND tipo_documento_soporte = $8`,
        [
          estado,
          doc.id || null,
          doc.fecha_subida || new Date().toISOString(),
          doc.fecha_validacion || (estado === 'Aceptado' ? new Date().toISOString() : null),
          doc.validado_por || null,
          doc.comentarios || null,
          docente.id,
          bloque,
        ],
      );
    }

    return this.getRundDocente(docente.id);
  }
}
