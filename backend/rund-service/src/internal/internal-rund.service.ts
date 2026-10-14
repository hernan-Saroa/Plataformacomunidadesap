import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RundValidacionService } from '../modules/banco-docentes/rund-validacion.service';

export interface RegistrarAccesoDocumentoDto {
  actorId: string;
  roles: string[];
  endpoint: string;
  recursoId: string;
  campos?: string[];
  resultado: 'COMPLETO' | 'ENMASCARADO' | 'DENEGADO';
}

/**
 * Lecturas/escrituras del RUND que necesitan otros microservicios. Devuelve datos
 * crudos: la lógica propia de cada consumidor (p. ej. el clasificador de situación
 * administrativa de PTA) se queda en ese consumidor.
 */
@Injectable()
export class InternalRundService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly validacion: RundValidacionService,
  ) {}

  /**
   * Página de docentes completos para que otro servicio mantenga su copia local (PTA la usa como ancla de
   * claves foráneas). Paginación por cursor sobre el id: estable aunque haya altas durante el recorrido.
   */
  async docentesParaSincronizar(cursor: string | null, limite: number) {
    const tope = Math.min(Math.max(Number(limite) || 200, 1), 500);
    // La fila la serializa Postgres (to_jsonb): si la armara el driver de Node, las columnas `timestamp` sin
    // zona horaria se convertirían a la hora local y llegarían desplazadas al servicio que las copia.
    const filas: Array<{ fila: Record<string, any> }> = await this.dataSource.query(
      `SELECT to_jsonb(d) AS fila FROM rund."Docente" d WHERE ($1::text IS NULL OR d.id > $1::text) ORDER BY d.id ASC LIMIT $2`,
      [cursor || null, tope + 1],
    );
    const hayMas = filas.length > tope;
    const items = (hayMas ? filas.slice(0, tope) : filas).map((f) => f.fila);
    return { items, nextCursor: hayMas ? items[items.length - 1].id : null };
  }

  /** Un docente por id propio o por id de persona; con `periodo`, prefiere la fila de ese período. */
  async docentePorClave(clave: string, periodo?: string | null) {
    const k = String(clave ?? '').trim();
    if (!k) throw new BadRequestException('Debe indicar la clave del docente.');
    const filas: Array<{ fila: Record<string, any> }> = await this.dataSource.query(
      `SELECT to_jsonb(d) AS fila FROM rund."Docente" d
        WHERE d.id = $1 OR d."personaId"::text = $1
        ORDER BY CASE WHEN d.id = $1 THEN 0 ELSE 1 END,
                 CASE WHEN $2::text IS NOT NULL AND d."periodoCarga" = $2::text THEN 0 ELSE 1 END,
                 CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END,
                 d."updatedAt" DESC NULLS LAST, d.id ASC
        LIMIT 1`,
      [k, periodo || null],
    );
    if (!filas?.length) throw new NotFoundException(`No existe un docente con clave ${k} en el RUND.`);
    return filas[0].fila;
  }

  /** Validación documental por campo (la usa PTA al aprobar un plan de trabajo). */
  validacionDocumental(docenteId: string) {
    return this.validacion.getRundDocente(docenteId);
  }

  /** Perfil del docente por número de documento (el vigente más reciente). */
  async docentePorDocumento(documento: string) {
    const limpio = String(documento ?? '').trim();
    if (!limpio) throw new BadRequestException('Debe indicar el número de documento del docente.');
    const filas = await this.dataSource.query(
      `SELECT d.id                          AS "idDocente",
              d."personaId"                 AS "idPersona",
              p.num_identificacion          AS documento,
              p.nom_largo                   AS "nombreCompleto",
              d."correoInstitucional"       AS "correoInstitucional",
              d."territorialId"             AS "territorialCodigo",
              dt.nombre                     AS "territorialNombre",
              d."tipoVinculacion"           AS "tipoVinculacion",
              d."dedicacion"                AS dedicacion,
              d."dedicacionHorasSemana"     AS "dedicacionHorasSemana",
              d."escalafon"                 AS escalafon,
              d."regimenNormativo"          AS "regimenNormativo",
              d."horasAsignables"           AS "horasAsignables",
              d."investigacion"             AS investigacion,
              d."fechaInicioVinculacion"    AS "fechaInicioVinculacion",
              d."fechaFinVinculacion"       AS "fechaFinVinculacion",
              d."situacionAdministrativa"   AS "situacionAdministrativa",
              d."situacionCategoria"        AS "situacionCategoria",
              d."estado"                    AS estado,
              d."nivelFormacion"            AS "nivelFormacion",
              d."nucleoTematico"            AS "nucleoTematico"
         FROM rund."Docente" d
         INNER JOIN auth.personas p ON p.id_person = d."personaId"
         LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.codigo = d."territorialId"
        WHERE p.num_identificacion = $1
        ORDER BY d."updatedAt" DESC NULLS LAST
        LIMIT 1`,
      [limpio],
    );
    if (!filas?.length) throw new NotFoundException(`No existe un docente con documento ${limpio} en el RUND.`);
    return filas[0];
  }

  /** Soportes RUND de una persona (Carpeta Digital los lista junto a sus propios documentos). */
  async soportesPorPersona(personaId: string) {
    const id = String(personaId ?? '').trim();
    if (!id) throw new BadRequestException('Debe indicar la persona.');
    return this.dataSource.query(
      `SELECT s.id, s.bloque, s.tipo_soporte, s.documento_carpeta_id, s.nombre_archivo,
              s.estado, s.fecha_vencimiento, s.observacion, s."createdAt"
         FROM rund."RundSoporteCampo" s
         -- "Docente".id es text y docente_id es uuid: se compara como texto.
         JOIN rund."Docente" d ON d.id = s.docente_id::text
        WHERE d."personaId" = $1`,
      [id],
    );
  }

  /** Bitácora inmutable de acceso a documentos: la escribe el dueño del dato. */
  async registrarAccesoDocumento(dto: RegistrarAccesoDocumentoDto) {
    if (!dto?.actorId || !dto?.endpoint || !dto?.recursoId || !dto?.resultado) {
      throw new BadRequestException('actorId, endpoint, recursoId y resultado son obligatorios.');
    }
    await this.dataSource.query(
      `INSERT INTO rund."RundAccesoDatosLog" (id, actor_id, roles, endpoint, recurso_id, campos, resultado)
       VALUES (gen_random_uuid(), $1, $2::text[], $3, $4, $5::text[], $6)`,
      [dto.actorId, dto.roles ?? [], dto.endpoint, dto.recursoId, dto.campos ?? [], dto.resultado],
    );
    return { registrado: true };
  }

  /**
   * ¿Esta URL de archivo es un original RUND? Lo es si un soporte la referencia o si ya
   * hay un acceso registrado a ese recurso por las operaciones de Carpeta Digital.
   */
  async esOriginalRund(url: string, recursoId: string, endpoints: string[]) {
    const filas = await this.dataSource.query(
      `SELECT id FROM rund."RundSoporteCampo" WHERE LOWER(documento_carpeta_id) = LOWER($1)
       UNION ALL SELECT id FROM rund."RundAccesoDatosLog" WHERE recurso_id = $2 AND endpoint = ANY($3::text[])
       LIMIT 1`,
      [url, recursoId, endpoints],
    );
    return { esOriginalRund: filas.length > 0 };
  }

  /** Agregados del RUND para el tablero del backoffice. */
  async estadisticasBackoffice() {
    const q = (sql: string) => this.dataSource.query(sql).catch(() => []);
    const [totales, vinculacion, dedicacion, escalafon, nivelFormacion, territoriales, formacionAvanzada] = await Promise.all([
      q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "sedeId" IS NULL)::int AS "sinCetap" FROM rund."Docente"`),
      q(`SELECT "tipoVinculacion" AS key, COUNT(*)::int AS cnt FROM rund."Docente" GROUP BY 1 ORDER BY cnt DESC`),
      q(`SELECT dedicacion AS key, COUNT(*)::int AS cnt FROM rund."Docente" GROUP BY 1 ORDER BY cnt DESC`),
      q(`SELECT escalafon AS key, COUNT(*)::int AS cnt FROM rund."Docente" WHERE escalafon IS NOT NULL GROUP BY 1 ORDER BY cnt DESC`),
      q(`SELECT "nivelFormacion" AS key, COUNT(*)::int AS cnt FROM rund."Docente" WHERE "nivelFormacion" IS NOT NULL GROUP BY 1 ORDER BY cnt DESC`),
      q(`SELECT s.nom_seccional AS territorial, COUNT(d.id)::int AS total,
                COUNT(CASE WHEN d."sedeId" IS NULL THEN 1 END)::int AS sin_cetap,
                COUNT(CASE WHEN d."sedeId" IS NOT NULL THEN 1 END)::int AS con_cetap
           FROM rund."Docente" d
           JOIN auth.seccionales s ON d."territorialId" = s.id_seccional::text
          GROUP BY s.nom_seccional ORDER BY total DESC`),
      q(`SELECT CASE
                  WHEN "nivelFormacion" ILIKE '%doctorado%' OR "nivelFormacion" ILIKE '%doctor%' THEN 'Doctorado'
                  WHEN "nivelFormacion" ILIKE '%maestr%' OR "nivelFormacion" ILIKE '%magíster%' OR "nivelFormacion" ILIKE '%magister%' THEN 'Maestría'
                  WHEN "nivelFormacion" ILIKE '%especializ%' THEN 'Especialización'
                  WHEN "nivelFormacion" ILIKE '%pregrado%' OR "nivelFormacion" ILIKE '%licenciat%' OR "nivelFormacion" ILIKE '%ingenier%' THEN 'Pregrado'
                  ELSE 'Sin información'
                END AS nivel, COUNT(*)::int AS total
           FROM rund."Docente" GROUP BY nivel ORDER BY total DESC`),
    ]);
    return {
      totalDocentes: totales[0]?.total ?? 0,
      docentesSinCetap: totales[0]?.sinCetap ?? 0,
      porVinculacion: vinculacion,
      porDedicacion: dedicacion,
      porEscalafon: escalafon,
      porNivelFormacion: nivelFormacion,
      coberturaTerritorial: territoriales,
      formacionAvanzada,
    };
  }
}
