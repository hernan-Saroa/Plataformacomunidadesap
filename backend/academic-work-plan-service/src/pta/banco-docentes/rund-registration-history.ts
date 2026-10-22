import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { capturarDatosCarga } from './rund-carga-original';
import { resolveRundActorNames, rundActorName } from './rund-actor-names';
import * as xlsx from 'xlsx';

export type RegistrationRow = {
  fila: number | null; nombre: string; documento_identidad: string | null; correo: string | null;
  periodo: string | null; resultado: string; docenteId?: string | null; fecha?: string | null; observacion?: string | null;
};

const clean = (value: unknown) => value == null ? null : String(value).trim() || null;
const periodKey = (value: unknown) => clean(value) || '';
const sourcePeriod = (summary: any) => clean(summary?.periodoCarga || summary?.periodo_carga || summary?.periodo);

/** Recovers source membership, never invents a successful outcome for old rows. */
export function historicalRegistrationRows(content: Buffer, mimeType: string, summary: any): RegistrationRow[] {
  try {
    let rows: any[];
    if (mimeType === 'application/json') {
      const parsed = JSON.parse(content.toString('utf8'));
      rows = Array.isArray(parsed) ? parsed : [];
    } else {
      const workbook = xlsx.read(content, { type: 'buffer' });
      const name = workbook.SheetNames.find(sheet => /CARGA|DOCENTES|DATOS/i.test(sheet)) || workbook.SheetNames[0];
      if (!name) return [];
      const matrix = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[name], { header: 1, defval: null, raw: false });
      const canonical = (value: any) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      const header = matrix.findIndex(row => row.some(value => ['DOCUMENTOIDENTIDAD','DOCUMENTODEIDENTIDAD','DOCUMENTO'].includes(canonical(value)))
        && row.some(value => ['NOMBRECOMPLETO','NOMBRE'].includes(canonical(value))));
      if (header < 0) return [];
      const columns = matrix[header];
      rows = matrix.slice(header + 1).map((row, index) => Object.fromEntries([
        ['__sourceRowNumber', header + index + 2], ...columns.map((column, col) => [column, row[col]]),
      ])).filter(row => Object.entries(row).some(([key, value]) =>
        ['DOCUMENTOIDENTIDAD','DOCUMENTODEIDENTIDAD','DOCUMENTO','NOMBRECOMPLETO','NOMBRE'].includes(canonical(key)) && clean(value)));
    }
    return rows.map((raw, index) => ({ ...registrationSnapshot({ ...raw, __sourceRowNumber: raw.__sourceRowNumber || index + 2,
      PERIODO_CARGA: raw.PERIODO_CARGA || raw.periodoCarga || raw.periodo_carga || sourcePeriod(summary) }), resultado: 'HISTORICO' }));
  } catch { return []; }
}
export function registrationSnapshot(raw: any, result?: any): RegistrationRow {
  const values = capturarDatosCarga(raw || {});
  return {
    fila: Number(raw?.__sourceRowNumber) || null,
    nombre: clean(result?.fullName || values.NOMBRE_COMPLETO || raw?.fullName || raw?.nombreCompleto || raw?.NOMBRE || raw?.nombre) || 'Nombre no disponible',
    documento_identidad: clean(result?.documentNumber || values.DOCUMENTO_IDENTIDAD || raw?.documentNumber || raw?.DOCUMENTO || raw?.documento),
    correo: clean(result?.email || values.CORREO_INSTITUCIONAL || raw?.correoInstitucional),
    periodo: clean(result?.periodoCarga || raw?.PERIODO_CARGA || raw?.periodoCarga || raw?.periodo_carga),
    resultado: 'PENDIENTE',
  };
}

export function bulkRegistrationTrace(rows: any[], results?: any[], errors: any[] = []) {
  const processed = new Map((results || []).map(result => [Number(result.sourceRowNumber), result]));
  const failures = new Map(errors.map(error => [Number(error.fila || error.row), error]));
  const registros = rows.map(raw => {
    const row = Number(raw.__sourceRowNumber);
    const result = processed.get(row), failure = failures.get(row);
    const snapshot = registrationSnapshot(raw, result);
    return { ...snapshot,
      resultado: result ? ({ insert: 'CREADO', update: 'ACTUALIZADO', unchanged: 'SIN_CAMBIOS' }[result.action] || 'PROCESADO')
        : failure ? 'NO_CARGADO' : results ? 'NO_PROCESADO' : 'PENDIENTE',
      docenteId: result?.docenteId || null, fecha: result?.processedAt || failure?.processedAt || null,
      observacion: failure ? failure.tipo === 'DUPLICADO_DOCUMENTO' ? 'Documento repetido dentro del archivo para el mismo periodo.' : 'El registro no superó la validación de la carga.' : null,
    };
  });
  const resumenPorPeriodo: Record<string, any> = {};
  for (const row of registros) {
    const key = periodKey(row.periodo);
    const counters = resumenPorPeriodo[key] ||= { total: 0, creados: 0, actualizados: 0, sinCambios: 0, errores: 0, omitidos: 0 };
    counters.total++;
    if (row.resultado === 'CREADO') counters.creados++;
    if (row.resultado === 'ACTUALIZADO') counters.actualizados++;
    if (row.resultado === 'SIN_CAMBIOS') counters.sinCambios++;
    if (row.resultado === 'NO_CARGADO') counters.errores++;
    if (row.resultado === 'NO_PROCESADO') counters.omitidos++;
  }
  return { version: 1, periodos: Object.keys(resumenPorPeriodo).map(key => key || null), registros, resumenPorPeriodo };
}

function boundedNumber(value: unknown, fallback: number, max: number) {
  if (value == null || value === '') return fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > max) throw new BadRequestException('La página o el tamaño solicitado no es válido.');
  return Number(value);
}

export function registrationHistoryFilters(query: any = {}) {
  const periodo = clean(query.periodoCarga);
  const tipo = clean(query.tipo);
  const search = clean(query.search);
  if (periodo && (periodo.length > 40 || /[\u0000-\u001f]/.test(periodo))) throw new BadRequestException('El periodo no es válido.');
  if (tipo && !['MASIVO', 'INDIVIDUAL'].includes(tipo)) throw new BadRequestException('El tipo de operación no es válido.');
  if (search && search.length > 150) throw new BadRequestException('La búsqueda admite hasta 150 caracteres.');
  return { periodo, tipo, search, sinPeriodo: query.sinPeriodo === true || query.sinPeriodo === 'true',
    page: boundedNumber(query.page, 1, 1_000_000), limit: boundedNumber(query.limit, 20, 50) };
}

// Old batches are related to their immutable row audits. New batches also keep
// unchanged, rejected and unprocessed rows in their source receipt.
const EVENTS = `WITH bulk_rows AS (
  SELECT COALESCE(NULLIF(l.metadata->>'cargaMasivaId',''),l.soporte_id) AS carga_id,
    COALESCE(NULLIF(l.metadata->>'periodoCarga',''),NULLIF(l.metadata->>'periodo',''),d."periodoCarga") AS periodo,l.accion
  FROM academic_work_plan."RundAprobacionLog" l
  LEFT JOIN academic_work_plan."Docente" d ON d.id::text=l.docente_id::text
  WHERE l.canal_origen='MASIVO' AND l.accion IN ('CREAR','EDITAR','RECUPERAR_DATOS_CARGA')
), bulk_audits AS (
  SELECT carga_id,ARRAY_AGG(DISTINCT periodo) AS periodos FROM bulk_rows GROUP BY carga_id
), historical_counts AS (
  SELECT carga_id,periodo,jsonb_build_object('total',COUNT(*),'creados',COUNT(*) FILTER(WHERE accion='CREAR'),
    'actualizados',COUNT(*) FILTER(WHERE accion='EDITAR'),
    'recuperados',COUNT(*) FILTER(WHERE accion='RECUPERAR_DATOS_CARGA')) AS resumen FROM bulk_rows GROUP BY carga_id,periodo
), bulk_sources AS (
  SELECT b.id,b.nombre_archivo,b.actor_id,b.estado,b.resumen,b."createdAt",b."updatedAt",
    CASE WHEN jsonb_array_length(COALESCE(b.resumen->'trazabilidad'->'periodos','[]'::jsonb))>0
      THEN ARRAY(SELECT jsonb_array_elements_text(b.resumen->'trazabilidad'->'periodos'))
      WHEN COALESCE(NULLIF(b.resumen->>'periodoCarga',''),NULLIF(b.resumen->>'periodo_carga',''),NULLIF(b.resumen->>'periodo','')) IS NOT NULL
        THEN ARRAY[COALESCE(NULLIF(b.resumen->>'periodoCarga',''),NULLIF(b.resumen->>'periodo_carga',''),NULLIF(b.resumen->>'periodo',''))]
      WHEN cardinality(a.periodos)>0 THEN a.periodos ELSE ARRAY[NULL::text] END AS periodos
  FROM academic_work_plan."RundCargaMasiva" b LEFT JOIN bulk_audits a ON a.carga_id=b.id::text
), events AS (
  SELECT b.id::text,'MASIVO'::text AS tipo,p.periodo,b.nombre_archivo AS titulo,b.actor_id,b.estado,
    b."createdAt" AT TIME ZONE current_setting('TIMEZONE') AS fecha,
    b."updatedAt" AT TIME ZONE current_setting('TIMEZONE') AS fecha_fin,
    COALESCE(b.resumen->'trazabilidad'->'resumenPorPeriodo'->COALESCE(p.periodo,''),
      CASE WHEN b.resumen->>'tipo'='RECUPERACION_INFORMATIVA' THEN h.resumen END,
      CASE WHEN cardinality(b.periodos)>1 THEN h.resumen ELSE NULL END,
      jsonb_build_object('total',COALESCE(b.resumen->'total',CASE WHEN jsonb_typeof(b.resumen->'registros')='number' THEN b.resumen->'registros' END),'creados',b.resumen->'created',
        'actualizados',b.resumen->'updated','sinCambios',b.resumen->'unchanged','errores',b.resumen->'errors')) AS resumen,
    b.resumen ? 'trazabilidad' AS detalle_completo,
    CASE WHEN b.resumen->>'tipo'='RECUPERACION_INFORMATIVA' THEN 'RECUPERACION_INFORMATIVA' ELSE 'REGISTRO' END AS origen
  FROM bulk_sources b CROSS JOIN LATERAL unnest(b.periodos) p(periodo)
  LEFT JOIN historical_counts h ON h.carga_id=b.id::text AND h.periodo IS NOT DISTINCT FROM p.periodo
  UNION ALL
  SELECT l.id::text,'INDIVIDUAL',COALESCE(NULLIF(l.metadata->>'periodoCarga',''),d."periodoCarga"),
    COALESCE(NULLIF(l.metadata->'registro'->>'nombre',''),NULLIF(p.nom_largo,''),'Nombre no disponible'),
    l.actor_id,'COMPLETADA',l."createdAt" AT TIME ZONE current_setting('TIMEZONE'),
    l."createdAt" AT TIME ZONE current_setting('TIMEZONE'),
    jsonb_build_object('total',1,'creados',1,'actualizados',0,'sinCambios',0,'errores',0),true,'REGISTRO'
  FROM academic_work_plan."RundAprobacionLog" l
  LEFT JOIN academic_work_plan."Docente" d ON d.id::text=l.docente_id::text
  LEFT JOIN auth.personas p ON p.id_person::text=d."personaId"::text
  WHERE l.accion='CREAR' AND l.canal_origen='MODAL'
)`;

export class RundRegistrationHistory {
  constructor(private readonly db: Pick<DataSource, 'query'>) {}

  private async present(rows: any[]) {
    const names = await resolveRundActorNames(this.db as any, rows.map(row => row.actor_id));
    return rows.map(row => ({ id: row.id, tipo: row.tipo, periodo: row.periodo, origen: row.origen,
      titulo: row.titulo, responsable: row.origen === 'RECUPERACION_INFORMATIVA' ? 'No registrado' : rundActorName(names, row.actor_id),
      responsableRecuperacion: row.origen === 'RECUPERACION_INFORMATIVA' ? rundActorName(names, row.actor_id) : null,
      estado: row.estado,
      fecha: row.fecha, fechaFin: row.fecha_fin, resumen: row.resumen, detalleCompleto: row.detalle_completo }));
  }

  async list(query: any) {
    const filters = registrationHistoryFilters(query);
    const args = [filters.periodo, filters.tipo, filters.search];
    const where = `WHERE ($1::text IS NULL OR periodo=$1) AND ($2::text IS NULL OR tipo=$2)
      AND ($3::text IS NULL OR strpos(LOWER(titulo),LOWER($3))>0)`;
    const [count] = await this.db.query(`${EVENTS} SELECT COUNT(*)::int AS total FROM events ${where}`, args);
    const rows = await this.db.query(`${EVENTS} SELECT * FROM events ${where}
      ORDER BY fecha DESC,id DESC,periodo DESC NULLS LAST LIMIT $4 OFFSET $5`, [...args, filters.limit, (filters.page - 1) * filters.limit]);
    return { data: await this.present(rows), total: count.total, page: filters.page, limit: filters.limit, pages: Math.ceil(count.total / filters.limit) };
  }

  async detail(tipo: string, id: string, query: any) {
    if (!['MASIVO', 'INDIVIDUAL'].includes(tipo) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('La operación de trazabilidad no es válida.');
    }
    const filters = registrationHistoryFilters(query);
    const [event] = await this.db.query(`${EVENTS} SELECT * FROM events WHERE id=$1 AND tipo=$2
      AND (($4::boolean AND periodo IS NULL) OR (NOT $4::boolean AND ($3::text IS NULL OR periodo=$3)))
      ORDER BY periodo NULLS LAST LIMIT 1`, [id, tipo, filters.periodo, filters.sinPeriodo]);
    if (!event) throw new NotFoundException('No se encontró la operación en el periodo seleccionado.');
    let records: RegistrationRow[];
    let complete = true;
    if (tipo === 'MASIVO') {
      const [batch] = await this.db.query(`SELECT resumen->'trazabilidad' AS trace,resumen,contenido,tipo_mime FROM academic_work_plan."RundCargaMasiva" WHERE id::text=$1`, [id]);
      if (Array.isArray(batch?.trace?.registros)) records = batch.trace.registros;
      else {
        records = await this.db.query(`SELECT COALESCE(l.metadata->'registro'->>'nombre',d."datosCargaMasiva"->>'NOMBRE_COMPLETO',p.nom_largo,'Nombre no disponible') AS nombre,
          COALESCE(l.metadata->'registro'->>'documento_identidad',d."datosCargaMasiva"->>'DOCUMENTO_IDENTIDAD',p.num_identificacion) AS documento_identidad,
          COALESCE(l.metadata->'registro'->>'correo',d."datosCargaMasiva"->>'CORREO_INSTITUCIONAL',d."correoInstitucional") AS correo,
          COALESCE(NULLIF(l.metadata->>'periodoCarga',''),NULLIF(l.metadata->>'periodo',''),d."periodoCarga") AS periodo,
          CASE l.accion WHEN 'CREAR' THEN 'CREADO' WHEN 'RECUPERAR_DATOS_CARGA' THEN 'RECUPERADO' ELSE 'ACTUALIZADO' END AS resultado,
          l.metadata->>'filaOrigen' AS fila,l."createdAt" AT TIME ZONE current_setting('TIMEZONE') AS fecha
          FROM academic_work_plan."RundAprobacionLog" l
          LEFT JOIN academic_work_plan."Docente" d ON d.id::text=l.docente_id::text
          LEFT JOIN auth.personas p ON p.id_person::text=d."personaId"::text
          WHERE l.canal_origen='MASIVO' AND l.accion IN ('CREAR','EDITAR','RECUPERAR_DATOS_CARGA')
            AND (l.soporte_id=$1 OR l.metadata->>'cargaMasivaId'=$1) ORDER BY l."createdAt",l.id`, [id]);
        complete = records.length >= Number(event.resumen?.total || 0) && records.length > 0;
        if (batch?.contenido) {
          const archived = historicalRegistrationRows(batch.contenido, batch.tipo_mime, batch.resumen);
          if (archived.length) {
            const rowKey = (row: RegistrationRow) => `${row.fila}:${periodKey(row.periodo)}`;
            const identityKey = (row: RegistrationRow) => `${String(row.documento_identidad || '').replace(/[.\s]/g, '').toUpperCase()}:${periodKey(row.periodo)}`;
            const byRow = new Map(records.filter(row => row.fila != null).map(row => [rowKey(row), row]));
            const byIdentity = new Map<string, RegistrationRow[]>();
            for (const row of records) byIdentity.set(identityKey(row), [...(byIdentity.get(identityKey(row)) || []), row]);
            const archiveCounts = new Map<string, number>();
            for (const row of archived) archiveCounts.set(identityKey(row), (archiveCounts.get(identityKey(row)) || 0) + 1);
            const matched = new Set<RegistrationRow>();
            const recovered = archived.map(row => {
              const candidates = byIdentity.get(identityKey(row)) || [];
              const audited = byRow.get(rowKey(row)) || (archiveCounts.get(identityKey(row)) === 1 && candidates.length === 1 ? candidates[0] : undefined);
              if (!audited || matched.has(audited)) return row;
              matched.add(audited);
              return { ...row, resultado: audited.resultado, fecha: audited.fecha };
            });
            records = [...recovered, ...records.filter(row => !matched.has(row))];
            complete = complete && records.every(row => row.resultado !== 'HISTORICO');
          }
        }
      }
    } else records = await this.db.query(`SELECT COALESCE(l.metadata->'registro'->>'nombre',p.nom_largo,'Nombre no disponible') AS nombre,
      COALESCE(l.metadata->'registro'->>'documento_identidad',p.num_identificacion) AS documento_identidad,
      COALESCE(l.metadata->'registro'->>'correo',d."correoInstitucional") AS correo,
      COALESCE(NULLIF(l.metadata->>'periodoCarga',''),d."periodoCarga") AS periodo,'CREADO' AS resultado,
      l."createdAt" AT TIME ZONE current_setting('TIMEZONE') AS fecha,NULL::int AS fila
      FROM academic_work_plan."RundAprobacionLog" l LEFT JOIN academic_work_plan."Docente" d ON d.id::text=l.docente_id::text
      LEFT JOIN auth.personas p ON p.id_person::text=d."personaId"::text WHERE l.id::text=$1 AND l.accion='CREAR' AND l.canal_origen='MODAL'`, [id]);
    // The selected event is always scoped to one period, even when opened from
    // the global list. Never leak another period's batch members into its card.
    records = records.filter(row => periodKey(row.periodo) === periodKey(event.periodo));
    const search = filters.search?.toLocaleLowerCase();
    if (search) records = records.filter(row => [row.nombre, row.documento_identidad, row.correo].some(value => String(value || '').toLocaleLowerCase().includes(search)));
    const total = records.length;
    return { event: (await this.present([event]))[0], registros: records.slice((filters.page - 1) * filters.limit, filters.page * filters.limit),
      total, page: filters.page, limit: filters.limit, pages: Math.ceil(total / filters.limit), detalleCompleto: complete };
  }
}
