import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';
import { HistorialEstadoPtaEntity } from './entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './entities/pta-evidencia.entity';
import { SolicitudPtaEntity } from './entities/solicitud-pta.entity';
import { PtaConfiguracionEntity } from './entities/pta-configuracion.entity';
import { PtaUserDataEntity } from './entities/pta-user-data.entity';
import { ProgramaEntity } from './entities/programa.entity';
import { AsignaturaEntity } from './entities/asignatura.entity';
import { TerritorialEntity } from './entities/territorial.entity';
import { SedeEntity } from './entities/sede.entity';
import { DocenteEntity } from './entities/docente.entity';
import { PersonaEntity } from './entities/persona.entity';
import { UsuarioEntity } from './entities/usuario.entity';
import { AprobacionJefaturaEntity } from './entities/aprobacion-jefatura.entity';
import { PtaEventoEntity } from './entities/pta-evento.entity';
import { PtaComponentApprovalEntity } from './entities/pta-component-approval.entity';
import { PtaComponentReviewEntity } from './entities/pta-component-review.entity';
import { PtaTerritorialApprovalEntity } from './entities/pta-territorial-approval.entity';
import { PtaTerritorialReviewEntity } from './entities/pta-territorial-review.entity';
import type { PtaAuthenticatedUser } from './auth/pta-auth.guard';
import {
  COMPONENT_PERMISSION,
  DOCENCIA_COMPONENT_KEYS,
  COMPLEMENTARIAS_COMPONENT_KEYS,
  REVIEW_SUBSECCIONES_BY_COMPONENT,
  reviewPermissionFor,
  type PTAComponentKey,
  type PTANivelDocencia,
} from './auth/pta-permissions.constants';
import { PtaNotificationsService } from './notifications/pta-notifications.service';
import { obtenerNombreVisibleAsignatura } from './utils/asignatura-nombre.util';

type SavePtaInput = Record<string, any>;
type ComponentResponseMap = Record<string, string>;

const CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION = 'Resolución proyecto de investigación';
const CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION_CREACION =
  `${CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION} · Creación`;
const COMENTARIO_RESOLUCION_PROYECTO_APROBADA =
  'Aprobado automáticamente junto con el componente Investigación del PTA.';

function isCategoriaResolucionProyecto(value: unknown): boolean {
  return normalizeEstadoFilter(value).startsWith(
    normalizeEstadoFilter(CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION),
  );
}

function isPtaHabilitadoParaSeguimientoPorEstado(value: unknown): boolean {
  return new Set([
    'APROBADO',
    'EN_FIRME',
    'RADICADO',
    'EN_EJECUCION',
    'FINALIZADO',
    'TERMINADO',
  ]).has(normalizeEstadoFilter(value));
}

function resolveHorasResolucionProyecto(proyecto: any): number {
  return Math.max(0, Math.round(Number(proyecto?.horas_solicitadas) || 0));
}

function coalesceString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function coalesceLookupKey(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'bigint') return value.toString();
  }
  return null;
}

function normalizeEstadoFilter(value: unknown): string {
  const raw = coalesceString(value);
  return raw
    ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, '_')
    : '';
}

function normalizeDocenciaModality(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isUndefinedDocenciaModality(value: unknown): boolean {
  const modality = normalizeDocenciaModality(value);
  return modality.includes('POR DEFINIR') || modality.includes('SIN DEFINIR');
}

function isNonPresentialDocenciaModality(value: unknown): boolean {
  const modality = normalizeDocenciaModality(value);
  return modality.includes('VIRTUAL')
    || modality.includes('DISTANCIA')
    || modality.includes('REMOT')
    || modality.includes('ONLINE')
    || modality.includes('EN LINEA')
    || modality.includes('NO PRESENCIAL');
}

function getGroupedPtaEstados(value: unknown): string[] | null {
  const key = normalizeEstadoFilter(value);
  if (!key) return null;

  if (key === 'BORRADOR' || key === 'BORRADORES') {
    return ['Borrador', 'BORRADOR'];
  }

  if (key === 'PENDIENTES' || key === 'APROBACION') {
    return [
      'Pendiente Jefatura',
      'Pendiente Decanatura',
      'Pendiente Gesti\u00f3n Profesoral',
      'PENDIENTE_JEFATURA',
      'PENDIENTE_DECANATURA',
      'PENDIENTE_GESTION_PROFESORAL',
      'PENDIENTE_APROBACION',
      'CONCERTADO',
    ];
  }

  if (key === 'CONCERTACION') {
    return [
      'EN_CONCERTACION',
      'OBJETADO_DOCENTE',
      'MODIFICADO_DOCENTE',
      'DEVUELTO',
      'Devuelto',
      'PROPUESTO_POR_DIRECCION',
      'NOTIFICADO_DOCENTE',
    ];
  }

  if (key === 'SNA') return ['ESCALADO_SNA', 'Escalado SNA'];
  if (key === 'APROBADO' || key === 'APROBADOS') return ['Aprobado', 'APROBADO'];
  if (key === 'FINALIZADO' || key === 'FINALIZADOS') return ['Finalizado', 'FINALIZADO'];
  if (key === 'SEGUIMIENTO') return ['En Firme', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'EN_EJECUCI\u00d3N'];

  return null;
}

const ROLE_APPROVALS = [
  { nivel: 1, key: 'role_jefatura', label: 'Jefatura', revision: 'REVISION_DOCENTE_N1' },
  { nivel: 2, key: 'role_decanatura', label: 'Decanatura', revision: 'REVISION_DOCENTE_N2' },
  { nivel: 3, key: 'role_gestion_profesoral', label: 'Gestión Profesoral', revision: 'REVISION_DOCENTE_N3' },
];

const ROLE_APPROVAL_KEYS = new Set(ROLE_APPROVALS.map(item => item.key));
const PENDING_ROLE_APPROVAL_STATES = new Set([
  'PENDIENTE_APROBACION',
  'PENDIENTE_JEFATURA',
  'PENDIENTE_DECANATURA',
  'PENDIENTE_GESTION_PROFESORAL',
]);

const COMPONENT_APPROVAL_KEYS = [
  'academica_pregrado',
  'academica_posgrado',
  'academica_territorial',
  'investigacion',
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
  'complementarias',
  // 'complementarias' es ahora el catch-all "sin programa asociado" (ver
  // clasificarComplementarias); estos dos cubren lo asociado a Pregrado/Posgrado.
  'complementarias_pregrado',
  'complementarias_posgrado',
];

// Tipos de academic_work_plan.programa.tipo que se consideran "posgrado" para
// enrutar Docencia entre los componentes academica_pregrado/academica_posgrado
// (migración 355: pregrado, tecnico_profesional, tecnologico, especializacion,
// maestria, doctorado). El resto (pregrado/tecnico_profesional/tecnologico) cae
// en el bucket "pregrado".
const POSGRADO_PROGRAMA_TIPOS = new Set(['especializacion', 'maestria', 'doctorado']);

// AADM se fusionó dentro de 'complementarias' (sección academico_administrativas).
// Se conserva la clave legacy solo para poder limpiar filas viejas de aprobación.
const LEGACY_COMPONENT_APPROVAL_KEYS = ['academicas_admin'];

// Secciones fijas de Complementarias (espejo de ConfiguracionReglasPTA.tsx FIXED_COMP_SECCIONES).
// Se usan como default del catálogo agrupado cuando la config no trae comp_secciones.
const FIXED_COMP_SECCIONES = [
  { key: 'complementarias_docencia', label: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA', color: '#D97706', orden: 1, multiplicador: 1, columnas: ['_items_'] },
  { key: 'academico_administrativas', label: 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS', color: '#2563EB', orden: 2, multiplicador: 1, columnas: ['_items_'] },
];

const COMPONENT_APPROVAL_KEY_SET = new Set(COMPONENT_APPROVAL_KEYS);

const SOLICITUD_EDICION_TIPO = 'edicion_componentes';
const SOLICITUD_CREACION_TIPO = 'creacion';
const MAX_CARACTERES_JUSTIFICACION_SOLICITUD = 3000;
const SOLICITUD_COMPONENT_KEYS = ['docencia', 'investigacion', 'extension', 'complementarias'] as const;
const SOLICITUD_COMPONENT_KEY_SET = new Set<string>(SOLICITUD_COMPONENT_KEYS);
const SOLICITUD_COMPONENT_APPROVAL_KEYS: Record<string, string[]> = {
  docencia: ['academica_pregrado', 'academica_posgrado', 'academica_territorial'],
  investigacion: ['investigacion'],
  extension: ['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'],
  complementarias: COMPLEMENTARIAS_COMPONENT_KEYS,
};
const ESTADOS_PTA_RESTAURABLES_EDICION = new Set([
  'APROBADO',
  'APROBADO_DEF',
  'EN_FIRME',
  'RADICADO',
  'EN_EJECUCION',
  'FINALIZADO',
  'TERMINADO',
]);
const ESTADOS_SOLICITUD_EDICION_ACTIVA = ['pendiente', 'aprobado', 'en_aprobacion'];

function ptaAdmiteSolicitudEdicion(value: unknown): boolean {
  const estado = normalizeEstadoFilter(value);
  // Una vez enviado, el PTA puede requerir una corrección en cualquier punto
  // de su ciclo. El Borrador no necesita autorización porque todavía es
  // editable directamente por su propietario.
  return Boolean(estado) && estado !== 'BORRADOR';
}

function normalizeSolicitudComponentes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map(item => String(item || '').trim().toLowerCase())
      .filter(item => SOLICITUD_COMPONENT_KEY_SET.has(item)),
  ));
}

function expandSolicitudComponentes(componentes: string[]): string[] {
  return Array.from(new Set(
    componentes.flatMap(componente => SOLICITUD_COMPONENT_APPROVAL_KEYS[componente] || []),
  ));
}

function restoreEstadoDespuesEdicion(value: unknown): string {
  const estado = coalesceString(value) || 'Aprobado';
  const normalized = normalizeEstadoFilter(estado);
  if (ESTADOS_PTA_RESTAURABLES_EDICION.has(normalized)) return estado;
  return 'Aprobado';
}

const EXTENSION_COMPONENT_BY_SECTION: Record<string, string> = {
  capacitacion: 'ext_capacitacion',
  seleccion: 'ext_procesos',
  fortalecimiento: 'ext_fortalecimiento',
  alto_gobierno: 'ext_gobierno',
  laboratorio_innovacion: 'ext_fortalecimiento',
  investigacion_aplicada: 'ext_fortalecimiento',
};

const COMPONENT_REVISION_STATE: Record<string, string> = {
  academica_pregrado: 'REVISION_DOCENTE_N1',
  academica_posgrado: 'REVISION_DOCENTE_N1',
  academica_territorial: 'REVISION_DOCENTE_N1',
  complementarias: 'REVISION_DOCENTE_N1',
  complementarias_pregrado: 'REVISION_DOCENTE_N1',
  complementarias_posgrado: 'REVISION_DOCENTE_N1',
  investigacion: 'REVISION_DOCENTE_N2',
  ext_capacitacion: 'REVISION_DOCENTE_N2',
  ext_procesos: 'REVISION_DOCENTE_N2',
  ext_fortalecimiento: 'REVISION_DOCENTE_N2',
  ext_gobierno: 'REVISION_DOCENTE_N2',
};

// Estados que indican devolución PARCIAL (uno o más componentes devueltos, el resto
// puede seguir aprobado) — a diferencia del estado legacy 'Devuelto' (todo el PTA).
const REVISION_DOCENTE_STATES = new Set(Object.values(COMPONENT_REVISION_STATE));

type ExtensionCatalogActivity = {
  id: string;
  nombre: string;
  items?: Array<{ nombre: string; tipo?: string; horas: number; min?: number }>;
  max_horas?: number;
  min_horas?: number;
};

const FIXED_EXTENSION_SECTIONS = [
  { key: 'capacitacion', label: '3.1.1. Dirección de Capacitación', color: '#059669', orden: 1, multiplicador: 2 },
  { key: 'seleccion', label: '3.1.2. Dirección de Procesos de Selección', color: '#0284C7', orden: 2, multiplicador: 1 },
  { key: 'fortalecimiento', label: '3.1.3. Dirección de Fortalecimiento y Apoyo a la Gestión Estatal', color: '#7C3AED', orden: 3, multiplicador: 1 },
  { key: 'alto_gobierno', label: '3.2. Escuela de Alto Gobierno', color: '#B45309', orden: 4, multiplicador: 1 },
];

const EXTENSION_SECTION_ALIASES: Record<string, string> = {
  laboratorio_innovacion: 'fortalecimiento',
  investigacion_aplicada: 'fortalecimiento',
};

function normalizeExtensionSectionKey(section: unknown): string {
  const key = String(section || '');
  if (FIXED_EXTENSION_SECTIONS.some(s => s.key === key)) return key;
  return EXTENSION_SECTION_ALIASES[key] || 'fortalecimiento';
}

const EXTENSION_ITEMS_COLUMN_KEY = '_items_';

function findReorderedPtaSection(
  previousRules: any,
  nextRules: any,
): string | null {
  const sectionCollections = ['ext_secciones', 'comp_secciones'];
  for (const collectionKey of sectionCollections) {
    const previousSections = Array.isArray(previousRules?.[collectionKey])
      ? previousRules[collectionKey]
      : [];
    const nextSections = Array.isArray(nextRules?.[collectionKey])
      ? nextRules[collectionKey]
      : [];
    const previousByKey = new Map(
      previousSections.map((section: any) => [String(section?.key || ''), section]),
    );
    for (const nextSection of nextSections) {
      const sectionKey = String(nextSection?.key || '');
      const previousSection: any = previousByKey.get(sectionKey);
      if (!previousSection) continue;
      const previousColumns = Array.isArray(previousSection?.columnas)
        ? previousSection.columnas.filter((column: any) => typeof column === 'string')
        : [];
      const nextColumns = Array.isArray(nextSection?.columnas)
        ? nextSection.columnas.filter((column: any) => typeof column === 'string')
        : [];
      const retainedPrevious = previousColumns.filter((column: string) => nextColumns.includes(column));
      const retainedNext = nextColumns.filter((column: string) => previousColumns.includes(column));
      if (JSON.stringify(retainedPrevious) !== JSON.stringify(retainedNext)) {
        return String(nextSection?.label || previousSection?.label || sectionKey || 'Sección');
      }
    }
  }
  return null;
}

function getExtensionItemDetailGroups(item: any, detailColumns: string[]): any[] {
  if (!detailColumns.length) return [];
  const primaryColumn = detailColumns[0];
  const primaryValues = Array.isArray(item?.col_valores?.[primaryColumn])
    ? item.col_valores[primaryColumn]
    : [];
  const groups = primaryValues.map((value: any) => {
    const name = String(value || '').trim();
    return name ? { name, values: [] as Array<{ column: string; value: string }> } : null;
  });

  for (let columnIndex = 1; columnIndex < detailColumns.length; columnIndex += 1) {
    const column = detailColumns[columnIndex];
    const values = Array.isArray(item?.col_valores?.[column]) ? item.col_valores[column] : [];
    const parentIndexes = Array.isArray(item?.col_parents?.[column]) ? item.col_parents[column] : [];
    values.forEach((rawValue: any, valueIndex: number) => {
      const value = String(rawValue || '').trim();
      if (!value) return;
      let primaryIndex = Number(parentIndexes[valueIndex] ?? valueIndex);
      for (let parentColumnIndex = columnIndex - 1; parentColumnIndex > 0; parentColumnIndex -= 1) {
        const parentColumn = detailColumns[parentColumnIndex];
        const ancestors = Array.isArray(item?.col_parents?.[parentColumn]) ? item.col_parents[parentColumn] : [];
        primaryIndex = Number(ancestors[primaryIndex] ?? primaryIndex);
      }
      if (!Number.isInteger(primaryIndex) || primaryIndex < 0 || primaryIndex >= groups.length) return;
      groups[primaryIndex]?.values.push({ column, value });
    });
  }
  return groups.filter((group): group is NonNullable<typeof group> => Boolean(group));
}

type HierarchyBranch = {
  clave: string;
  nombre: string;
  ruta: Array<{ columna: string; valor: string; reconocimiento?: Record<string, any> }>;
};

function normalizeHierarchyKeyPart(value: unknown): string {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'opcion';
}

function getHierarchyGroupSelectionKey(
  levels: Array<{ columna: string; valor: string }>,
): string {
  const path = levels
    .map(level =>
      `${normalizeHierarchyKeyPart(level?.columna)}:${normalizeHierarchyKeyPart(level?.valor)}`,
    )
    .join('/');
  return `grupo:${path}`;
}

function getHierarchySelectionCandidates(branches: HierarchyBranch[]): Map<
  string,
  HierarchyBranch & { isGroup: boolean }
> {
  const candidates = new Map<string, HierarchyBranch & { isGroup: boolean }>();
  branches.forEach(branch => {
    const route = Array.isArray(branch?.ruta) ? branch.ruta : [];
    candidates.set(String(branch?.clave || ''), {
      ...branch,
      ruta: route,
      isGroup: false,
    });
    for (let length = 1; length < route.length; length += 1) {
      const groupRoute = route.slice(0, length);
      const groupKey = getHierarchyGroupSelectionKey(groupRoute);
      if (!candidates.has(groupKey)) {
        candidates.set(groupKey, {
          clave: groupKey,
          nombre: String(groupRoute[groupRoute.length - 1]?.valor || ''),
          ruta: groupRoute,
          isGroup: true,
        });
      }
    }
  });
  candidates.delete('');
  return candidates;
}

function getConfiguredRecognitionSnapshot(
  source: any,
  force = false,
): Record<string, any> | undefined {
  const hasConfiguration = source && typeof source === 'object' && [
    'tipo', 'tipo_horas', 'modalidad_horas', 'horas', 'max_horas',
    'min_horas', 'horas_min', 'min', 'porcentaje_pta', 'porcentaje',
  ].some(key => source[key] !== undefined && source[key] !== null);
  if (!force && !hasConfiguration) return undefined;

  const maximum = Math.max(0, Number(source?.max_horas ?? source?.horas) || 0);
  const minimum = Math.max(0, Number(source?.min_horas ?? source?.horas_min ?? source?.min) || 0);
  const percentage = Math.max(0, Number(source?.porcentaje_pta ?? source?.porcentaje) || 0);
  const rawType = String(source?.tipo || '').trim().toLowerCase();
  const type = rawType === 'sin_horas'
    || rawType === 'fija'
    || rawType === 'hasta'
    || rawType === 'intervalo'
    || rawType === 'porcentaje'
    ? rawType
    : percentage > 0
      ? 'porcentaje'
      : minimum > 0
        ? 'intervalo'
        : maximum > 0
          ? 'hasta'
          : 'sin_horas';
  const snapshot: Record<string, any> = { tipo: type };
  if (type === 'porcentaje' && percentage > 0) snapshot.porcentaje_pta = percentage;
  if (type !== 'sin_horas' && type !== 'porcentaje' && maximum > 0) {
    snapshot.horas = maximum;
    snapshot.max_horas = maximum;
  }
  if (type === 'intervalo' && minimum > 0) {
    snapshot.horas_min = minimum;
    snapshot.min_horas = minimum;
  }
  return snapshot;
}

function getSelectedHierarchyRecognitionEntries(
  candidates: Array<HierarchyBranch & { isGroup: boolean }>,
): Array<{ key: string; source: Record<string, any> }> {
  const entries = new Map<string, { key: string; source: Record<string, any> }>();
  candidates.forEach(candidate => {
    const source = candidate.ruta[candidate.ruta.length - 1]?.reconocimiento;
    if (!source || String(source?.tipo || 'sin_horas').toLowerCase() === 'sin_horas') return;
    if (!entries.has(candidate.clave)) entries.set(candidate.clave, { key: candidate.clave, source });
  });
  return [...entries.values()];
}

function buildHierarchyBranches(
  item: any,
  detailColumns: string[],
  itemColumnLabel = 'Actividad / Ítem',
  includeItem = true,
): HierarchyBranch[] {
  const itemRecognition = getConfiguredRecognitionSnapshot(item);
  const prefix = includeItem && String(item?.nombre || '').trim()
    ? [{
        columna: itemColumnLabel,
        valor: String(item.nombre).trim(),
        ...(itemRecognition ? { reconocimiento: itemRecognition } : {}),
      }]
    : [];
  const valuesByColumn = detailColumns.map(column =>
    (Array.isArray(item?.col_valores?.[column]) ? item.col_valores[column] : [])
      .map((value: any) => String(value || '').trim()),
  );
  const metadataByColumn = detailColumns.map(column =>
    Array.isArray(item?.col_meta?.[column]) ? item.col_meta[column] : [],
  );
  const parentsByColumn = detailColumns.map((column, level) => {
    if (level === 0) return [];
    const previousCount = valuesByColumn[level - 1].length;
    return valuesByColumn[level].map((_: string, index: number) => {
      const stored = item?.col_parents?.[column]?.[index];
      const fallback = previousCount > 0 ? Math.min(index, previousCount - 1) : -1;
      const candidate = Number.isFinite(Number(stored)) ? Number(stored) : fallback;
      return previousCount > 0 ? Math.max(0, Math.min(candidate, previousCount - 1)) : -1;
    });
  });
  const branches: Array<{ nombre: string; ruta: HierarchyBranch['ruta'] }> = [];

  const visit = (
    level: number,
    parentIndex: number | null,
    path: HierarchyBranch['ruta'],
  ) => {
    if (level >= detailColumns.length) {
      if (path.length > prefix.length) {
        branches.push({ nombre: path[path.length - 1].valor, ruta: path });
      }
      return;
    }
    const column = detailColumns[level];
    const indexes = valuesByColumn[level]
      .map((_: string, index: number) => index)
      .filter(index => {
        if (!valuesByColumn[level][index]) return false;
        if (level === 0 || parentIndex === null) return true;
        return parentsByColumn[level][index] === parentIndex;
      });
    if (indexes.length === 0) {
      if (path.length > prefix.length) {
        branches.push({ nombre: path[path.length - 1].valor, ruta: path });
      }
      return;
    }
    indexes.forEach(index => {
      const metadata = metadataByColumn[level][index];
      visit(
        level + 1,
        index,
        [...path, {
          columna: column,
          valor: valuesByColumn[level][index],
          ...(metadata && typeof metadata === 'object'
            ? { reconocimiento: { ...metadata, tipo: String(metadata.tipo || 'sin_horas') } }
            : {}),
        }],
      );
    });
  };

  if (detailColumns.length > 0) visit(0, null, prefix);
  if (branches.length === 0 && prefix.length > 0) {
    branches.push({ nombre: prefix[0].valor, ruta: prefix });
  }

  const occurrences = new Map<string, number>();
  return branches.map(branch => {
    const base = branch.ruta
      .map(value => `${normalizeHierarchyKeyPart(value.columna)}:${normalizeHierarchyKeyPart(value.valor)}`)
      .join('/');
    const occurrence = (occurrences.get(base) || 0) + 1;
    occurrences.set(base, occurrence);
    return { ...branch, clave: `${base}#${occurrence}` };
  });
}

function getStableCatalogRowDescriptors(rows: any[]): Array<{ row: any; index: number; key: string }> {
  const occurrences = new Map<string, number>();
  return rows.map((row, index) => {
    const explicitKey = String(row?.clave ?? row?.id ?? row?.key ?? '').trim();
    if (explicitKey && String(row?.clave || '').trim()) {
      return { row, index, key: explicitKey };
    }
    const base = explicitKey
      ? `id:${explicitKey}`
      : `nombre:${normalizeHierarchyKeyPart(row?.nombre || `fila-${index + 1}`)}`;
    const occurrence = (occurrences.get(base) || 0) + 1;
    occurrences.set(base, occurrence);
    return { row, index, key: `${base}#${occurrence}` };
  });
}

function getExtensionCatalogHourRows(activity: any, section: any): any[] {
  const columns = Array.isArray(section?.columnas) ? section.columnas : undefined;
  if (columns && columns.length > 0 && columns[0] !== EXTENSION_ITEMS_COLUMN_KEY) {
    const controllingColumn = columns[0];
    const itemsPosition = columns.indexOf(EXTENSION_ITEMS_COLUMN_KEY);
    const detailColumns = itemsPosition >= 0 ? columns.slice(itemsPosition + 1) : [];
    const values = Array.isArray(activity?.columnas_valores?.[controllingColumn])
      ? activity.columnas_valores[controllingColumn]
      : [];
    const metadata = Array.isArray(activity?.columnas_meta?.[controllingColumn])
      ? activity.columnas_meta[controllingColumn]
      : [];
    const items = Array.isArray(activity?.items) ? activity.items : [];
    const rows: any[] = [];
    const rowCount = Math.max(values.length, metadata.length);
    const itemColumnLabel = String(section?.columna_items_nombre || 'Actividad / Ítem').trim();
    const decorateItem = (item: any) => ({
      ...item,
      _detailValues: detailColumns.flatMap((column: string) => {
        const columnValues = Array.isArray(item?.col_valores?.[column]) ? item.col_valores[column] : [];
        return columnValues
          .filter((value: any) => String(value || '').trim())
          .map((value: any) => ({ column, value: String(value) }));
      }),
      _ramificaciones: buildHierarchyBranches(item, detailColumns, itemColumnLabel, true),
    });
    for (let index = 0; index < rowCount; index += 1) {
      const meta = metadata[index] || {};
      const rowName = String(values[index] || meta?.nombre || `Fila ${index + 1}`);
      const childItems = items
        .filter((item: any) => Number(item?.parent_col_idx ?? 0) === index)
        .map(decorateItem);
      if (String(meta?.horas_en || 'linea') === 'actividad') {
        childItems.forEach((item: any) => rows.push({
          ...item,
          nombre: `${rowName} — ${String(item?.nombre || 'Actividad')}`,
          _detailGroups: [{ name: String(item?.nombre || 'Actividad'), values: item._detailValues || [] }],
          _ramificaciones: buildHierarchyBranches(item, detailColumns, itemColumnLabel, false),
        }));
      } else {
        rows.push({
          ...meta,
          nombre: rowName,
          _detailGroups: childItems.map((item: any) => ({
            name: String(item?.nombre || 'Actividad'),
            values: item._detailValues || [],
          })),
          _ramificaciones: childItems.flatMap((item: any) => item._ramificaciones || []),
        });
      }
    }
    return rows;
  }
  if (columns && columns.length === 0) return [];
  if (Array.isArray(activity?.items)) {
    const detailColumns = columns && columns[0] === EXTENSION_ITEMS_COLUMN_KEY
      ? columns.slice(1)
      : [];
    const itemColumnLabel = String(section?.columna_items_nombre || 'Actividad / Ítem').trim();
    return activity.items.map((item: any) => ({
      ...item,
      _detailGroups: getExtensionItemDetailGroups(item, detailColumns),
      _ramificaciones: buildHierarchyBranches(item, detailColumns, itemColumnLabel, false),
    }));
  }
  return [];
}

function isConfiguredHourRow(row: any): boolean {
  const type = String(row?.tipo || 'hasta').toLowerCase();
  if (type === 'sin_horas') return false;
  if (type === 'porcentaje') {
    const percentage = Number(row?.porcentaje_pta);
    return Number.isFinite(percentage) && percentage > 0;
  }
  const hours = Number(row?.horas ?? row?.max_horas);
  return Number.isFinite(hours) && hours > 0;
}

/**
 * Resume la estructura jerárquica de Complementarias en la restricción plana
 * que consume el docente. El ID identifica el bloque, pero nunca determina sus
 * horas ni el tipo de reconocimiento.
 */
function flattenConfiguredComplementaryActivity(
  activity: any,
  section: any,
  fullPTAFromPercentage = false,
): any {
  const columns = Array.isArray(section?.columnas) ? section.columnas : undefined;
  const usesStructuredRows = Array.isArray(columns)
    ? columns.length > 0
    : Array.isArray(activity?.items);
  const configuredRows = usesStructuredRows
    ? getExtensionCatalogHourRows(activity, section).filter((row: any) =>
        isConfiguredHourRow(row)
        || (String(row?.tipo || '').toLowerCase() === 'sin_horas'
          && Boolean(String(row?.nombre || '').trim())))
    : [];
  const hourRows = configuredRows.filter(isConfiguredHourRow);

  const rowMax = (row: any) => Math.max(0, Number(row?.horas ?? row?.max_horas) || 0);
  const rowMin = (row: any, allowOptionalUntil = false) => {
    const type = String(row?.tipo || 'hasta').toLowerCase();
    if (type === 'fija') return rowMax(row);
    if (type === 'intervalo') {
      return Math.min(rowMax(row), Math.max(1, Number(row?.horas_min ?? row?.min_horas ?? row?.min) || 1));
    }
    if (type === 'hasta' && allowOptionalUntil) return 0;
    return rowMax(row) > 0 ? 1 : 0;
  };

  let source: any = activity;
  if (usesStructuredRows && hourRows.length === 0) {
    source = { tipo: 'sin_horas', max_horas: 0 };
  } else if (hourRows.length === 1) {
    source = hourRows[0];
  } else if (hourRows.length > 1) {
    const types = hourRows.map((row: any) => String(row?.tipo || 'hasta').toLowerCase());
    const allFixed = types.every((type: string) => type === 'fija');
    const allPercentage = types.every((type: string) => type === 'porcentaje');
    const maxHours = hourRows.reduce((sum: number, row: any) => sum + rowMax(row), 0);
    const minHours = hourRows.reduce(
      (sum: number, row: any) => sum + rowMin(row, hourRows.length > 1),
      0,
    );
    source = allPercentage
      ? {
          tipo: 'porcentaje',
          porcentaje_pta: hourRows.reduce(
            (sum: number, row: any) => sum + Math.max(0, Number(row?.porcentaje_pta) || 0),
            0,
          ),
        }
      : {
          tipo: allFixed ? 'fija' : 'intervalo',
          horas: maxHours,
          horas_min: allFixed ? maxHours : Math.max(1, minHours),
        };
  }

  const type = String(source?.tipo || activity?.tipo || 'hasta').toLowerCase();
  const maxHours = source?.max_horas ?? source?.horas ?? activity?.max_horas ?? 0;
  const minHours = source?.min_horas ?? source?.horas_min ?? source?.min ?? activity?.min_horas;
  const percentage = source?.porcentaje_pta ?? activity?.porcentaje_pta;
  const consumesFullPTA = Boolean(activity?.consumeTotalidad) || (
    fullPTAFromPercentage
    && type === 'porcentaje'
    && Math.min(100, Math.max(1, Number(percentage) || 1)) === 100
  );
  const recognitionKeyOccurrences = new Map<string, number>();
  const recognitionRows = configuredRows.map((row: any, rowIndex: number) => {
    const rowType = String(row?.tipo || 'hasta').toLowerCase();
    const max = rowMax(row);
    const explicitKey = String(row?.id ?? row?.key ?? '').trim();
    const normalizedName = String(row?.nombre || `fila-${rowIndex + 1}`)
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-');
    const keyBase = explicitKey ? `id:${explicitKey}` : `nombre:${normalizedName || 'fila'}`;
    const occurrence = (recognitionKeyOccurrences.get(keyBase) || 0) + 1;
    recognitionKeyOccurrences.set(keyBase, occurrence);
    return {
      // La clave permite conservar las cantidades del docente aunque el administrador
      // reordene filas. Si no existe ID persistido, nombre + ocurrencia es estable.
      clave: `${keyBase}#${occurrence}`,
      nombre: row?.nombre,
      tipo: rowType,
      max_horas: rowType === 'porcentaje' ? null : max,
      min_horas: rowType === 'intervalo' ? rowMin(row) : undefined,
      porcentaje_pta: rowType === 'porcentaje'
        ? Math.min(100, Math.max(1, Number(row?.porcentaje_pta) || 1))
        : undefined,
      ramificaciones: Array.isArray(row?._ramificaciones)
        ? row._ramificaciones.map((branch: any) => ({
            clave: String(branch?.clave || ''),
            nombre: String(branch?.nombre || ''),
            ruta: Array.isArray(branch?.ruta)
              ? branch.ruta.map((value: any) => ({
                  columna: String(value?.columna || ''),
                  valor: String(value?.valor || ''),
                  ...(value?.reconocimiento && typeof value.reconocimiento === 'object'
                    ? { reconocimiento: { ...value.reconocimiento } }
                    : {}),
                }))
              : [],
          }))
        : [],
    };
  });

  return {
    id: activity?.id,
    nombre: activity?.nombre,
    max_horas: consumesFullPTA || type === 'porcentaje' ? null : Math.max(0, Number(maxHours) || 0),
    min_horas: type === 'intervalo'
      ? Math.min(Math.max(0, Number(maxHours) || 0), Math.max(1, Number(minHours) || 1))
      : undefined,
    tipo: type,
    porcentaje_pta: type === 'porcentaje'
      ? Math.min(100, Math.max(1, Number(percentage) || 1))
      : undefined,
    // Permite calcular correctamente bloques que mezclan, por ejemplo, una fila
    // fija con otra porcentual. El resumen plano se conserva por compatibilidad.
    filas_reconocimiento: recognitionRows,
    requiere_seleccion_jerarquica: recognitionRows.length > 0,
    consumeTotalidad: consumesFullPTA,
    // Programa asociado a este TIPO de actividad (config-driven, no por instancia):
    // 'pregrado' | 'posgrado' | ausente = sin programa. Enruta la aprobación/revisión
    // a complementarias_pregrado / complementarias_posgrado / complementarias (catch-all).
    nivel_programa: normalizeNivelProgramaComplementaria(activity?.nivel_programa),
  };
}

function normalizeNivelProgramaComplementaria(value: unknown): 'pregrado' | 'posgrado' | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'pregrado' || normalized === 'posgrado' ? normalized : undefined;
}

function normalizeExtensionSections(raw: any): any[] {
  const savedByKey = new Map<string, any>();
  if (Array.isArray(raw)) {
    for (const section of raw) {
      const key = normalizeExtensionSectionKey(section?.key);
      if (!savedByKey.has(key)) savedByKey.set(key, section);
    }
  }

  return FIXED_EXTENSION_SECTIONS.map(section => {
    const previous = savedByKey.get(section.key);
    const savedMult = Number(previous?.multiplicador);
    return {
      ...section,
      color: previous?.color || section.color,
      columnas: Array.isArray(previous?.columnas) ? previous.columnas : (section as any).columnas,
      columna_raiz_nombre: previous?.columna_raiz_nombre || (section as any).columna_raiz_nombre || 'Componente',
      columna_raiz_habilitada: previous?.columna_raiz_habilitada ?? (section as any).columna_raiz_habilitada ?? true,
      columna_items_nombre: previous?.columna_items_nombre || (section as any).columna_items_nombre || 'Actividad / Ítem',
      // El multiplicador (×Factor) es configurable por el admin y debe persistir en guardado/lectura.
      multiplicador: Number.isFinite(savedMult) && savedMult > 0 ? savedMult : section.multiplicador,
    };
  });
}

function canonicalizeExtensionActivities(raw: any): Record<string, any[]> {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: Record<string, any[]> = {};

  for (const [sectionKey, value] of Object.entries(source)) {
    if (!Array.isArray(value)) continue;
    const targetKey = normalizeExtensionSectionKey(sectionKey);
    const bucket = result[targetKey] || (result[targetKey] = []);
    // De-duplicar por id al fusionar: varias claves/alias legacy (p.ej.
    // laboratorio_innovacion, investigacion_aplicada → fortalecimiento) pueden
    // aportar la MISMA actividad, dejando ids repetidos (LAB_12, etc.) que rompían
    // el dropdown (React keys duplicadas) y la selección. Se conserva la primera.
    const seen = new Set(
      bucket.map((a: any) => String(a?.id ?? '')).filter(Boolean),
    );
    for (const act of value) {
      const id = String(act?.id ?? '');
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      bucket.push({ ...act });
    }
  }

  return result;
}

const EXTENSION_ACTIVITY_COMPLETIONS: Record<string, ExtensionCatalogActivity[]> = {
  laboratorio_innovacion: [
    { id: 'LAB_01', nombre: 'Componente Fijo — Espacios de participación y representación', max_horas: 100, items: [{ nombre: 'Participación, representación y apoyo al Laboratorio', tipo: 'hasta', horas: 100 }] },
    { id: 'LAB_02', nombre: 'Componente Fijo — Aspectos administrativos y gestión', max_horas: 120, items: [{ nombre: 'Coordinación, planeación, seguimiento y control del Laboratorio', tipo: 'hasta', horas: 120 }] },
    { id: 'LAB_03', nombre: 'Componente Variable — Elaborar documentos técnicos en el marco de las iniciativas', max_horas: 80, items: [{ nombre: 'Documento técnico académico elaborado', tipo: 'hasta', horas: 80 }] },
    { id: 'LAB_04', nombre: 'Componente Variable — Preparar y compilar documentos técnicos para publicación', max_horas: 40, items: [{ nombre: 'Documento técnico preparado o compilado', tipo: 'hasta', horas: 40 }] },
    { id: 'LAB_05', nombre: 'Componente Variable — Elaborar documentos soporte de ejecución de iniciativas', max_horas: 80, items: [{ nombre: 'Documento soporte de ejecución', tipo: 'hasta', horas: 80 }] },
    { id: 'LAB_06', nombre: 'Componente Variable — Diseñar, ejecutar y/o liderar iniciativas innovadoras', max_horas: 120, items: [{ nombre: 'Informe académico de ejecución de la iniciativa', tipo: 'hasta', horas: 120 }] },
    { id: 'LAB_07', nombre: 'Componente Variable — Ejecutar trabajo de campo', max_horas: 40, items: [{ nombre: 'Informe ejecutivo del trabajo de campo', tipo: 'hasta', horas: 40 }] },
    { id: 'LAB_08', nombre: 'Componente Variable — Acompañamiento en planeación de eventos', max_horas: 20, items: [{ nombre: 'Acompañamiento y planeación de eventos', tipo: 'hasta', horas: 20 }] },
    { id: 'LAB_09', nombre: 'Componente Variable — Acompañamiento en trabajo de campo', max_horas: 40, items: [{ nombre: 'Acompañamiento y planeación del trabajo de campo', tipo: 'hasta', horas: 40 }] },
    { id: 'LAB_10', nombre: 'Componente Variable — Representar a la ESAP en espacios consultivos', max_horas: 20, items: [{ nombre: 'Representación institucional en espacios consultivos', tipo: 'hasta', horas: 20 }] },
    { id: 'LAB_11', nombre: 'Componente Variable — Charlas y conferencias (formación)', max_horas: 20, items: [{ nombre: 'Charlas, conferencias o paneles de formación', tipo: 'hasta', horas: 20 }] },
    { id: 'LAB_12', nombre: 'Componente Variable — Coordinar enlace de capacitación en temáticas del Lab.', max_horas: 60, items: [{ nombre: 'Coordinación y enlace de iniciativas de capacitación', tipo: 'hasta', horas: 60 }] },
    { id: 'LAB_13', nombre: 'Componente Variable — Diseño de estrategias de gestión social del conocimiento', max_horas: 60, items: [{ nombre: 'Documento de estrategia e informe de gestión', tipo: 'hasta', horas: 60 }] },
  ],
  investigacion_aplicada: [
    { id: 'INV_AP_01', nombre: 'Documentos técnicos (informe, análisis temático)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Documento técnico', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_02', nombre: 'Plan de Trabajo de Investigación Aplicada', min_horas: 2, max_horas: 6, items: [{ nombre: 'Plan de trabajo', tipo: 'intervalo', min: 2, horas: 6 }] },
    { id: 'INV_AP_03', nombre: 'Productos de Generación de Nuevo Conocimiento (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de generación de nuevo conocimiento', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_04', nombre: 'Productos de Desarrollo Tecnológico e Innovación (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de desarrollo tecnológico e innovación', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_05', nombre: 'Productos de Apropiación Social del Conocimiento (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de apropiación social del conocimiento', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_06', nombre: 'Productos de Formación de Recurso Humano para CTeI (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de formación de recurso humano para CTeI', tipo: 'intervalo', min: 40, horas: 60 }] },
    { id: 'INV_AP_07', nombre: 'Asistencia a eventos académicos / representación Grupo Inv. Aplicada', max_horas: 8, items: [{ nombre: 'Asistencia o representación académica', tipo: 'hasta', horas: 8 }] },
    { id: 'INV_AP_08', nombre: 'Procesos de evaluación de desempeño y productos', max_horas: 4, items: [{ nombre: 'Evaluación de desempeño o productos generados', tipo: 'hasta', horas: 4 }] },
  ],
  alto_gobierno: [
    { id: 'EAG_01', nombre: 'Coaching directivo', min_horas: 80, max_horas: 200, items: [{ nombre: 'Coaching directivo', tipo: 'intervalo', min: 80, horas: 200 }] },
    { id: 'EAG_02', nombre: 'Formación estratégica a la alta gerencia', min_horas: 80, max_horas: 200, items: [{ nombre: 'Diseño y formación estratégica', tipo: 'intervalo', min: 80, horas: 200 }] },
    { id: 'EAG_03', nombre: 'Gestión del conocimiento', min_horas: 80, max_horas: 200, items: [{ nombre: 'Diseño y formación en gestión del conocimiento', tipo: 'intervalo', min: 80, horas: 200 }] },
    { id: 'EAG_04', nombre: 'Desarrollo de contenidos', min_horas: 40, max_horas: 120, items: [{ nombre: 'Diseño y desarrollo de contenidos', tipo: 'intervalo', min: 40, horas: 120 }] },
  ],
};

function isRoleApprovalComponent(componente?: string | null): boolean {
  return ROLE_APPROVAL_KEYS.has(String(componente || ''));
}

function componentKeyForExtensionSection(section: unknown): string {
  return EXTENSION_COMPONENT_BY_SECTION[normalizeExtensionSectionKey(section)] || 'ext_fortalecimiento';
}

function isPendingRoleApprovalState(estado?: string | null): boolean {
  return PENDING_ROLE_APPROVAL_STATES.has(normalizeEstadoFilter(estado));
}

function isDraftPtaState(estado?: string | null): boolean {
  return normalizeEstadoFilter(estado) === 'BORRADOR';
}

function pendingApprovalState(estado?: string | null): string {
  return normalizeEstadoFilter(estado) === 'PENDIENTE_APROBACION'
    ? 'Pendiente Jefatura'
    : (coalesceString(estado) || 'Pendiente Jefatura');
}

function roleApprovalMetaByLevel(nivel: number) {
  return ROLE_APPROVALS.find(item => item.nivel === nivel);
}

function approvalLevelFromRole(role?: string | null): number {
  const key = normalizeEstadoFilter(role);
  if (key.includes('JEFATURA')) return 1;
  if (key.includes('DECAN')) return 2;
  if (key.includes('GESTION_PROFESORAL') || key.includes('GESTION_PROF') || key.includes('PROFESORAL')) return 3;
  return 0;
}

@Injectable()
export class PtaService {
  private readonly otpStore = new Map<string, { code: string; expiresAt: Date }>();
  private readonly logger = new Logger(PtaService.name);

  // Timestamp del último barrido de PTAs vencidos (para throttling del sweep perezoso).
  private lastPurgeAt = 0;

  // MOCK de firma OTP: mientras esté activo, cualquier código de 6 dígitos es válido
  // para avanzar (no se valida contra el código generado). Se desactiva con
  // PTA_MOCK_FIRMA_OTP=false. Por ahora viene mockeado por defecto para pruebas.
  private readonly MOCK_FIRMA_OTP = process.env.PTA_MOCK_FIRMA_OTP !== 'false';

  constructor(
    @InjectRepository(PlanTrabajoAcademicoEntity)
    private readonly ptaRepo: Repository<PlanTrabajoAcademicoEntity>,
    @InjectRepository(HistorialEstadoPtaEntity)
    private readonly historialRepo: Repository<HistorialEstadoPtaEntity>,
    @InjectRepository(PtaEvidenciaEntity)
    private readonly evidenciaRepo: Repository<PtaEvidenciaEntity>,
    @InjectRepository(SolicitudPtaEntity)
    private readonly solicitudRepo: Repository<SolicitudPtaEntity>,
    @InjectRepository(PtaConfiguracionEntity)
    private readonly configuracionRepo: Repository<PtaConfiguracionEntity>,
    @InjectRepository(PtaUserDataEntity)
    private readonly userDataRepo: Repository<PtaUserDataEntity>,
    @InjectRepository(ProgramaEntity)
    private readonly programaRepo: Repository<ProgramaEntity>,
    @InjectRepository(AsignaturaEntity)
    private readonly asignaturaRepo: Repository<AsignaturaEntity>,
    @InjectRepository(TerritorialEntity)
    private readonly territorialRepo: Repository<TerritorialEntity>,
    @InjectRepository(SedeEntity)
    private readonly sedeRepo: Repository<SedeEntity>,
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(AprobacionJefaturaEntity)
    private readonly aprobacionJefaturaRepo: Repository<AprobacionJefaturaEntity>,
    @InjectRepository(PtaEventoEntity)
    private readonly eventoRepo: Repository<PtaEventoEntity>,
    @InjectRepository(PtaComponentApprovalEntity)
    private readonly ptaComponentApprovalRepo: Repository<PtaComponentApprovalEntity>,
    @InjectRepository(PtaComponentReviewEntity)
    private readonly ptaComponentReviewRepo: Repository<PtaComponentReviewEntity>,
    @InjectRepository(PtaTerritorialApprovalEntity)
    private readonly ptaTerritorialApprovalRepo: Repository<PtaTerritorialApprovalEntity>,
    @InjectRepository(PtaTerritorialReviewEntity)
    private readonly ptaTerritorialReviewRepo: Repository<PtaTerritorialReviewEntity>,
    private readonly ptaNotifications: PtaNotificationsService,
  ) {}

  private safeUsuario(usuario: any) {
    if (!usuario || typeof usuario !== 'object') return null;
    const { password: _pw, ...rest } = usuario as any;
    return rest;
  }

  private readonly columnCache = new Map<string, boolean>();

  private async hasColumn(schema: string, table: string, column: string): Promise<boolean> {
    const cacheKey = `${schema}.${table}.${column}`;
    const cached = this.columnCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const rows = await this.ptaRepo.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
         AND column_name = $3
       LIMIT 1`,
      [schema, table, column],
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  private async fetchAuthDocenteInfo(docenteKey: string, options?: { adminEdit?: boolean }): Promise<{ personId: string, email: string | null, fullName: string }> {
    const key = coalesceString(docenteKey);
    if (!key) throw new BadRequestException('docente_id es requerido');

    const [personasHasIdPerson, personasHasIdTercero, userHasIdPerson, userHasIdTercero] = await Promise.all([
      this.hasColumn('auth', 'personas', 'id_person'),
      this.hasColumn('auth', 'personas', 'id_tercero'),
      this.hasColumn('auth', 'user', 'id_person'),
      this.hasColumn('auth', 'user', 'id_tercero'),
    ]);

    let joinUserPersonas: string;
    if (personasHasIdPerson && userHasIdPerson) {
      joinUserPersonas = `u.id_person = p.id_person`;
    } else if (personasHasIdTercero && userHasIdTercero) {
      joinUserPersonas = `u.id_tercero = p.id_tercero`;
    } else {
      throw new BadRequestException(
        'No se pudo resolver el esquema auth: faltan columnas para relacionar auth."user" con auth.personas.',
      );
    }

    const keyPredicates = [
      personasHasIdPerson ? `p.id_person::text = $1` : null,
      personasHasIdTercero ? `p.id_tercero::text = $1` : null,
      `u.id_user::text = $1`,
    ].filter(Boolean);

    const roleFilter = options?.adminEdit
      ? ''
      : `JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
      JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
        AND (UPPER(COALESCE(r.code, '')) = 'DOCENTE' OR UPPER(COALESCE(r.name, '')) = 'DOCENTE')`;

    const sql = `
      SELECT
        ${personasHasIdPerson ? 'p.id_person::text' : 'NULL'} as person_id,
        ${personasHasIdTercero ? 'p.id_tercero::text' : 'NULL'} as tercero_id,
        p.dir_email as email,
        p.nom_largo as nom_largo,
        p.nom_tercero as primer_nombre,
        NULL as segundo_nombre,
        p.pri_apellido as primer_apellido,
        p.seg_apellido as segundo_apellido
      FROM auth.personas p
      JOIN auth."user" u ON ${joinUserPersonas}
      ${roleFilter}
      WHERE (${keyPredicates.join(' OR ')})
      LIMIT 1
    `;

    const rows = await this.ptaRepo.query(sql, [key]);
    const authRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!authRow) {
      if (options?.adminEdit) {
        // No está en auth.personas pero es una edición admin: usar el key directamente
        // para que resolveDocenteCompleto lo busque en academic_work_plan."Docente"
        return { personId: key, email: null, fullName: 'Docente ESAP' };
      }
      throw new BadRequestException('La persona no tiene el rol DOCENTE (auth.role.code) o no existe en auth.personas.');
    }

    const personId = coalesceString(authRow.person_id, authRow.tercero_id) || key;
    const email = coalesceString(authRow.email);
    // Preferir nom_largo (nombre completo) sobre la concatenación de campos parciales
    const fullNameFromParts = [
      authRow.primer_nombre,
      authRow.segundo_nombre,
      authRow.primer_apellido,
      authRow.segundo_apellido,
    ].filter(Boolean).join(' ');
    const fullName = coalesceString(authRow.nom_largo, fullNameFromParts) || 'Docente ESAP';

    return { personId, email, fullName };
  }

  private async resolveDocenteCompleto(docenteKey: string, options?: { fallbackTerritorial?: string; adminEdit?: boolean; periodo?: string }): Promise<{ personId: string, email: string | null, fullName: string }> {
    // Los llamadores históricos no siempre usan el mismo identificador: el portal
    // envía id_person/id_user, mientras que un PTA ya persistido guarda el id de la
    // fila academic_work_plan."Docente". Antes, al editar un PTA existente, ese id
    // interno se buscaba directamente en auth.personas y producía el falso mensaje
    // "no tiene el rol DOCENTE". Normalizar primero a personaId permite aceptar de
    // forma segura cualquiera de los identificadores sin relajar la validación del rol.
    const docenteByInternalId = await this.docenteRepo
      .createQueryBuilder('d')
      .where('d.id::text = :docenteKey', { docenteKey })
      .getOne();
    const authDocenteKey = coalesceString(docenteByInternalId?.personaId) || docenteKey;

    const { personId, email, fullName } = await this.fetchAuthDocenteInfo(authDocenteKey, { adminEdit: options?.adminEdit });

    // Mapear a academic_work_plan."Docente" (para mantener compatibilidad con FK de PTA).
    // Se prioriza la vinculacion oficial del periodo sobre un registro dummy antiguo
    // cuyo id pudo quedar igual al personaId con 800h por defecto. Ese caso producia
    // duplicados en Banco de Docentes y hacia que el PTA ignorara el registro de 720h.
    const byPersonaQb = this.docenteRepo
      .createQueryBuilder('d')
      .where('d."personaId"::text = :personId', { personId });
    if (options?.periodo) {
      byPersonaQb
        .orderBy('CASE WHEN d."periodoCarga" = :periodo THEN 0 ELSE 1 END', 'ASC')
        .setParameter('periodo', options.periodo);
    } else {
      byPersonaQb.orderBy('CASE WHEN d."periodoCarga" IS NOT NULL THEN 0 ELSE 1 END', 'ASC');
    }
    const byPersonaId = await byPersonaQb
      .addOrderBy('CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('d."updatedAt"', 'DESC')
      .getOne();
    if (byPersonaId) return { personId: byPersonaId.id, email, fullName };

    const byId = await this.docenteRepo.findOne({ where: { id: personId } as any });
    if (byId) return { personId: byId.id, email, fullName };

    if (email) {
      const byCorreo = await this.docenteRepo.findOne({ where: { correoInstitucional: email } as any });
      if (byCorreo) return { personId: byCorreo.id, email, fullName };

      // Buscar por email en auth.personas → academic_work_plan."Docente"
      const byUsuarioEmail = await this.docenteRepo
        .createQueryBuilder('d')
        .where(
          `EXISTS (
            SELECT 1
            FROM auth.personas p
            WHERE p.id_person = d."personaId"
              AND LOWER(p.dir_email) = LOWER(:email)
          )`,
          { email },
        )
        .getOne();
      if (byUsuarioEmail) return { personId: byUsuarioEmail.id, email, fullName };
    }

    // Buscar por num_identificacion en auth.personas vs identificacion en academic_work_plan."Persona"
    const authPersonaRows = await this.ptaRepo.manager.query(
      `SELECT p.num_identificacion FROM auth.personas p WHERE p.id_person = $1 LIMIT 1`,
      [personId],
    );
    if (authPersonaRows?.length > 0) {
      const numId = authPersonaRows[0]?.num_identificacion;
      if (numId) {
        const byDoc = await this.docenteRepo
          .createQueryBuilder('d')
          .where(
            `EXISTS (
              SELECT 1
              FROM academic_work_plan."Persona" p
              WHERE p.id = d."personaId"::text
                AND p.identificacion = :numId
            )`,
            { numId },
          )
          .getOne();
        if (byDoc) return { personId: byDoc.id, email, fullName };
      }
    }

    // Si no existe, auto-aprovisionamos el docente para no violar la FK al guardar el PTA
    const fallbackTerritorial = options?.fallbackTerritorial || (await this.ptaRepo.manager.query(`SELECT id_seccional::text AS id FROM auth.seccionales LIMIT 1`))?.[0]?.id;

    if (fallbackTerritorial) {
      console.warn(`[PTA] Auto-aprovisionando Docente ${personId} en academic_work_plan."Docente" para evitar error de FK.`);
      try {
        const usuarioRepo = this.ptaRepo.manager.getRepository(UsuarioEntity);
        // Usar upsert para evitar QueryFailedError por duplicidad de llaves en condiciones de carrera
        const now = new Date();
        await usuarioRepo.upsert({ id: personId, email: email || 'docente@esap.edu.co', password: 'N/A', updatedAt: now, createdAt: now }, ['id']);

        const personaRepoLocal = this.ptaRepo.manager.getRepository(PersonaEntity);
        // Buscar primero por usuarioId para evitar violación del constraint UNIQUE(usuarioId)
        const personaExistente = await personaRepoLocal.findOne({ where: { usuarioId: personId } as any });
        if (!personaExistente) {
          await personaRepoLocal.upsert({ id: personId, usuarioId: personId, updatedAt: now, createdAt: now }, ['id']);
        }

        const nuevoDocente = this.docenteRepo.create({
          id: personId,
          personaId: personId,
          territorialId: fallbackTerritorial,
          tipoVinculacion: 'CARRERA_003',
          dedicacion: 'Tiempo Completo',
          estado: 'ACTIVO',
          horasAsignables: 800,
          correoInstitucional: email,
          updatedAt: now,
          createdAt: now,
        });
        await this.docenteRepo.upsert(nuevoDocente, ['id']);
        return { personId, email, fullName };
      } catch (err) {
        console.error('[PTA] Error aprovisionando docente dummy:', err);
      }
    }

    console.warn(
      `[PTA] Persona ${personId} tiene rol DOCENTE en auth, pero no se encontró mapeo en academic_work_plan."Docente". Usando personId como docenteId.`,
    );
    return { personId, email, fullName };
  }

  // Cache de resolución de docente (TTL 30s) para evitar queries repetidas en la misma sesión
  private readonly docenteCache = new Map<string, { result: { personId: string; email: string | null; fullName: string }; expiresAt: number }>();

  private async resolveDocenteIdCached(docenteKey: string, options?: { fallbackTerritorial?: string; adminEdit?: boolean; periodo?: string }): Promise<{ personId: string; email: string | null; fullName: string }> {
    const cacheKey = `${docenteKey}:${options?.adminEdit ? 'admin' : 'normal'}:${options?.periodo || ''}`;
    const cached = this.docenteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const result = await this.resolveDocenteCompleto(docenteKey, options);
    this.docenteCache.set(cacheKey, { result, expiresAt: Date.now() + 30_000 });
    return result;
  }

  private async resolveDocenteId(docenteKey: string, options?: { fallbackTerritorial?: string; periodo?: string }): Promise<string> {
    const res = await this.resolveDocenteIdCached(docenteKey, options);
    return res.personId;
  }

  /** Vinculaciones históricas que pertenecen a la misma persona. Un docente puede
   * tener una fila distinta por periodo; la identidad funcional sigue siendo una. */
  private async resolveDocenteIdentityIds(
    docenteKey: string,
    options?: { fallbackTerritorial?: string; periodo?: string },
  ): Promise<string[]> {
    const resolved = await this.resolveDocenteId(docenteKey, options);
    const base = await this.docenteRepo.findOne({ where: { id: resolved } as any });
    if (!base?.personaId) return [resolved];
    const vinculaciones = await this.docenteRepo.find({
      where: { personaId: base.personaId } as any,
      select: { id: true } as any,
    });
    return Array.from(new Set([resolved, ...vinculaciones.map(row => row.id).filter(Boolean)]));
  }

  /**
   * Obtiene la bolsa autoritativa del Banco de Docentes. El valor enviado por el
   * navegador solo se conserva como compatibilidad para registros legacy que aun
   * no tengan una vinculacion en academic_work_plan."Docente".
   */
  private async resolveHorasAProgramar(
    docenteId: string,
    input: any,
    legacyFallback?: number,
  ): Promise<number> {
    let docente = docenteId
      ? await this.docenteRepo.findOne({ where: { id: docenteId } as any })
      : null;
    // Un PTA legacy puede seguir apuntando al registro dummy de 800h aunque la
    // misma persona ya tenga una vinculacion RUND oficial para el periodo. Se usa
    // la misma precedencia deterministica aplicada al crear/guardar el PTA.
    if (docente?.personaId) {
      const preferredQb = this.docenteRepo
        .createQueryBuilder('d')
        .where('d."personaId"::text = :personId', { personId: docente.personaId });
      const periodo = coalesceString(input?.periodo);
      if (periodo) {
        preferredQb
          .orderBy('CASE WHEN d."periodoCarga" = :periodo THEN 0 ELSE 1 END', 'ASC')
          .setParameter('periodo', periodo);
      } else {
        preferredQb.orderBy('CASE WHEN d."periodoCarga" IS NOT NULL THEN 0 ELSE 1 END', 'ASC');
      }
      docente = await preferredQb
        .addOrderBy('CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
        .addOrderBy('d."updatedAt"', 'DESC')
        .getOne() || docente;
    }
    const horasBanco = Number(docente?.horasAsignables);

    if (Number.isFinite(horasBanco) && horasBanco >= 0) {
      const semanasProrrateo = Number(input?.semanas_prorrateo ?? input?.semanasProrrateo ?? 16);
      const factor = Number.isFinite(semanasProrrateo) && semanasProrrateo > 0
        ? Math.min(semanasProrrateo / 16, 1)
        : 1;
      return Math.round(horasBanco * factor);
    }

    const legacy = Number(
      legacyFallback
      ?? input?.horas_a_programar
      ?? input?.horasAsignables
      ?? input?.horas_asignables,
    );
    if (Number.isFinite(legacy) && legacy > 0) return legacy;

    return this.calcHorasProgramables({
      tipo_vinculacion: input?.tipo_vinculacion,
      dedicacion: input?.dedicacion,
      semanas_vinculacion: input?.semanas_vinculacion,
    });
  }

  /**
   * Refresca las horas de los DTO que alimentan listados, reportes, concertacion
   * y aprobacion. Asi, un PTA legacy no conserva visualmente una bolsa antigua
   * cuando la vinculacion oficial del mismo periodo ya existe en el RUND.
   *
   * La consulta es por lote para evitar una consulta por cada PTA del listado.
   */
  private async enrichHorasDesdeBanco(dtos: any[]): Promise<void> {
    const solicitudes = [...new Map(
      dtos
        .map((dto) => ({
          docente_id: coalesceString(dto?.docente_id, dto?.docenteId),
          periodo: coalesceString(dto?.periodo),
        }))
        .filter((item) => item.docente_id)
        .map((item) => [`${item.docente_id}::${item.periodo || ''}`, item]),
    ).values()];
    if (solicitudes.length === 0) return;

    try {
      const rows = await this.ptaRepo.manager.query(
        `
        WITH solicitudes AS (
          SELECT DISTINCT s.docente_id, s.periodo
          FROM jsonb_to_recordset($1::jsonb) AS s(docente_id text, periodo text)
        ), vinculaciones AS (
          SELECT
            s.docente_id,
            s.periodo,
            base."personaId" AS persona_id
          FROM solicitudes s
          LEFT JOIN academic_work_plan."Docente" base
            ON base.id::text = s.docente_id
        ), candidatas AS (
          SELECT
            v.docente_id,
            v.periodo,
            d."horasAsignables" AS horas,
            ROW_NUMBER() OVER (
              PARTITION BY v.docente_id, v.periodo
              ORDER BY
                CASE WHEN d."periodoCarga" = v.periodo THEN 0 ELSE 1 END,
                CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END,
                d."updatedAt" DESC
            ) AS prioridad
          FROM vinculaciones v
          JOIN academic_work_plan."Docente" d
            ON d.id::text = v.docente_id
            OR d."personaId"::text = COALESCE(v.persona_id::text, v.docente_id)
        )
        SELECT docente_id, periodo, horas
        FROM candidatas
        WHERE prioridad = 1
        `,
        [JSON.stringify(solicitudes)],
      );

      const horasPorVinculacion = new Map<string, number>();
      for (const row of rows) {
        const horas = Number(row?.horas);
        if (!Number.isFinite(horas) || horas < 0) continue;
        horasPorVinculacion.set(
          `${String(row.docente_id)}::${coalesceString(row.periodo) || ''}`,
          horas,
        );
      }

      for (const dto of dtos) {
        const docenteId = coalesceString(dto?.docente_id, dto?.docenteId);
        const periodo = coalesceString(dto?.periodo) || '';
        const horasBanco = docenteId
          ? horasPorVinculacion.get(`${docenteId}::${periodo}`)
          : undefined;
        if (horasBanco == null) continue;

        const semanasProrrateo = Number(dto?.semanas_prorrateo ?? dto?.semanasProrrateo ?? 16);
        const factor = Number.isFinite(semanasProrrateo) && semanasProrrateo > 0
          ? Math.min(semanasProrrateo / 16, 1)
          : 1;
        const horas = Math.round(horasBanco * factor);
        dto.horas_a_programar = horas;
        dto.horas_asignables = horas;
        dto.horas_fuente = 'BANCO_DOCENTES';
      }
    } catch (err: any) {
      // Un fallo de enriquecimiento no debe impedir consultar PTAs legacy. En
      // ese caso se conserva la bolsa persistida, pero nunca se inventa 800h.
      this.logger?.warn?.(`Horas del Banco de Docentes no disponibles para el listado: ${err?.message || err}`);
    }
  }

  private isMedioTiempo(dedicacionRaw: any): boolean {
    const d = String(dedicacionRaw || '').toLowerCase();
    return d.includes('medio') || d === 'mt' || d === 'medio_tiempo' || d === 'medio tiempo';
  }

  async calcHorasProgramables(input: { tipo_vinculacion?: any; dedicacion?: any; semanas_vinculacion?: any }) {
    const tipo = coalesceString(input?.tipo_vinculacion) || 'CARRERA_003';
    const esMT = this.isMedioTiempo(input?.dedicacion);
    const semanas = Number(input?.semanas_vinculacion) || 16;

    // Lee las horas base configuradas (Términos Generales). Fallback a los valores normativos.
    let rules: any = {};
    try {
      rules = (await this.getConfiguracionPTAGlobal()) || {};
    } catch {
      rules = {}; // config no disponible: usa los valores normativos por defecto
    }
    const base009 = Number(rules.horas_base_carrera_009) || 720;
    const base003 = Number(rules.horas_base_carrera_003) || 800;
    const hSemTC = Number(rules.horas_semanales_tc) || 40;
    const hSemMT = Number(rules.horas_semanales_mt) || 20;

    if (tipo === 'CARRERA_009') {
      return esMT ? Math.round(base009 / 2) : base009;
    }
    if (tipo === 'CARRERA_003' || tipo === 'PERIODO_PRUEBA') {
      return esMT ? Math.round(base003 / 2) : base003;
    }

    const hSem = esMT ? hSemMT : hSemTC;
    return hSem * semanas;
  }

  // ── Multiplicadores de secciones de extensión (config-driven) ──────────────
  // Antes el ×2 de Capacitación estaba hardcodeado. Ahora se lee de la config
  // (ext_secciones[].multiplicador). Se cachea y se invalida al guardar config.
  private extMultCache: Record<string, number> | null = null;

  private async getExtMultiplicadores(): Promise<Record<string, number>> {
    if (this.extMultCache) return this.extMultCache;
    let rules: any = {};
    try {
      rules = (await this.getConfiguracionPTAGlobal()) || {};
    } catch {
      // Config no disponible aún (p.ej. tabla no creada en este ambiente): fallback sin cachear.
      return { capacitacion: 2 };
    }
    // Multiplicadores normativos por defecto (cuando la config no trae el campo).
    const DEFAULTS: Record<string, number> = { capacitacion: 2 };
    const secciones = Array.isArray((rules as any).ext_secciones) ? (rules as any).ext_secciones : null;
    const map: Record<string, number> = {};
    if (secciones && secciones.length) {
      for (const s of secciones) {
        const key = normalizeExtensionSectionKey(s?.key);
        if (!key) continue;
        // Respeta el multiplicador explícito (incluido 1); si falta, usa el default normativo de la sección.
        map[key] = Number(s?.multiplicador) > 0 ? Number(s.multiplicador) : (DEFAULTS[key] ?? 1);
      }
    } else {
      this.extMultCache = { ...DEFAULTS };
      return this.extMultCache;
    }
    this.extMultCache = map;
    return map;
  }

  private multiplicadorDeExt(a: any, mult: Record<string, number>): number {
    const actId = String(a?.actividad_id || a?.id || '');
    let seccion = String(a?.seccion || '');
    if (!seccion && actId.startsWith('CAP_')) seccion = 'capacitacion';
    else seccion = normalizeExtensionSectionKey(seccion);
    const m = Number(mult?.[seccion]);
    return m > 0 ? m : 1;
  }

  // Normaliza la clave de sección de una actividad complementaria. AADM ahora es
  // la sección 'academico_administrativas' dentro de complementarias.
  private normalizeCompSeccion(seccion: unknown, item?: any): 'complementarias_docencia' | 'academico_administrativas' {
    const s = String(seccion || '');
    if (s === 'academico_administrativas' || s === 'complementarias_docencia') return s;
    // Heurística legacy: un ítem que vivía en academico_admin trae consumeTotalidad definido.
    if (item && item.consumeTotalidad !== undefined && s === '') return 'academico_administrativas';
    return 'complementarias_docencia';
  }

  // Lee complementarias separando por sección y fusionando cualquier array legacy
  // `academico_admin` (PTAs no migrados o saves en tránsito). Mantiene separadas las
  // dos sumas para que el prorrateo/topes por sección no se mezclen. Se conservan
  // las referencias originales: la validación autoritativa puede sanear la
  // instantánea jerárquica que finalmente se persiste en datosEstructurados.
  private readComplementariasSecciones(ds: any): { all: any[]; docencia: any[]; aadm: any[] } {
    const comp = Array.isArray(ds?.complementarias) ? ds.complementarias : [];
    const legacyAadm = Array.isArray(ds?.academico_admin) ? ds.academico_admin : [];
    // Fusiona el array legacy academico_admin evitando duplicar lo ya migrado a complementarias.
    const legacyAadmUnique = legacyAadm
      .filter((a: any) => !comp.some((c: any) =>
        (c?.actividad_id ?? c?.id) === (a?.actividad_id ?? a?.id) &&
        this.normalizeCompSeccion(c?.seccion, c) === 'academico_administrativas'));
    const docencia = comp.filter(
      a => this.normalizeCompSeccion(a?.seccion, a) !== 'academico_administrativas',
    );
    const aadm = [
      ...comp.filter(a => this.normalizeCompSeccion(a?.seccion, a) === 'academico_administrativas'),
      ...legacyAadmUnique,
    ];
    return { all: [...comp, ...legacyAadmUnique], docencia, aadm };
  }

  private computeHorasTotales(body: any, extMult: Record<string, number> = { capacitacion: 2 }) {
    const asignaturas = Array.isArray(body?.asignaturas) ? body.asignaturas : [];
    const sumDocencia = asignaturas.reduce((sum: number, a: any) => sum + Number(a?.total_horas ?? a?.horas ?? 0), 0);

    const invActs = Array.isArray(body?.investigacion_actividades) ? body.investigacion_actividades : [];
    const invProyectoHoras = Number(body?.investigacion_proyecto?.horas_solicitadas || 0);
    const horasActividadesInv = invActs.reduce(
      (sum: number, a: any) => sum + (Number(a?.horas) || Number(a?.horas_total) || 0),
      0,
    );
    // Un proyecto y sus actividades son dos fuentes distintas de horas. Cuando
    // coexisten deben contabilizarse ambas; la regla configurable decide si esa
    // combinación puede enviarse, pero nunca se deben ocultar horas persistidas.
    const sumInv = invProyectoHoras + horasActividadesInv;

    const extActsRaw = Array.isArray(body?.extension_actividades) ? body.extension_actividades : [];
    const extActs = extActsRaw.map((a: any) => {
      const m = this.multiplicadorDeExt(a, extMult);
      if (m === 1) return a;
      const horasEjec = Number(a?.horas_ejecutadas ?? a?.horas ?? 0);
      return { ...a, horas: horasEjec * m };
    });
    const sumExt = extActs.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    // Complementarias = una sola colección con dos secciones. Las horas se separan
    // por sección para conservar reglas/topes/prorrateo distintos.
    const { docencia: compDocencia, aadm: compAadm } = this.readComplementariasSecciones(body);
    const sumComp = compDocencia.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);
    const sumAcad = compAadm.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    // Una actividad académico-administrativa de dedicación exclusiva sustituye la
    // bolsa conjunta de Investigación, Extensión y Complementarias. Docencia se
    // conserva en el cálculo para que el tope global detecte cualquier hora adicional.
    const exclusiveActivities = compAadm.filter((activity: any) => activity?.consumeTotalidad === true);
    if (exclusiveActivities.length > 0) {
      const exclusiveHours = Math.max(
        ...exclusiveActivities.map((activity: any) => Number(activity?.horas) || 0),
      );
      return {
        sumDocencia,
        sumInv: 0,
        sumExt: 0,
        sumComp: 0,
        sumAcad: exclusiveHours,
        total: sumDocencia + exclusiveHours,
      };
    }

    const total = sumDocencia + sumInv + sumExt + sumComp + sumAcad;
    return { sumDocencia, sumInv, sumExt, sumComp, sumAcad, total };
  }

  private mergeExtensionActivity(defaultAct: ExtensionCatalogActivity, savedAct?: any): any {
    if (!savedAct) return defaultAct;
    const merged = { ...defaultAct, ...savedAct };

    // Un arreglo `items` vacío es una eliminación deliberada del usuario; solo rellenar
    // cuando el guardado no trae el arreglo en absoluto (config legacy sin ítems).
    if (!Array.isArray(savedAct.items) && Array.isArray(defaultAct.items) && defaultAct.items.length > 0) {
      merged.items = defaultAct.items;
    }
    if ((savedAct.max_horas === undefined || savedAct.max_horas === null) && defaultAct.max_horas !== undefined) {
      merged.max_horas = defaultAct.max_horas;
    }
    if ((savedAct.min_horas === undefined || savedAct.min_horas === null) && defaultAct.min_horas !== undefined) {
      merged.min_horas = defaultAct.min_horas;
    }

    return merged;
  }

  private normalizeExtensionActivities(raw: any): Record<string, any[]> {
    const savedRecord = canonicalizeExtensionActivities(raw);
    const defaultRecord = canonicalizeExtensionActivities(EXTENSION_ACTIVITY_COMPLETIONS);
    const result: Record<string, any[]> = {};

    const sectionKeys = new Set<string>([
      ...FIXED_EXTENSION_SECTIONS.map(s => s.key),
      ...Object.keys(savedRecord),
    ]);

    for (const sectionKey of sectionKeys) {
      const defaults = defaultRecord[sectionKey] || [];
      const defaultById = new Map(defaults.map((act: any) => [act.id, act]));

      // Si la sección ya fue guardada, el arreglo guardado es la fuente de verdad: se
      // respetan las eliminaciones del usuario y NO se re-agregan las actividades por
      // defecto ya borradas. Los defaults solo siembran secciones aún no configuradas.
      if (Object.prototype.hasOwnProperty.call(savedRecord, sectionKey)) {
        const savedActivities = Array.isArray(savedRecord[sectionKey]) ? savedRecord[sectionKey] : [];
        result[sectionKey] = savedActivities.map((savedAct: any) =>
          this.mergeExtensionActivity(defaultById.get(savedAct?.id) || savedAct, savedAct),
        );
      } else {
        result[sectionKey] = defaults.map(act => ({ ...act }));
      }
    }

    return result;
  }

  private normalizePtaRules(rules: any): any {
    if (!rules || typeof rules !== 'object') return rules;
    const maxExtensionGlobal = Number(rules.max_horas_extension_global ?? rules.ext_max_horas_enlace ?? 200);
    const normalized = {
      ...rules,
      max_horas_extension_global: Number.isFinite(maxExtensionGlobal) ? maxExtensionGlobal : 200,
      ext_max_horas_enlace: Number.isFinite(maxExtensionGlobal) ? maxExtensionGlobal : 200,
      comp_anexo1_validado: Boolean(rules.comp_anexo1_validado ?? false),
      comp_anexo1_fuente: String(rules.comp_anexo1_fuente || 'Pendiente de cotejo contra Anexo 1'),
      inv_permitir_proyecto_actividades_simultaneos: Boolean(
        rules.inv_permitir_proyecto_actividades_simultaneos ?? false,
      ),
      ext_secciones: normalizeExtensionSections(rules.ext_secciones),
    };

    if (rules.ext_actividades === undefined || rules.ext_actividades === null) return normalized;
    return {
      ...normalized,
      ext_actividades: this.normalizeExtensionActivities(rules.ext_actividades),
    };
  }

  private getRuleNumber(rules: any, key: string, fallback: number): number {
    const value = Number(rules?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  private getPositiveRuleNumber(rules: any, key: string, fallback: number): number {
    const value = Number(rules?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  /**
   * Convierte los topes historicos expresados en horas sobre una bolsa de 800h
   * a un porcentaje y lo aplica a la bolsa real del RUND. De esta forma 400h
   * conserva su significado de 50%, pero una bolsa de 900h permite 450h.
   */
  private getScaledRuleLimit(
    rules: any,
    horasAProgramar: number,
    percentageKey: string,
    percentageFallback: number,
    absoluteKey?: string,
    absoluteFallback?: number,
  ): number {
    let percentage = this.getPositiveRuleNumber(rules, percentageKey, percentageFallback);
    if (absoluteKey) {
      const absoluteReference = this.getPositiveRuleNumber(
        rules,
        absoluteKey,
        absoluteFallback ?? Math.round(800 * percentageFallback / 100),
      );
      percentage = Math.min(percentage, (absoluteReference / 800) * 100);
    }
    return Math.round(horasAProgramar * percentage / 100);
  }

  private getInvestigacionLimit(body: any, rules: any, horasAProgramar: number): number {
    const globalLimit = this.getScaledRuleLimit(
      rules,
      horasAProgramar,
      'max_pct_investigacion',
      50,
      'max_horas_investigacion_global',
      400,
    );
    const rolRaw = coalesceString(body?.investigacion_proyecto?.rol);
    if (!rolRaw) {
      const maxHoras = this.getRuleNumber(rules, 'max_horas_inv_fomento', 200);
      const maxPct = this.getRuleNumber(rules, 'max_pct_inv_fomento', 25);
      const scaledLimit = Math.round(
        horasAProgramar * Math.min(maxPct, (maxHoras / 800) * 100) / 100,
      );
      return Math.min(globalLimit, scaledLimit);
    }

    const rolKey = normalizeEstadoFilter(rolRaw);
    const configuredRoles = Array.isArray(rules?.inv_roles) ? rules.inv_roles : [];
    const configured = configuredRoles.find((r: any) => {
      const nameKey = normalizeEstadoFilter(r?.nombre);
      return nameKey === rolKey || nameKey.includes(rolKey) || rolKey.includes(nameKey);
    });

    let maxRol = Number(configured?.horas_max);
    if (!Number.isFinite(maxRol) || maxRol <= 0) {
      if (rolKey.includes('COINVESTIGADOR')) maxRol = this.getRuleNumber(rules, 'max_horas_inv_coinvestigador', 300);
      else if (rolKey.includes('ASISTENTE')) maxRol = this.getRuleNumber(rules, 'max_horas_inv_asistente', 200);
      else maxRol = this.getRuleNumber(rules, 'max_horas_inv_lider', 400);
    }

    const configuredPct = Number(configured?.pct_max);
    // Los roles historicamente expresaban la misma regla en horas para una bolsa
    // de 800h y en porcentaje. El porcentaje permite aplicar el tope a cualquier
    // bolsa del Banco (720h u otro valor) sin depender del acuerdo de vinculacion.
    const maxRolPct = (maxRol / 800) * 100;
    const rolPct = Number.isFinite(configuredPct) && configuredPct > 0
      ? Math.min(configuredPct, maxRolPct)
      : maxRolPct;
    const rolLimit = Math.round(horasAProgramar * rolPct / 100);

    return Math.min(globalLimit, rolLimit);
  }

  private validateInvestigacionComponent(
    body: any,
    horas: ReturnType<PtaService['computeHorasTotales']>,
    horasAProgramar: number,
    rules: any,
  ): void {
    const rolInvestigacion = coalesceString(body?.investigacion_proyecto?.rol);
    const horasProyecto = Number(body?.investigacion_proyecto?.horas_solicitadas || 0);
    const actividades = Array.isArray(body?.investigacion_actividades)
      ? body.investigacion_actividades
      : [];
    const horasActividades = actividades.reduce(
      (sum: number, activity: any) => sum + (Number(activity?.horas_total ?? activity?.horas) || 0),
      0,
    );
    const permiteCoexistencia = rules?.inv_permitir_proyecto_actividades_simultaneos === true;
    const proyecto = body?.investigacion_proyecto;
    const tieneDatosProyecto = Boolean(proyecto) && (
      [
        proyecto?.territorial_id,
        proyecto?.nombre,
        proyecto?.codigo,
        proyecto?.grupo,
        proyecto?.linea,
        proyecto?.rol,
        proyecto?.fecha_inicio,
        proyecto?.fecha_fin,
        proyecto?.resolucion_nombre,
        proyecto?.resolucion_archivo_url,
      ].some(value => Boolean(coalesceString(value)))
      || horasProyecto > 0
    );
    const tieneDatosActividades = actividades.some((activity: any) => [
      activity?.territorial_id,
      activity?.actividad_id,
      activity?.nombre,
      activity?.descripcion,
      activity?.fecha_inicio,
      activity?.fecha_fin,
      activity?.resolucion_nombre,
      activity?.resolucion_archivo_url,
    ].some(value => Boolean(coalesceString(value)))
      || Number(activity?.horas_total ?? activity?.horas) > 0);
    const resolucionArchivoUrl = coalesceString(
      body?.investigacion_proyecto?.resolucion_archivo_url,
    );

    if (!permiteCoexistencia && tieneDatosProyecto && tieneDatosActividades) {
      throw new BadRequestException(
        'La configuracion actual de Investigacion permite registrar un proyecto o actividades, pero no ambos simultaneamente.',
      );
    }

    const limiteProyecto = this.getInvestigacionLimit(body, rules, horasAProgramar);
    if (rolInvestigacion) {
      if (!Number.isFinite(horasProyecto) || horasProyecto <= 0 || horasProyecto > limiteProyecto) {
        throw new BadRequestException(
          `Las horas de Investigacion para el rol ${rolInvestigacion} deben estar entre 1h y ${limiteProyecto}h (hasta el tope dinamico de la bolsa RUND).`,
        );
      }

      if (rules?.inv_adjunto_obligatorio === true && !resolucionArchivoUrl) {
        throw new BadRequestException(
          'El archivo adjunto de la resolución es obligatorio para enviar el proyecto de investigación.',
        );
      }
    }

    const limiteGlobal = this.getScaledRuleLimit(
      rules,
      horasAProgramar,
      'max_pct_investigacion',
      50,
      'max_horas_investigacion_global',
      400,
    );
    const esCombinacionPermitida = permiteCoexistencia
      && Boolean(rolInvestigacion)
      && horasProyecto > 0
      && horasActividades > 0;
    const limiteComponente = esCombinacionPermitida ? limiteGlobal : limiteProyecto;

    if (horas.sumInv > limiteComponente) {
      throw new BadRequestException(
        `El componente Investigacion excede el limite permitido: ${horas.sumInv}h / ${limiteComponente}h.`,
      );
    }
  }

  private validateDocenciaDateOverlaps(asignaturas: any[]): void {
    const candidates = (Array.isArray(asignaturas) ? asignaturas : [])
      .filter((asig: any) => asig?.asignatura_id && asig?.fecha_inicio && asig?.fecha_fin);

    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const first = candidates[i];
        const second = candidates[j];

        // Una modalidad pendiente proviene del catálogo institucional y no debe
        // bloquear al docente. Tampoco se presume presencial o remota para
        // aplicar una regla de cruce que aún no se puede determinar.
        if (isUndefinedDocenciaModality(first?.modalidad)
          || isUndefinedDocenciaModality(second?.modalidad)) continue;

        // Si al menos una asignatura es enteramente remota, el cruce es solo
        // informativo en el cliente y nunca impide la concertación.
        if (isNonPresentialDocenciaModality(first?.modalidad)
          || isNonPresentialDocenciaModality(second?.modalidad)) continue;

        const firstStart = new Date(`${first.fecha_inicio}T00:00:00`);
        const firstEnd = new Date(`${first.fecha_fin}T00:00:00`);
        const secondStart = new Date(`${second.fecha_inicio}T00:00:00`);
        const secondEnd = new Date(`${second.fecha_fin}T00:00:00`);
        if ([firstStart, firstEnd, secondStart, secondEnd]
          .some(date => Number.isNaN(date.getTime()))) continue;

        if (firstStart <= secondEnd && secondStart <= firstEnd) {
          const firstLabel = first?.asignatura_nombre || 'Asignatura 1';
          const secondLabel = second?.asignatura_nombre || 'Asignatura 2';
          throw new BadRequestException(
            `No se puede enviar el PTA: las asignaturas presenciales "${firstLabel}" y "${secondLabel}" `
            + `tienen fechas cruzadas (${first.fecha_inicio}-${first.fecha_fin} / ${second.fecha_inicio}-${second.fecha_fin}). `
            + 'La territorial no cambia esta validacion.',
          );
        }
      }
    }
  }

  private validateGlobalPtaHours(totalHours: number, horasAProgramar: number): void {
    const total = Number(totalHours) || 0;
    const limit = Math.max(0, Number(horasAProgramar) || 0);
    if (total > limit) {
      throw new BadRequestException(
        `El total del PTA excede las horas programables del docente: ${total}h / ${limit}h. `
        + `Redistribuya ${total - limit}h entre los componentes antes de continuar.`,
      );
    }
  }

  private validatePtaForSubmission(body: any, horas: ReturnType<PtaService['computeHorasTotales']>, horasAProgramar: number, rules: any) {
    const { all: allComp, aadm: compAadm } = this.readComplementariasSecciones(body);
    const tieneTotalidad = compAadm.some((a: any) => a?.consumeTotalidad === true);

    // Las reglas porcentuales son autoritativas también en servidor. El frontend
    // calcula el valor para facilitar la edición, pero una petición no puede enviar
    // una cantidad distinta al porcentaje configurado sobre las horas reales del PTA.
    const expectedPercentageHours = (activity: any): number | null => {
      if (String(activity?.tipo || '').toLowerCase() !== 'porcentaje') return null;
      const percentage = Math.min(100, Math.max(1, Number(activity?.porcentaje_pta) || 1));
      return Math.round(horasAProgramar * percentage / 100);
    };
    const assertPercentageHours = (label: string, submitted: any, configured: any) => {
      const expected = expectedPercentageHours(configured);
      if (expected === null) return;
      const actual = Number(submitted) || 0;
      if (actual !== expected) {
        const percentage = Math.min(100, Math.max(1, Number(configured?.porcentaje_pta) || 1));
        throw new BadRequestException(
          `La actividad ${label} corresponde al ${percentage}% del PTA y debe registrar ${expected}h.`,
        );
      }
    };
    const getRecognitionBounds = (configured: any, defaultType = 'hasta', allowZeroUntil = false) => {
      const recognitionRows = Array.isArray(configured?.filas_reconocimiento)
        ? configured.filas_reconocimiento
        : [];
      if (recognitionRows.length > 0) {
        const bounds = recognitionRows.map((row: any) => getRecognitionBounds(
          row,
          'fija',
          recognitionRows.length > 1,
        ));
        if (bounds.length === 1) return bounds[0];
        const max = bounds.reduce((sum: number, entry: any) => sum + entry.max, 0);
        const min = max > 0
          ? Math.max(1, bounds.reduce((sum: number, entry: any) => sum + entry.min, 0))
          : 0;
        return { type: min === max ? 'fija' : 'intervalo', min, max };
      }
      const type = String(configured?.tipo || defaultType).toLowerCase();
      const max = type === 'porcentaje'
        ? (expectedPercentageHours(configured) || 0)
        : Math.max(0, Number(configured?.max_horas ?? configured?.horas) || 0);
      const min = type === 'fija' || type === 'porcentaje'
        ? max
        : type === 'sin_horas'
          ? 0
        : type === 'intervalo'
          ? Math.min(max, Math.max(1, Number(configured?.min_horas ?? configured?.horas_min ?? configured?.min) || 1))
          : (max > 0 ? (allowZeroUntil && type === 'hasta' ? 0 : 1) : 0);
      return { type, min, max };
    };
    const assertConfiguredHours = (
      label: string,
      submitted: any,
      configured: any,
      defaultType = 'hasta',
      allowZeroUntil = false,
    ) => {
      const { type, min, max } = getRecognitionBounds(configured, defaultType, allowZeroUntil);
      const actual = Number(submitted) || 0;
      if (type === 'sin_horas') {
        if (actual !== 0) {
          throw new BadRequestException(`La actividad ${label} es informativa y debe registrar 0h.`);
        }
        return;
      }
      if (max <= 0) {
        throw new BadRequestException(`La actividad ${label} no tiene horas configuradas y no puede enviarse.`);
      }
      if ((type === 'fija' || type === 'porcentaje') && actual !== max) {
        throw new BadRequestException(`La actividad ${label} debe registrar exactamente ${max}h.`);
      }
      if ((type === 'hasta' || type === 'intervalo') && (actual < min || actual > max)) {
        throw new BadRequestException(`La actividad ${label} debe registrar entre ${min}h y ${max}h.`);
      }
    };
    const resolveSubmittedHierarchyRows = (
      label: string,
      submittedActivity: any,
      descriptors: Array<{ row: any; index: number; key: string }>,
      rowLabel = 'Actividad / Ítem',
    ): Array<{ row: any; index: number; key: string }> | null => {
      if (!Array.isArray(submittedActivity?.filas_seleccionadas)) return null;
      const selectedKeys = submittedActivity.filas_seleccionadas
        .map((key: any) => String(key || '').trim())
        .filter(Boolean);
      if (selectedKeys.length === 0) {
        throw new BadRequestException(
          `La actividad ${label} requiere seleccionar al menos una opción de su desglose.`,
        );
      }
      if (new Set(selectedKeys).size !== selectedKeys.length) {
        throw new BadRequestException(`La actividad ${label} contiene opciones jerárquicas duplicadas.`);
      }
      const descriptorByKey = new Map(descriptors.map(descriptor => [descriptor.key, descriptor]));
      const selected = selectedKeys.map((key: string) => descriptorByKey.get(key));
      if (selected.some(entry => !entry)) {
        throw new BadRequestException(
          `La actividad ${label} contiene una opción que ya no existe en la configuración vigente.`,
        );
      }

      const submittedBranches = submittedActivity?.ramificaciones_seleccionadas;
      const hasExplicitBranchMap = Boolean(
        submittedBranches
        && typeof submittedBranches === 'object'
        && !Array.isArray(submittedBranches),
      );
      const sanitizedBranchMap: Record<string, string[]> = {};
      const sanitizedBranchHours: Record<string, Record<string, number>> = {};
      const sanitizedHoursByKey: Record<string, number> = {};
      const sanitizedHoursByIndex: Record<number, number> = {};
      const sanitizedSelections: any[] = [];
      for (const descriptor of selected as Array<{ row: any; index: number; key: string }>) {
        const configuredBranches = Array.isArray(descriptor.row?.ramificaciones)
          ? descriptor.row.ramificaciones
          : (Array.isArray(descriptor.row?._ramificaciones) ? descriptor.row._ramificaciones : []);
        // Compatibilidad con la primera transición del formato jerárquico: si
        // ya había filas seleccionadas pero todavía no existía el mapa de
        // ramificaciones, el comportamiento histórico equivalía a incluirlas
        // todas. Un mapa explícito sí exige una selección explícita.
        const branchKeys = Array.isArray(submittedBranches?.[descriptor.key])
          ? submittedBranches[descriptor.key].map((key: any) => String(key || '').trim()).filter(Boolean)
          : (!hasExplicitBranchMap
              ? configuredBranches.map((branch: any) => String(branch?.clave || '')).filter(Boolean)
              : []);
        if (configuredBranches.length > 0 && branchKeys.length === 0) {
          throw new BadRequestException(
            `La opción ${descriptor.row?.nombre || descriptor.index + 1} de ${label} requiere seleccionar al menos una ramificación.`,
          );
        }
        const normalizedConfiguredBranches: HierarchyBranch[] = configuredBranches.map((branch: any) => ({
          clave: String(branch?.clave || ''),
          nombre: String(branch?.nombre || ''),
          ruta: (Array.isArray(branch?.ruta) ? branch.ruta : []).map((value: any) => ({
            columna: String(value?.columna || value?.column || ''),
            valor: String(value?.valor || value?.value || ''),
            ...(value?.reconocimiento && typeof value.reconocimiento === 'object'
              ? { reconocimiento: { ...value.reconocimiento } }
              : {}),
          })),
        }));
        const selectionCandidates = getHierarchySelectionCandidates(normalizedConfiguredBranches);
        if (branchKeys.some((key: string) => !selectionCandidates.has(key))) {
          throw new BadRequestException(
            `La opción ${descriptor.row?.nombre || descriptor.index + 1} de ${label} contiene una ramificación inválida.`,
          );
        }
        const uniqueBranchKeys = [...new Set(branchKeys)] as string[];
        const selectedCandidates = uniqueBranchKeys
          .map(key => selectionCandidates.get(key))
          .filter((candidate): candidate is HierarchyBranch & { isGroup: boolean } => Boolean(candidate));
        if (uniqueBranchKeys.length > 0) sanitizedBranchMap[descriptor.key] = uniqueBranchKeys;
        const selectedBranches = selectedCandidates
          .map(({ isGroup: _isGroup, ...branch }) => branch);
        const configuredRecognitionEntries = getSelectedHierarchyRecognitionEntries(selectedCandidates);
        const submittedBranchHours = submittedActivity?.ramificaciones_cantidades?.[descriptor.key];
        let branchHoursTotal = 0;
        if (configuredRecognitionEntries.length > 0) {
          const nextBranchHours: Record<string, number> = {};
          configuredRecognitionEntries.forEach(entry => {
            const submittedValue = submittedBranchHours?.[entry.key];
            if (submittedValue === undefined || submittedValue === null) {
              throw new BadRequestException(
                `La opción ${descriptor.row?.nombre || descriptor.index + 1} de ${label} no tiene horas registradas para uno de sus niveles.`,
              );
            }
            assertConfiguredHours(
              String(descriptor.row?.nombre || descriptor.index + 1),
              submittedValue,
              entry.source,
              'fija',
            );
            const normalizedValue = Number(submittedValue) || 0;
            nextBranchHours[entry.key] = normalizedValue;
            branchHoursTotal += normalizedValue;
          });
          sanitizedBranchHours[descriptor.key] = nextBranchHours;
        }
        const rawRowHours = submittedActivity?.filas_cantidades?.[descriptor.key]
          ?? submittedActivity?.items_cantidades?.[descriptor.index];
        const rowHours = Number(rawRowHours) || 0;
        if ((rawRowHours !== undefined && rawRowHours !== null)
          || String(descriptor.row?.tipo || '').toLowerCase() === 'sin_horas') {
          sanitizedHoursByKey[descriptor.key] = rowHours;
          sanitizedHoursByIndex[descriptor.index] = rowHours;
        }
        sanitizedSelections.push({
          clave: descriptor.key,
          nombre: String(descriptor.row?.nombre || `Opción ${descriptor.index + 1}`),
          etiqueta: rowLabel,
          horas: rowHours + branchHoursTotal,
          horas_base: rowHours,
          reconocimiento: getConfiguredRecognitionSnapshot(descriptor.row, true),
          ramificaciones: selectedBranches.map(branch => ({
            ...branch,
            horas: Math.max(0, Number(sanitizedBranchHours[descriptor.key]?.[branch.clave]) || 0),
          })),
        });
      }
      submittedActivity.filas_seleccionadas = selectedKeys;
      submittedActivity.filas_cantidades = Object.keys(sanitizedHoursByKey).length > 0
        ? sanitizedHoursByKey
        : undefined;
      submittedActivity.items_cantidades = Object.keys(sanitizedHoursByIndex).length > 0
        ? sanitizedHoursByIndex
        : undefined;
      submittedActivity.ramificaciones_seleccionadas = sanitizedBranchMap;
      submittedActivity.ramificaciones_cantidades = sanitizedBranchHours;
      submittedActivity.seleccion_jerarquica = sanitizedSelections;
      return selected as Array<{ row: any; index: number; key: string }>;
    };
    const validateSubmittedRecognitionRows = (
      label: string,
      submittedActivity: any,
      configuredActivity: any,
    ): boolean => {
      const recognitionRows = Array.isArray(configuredActivity?.filas_reconocimiento)
        ? configuredActivity.filas_reconocimiento
        : [];
      if (recognitionRows.length === 0) return false;

      const descriptors = getStableCatalogRowDescriptors(recognitionRows);
      const selectedDescriptors = resolveSubmittedHierarchyRows(
        label,
        submittedActivity,
        descriptors,
      );
      // Sin el nuevo marcador se conserva exactamente la validación legacy.
      if (!selectedDescriptors && recognitionRows.length <= 1) return false;

      const keyedValues = submittedActivity?.filas_cantidades;
      const indexedValues = submittedActivity?.items_cantidades;
      const hasKeyedValues = keyedValues && typeof keyedValues === 'object';
      const hasIndexedValues = indexedValues && typeof indexedValues === 'object';
      if (!hasKeyedValues && !hasIndexedValues) {
        if (selectedDescriptors) {
          throw new BadRequestException(
            `La actividad ${label} no tiene horas registradas para sus opciones seleccionadas.`,
          );
        }
        return false;
      }

      let submittedTotal = 0;
      const rowsToValidate = selectedDescriptors || descriptors;
      rowsToValidate.forEach(({ row, index, key: rowKey }) => {
        const submitted = (hasKeyedValues && rowKey ? keyedValues[rowKey] : undefined)
          ?? (hasIndexedValues ? indexedValues[index] : undefined);
        if (submitted === undefined || submitted === null) {
          throw new BadRequestException(
            `La fila ${row?.nombre || index + 1} de ${label} no tiene horas registradas.`,
          );
        }
        assertConfiguredHours(
          String(row?.nombre || index + 1),
          submitted,
          row,
          'fija',
          rowsToValidate.length > 1,
        );
        submittedTotal += Number(submitted) || 0;
        submittedTotal += (Object.values(
          submittedActivity?.ramificaciones_cantidades?.[rowKey] || {},
        ) as unknown[]).reduce<number>((sum, branchHours) => sum + (Number(branchHours) || 0), 0);
      });

      const selectedRequiresHours = rowsToValidate.some(({ row }) =>
        String(row?.tipo || '').toLowerCase() !== 'sin_horas')
        || submittedTotal > 0;
      if (submittedTotal <= 0 && selectedRequiresHours) {
        throw new BadRequestException(
          `La actividad ${label} debe registrar al menos 1h en una de sus filas.`,
        );
      }

      const activityHours = Number(submittedActivity?.horas) || 0;
      if (activityHours !== submittedTotal) {
        throw new BadRequestException(
          `La actividad ${label} debe totalizar ${submittedTotal}h según sus filas configuradas.`,
        );
      }
      return true;
    };

    const extCatalog = rules?.ext_actividades && typeof rules.ext_actividades === 'object'
      ? rules.ext_actividades
      : {};
    const extensionSections = normalizeExtensionSections(rules?.ext_secciones);
    const extensionComponentLimit = this.getScaledRuleLimit(
      rules,
      horasAProgramar,
      'max_pct_extension',
      25,
      'max_horas_extension_global',
      this.getPositiveRuleNumber(rules, 'ext_max_horas_enlace', 200),
    );
    const configuredRowHours = (row: any, allowZeroUntil = false): number =>
      getRecognitionBounds(row, 'fija', allowZeroUntil).min;
    for (const activity of (tieneTotalidad ? [] : (Array.isArray(body?.extension_actividades) ? body.extension_actividades : []))) {
      const sectionKey = normalizeExtensionSectionKey(activity?.seccion);
      const configured = (Array.isArray(extCatalog?.[sectionKey]) ? extCatalog[sectionKey] : [])
        .find((item: any) => String(item?.id) === String(activity?.actividad_id ?? activity?.id));
      if (configured) {
        assertPercentageHours(configured?.nombre || activity?.nombre || 'de extensión', activity?.horas, configured);
        const section = extensionSections.find((item: any) => item?.key === sectionKey);
        const allConfiguredRows = getExtensionCatalogHourRows(configured, section);
        const configuredRows = allConfiguredRows
          .map((row: any, index: number) => ({ row, index }))
          .filter(({ row }: any) => {
            const type = String(row?.tipo || 'fija').toLowerCase();
            if (type === 'sin_horas') return true;
            if (type === 'porcentaje') return (expectedPercentageHours(row) || 0) > 0;
            return Number(row?.horas) > 0;
          });
        // El portal construye la selección sobre las filas que realmente tienen
        // horas. Generar aquí las claves sobre ese mismo arreglo evita desfases si
        // la configuración conserva filas informativas sin reconocimiento.
        const hierarchyDescriptors = getStableCatalogRowDescriptors(
          configuredRows.map((entry: any) => entry.row),
        );
        const firstColumn = String(section?.columnas?.[0] || '').trim();
        const hierarchyRowLabel = firstColumn === EXTENSION_ITEMS_COLUMN_KEY
          ? String(section?.columna_items_nombre || 'Actividad / Ítem').trim()
          : (!firstColumn || /^_.*_$/.test(firstColumn) ? 'Opción del bloque' : firstColumn);
        const selectedHierarchyRows = resolveSubmittedHierarchyRows(
          configured?.nombre || activity?.nombre || 'de extensión',
          activity,
          hierarchyDescriptors,
          hierarchyRowLabel,
        );
        const mandatoryHours = configuredRows.reduce(
          (sum: number, entry: any) => sum + configuredRowHours(
            entry.row,
            configuredRows.length > 1,
          ),
          0,
        );
        const requiresRowSelection = configuredRows.length > 1
          && mandatoryHours > extensionComponentLimit;
        if (selectedHierarchyRows) {
          const keyedValues = activity?.filas_cantidades;
          const indexedValues = activity?.items_cantidades;
          let submittedTotal = 0;
          selectedHierarchyRows.forEach(({ row, index, key }) => {
            const submitted = (keyedValues && typeof keyedValues === 'object' ? keyedValues[key] : undefined)
              ?? (indexedValues && typeof indexedValues === 'object' ? indexedValues[index] : undefined);
            if (submitted === undefined || submitted === null) {
              throw new BadRequestException(
                `La fila ${row?.nombre || index + 1} de ${configured?.nombre || activity?.nombre || 'la actividad de extensión'} no tiene horas registradas.`,
              );
            }
            assertConfiguredHours(
              String(row?.nombre || index + 1),
              submitted,
              row,
              'fija',
              selectedHierarchyRows.length > 1,
            );
            submittedTotal += Number(submitted) || 0;
            submittedTotal += (Object.values(
              activity?.ramificaciones_cantidades?.[key] || {},
            ) as unknown[]).reduce<number>((sum, branchHours) => sum + (Number(branchHours) || 0), 0);
          });
          const selectedRequiresHours = selectedHierarchyRows.some(({ row }) =>
            String(row?.tipo || '').toLowerCase() !== 'sin_horas')
            || submittedTotal > 0;
          if (submittedTotal <= 0 && selectedRequiresHours) {
            throw new BadRequestException(
              `La actividad ${configured?.nombre || activity?.nombre || 'de extensión'} debe registrar al menos 1h en una de sus opciones seleccionadas.`,
            );
          }
          if ((Number(activity?.horas) || 0) !== submittedTotal) {
            throw new BadRequestException(
              `La actividad ${configured?.nombre || activity?.nombre || 'de extensión'} debe totalizar ${submittedTotal}h según sus opciones seleccionadas.`,
            );
          }
        } else if (requiresRowSelection) {
          const selectedRowIndex = Number(activity?.fila_seleccionada);
          if (!Number.isInteger(selectedRowIndex)
            || selectedRowIndex < 0
            || selectedRowIndex >= allConfiguredRows.length
            || !configuredRows.some((entry: any) => entry.index === selectedRowIndex)) {
            throw new BadRequestException(
              `La actividad ${configured?.nombre || activity?.nombre || 'de extensión'} requiere seleccionar una de sus filas horarias.`,
            );
          }
          const selectedRow = allConfiguredRows[selectedRowIndex];
          assertConfiguredHours(
            String(selectedRow?.nombre || selectedRowIndex + 1),
            activity?.horas,
            selectedRow,
            'fija',
          );
        } else if (configuredRows.length > 0) {
          const submittedRows = activity?.items_cantidades;
          if (submittedRows && typeof submittedRows === 'object') {
            let submittedTotal = 0;
            configuredRows.forEach(({ row, index }: any) => {
              const submitted = submittedRows[index];
              assertConfiguredHours(
                String(row?.nombre || index + 1),
                submitted,
                row,
                'fija',
                configuredRows.length > 1,
              );
              submittedTotal += Number(submitted) || 0;
            });
            if (submittedTotal <= 0) {
              throw new BadRequestException(
                `La actividad ${configured?.nombre || activity?.nombre || 'de extensión'} debe registrar al menos 1h en una de sus filas.`,
              );
            }
            const activityHours = Number(activity?.horas) || 0;
            if (activityHours !== submittedTotal) {
              throw new BadRequestException(
                `La actividad ${configured?.nombre || activity?.nombre || 'de extensión'} debe totalizar ${submittedTotal}h según sus filas configuradas.`,
              );
            }
          } else {
            // Compatibilidad con borradores anteriores a `items_cantidades`: se valida
            // al menos el rango agregado sin inferir reglas desde el ID.
            const minTotal = configuredRows.reduce(
              (sum: number, entry: any) => sum + getRecognitionBounds(
                entry.row,
                'fija',
                configuredRows.length > 1,
              ).min,
              0,
            );
            const maxTotal = configuredRows.reduce(
              (sum: number, entry: any) => sum + getRecognitionBounds(entry.row, 'fija').max,
              0,
            );
            const submittedTotal = Number(activity?.horas) || 0;
            const effectiveMin = Math.max(1, minTotal);
            if (submittedTotal < effectiveMin || submittedTotal > maxTotal) {
              throw new BadRequestException(
                `La actividad ${configured?.nombre || activity?.nombre || 'de extensión'} debe registrar entre ${effectiveMin}h y ${maxTotal}h.`,
              );
            }
          }
        } else {
          // En una tabla simple el reconocimiento vive directamente en el bloque.
          assertConfiguredHours(
            configured?.nombre || activity?.nombre || 'de extensión',
            activity?.horas,
            configured,
          );
        }
      }
    }

    for (const activity of allComp) {
      if (tieneTotalidad && activity?.consumeTotalidad !== true) continue;
      const sectionKey = this.normalizeCompSeccion(activity?.seccion, activity);
      const configured = this.flattenCompV2Section(rules, sectionKey)
        .find((item: any) => String(item?.id) === String(activity?.actividad_id ?? activity?.id));
      if (configured) {
        const label = configured?.nombre || activity?.nombre || 'complementaria';
        const validatedByRows = validateSubmittedRecognitionRows(label, activity, configured);
        if (!validatedByRows) {
          // Borradores anteriores al desglose por filas conservan la validación
          // agregada para poder abrirse y corregirse sin perder información.
          assertPercentageHours(label, activity?.horas, configured);
          assertConfiguredHours(label, activity?.horas, configured);
        }
      }
    }

    if (!tieneTotalidad && horas.total === 0) {
      throw new BadRequestException('El PTA no tiene horas programadas (0h). Guarda el PTA con tus actividades antes de enviarlo a aprobacion.');
    }

    // La bolsa proveniente del Banco de Docentes es el tope autoritativo para la
    // suma de los cuatro componentes. También aplica a dedicaciones exclusivas:
    // una actividad del 100% no puede coexistir con horas adicionales.
    this.validateGlobalPtaHours(horas.total, horasAProgramar);

    // Una actividad de dedicación exclusiva ya consume la bolsa completa.
    if (tieneTotalidad) return;

    const asignaturas = Array.isArray(body?.asignaturas)
      ? body.asignaturas.filter((a: any) => a?.asignatura_id)
      : [];
    this.validateDocenciaDateOverlaps(asignaturas);

    const maxExtension = this.getScaledRuleLimit(
      rules,
      horasAProgramar,
      'max_pct_extension',
      25,
      'max_horas_extension_global',
      this.getPositiveRuleNumber(rules, 'ext_max_horas_enlace', 200),
    );
    const maxComplementarias = this.getScaledRuleLimit(
      rules,
      horasAProgramar,
      'max_pct_complementarias',
      25,
      'max_horas_complementarias_global',
      200,
    );

    const assertComponentLimit = (label: string, value: number, limit: number) => {
      if (value > limit) {
        throw new BadRequestException(`El componente ${label} excede el limite permitido: ${value}h / ${limit}h.`);
      }
    };

    this.validateInvestigacionComponent(body, horas, horasAProgramar, rules);

    // Docencia no tiene tope porcentual propio; el límite global anterior le
    // permite ocupar desde una fracción hasta el 100% de la bolsa disponible.
    assertComponentLimit('Extension', horas.sumExt, maxExtension);
    assertComponentLimit('Complementarias', horas.sumComp + horas.sumAcad, maxComplementarias);

    if (asignaturas.length === 0) {
      throw new BadRequestException('Debe incluir al menos una asignatura valida antes de enviar el PTA a aprobacion.');
    }

    const minCreditos = this.getRuleNumber(rules, 'min_creditos_docencia', 3);
    if (!asignaturas.some((a: any) => Number(a?.creditos) >= minCreditos)) {
      throw new BadRequestException(`Debe incluir al menos una asignatura de minimo ${minCreditos} creditos antes de enviar el PTA.`);
    }

    for (const [idx, asig] of asignaturas.entries()) {
      const label = asig.asignatura_nombre || `Asignatura ${idx + 1}`;
      if (!asig.programa_id) {
        throw new BadRequestException(`Complete el programa de ${label} antes de enviar el PTA.`);
      }
      if (!coalesceString(asig.pensum)) {
        throw new BadRequestException(`Seleccione el Pensum de ${label} antes de enviar el PTA.`);
      }
      if (!asig.fecha_inicio || !asig.fecha_fin) {
        throw new BadRequestException(`Complete las fechas de inicio y fin de ${label} antes de enviar el PTA.`);
      }
      const inicio = new Date(`${asig.fecha_inicio}T00:00:00`);
      const fin = new Date(`${asig.fecha_fin}T00:00:00`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
        throw new BadRequestException(`El rango de fechas de ${label} no es valido.`);
      }
      const horasAsignatura = Number(asig.total_horas ?? asig.horas);
      if (!Number.isFinite(horasAsignatura) || horasAsignatura <= 0) {
        throw new BadRequestException(`La asignatura ${label} no tiene horas calculadas.`);
      }
    }

    const tipo = normalizeEstadoFilter(body?.tipo_vinculacion ?? body?.tipoVinculacion);
    if (['OCASIONAL', 'VISITANTE', 'ESPECIAL'].some(t => tipo.includes(t))) {
      const minDocencia = horasAProgramar * (this.getRuleNumber(rules, 'min_pct_docencia_no_vinculados', 50) / 100);
      if (horas.sumDocencia < minDocencia) {
        throw new BadRequestException(`Los docentes no vinculados deben dedicar al menos ${minDocencia}h a docencia (${rules?.min_pct_docencia_no_vinculados ?? 50}% del PTA).`);
      }
    }

    const maxAadm = this.getScaledRuleLimit(
      rules,
      horasAProgramar,
      'max_pct_aadm',
      25,
      'max_horas_aadm_global',
      200,
    );
    if (horas.sumAcad > maxAadm) {
      throw new BadRequestException(`Actividades academico-administrativas superan el tope permitido: ${horas.sumAcad}h / ${maxAadm}h.`);
    }

  }

  private toPtaDto(entity: PlanTrabajoAcademicoEntity, extMult: Record<string, number> = { capacitacion: 2 }) {
    const {
      id: _id, pta_id: _ptaId, ptaId: _ptaId2,
      estado: _estado, periodo: _periodo, version: _version,
      docente_id: _docId,
      horas_a_programar: _horasAProgramar,
      horas_asignables: _horasAsignables,
      horasAsignables: _horasAsignablesCamel,
      ...extra
    } = (entity.datosEstructurados && typeof entity.datosEstructurados === 'object'
      ? entity.datosEstructurados
      : {}) as Record<string, any>;

    // Calcular horas por componente desde datosEstructurados para la tabla del backoffice
    const ds = entity.datosEstructurados as any || {};
    const asignaturas: any[] = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
    const invActs: any[] = Array.isArray(ds.investigacion_actividades) ? ds.investigacion_actividades : [];
    const extActs: any[] = Array.isArray(ds.extension_actividades) ? ds.extension_actividades : [];
    const { docencia: compDocencia, aadm: compAadm } = this.readComplementariasSecciones(ds);

    const hDocencia = asignaturas.reduce((s: number, a: any) => s + (Number(a?.total_horas ?? a?.horas) || 0), 0);
    const hInv = Number(ds.investigacion_proyecto?.horas_solicitadas || 0) +
      invActs.reduce((s: number, a: any) => s + (Number(a?.horas_total ?? a?.horas) || 0), 0);
    // Aplicar multiplicador de sección (config-driven) para mantener consistencia con computeHorasTotales
    const extActsNorm = extActs.map((a: any) => {
      const m = this.multiplicadorDeExt(a, extMult);
      if (m === 1) return a;
      const horasEjec = Number(a?.horas_ejecutadas ?? a?.horas ?? 0);
      return { ...a, horas: horasEjec * m };
    });
    const hExt = extActsNorm.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hCompDocencia = compDocencia.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hAcad = compAadm.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    // Complementarias unificado = sección docencia + sección académico-administrativa.
    const hComp = hCompDocencia + hAcad;
    const horasTotal = entity.horasTotales || (hDocencia + hInv + hExt + hComp);
    const horasAsignablesRaw = Number(
      (entity as any).horasAsignables
      ?? ds.horas_a_programar
      ?? ds.horas_asignables
      ?? 0,
    );
    const horasAsignables = Number.isFinite(horasAsignablesRaw) ? horasAsignablesRaw : 0;

    return {
      id: entity.id,
      docente_id: entity.docenteId,
      periodo: entity.periodo,
      estado: entity.estado === 'BORRADOR' ? 'Borrador' : entity.estado,
      version: entity.version,
      horas_totales: horasTotal,
      // Aliases usados por la tabla del backoffice
      total_horas_programadas: horasTotal,
      horas_a_programar: horasAsignables,
      horas_asignables: horasAsignables,
      // Horas por componente para barras de color
      horas_docencia: hDocencia,
      horas_investigacion: hInv,
      horas_extension: hExt,
      // Complementarias unificado incluye la sección académico-administrativa.
      horas_complementarias: hComp,
      // Desglose por sección (nuevo) — para vistas que quieran diferenciar.
      complementarias_secciones: {
        complementarias_docencia: hCompDocencia,
        academico_administrativas: hAcad,
      },
      // Alias deprecado (compat con consumidores que aún leen horas_acad_admin).
      horas_acad_admin: hAcad,
      num_asignaturas: asignaturas.length,
      motivo_devolucion: entity.motivoDevolucion,
      dedicacion: (entity as any).dedicacion,
      tipo_vinculacion: (entity as any).tipoVinculacion,
      semanas_vinculacion: (entity as any).semanasVinculacion,
      ...extra,
      createdAt: entity.createdAt,
      created_at: entity.createdAt,
      updatedAt: entity.updatedAt,
      updated_at: entity.updatedAt,
      pta_id: entity.id,
      ptaId: entity.id,
    };
  }

  private compactNameList(names: string[]): string | undefined {
    const unique = [...new Set(names.map(n => n.trim()).filter(Boolean))];
    if (unique.length === 0) return undefined;
    if (unique.length <= 2) return unique.join(', ');
    return `${unique[0]} +${unique.length - 1}`;
  }

  /**
   * Completa la selección jerárquica de Extensión con textos legibles para las
   * vistas posteriores al envío. Los PTAs recientes ya guardan esta instantánea;
   * para registros anteriores se reconstruye desde fila_seleccionada + catálogo.
   */
  private async enrichExtensionSelections(dtos: any[]): Promise<void> {
    if (!dtos.some(dto => Array.isArray(dto?.extension_actividades) && dto.extension_actividades.length > 0)) return;

    const [catalogBySection, sections] = await Promise.all([
      this.getCatalogoActividadesExtension(),
      this.getCatalogoSeccionesExtension(),
    ]);
    const sectionByKey = new Map(
      (Array.isArray(sections) ? sections : []).map((section: any) => [
        normalizeExtensionSectionKey(section?.key),
        section,
      ]),
    );

    for (const dto of dtos) {
      const activities = Array.isArray(dto?.extension_actividades) ? dto.extension_actividades : [];
      dto.extension_actividades = activities.map((activity: any) => {
        const selectedIndex = Number(activity?.fila_seleccionada);
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0) return activity;

        const sectionKey = normalizeExtensionSectionKey(activity?.seccion);
        const section = sectionByKey.get(sectionKey);
        const catalog = Array.isArray(catalogBySection?.[sectionKey]) ? catalogBySection[sectionKey] : [];
        const catalogActivity = catalog.find((item: any) =>
          String(item?.id || '') === String(activity?.actividad_id || activity?.id || ''),
        );
        const selectedRow = catalogActivity
          ? getExtensionCatalogHourRows(catalogActivity, section)[selectedIndex]
          : null;
        if (!selectedRow && activity?.fila_seleccionada_nombre) return activity;
        if (!selectedRow) return activity;

        const firstColumn = String(section?.columnas?.[0] || '').trim();
        const selectionLabel = firstColumn === EXTENSION_ITEMS_COLUMN_KEY
          ? String(section?.columna_items_nombre || 'Actividad / Ítem').trim()
          : (!firstColumn || /^_.*_$/.test(firstColumn) ? 'Opción del bloque' : firstColumn);
        const details = Array.isArray(selectedRow?._detailGroups)
          ? selectedRow._detailGroups
              .map((group: any) => ({
                nombre: String(group?.name || group?.nombre || '').trim(),
                valores: (Array.isArray(group?.values) ? group.values : [])
                  .map((value: any) => ({
                    columna: String(value?.column || value?.columna || '').trim(),
                    valor: String(value?.value || value?.valor || '').trim(),
                  }))
                  .filter((value: any) => value.valor),
              }))
              .filter((group: any) => group.nombre || group.valores.length > 0)
          : [];

        return {
          ...activity,
          fila_seleccionada_nombre: activity?.fila_seleccionada_nombre || String(selectedRow?.nombre || '').trim(),
          fila_seleccionada_etiqueta: activity?.fila_seleccionada_etiqueta || selectionLabel,
          fila_seleccionada_detalles: Array.isArray(activity?.fila_seleccionada_detalles)
            && activity.fila_seleccionada_detalles.length > 0
            ? activity.fila_seleccionada_detalles
            : details,
        };
      });
    }
  }

  private async enrichPtaSummaries(dtos: any[]): Promise<any[]> {
    if (!dtos.length) return dtos;

    await this.enrichHorasDesdeBanco(dtos);

    // Aditivo y tolerante a configuraciones legacy: nunca bloquea la consulta del PTA.
    try {
      await this.enrichExtensionSelections(dtos);
    } catch (err: any) {
      this.logger.warn(`Detalle de selección de Extensión omitido: ${err?.message || err}`);
    }

    // Los listados del centro de reportes también deben resolver el Pensum de
    // PTAs creados antes de que el campo existiera. Se consolida todo el lote
    // para consultar el catálogo una sola vez y evitar una consulta por PTA.
    const assignmentLocations: Array<{ dto: any; index: number }> = [];
    const assignmentsToSync: any[] = [];
    for (const dto of dtos) {
      const asignaturas = Array.isArray(dto.asignaturas) ? dto.asignaturas : [];
      asignaturas.forEach((asignatura: any, index: number) => {
        assignmentLocations.push({ dto, index });
        assignmentsToSync.push(asignatura);
      });
    }
    if (assignmentsToSync.length > 0) {
      try {
        const syncedAssignments = await this.syncAsignaturasPensum(assignmentsToSync, false);
        assignmentLocations.forEach(({ dto, index }, position) => {
          dto.asignaturas[index] = syncedAssignments[position];
        });
      } catch (err: any) {
        // Compatibilidad durante despliegues escalonados: un catálogo antiguo no
        // debe impedir consultar el resto del reporte.
        this.logger.warn(`Pensum de asignaturas PTA omitido en reporte: ${err?.message || err}`);
      }
    }

    const programaKeys = new Set<string>();
    const territorialKeys = new Set<string>();
    const cetapKeys = new Set<string>();

    for (const dto of dtos) {
      const asignaturas = Array.isArray(dto.asignaturas) ? dto.asignaturas : [];
      const dtoPrograma = coalesceLookupKey(dto.programa_id, dto.programaId);
      const dtoTerritorial = coalesceLookupKey(dto.territorial_id, dto.territorialId);
      if (dtoPrograma) programaKeys.add(dtoPrograma);
      if (dtoTerritorial) territorialKeys.add(dtoTerritorial);

      for (const asig of asignaturas) {
        const programaId = coalesceLookupKey(asig?.programa_id, asig?.programaId, asig?.programa?.id);
        const territorialId = coalesceLookupKey(asig?.territorial_id, asig?.territorialId, asig?.territorial?.id);
        const cetapId = coalesceLookupKey(asig?.cetap_id, asig?.cetapId, asig?.sede_id, asig?.sedeId);
        if (programaId) programaKeys.add(programaId);
        if (territorialId) territorialKeys.add(territorialId);
        if (cetapId) cetapKeys.add(cetapId);
      }
    }

    const programaMap = new Map<string, { id: string; codigo?: string; nombre: string; nombreCorto?: string }>();
    const territorialMap = new Map<string, { id: string; codigo?: string; nombre: string }>();
    const cetapMap = new Map<string, { id: string; codigo?: string; nombre: string }>();

    if (programaKeys.size > 0) {
      try {
        const rows = await this.ptaRepo.manager.query(
          `
          SELECT id::text AS id, codigo, nombre, nombre_corto AS "nombreCorto"
          FROM academic_work_plan.programa
          WHERE id::text = ANY($1::text[]) OR codigo::text = ANY($1::text[])
          `,
          [[...programaKeys]],
        );
        for (const row of rows) {
          const item = {
            id: String(row.id),
            codigo: row.codigo ? String(row.codigo) : undefined,
            // El nombre corto (p. ej. "APT") es solo un código visual. Los DTO
            // consumidos por reportes deben exponer el nombre oficial completo.
            nombre: String(row.nombre || row.nombreCorto || ''),
            nombreCorto: row.nombreCorto || undefined,
          };
          programaMap.set(item.id, item);
          if (item.codigo) programaMap.set(item.codigo, item);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron resolver nombres de programas PTA: ${err?.message || err}`);
      }
    }

    if (territorialKeys.size > 0) {
      try {
        const rows = await this.ptaRepo.manager.query(
          `
          SELECT id_seccional::text AS id, cod_seccional::text AS codigo, nom_seccional AS nombre
          FROM auth.seccionales
          WHERE id_seccional::text = ANY($1::text[]) OR cod_seccional::text = ANY($1::text[])
          `,
          [[...territorialKeys]],
        );
        for (const row of rows) {
          const item = {
            id: String(row.id),
            codigo: row.codigo ? String(row.codigo) : undefined,
            nombre: row.nombre,
          };
          territorialMap.set(item.id, item);
          if (item.codigo) territorialMap.set(item.codigo, item);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron resolver nombres de territoriales PTA: ${err?.message || err}`);
      }
    }

    if (cetapKeys.size > 0) {
      try {
        const rows = await this.ptaRepo.manager.query(
          `
          SELECT id_sede::text AS id, cod_sede::text AS codigo, nom_sede AS nombre
          FROM auth.sedes
          WHERE id_sede::text = ANY($1::text[]) OR cod_sede::text = ANY($1::text[])
          `,
          [[...cetapKeys]],
        );
        for (const row of rows) {
          const item = {
            id: String(row.id),
            codigo: row.codigo ? String(row.codigo) : undefined,
            nombre: row.nombre,
          };
          cetapMap.set(item.id, item);
          if (item.codigo) cetapMap.set(item.codigo, item);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron resolver nombres de CETAP/sedes PTA: ${err?.message || err}`);
      }
    }

    for (const dto of dtos) {
      const asignaturas = Array.isArray(dto.asignaturas) ? dto.asignaturas : [];
      const programaNames: string[] = [];
      const territorialNames: string[] = [];
      const cetapNames: string[] = [];

      for (const asig of asignaturas) {
        const programaId = coalesceLookupKey(asig?.programa_id, asig?.programaId, asig?.programa?.id);
        const territorialId = coalesceLookupKey(asig?.territorial_id, asig?.territorialId, asig?.territorial?.id);
        const cetapId = coalesceLookupKey(asig?.cetap_id, asig?.cetapId, asig?.sede_id, asig?.sedeId);

        const programaCatalogo = programaId ? programaMap.get(programaId) : null;
        // El catálogo vigente es autoritativo. Esto corrige también PTAs legacy
        // que persistieron `programa_nombre` con la abreviación (p. ej. "APT").
        const programaNombre = programaCatalogo?.nombre
          || coalesceString(asig?.programa_nombre_completo, asig?.programa_nombre, asig?.programa?.nombre, asig?.programa?.nombreCorto);
        const territorialNombre = coalesceString(asig?.territorial_nombre, asig?.territorial?.nombre)
          || (territorialId ? territorialMap.get(territorialId)?.nombre : null);
        const cetapNombre = coalesceString(asig?.cetap_nombre, asig?.sede_nombre, asig?.cetap?.nombre, asig?.sede?.nombre)
          || (cetapId ? cetapMap.get(cetapId)?.nombre : null);

        if (programaNombre) {
          asig.programa_nombre = programaNombre;
          asig.programa_nombre_completo = programaNombre;
          if (programaCatalogo?.codigo) asig.programa_codigo = programaCatalogo.codigo;
          if (programaCatalogo?.nombreCorto) asig.programa_nombre_corto = programaCatalogo.nombreCorto;
          programaNames.push(programaNombre);
        }
        if (territorialNombre) {
          asig.territorial_nombre = territorialNombre;
          territorialNames.push(territorialNombre);
        }
        if (cetapNombre) {
          asig.cetap_nombre = cetapNombre;
          cetapNames.push(cetapNombre);
        }
      }

      const programaResumen = coalesceString(dto.programa_academico, dto.programa, dto.programa_nombre)
        || this.compactNameList(programaNames);
      const territorialResumen = coalesceString(dto.territorial, dto.territorial_nombre)
        || this.compactNameList(territorialNames);
      const cetapResumen = coalesceString(dto.cetap, dto.cetap_nombre, dto.sede)
        || this.compactNameList(cetapNames);

      if (programaResumen) {
        dto.programa = programaResumen;
        dto.programa_nombre = dto.programa_nombre || programaResumen;
      }
      if (territorialResumen) {
        dto.territorial = territorialResumen;
        dto.territorial_nombre = dto.territorial_nombre || territorialResumen;
      }
      if (cetapResumen) {
        dto.cetap = cetapResumen;
        dto.cetap_nombre = dto.cetap_nombre || cetapResumen;
      }

      dto.programasAsignaturas = [...new Set(programaNames)];
      dto.territorialesAsignaturas = [...new Set(territorialNames)];
      dto.cetapsAsignaturas = [...new Set(cetapNames)];
      dto.num_programas = dto.programasAsignaturas.length;
      dto.num_territoriales = dto.territorialesAsignaturas.length;
    }

    // Solo lectura y aditivo: si algo falla, la lista sigue funcionando igual (sin conteos).
    try {
      await this.attachComponentApprovalProgress(dtos);
    } catch (err: any) {
      this.logger.warn(`Avance de aprobación por componente omitido: ${err?.message || err}`);
    }
    return dtos;
  }

  private async attachPtaReferenceDates(dtos: any[]): Promise<void> {
    const ids = dtos.map(d => d?.id).filter(Boolean);
    if (!ids.length) return;

    let histories: HistorialEstadoPtaEntity[] = [];
    try {
      histories = await this.historialRepo.find({
        where: { ptaId: In(ids) } as any,
        order: { createdAt: 'DESC' },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo calcular fecha de referencia PTA: ${err?.message || err}`);
    }

    const historiesByPta = new Map<string, HistorialEstadoPtaEntity[]>();
    for (const h of histories) {
      if (!h?.ptaId) continue;
      if (!historiesByPta.has(h.ptaId)) historiesByPta.set(h.ptaId, []);
      historiesByPta.get(h.ptaId)!.push(h);
    }

    for (const dto of dtos) {
      const draft = isDraftPtaState(dto?.estado);
      const submission = (historiesByPta.get(dto.id) || []).find(h =>
        isPendingRoleApprovalState(h.estadoNuevo) &&
        !isPendingRoleApprovalState(h.estadoAnterior),
      );
      const created = dto.createdAt || dto.created_at;
      const updated = dto.updatedAt || dto.updated_at;
      const referenceDate = draft
        ? (created || updated)
        : (submission?.createdAt || updated || created);

      dto.fecha_envio_revision = submission?.createdAt || null;
      dto.fecha_referencia = referenceDate || null;
      dto.fecha_orden = referenceDate || null;
    }
  }

  private sortPtasByReferenceDate(dtos: any[]): any[] {
    return [...dtos].sort((a, b) => {
      const aTime = new Date(a?.fecha_orden || a?.fecha_referencia || a?.updatedAt || a?.updated_at || a?.createdAt || a?.created_at || 0).getTime();
      const bTime = new Date(b?.fecha_orden || b?.fecha_referencia || b?.updatedAt || b?.updated_at || b?.createdAt || b?.created_at || 0).getTime();
      const safeA = Number.isFinite(aTime) ? aTime : 0;
      const safeB = Number.isFinite(bTime) ? bTime : 0;
      if (safeA !== safeB) return safeB - safeA;
      return String(a?.docente_nombre || '').localeCompare(String(b?.docente_nombre || ''), 'es');
    });
  }

  /**
   * Adjunta a cada DTO de la lista el avance de aprobación por componente
   * (componentes_aprobados / componentes_total), usando el mismo criterio que el
   * panel de detalle: 4 componentes base (Docencia, Investigación, Complementarias,
   * Acad-Admin) siempre + las sub-secciones de Extensión que tengan horas > 0.
   * Es SOLO LECTURA (no persiste ni auto-aprueba) y tolerante a fallos: si algo falla,
   * simplemente no adjunta los conteos y el front cae al rótulo de estado.
   */
  private async attachComponentApprovalProgress(dtos: any[]): Promise<void> {
    const ids = dtos.map(d => d?.id).filter(Boolean);
    if (!ids.length) return;

    let approvals: PtaComponentApprovalEntity[] = [];
    try {
      approvals = await this.ptaComponentApprovalRepo.find({ where: { ptaId: In(ids) } });
    } catch (err: any) {
      this.logger.warn(`No se pudo cargar el avance de aprobación por componente: ${err?.message || err}`);
      return;
    }

    const estadoByPta = new Map<string, Map<string, string>>();
    for (const a of approvals) {
      if (!a?.ptaId || !a?.componente || isRoleApprovalComponent(a.componente)) continue;
      if (!estadoByPta.has(a.ptaId)) estadoByPta.set(a.ptaId, new Map());
      estadoByPta.get(a.ptaId)!.set(a.componente, String(a.estado || 'pendiente'));
    }

    // ── Etapa de Revisión: progreso por componente, calculado en lote para no
    // hacer N consultas (una por PTA de la lista). Solo se usa para decidir si el
    // rótulo de un componente debe mostrarse como "en_revision" en vez de
    // "pendiente" — no persiste nada, igual que el resto de esta función.
    let reviews: PtaComponentReviewEntity[] = [];
    try {
      reviews = await this.ptaComponentReviewRepo.find({ where: { ptaId: In(ids) } });
    } catch (err: any) {
      this.logger.warn(`No se pudo cargar el avance de revisión por componente: ${err?.message || err}`);
    }
    const reviewByPta = new Map<string, Map<string, string>>();
    for (const r of reviews) {
      if (!r?.ptaId || !r?.componente) continue;
      if (!reviewByPta.has(r.ptaId)) reviewByPta.set(r.ptaId, new Map());
      reviewByPta.get(r.ptaId)!.set(`${r.componente}:${r.subseccion}`, String(r.estado || 'pendiente'));
    }

    const programaIds = Array.from(new Set(
      dtos.flatMap(dto => (Array.isArray(dto?.asignaturas) ? dto.asignaturas : []))
        .map((a: any) => coalesceLookupKey(a?.programa_id))
        .filter((v): v is string => !!v),
    ));
    let tipoPorPrograma = new Map<string, string>();
    if (programaIds.length > 0) {
      try {
        const programas = await this.programaRepo.find({ where: { id: In(programaIds) } as any });
        tipoPorPrograma = new Map(programas.map(p => [String(p.id), p.tipo]));
      } catch (err: any) {
        this.logger.warn(`No se pudo resolver el tipo de programa para Docencia: ${err?.message || err}`);
      }
    }

    // Territoriales (no Sede Central) presentes en las asignaturas del lote, para
    // enrutar Docencia también por territorialidad en el listado. Se resuelve una sola
    // vez para todos los PTAs, igual que el tipo de programa.
    const territorialIdsLote = Array.from(new Set(
      dtos.flatMap(dto => (Array.isArray(dto?.asignaturas) ? dto.asignaturas : []))
        .map((a: any) => coalesceLookupKey(a?.territorial_id))
        .filter((v): v is string => !!v),
    ));
    const seccionalesNoCentrales = await this.resolveTerritorialIdsNoCentrales(territorialIdsLote);
    const esAsignaturaTerritorial = (a: any): boolean => {
      const t = coalesceLookupKey(a?.territorial_id);
      return !!t && seccionalesNoCentrales.has(t);
    };

    // Catálogo de nivel_programa por actividad complementaria, resuelto una sola vez
    // para todo el lote (igual patrón que tipoPorPrograma/seccionalesNoCentrales
    // arriba) — evita una consulta de configuración por PTA.
    const [catComplementariasLote, catAadmLote] = await Promise.all([
      this.getCatalogoActividadesComplementarias(),
      this.getCatalogoActividadesAcademicoAdmin(),
    ]);
    const nivelProgramaPorActividadIdLote = new Map<string, 'pregrado' | 'posgrado'>();
    for (const act of [...catComplementariasLote, ...catAadmLote]) {
      const nivel = normalizeNivelProgramaComplementaria((act as any)?.nivel_programa);
      if (act?.id && nivel) nivelProgramaPorActividadIdLote.set(String(act.id), nivel);
    }

    // BASE_KEYS ya no incluye Docencia ni Complementarias: ambos se colapsan por
    // separado (DOCENCIA_KEYS / COMPLEMENTARIAS_KEYS_LOTE, más abajo) con el mismo
    // patrón que ya usa Extensión — varios componentes reales agrupados bajo un solo
    // rótulo visible.
    const BASE_KEYS = ['investigacion'];
    // Incluye también academica_territorial: las asignaturas dictadas en Direcciones
    // Territoriales son un componente de aprobación aparte, pero se siguen mostrando
    // bajo el mismo rótulo colapsado "Docencia" en el listado.
    const DOCENCIA_KEYS = [...DOCENCIA_COMPONENT_KEYS];
    const COMPLEMENTARIAS_KEYS_LOTE = [...COMPLEMENTARIAS_COMPONENT_KEYS];
    const EXT_SUB_SECTIONS: Record<string, string[]> = {
      ext_capacitacion: ['capacitacion'],
      ext_procesos: ['seleccion'],
      ext_fortalecimiento: ['fortalecimiento', 'laboratorio_innovacion', 'investigacion_aplicada'],
      ext_gobierno: ['alto_gobierno'],
    };

    for (const dto of dtos) {
      try {
        const extActs = Array.isArray(dto?.extension_actividades) ? dto.extension_actividades : [];
        const extHoras = (secs: string[]) => extActs
          .filter((a: any) => secs.includes(normalizeExtensionSectionKey(a?.seccion)))
          .reduce((s: number, a: any) => s + (Number(a?.horas_ejecutadas ?? a?.horas ?? 0) || 0), 0);

        const asignaturas: any[] = Array.isArray(dto?.asignaturas) ? dto.asignaturas : [];
        let horasDocPregrado = 0;
        let horasDocPosgrado = 0;
        let horasDocTerritorial = 0;
        // Territoriales concretas presentes en la Docencia de ESTE PTA: el frontend las
        // usa para que un aprobador/revisor territorial solo vea los PTAs de su
        // seccional (el permiso habilita el componente, la seccional acota cuál).
        const territorialesDocencia = new Set<string>();
        for (const a of asignaturas) {
          const horas = Number(a?.total_horas ?? a?.horas) || 0;
          // La territorialidad manda sobre el nivel, igual que en
          // clasificarAsignaturasDocencia (fuente de verdad del enrutamiento).
          if (esAsignaturaTerritorial(a)) {
            horasDocTerritorial += horas;
            const t = coalesceLookupKey(a?.territorial_id);
            if (t) territorialesDocencia.add(t);
            continue;
          }
          const programaId = coalesceLookupKey(a?.programa_id);
          const tipo = programaId ? tipoPorPrograma.get(programaId) : undefined;
          if (tipo && POSGRADO_PROGRAMA_TIPOS.has(tipo)) horasDocPosgrado += horas;
          else horasDocPregrado += horas;
        }
        // Respaldo cuando el DTO no trae el array `asignaturas` (algunos consumidores
        // solo pasan el agregado `horas_docencia`, p.ej. dtos armados a mano): sin
        // detalle por asignatura no hay forma de separar por nivel, así que se cuenta
        // todo como pregrado — igual que el criterio de "sin dato, no bloquear".
        if (asignaturas.length === 0 && Number(dto?.horas_docencia || 0) > 0) {
          horasDocPregrado = Number(dto.horas_docencia) || 0;
        }

        // Se exponen en el DTO para que el listado pueda filtrar por alcance real del
        // usuario (qué componente de Docencia y de qué territorial) sin re-resolver
        // los joins en el cliente.
        dto.docencia_por_componente = {
          academica_pregrado: horasDocPregrado,
          academica_posgrado: horasDocPosgrado,
          academica_territorial: horasDocTerritorial,
        };
        dto.territoriales_docencia_ids = [...territorialesDocencia];

        // Complementarias: mismo enrutamiento que clasificarComplementarias(), pero
        // resuelto en lote (nivelProgramaPorActividadIdLote ya calculado arriba) para
        // no repetir la consulta de configuración por cada PTA de la lista.
        const complementariasRaw: any[] = Array.isArray(dto?.complementarias) ? dto.complementarias : [];
        let horasCompPregrado = 0;
        let horasCompPosgrado = 0;
        let horasCompNinguno = 0;
        const compSeccionesPorBucket: Record<string, { docencia: number; academico_administrativas: number }> = {
          complementarias: { docencia: 0, academico_administrativas: 0 },
          complementarias_pregrado: { docencia: 0, academico_administrativas: 0 },
          complementarias_posgrado: { docencia: 0, academico_administrativas: 0 },
        };
        for (const item of complementariasRaw) {
          const horas = Number(item?.horas) || 0;
          const actividadId = coalesceLookupKey(item?.actividad_id ?? item?.id);
          const nivel = actividadId ? nivelProgramaPorActividadIdLote.get(actividadId) : undefined;
          const bucket = nivel === 'pregrado' ? 'complementarias_pregrado'
            : nivel === 'posgrado' ? 'complementarias_posgrado'
              : 'complementarias';
          if (bucket === 'complementarias_pregrado') horasCompPregrado += horas;
          else if (bucket === 'complementarias_posgrado') horasCompPosgrado += horas;
          else horasCompNinguno += horas;
          const esAadm = this.normalizeCompSeccion(item?.seccion, item) === 'academico_administrativas';
          compSeccionesPorBucket[bucket][esAadm ? 'academico_administrativas' : 'docencia'] += horas;
        }
        // Respaldo cuando el DTO no trae el detalle por ítem (mismo criterio "sin
        // dato, no bloquear" que ya usa Docencia arriba): todo cae en el catch-all.
        if (complementariasRaw.length === 0 && Number(dto?.horas_complementarias || 0) > 0) {
          horasCompNinguno = Number(dto.horas_complementarias) || 0;
          const secciones = dto?.complementarias_secciones || {};
          compSeccionesPorBucket.complementarias = {
            docencia: Number(secciones.complementarias_docencia || 0),
            academico_administrativas: Number(secciones.academico_administrativas || 0),
          };
        }
        dto.complementarias_por_componente = {
          complementarias: horasCompNinguno,
          complementarias_pregrado: horasCompPregrado,
          complementarias_posgrado: horasCompPosgrado,
        };
        dto.complementarias_secciones_por_componente = compSeccionesPorBucket;

        const horasPorComp: Record<string, number> = {
          academica_pregrado: horasDocPregrado,
          academica_posgrado: horasDocPosgrado,
          academica_territorial: horasDocTerritorial,
          investigacion: Number(dto?.horas_investigacion || 0),
          complementarias: horasCompNinguno,
          complementarias_pregrado: horasCompPregrado,
          complementarias_posgrado: horasCompPosgrado,
          ext_capacitacion: extHoras(EXT_SUB_SECTIONS.ext_capacitacion),
          ext_procesos: extHoras(EXT_SUB_SECTIONS.ext_procesos),
          ext_fortalecimiento: extHoras(EXT_SUB_SECTIONS.ext_fortalecimiento),
          ext_gobierno: extHoras(EXT_SUB_SECTIONS.ext_gobierno),
        };

        const hayActividades = Object.values(horasPorComp).some(h => h > 0);
        const recs = estadoByPta.get(dto.id) || new Map<string, string>();
        const reviewRecs = reviewByPta.get(dto.id) || new Map<string, string>();
        const esBorrador = isDraftPtaState(dto?.estado);
        // Un componente cuenta como aprobado si su registro está aprobado o si está vacío
        // (auto-aprobación cuando el PTA tiene actividades), pero únicamente después
        // de que el PTA haya salido de Borrador y comience realmente su revisión.
        const estaAprobado = (k: string) => !esBorrador && (
          recs.get(k) === 'aprobado'
          || (hayActividades && (horasPorComp[k] || 0) === 0)
        );

        // Subsecciones de revisión que aplican a este PTA concreto (mismo criterio
        // que getRequiredSubsecciones, calculado en lote para no hacer N consultas).
        // Docencia ya no necesita caso especial: al ser dos componentes reales, cae
        // en la regla genérica igual que investigación/extensión.
        const requeridasPorComponente = (k: string): string[] => {
          if ((COMPLEMENTARIAS_KEYS_LOTE as string[]).includes(k)) {
            const secciones = compSeccionesPorBucket[k] || { docencia: 0, academico_administrativas: 0 };
            const req: string[] = [];
            if (secciones.docencia > 0) req.push('docencia');
            if (secciones.academico_administrativas > 0) req.push('academico_administrativas');
            return req;
          }
          return (horasPorComp[k] || 0) > 0 ? ['general'] : [];
        };
        const revisionCompleta = (k: string): boolean =>
          requeridasPorComponente(k).every(sub => reviewRecs.get(`${k}:${sub}`) === 'revisado');

        // Componentes de ALTO NIVEL que ve el administrador (4 rótulos): Docencia,
        // Investigación, Extensión, Complementarias — cada uno puede agrupar varios
        // componentes reales (Docencia: 2, Extensión: 4) bajo un solo rótulo/estado.
        const EXT_KEYS = ['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'];
        let total = 0;
        let aprobados = 0;
        const componentesEstado: Array<{
          key: string; label: string; estado: string;
          horas: number; horas_aprobadas: number; horas_pendientes: number;
        }> = [];

        // Docencia colapsada: cuenta como 1 si tiene horas en pregrado y/o posgrado;
        // aprobada solo si TODOS sus sub-componentes con horas lo están. El rótulo de
        // salida se mantiene 'academica' (no 'docencia') por compatibilidad con los
        // consumidores existentes de componentes_estado (reportes, portal docente).
        const docTieneHoras = DOCENCIA_KEYS.reduce((s, k) => s + (horasPorComp[k] || 0), 0) > 0;
        if (docTieneHoras) {
          total++;
          const docAprobada = DOCENCIA_KEYS.every(k => estaAprobado(k));
          if (docAprobada) aprobados++;
          const docEstados = DOCENCIA_KEYS.map(k => recs.get(k)).filter(Boolean);
          const docEnRevision = DOCENCIA_KEYS.some(k => (horasPorComp[k] || 0) > 0 && !revisionCompleta(k));
          let docEstado: string;
          if (esBorrador) docEstado = 'no_iniciado';
          else if (docAprobada) docEstado = 'aprobado';
          else if (docEstados.includes('devuelto')) docEstado = 'devuelto';
          else if (docEnRevision) docEstado = 'en_revision';
          else docEstado = 'pendiente';
          // Horas aprobadas/pendientes se calculan sub-componente por sub-componente
          // (Pregrado/Posgrado/Territorial pueden aprobarse por separado) en vez de
          // usar el booleano colapsado `docAprobada`, que solo es true si TODOS lo están.
          const docHorasTotales = DOCENCIA_KEYS.reduce((s, k) => s + (horasPorComp[k] || 0), 0);
          const docHorasAprobadas = esBorrador ? 0 : DOCENCIA_KEYS.reduce(
            (s, k) => s + (estaAprobado(k) ? (horasPorComp[k] || 0) : 0), 0,
          );
          componentesEstado.push({
            key: 'academica',
            label: 'Docencia',
            estado: docEstado,
            horas: docHorasTotales,
            horas_aprobadas: docHorasAprobadas,
            horas_pendientes: docHorasTotales - docHorasAprobadas,
          });
        }

        for (const c of BASE_KEYS) {
          total++;
          const aprobado = estaAprobado(c);
          if (aprobado) aprobados++;
          let estado: string;
          if (esBorrador) estado = 'no_iniciado';
          else if (aprobado) estado = 'aprobado';
          else if (recs.get(c) === 'devuelto') estado = 'devuelto';
          else if (!revisionCompleta(c)) estado = 'en_revision';
          else estado = recs.get(c) || 'pendiente';
          const horasTotales = horasPorComp[c] || 0;
          const horasAprobadas = aprobado ? horasTotales : 0;
          componentesEstado.push({
            key: c,
            label: 'Investigacion',
            estado,
            horas: horasTotales,
            horas_aprobadas: horasAprobadas,
            horas_pendientes: horasTotales - horasAprobadas,
          });
        }

        // Complementarias colapsada: mismo patrón que Docencia — cuenta como 1 si
        // tiene horas en cualquiera de sus 3 componentes (sin programa/pregrado/
        // posgrado); aprobada solo si TODOS los que tienen horas lo están. El rótulo
        // de salida se mantiene 'complementarias' por compatibilidad.
        const compTieneHoras = COMPLEMENTARIAS_KEYS_LOTE.reduce((s, k) => s + (horasPorComp[k] || 0), 0) > 0;
        if (compTieneHoras) {
          total++;
          const compAprobada = COMPLEMENTARIAS_KEYS_LOTE.every(k => estaAprobado(k));
          if (compAprobada) aprobados++;
          const compEstados = COMPLEMENTARIAS_KEYS_LOTE.map(k => recs.get(k)).filter(Boolean);
          const compEnRevision = COMPLEMENTARIAS_KEYS_LOTE.some(k => (horasPorComp[k] || 0) > 0 && !revisionCompleta(k));
          let compEstado: string;
          if (esBorrador) compEstado = 'no_iniciado';
          else if (compAprobada) compEstado = 'aprobado';
          else if (compEstados.includes('devuelto')) compEstado = 'devuelto';
          else if (compEnRevision) compEstado = 'en_revision';
          else compEstado = 'pendiente';
          // Igual que Docencia: horas aprobadas por sub-componente propio (sin
          // programa / pregrado / posgrado), no por el booleano colapsado.
          const compHorasTotales = COMPLEMENTARIAS_KEYS_LOTE.reduce((s, k) => s + (horasPorComp[k] || 0), 0);
          const compHorasAprobadas = esBorrador ? 0 : COMPLEMENTARIAS_KEYS_LOTE.reduce(
            (s, k) => s + (estaAprobado(k) ? (horasPorComp[k] || 0) : 0), 0,
          );
          componentesEstado.push({
            key: 'complementarias',
            label: 'Complementarias',
            estado: compEstado,
            horas: compHorasTotales,
            horas_aprobadas: compHorasAprobadas,
            horas_pendientes: compHorasTotales - compHorasAprobadas,
          });
        }
        // Extensión colapsada: cuenta como 1 si tiene horas; aprobada solo si TODAS sus subsecciones lo están.
        const extTieneHoras = EXT_KEYS.reduce((s, k) => s + (horasPorComp[k] || 0), 0) > 0;
        if (extTieneHoras) {
          total++;
          const extAprobada = EXT_KEYS.every(k => estaAprobado(k));
          if (extAprobada) aprobados++;
          const extEstados = EXT_KEYS.map(k => recs.get(k)).filter(Boolean);
          const extEnRevision = EXT_KEYS.some(k => (horasPorComp[k] || 0) > 0 && !revisionCompleta(k));
          let extEstado: string;
          if (esBorrador) extEstado = 'no_iniciado';
          else if (extAprobada) extEstado = 'aprobado';
          else if (extEstados.includes('devuelto')) extEstado = 'devuelto';
          else if (extEnRevision) extEstado = 'en_revision';
          else extEstado = 'pendiente';
          // Igual patrón: cada sección de Extensión (capacitación, procesos,
          // fortalecimiento, alto gobierno) se aprueba de forma independiente.
          const extHorasTotales = EXT_KEYS.reduce((s, k) => s + (horasPorComp[k] || 0), 0);
          const extHorasAprobadas = esBorrador ? 0 : EXT_KEYS.reduce(
            (s, k) => s + (estaAprobado(k) ? (horasPorComp[k] || 0) : 0), 0,
          );
          componentesEstado.push({
            key: 'extension',
            label: 'Extension',
            estado: extEstado,
            horas: extHorasTotales,
            horas_aprobadas: extHorasAprobadas,
            horas_pendientes: extHorasTotales - extHorasAprobadas,
          });
        }

        dto.componentes_total = total;
        dto.componentes_aprobados = aprobados;
        dto.componentes_estado = componentesEstado;
      } catch {
        // No romper la lista por un DTO problemático.
      }
    }
  }

  private toEvidenciaDto(entity: PtaEvidenciaEntity) {
    return {
      id: entity.id,
      ptaId: entity.ptaId,
      pta_id: entity.ptaId,
      nombre: entity.nombre,
      tipoArchivo: entity.tipoArchivo,
      tipo_archivo: entity.tipoArchivo,
      tamanioBytes: entity.tamanioBytes,
      tamanio_bytes: entity.tamanioBytes,
      tamanio: entity.tamanioBytes,
      categoria: entity.categoria,
      componentePta: entity.componentePta,
      componente_pta: entity.componentePta,
      seccionExtension: entity.seccionExtension,
      seccion_extension: entity.seccionExtension,
      horasAvance: entity.horasAvance,
      horas_avance: entity.horasAvance,
      storageUrl: entity.storageUrl,
      storage_url: entity.storageUrl,
      subidoPor: entity.subidoPor,
      subido_por: entity.subidoPor,
      descripcion: entity.descripcion,
      estado: entity.estado,
      estadoRevision: entity.estadoRevision,
      estado_revision: entity.estadoRevision,
      revisadoPor: entity.revisadoPor,
      revisado_por: entity.revisadoPor,
      comentarioRevision: entity.comentarioRevision,
      comentario_revision: entity.comentarioRevision,
      createdAt: entity.createdAt,
      created_at: entity.createdAt,
      updatedAt: entity.updatedAt,
      updated_at: entity.updatedAt,
      fecha_subida: entity.createdAt,
    };
  }

  /**
   * Incorpora al Seguimiento la resolución registrada durante la creación del
   * PTA una vez que este alcanza un estado aprobado. La categoría estable
   * permite actualizar el mismo soporte sin generar duplicados.
   */
  private async syncResolucionProyectoInvestigacion(
    ptaId: string,
    input: SavePtaInput,
  ): Promise<void> {
    const proyecto = input?.investigacion_proyecto;
    const storageUrl = coalesceString(proyecto?.resolucion_archivo_url);
    const horasJustificar = resolveHorasResolucionProyecto(proyecto);
    const existing = await this.evidenciaRepo.findOne({
      where: {
        ptaId,
        categoria: CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION_CREACION,
      },
      order: { updatedAt: 'DESC' },
    });

    if (!storageUrl || horasJustificar <= 0) {
      // Un soporte ya aprobado forma parte de la trazabilidad y nunca se borra.
      // Solo se elimina una fila anticipada de versiones anteriores que todavía
      // no alcanzó la aprobación del componente.
      if (existing && normalizeEstadoFilter(existing.estadoRevision) !== 'APROBADO') {
        await this.evidenciaRepo.delete({ id: existing.id, ptaId });
      }
      return;
    }

    const nombre = coalesceString(
      proyecto?.resolucion_archivo_nombre,
      proyecto?.resolucion_nombre,
    ) || storageUrl.split('/').pop() || 'Resolución de investigación';
    const tipoArchivo = coalesceString(proyecto?.resolucion_archivo_tipo)
      || nombre.split('.').pop()
      || 'pdf';
    const tamanioBytes = Math.max(0, Number(proyecto?.resolucion_archivo_tamanio) || 0);
    const descripcion = [
      'Resolución del proyecto',
      coalesceString(proyecto?.nombre),
      coalesceString(proyecto?.resolucion_nombre),
    ].filter(Boolean).join(' · ');

    if (!existing) {
      await this.evidenciaRepo.save(this.evidenciaRepo.create({
        ptaId,
        nombre,
        tipoArchivo,
        tamanioBytes,
        categoria: CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION_CREACION,
        componentePta: 'investigacion',
        seccionExtension: null,
        horasAvance: horasJustificar,
        storageUrl,
        subidoPor: coalesceString(input?.docente_nombre, input?.docenteNombre) as any,
        descripcion,
        estado: 'activo',
        estadoRevision: 'aprobado',
        revisadoPor: 'Sistema',
        comentarioRevision: COMENTARIO_RESOLUCION_PROYECTO_APROBADA,
      }));
      return;
    }

    const yaEstabaAprobado =
      normalizeEstadoFilter(existing.estadoRevision) === 'APROBADO';
    await this.evidenciaRepo.save({
      ...existing,
      nombre,
      tipoArchivo,
      tamanioBytes,
      componentePta: 'investigacion',
      horasAvance: horasJustificar,
      storageUrl,
      subidoPor: coalesceString(input?.docente_nombre, input?.docenteNombre)
        ?? existing.subidoPor,
      descripcion,
      estado: 'activo',
      // Esta evidencia ya fue evaluada como parte del componente Investigación:
      // no debe abrir una segunda aprobación en Seguimiento.
      estadoRevision: 'aprobado',
      revisadoPor: yaEstabaAprobado
        ? (existing.revisadoPor || 'Sistema')
        : 'Sistema',
      comentarioRevision: yaEstabaAprobado
        ? (existing.comentarioRevision || COMENTARIO_RESOLUCION_PROYECTO_APROBADA)
        : COMENTARIO_RESOLUCION_PROYECTO_APROBADA,
    });
  }

  async getAllPTAs(filters: any) {
    // Sweep perezoso: elimina PTAs vencidos (sin aprobar dentro del plazo) al
    // consultar el listado del backoffice, como máximo una vez por hora.
    this.purgarPtasVencidosThrottled();

    const qb = this.ptaRepo.createQueryBuilder('pta');

    const estadoFilter = coalesceString(filters?.estado);
    if (estadoFilter) {
      const groupedEstados = getGroupedPtaEstados(estadoFilter);
      if (groupedEstados?.length) {
        qb.andWhere('pta.estado IN (:...estados)', { estados: groupedEstados });
      } else {
        qb.andWhere('pta.estado = :estado', { estado: estadoFilter });
      }
    }
    if (filters?.periodo) {
      qb.andWhere('pta.periodo = :periodo', { periodo: String(filters.periodo) });
    }

    qb.orderBy('pta.updatedAt', 'DESC');
    qb.take(Math.min(Number(filters?.limit || 200), 500));

    const rows = await qb.getMany();
    const extMult = await this.getExtMultiplicadores();
    const dtos = rows.map((row) => this.toPtaDto(row, extMult));
    await this.attachPtaReferenceDates(dtos);
    return this.sortPtasByReferenceDate(await this.enrichPtaSummaries(dtos));
  }

  async getPTAsByDocente(docenteId: string, periodo?: string | undefined) {
    const docenteIds = await this.resolveDocenteIdentityIds(docenteId, { periodo });
    const qb = this.ptaRepo.createQueryBuilder('pta');
    qb.andWhere('pta.docenteId IN (:...docenteIds)', { docenteIds });
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    qb.orderBy('pta.updatedAt', 'DESC');
    const rows = await qb.getMany();
    const extMult = await this.getExtMultiplicadores();
    const dtos = rows.map((row) => this.toPtaDto(row, extMult));
    await this.attachPtaReferenceDates(dtos);
    return this.sortPtasByReferenceDate(await this.enrichPtaSummaries(dtos));
  }

  async getPTAById(id: string) {
    const pta = await this.ptaRepo.findOne({ where: { id } });
    if (!pta) throw new NotFoundException('PTA no encontrado');

    const [evidencias, historial] = await Promise.all([
      this.evidenciaRepo.find({ where: { ptaId: id }, order: { createdAt: 'DESC' } }),
      this.historialRepo.find({ where: { ptaId: id }, order: { createdAt: 'DESC' } }),
    ]);

    const [dto] = await this.enrichPtaSummaries([
      this.toPtaDto(pta, await this.getExtMultiplicadores()) as any,
    ]);
    await this.attachPtaReferenceDates([dto]);

    if (dto.asignaturas && Array.isArray(dto.asignaturas)) {
      // Reconciliar primero referencias legacy. Una recarga completa del catálogo
      // puede conservar código/nombre pero cambiar el id interno de la asignatura.
      dto.asignaturas = await this.syncAsignaturasPensum(dto.asignaturas, false);
      const asigIds = dto.asignaturas.map((a: any) => a.asignatura_id).filter(Boolean);
      if (asigIds.length > 0) {
        try {
          const subjects = await this.asignaturaRepo.query(
            `SELECT a.id, a.pensum, a.id_programa, a.nombre, a.codigo, nt.nombre AS nucleo
             FROM academic_work_plan.asignatura a
             LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id = a.id_nucleo_tematico
             WHERE a.id::text IN (${asigIds.map((_, idx) => `$${idx + 1}`).join(', ')})`,
            asigIds.map(id => String(id))
          );
          const subjectMap = new Map<string, any>(
            subjects.map((s: any) => [String(s.id), s]),
          );
          dto.asignaturas = dto.asignaturas.map((a: any) => {
            const subject = subjectMap.get(String(a.asignatura_id));
            if (!subject) return a;
            const pensum = String(subject.pensum || '').trim() || '__SIN_PENSUM__';
            return {
              ...a,
              programa_id: a.programa_id || subject.id_programa,
              asignatura_nombre: a.asignatura_nombre || subject.nombre,
              asignatura_codigo: a.asignatura_codigo || subject.codigo,
              nucleo_tematico: subject.nucleo || a.nucleo_tematico,
              pensum,
            };
          });
        } catch (err) {
          console.error('[getPTAById] Error resolving nucleo tematico names:', err);
        }
      }

      // Los cupos pertenecen a la oferta CETAP + programa del periodo, no al
      // borrador del PTA. Al abrir un PTA siempre se devuelve el valor vigente,
      // incluso si la asignatura fue guardada antes de que cambiaran los cupos.
      dto.asignaturas = await this.syncAsignaturasCupos(
        dto.asignaturas,
        coalesceString(dto.periodo, pta.periodo),
      );

      // Anota por asignatura a QUÉ componente de Docencia pertenece
      // (academica_pregrado / academica_posgrado / academica_territorial), para que el
      // frontend arme sus tarjetas sin repetir los joins a programa.tipo ni a
      // auth.seccionales. `nivel_programa` se conserva por compatibilidad con
      // consumidores previos al enrutamiento territorial.
      try {
        const part = await this.clasificarAsignaturasDocencia(dto.asignaturas);
        // Se indexa por identidad de objeto: clasificarAsignaturasDocencia reparte las
        // MISMAS referencias que recibe, sin clonarlas.
        const componentePorAsignatura = new Map<any, string>();
        for (const key of DOCENCIA_COMPONENT_KEYS) {
          for (const a of part[key as keyof typeof part]) componentePorAsignatura.set(a, key);
        }
        dto.asignaturas = dto.asignaturas.map((a: any) => {
          const componente = componentePorAsignatura.get(a) || 'academica_pregrado';
          return {
            ...a,
            componente_docencia: componente,
            nivel_programa: componente === 'academica_posgrado' ? 'posgrado' : 'pregrado',
          };
        });
      } catch (err) {
        console.error('[getPTAById] Error resolving componente_docencia:', err);
      }
    }

    // Anota por actividad complementaria a QUÉ componente pertenece
    // (complementarias / complementarias_pregrado / complementarias_posgrado), mismo
    // patrón que componente_docencia arriba, para que el frontend restrinja edición
    // por fila sin reimplementar la clasificación.
    if (Array.isArray(dto.complementarias) && dto.complementarias.length > 0) {
      try {
        const part = await this.clasificarComplementarias({ complementarias: dto.complementarias });
        const componentePorItem = new Map<any, string>();
        for (const key of COMPLEMENTARIAS_COMPONENT_KEYS) {
          for (const item of (part as any)[key]) componentePorItem.set(item, key);
        }
        dto.complementarias = dto.complementarias.map((item: any) => ({
          ...item,
          componente_complementaria: componentePorItem.get(item) || 'complementarias',
        }));
      } catch (err) {
        console.error('[getPTAById] Error resolving componente_complementaria:', err);
      }
    }

    return {
      ...dto,
      evidencias: evidencias.map((e) => this.toEvidenciaDto(e)),
      historialEstados: historial,
    };
  }

  private async mergeRestrictedAdminEditInput(
    input: SavePtaInput,
    existing: PlanTrabajoAcademicoEntity,
    allowedComponentKeys: string[],
    // Solo se usa para 'academica_territorial' cuando el PTA tiene 2+ territoriales:
    // acota la edición docente a las filas de la(s) territorial(es) efectivamente
    // devuelta(s), dejando intactas las de otras territoriales (ej. una ya
    // aprobada). `undefined` = sin filtro adicional (comportamiento de siempre).
    territorialesDevueltas?: string[],
  ): Promise<SavePtaInput> {
    const existingData = existing.datosEstructurados && typeof existing.datosEstructurados === 'object'
      ? existing.datosEstructurados as Record<string, any>
      : {};
    const allowed = new Set(allowedComponentKeys.map(key => String(key)));
    const merged: SavePtaInput = { ...input };

    const preserveField = (field: string) => {
      if (Object.prototype.hasOwnProperty.call(existingData, field)) {
        merged[field] = existingData[field];
      }
    };

    merged.id = existing.id;
    merged.docente_id = existing.docenteId;
    merged.periodo = existing.periodo;
    merged.estado = existing.estado;
    ['docente_nombre', 'dedicacion', 'tipo_vinculacion', 'semanas_vinculacion', 'semanas_prorrateo', 'horas_a_programar'].forEach(preserveField);

    // Docencia se enruta a TRES componentes (pregrado / posgrado / territorial) pero
    // comparte un único array `asignaturas`. Si el alcance autorizado no los cubre a
    // todos hay que partir el array: se aceptan del payload solo las asignaturas de
    // los componentes autorizados y se conservan intactas las del resto. Sin esto,
    // devolver Docencia (Pregrado) dejaba que el reenvío del docente sobreescribiera
    // también Posgrado y las asignaturas territoriales.
    const docenciaAutorizada = DOCENCIA_COMPONENT_KEYS.filter(key => allowed.has(key));
    if (docenciaAutorizada.length === 0) {
      preserveField('asignaturas');
    } else if (docenciaAutorizada.length < DOCENCIA_COMPONENT_KEYS.length) {
      const entrantes = Array.isArray(input.asignaturas) ? input.asignaturas : [];
      const previas = Array.isArray(existingData.asignaturas) ? existingData.asignaturas : [];
      const partPrevias = await this.clasificarAsignaturasDocencia(previas);

      // El alcance autorizado se decide por el componente ORIGINAL de cada fila
      // (dónde estaba antes de la edición), no por el componente que resultaría
      // de reclasificar los datos que el docente acaba de cambiar. Si se
      // reclasificara por el valor nuevo, cambiar programa/territorial de una
      // fila autorizada podía moverla a un balde no autorizado y perderse (se
      // descartaba del entrante y tampoco existía en el previo de ese balde).
      const componenteOriginalPorId = new Map<string, string>();
      for (const key of DOCENCIA_COMPONENT_KEYS) {
        for (const a of partPrevias[key]) {
          const rowId = coalesceLookupKey((a as any)?.id);
          if (rowId) componenteOriginalPorId.set(rowId, key);
        }
      }
      const entrantesPorComponenteOriginal: Record<string, any[]> = {
        academica_pregrado: [], academica_posgrado: [], academica_territorial: [],
      };
      const entrantesNuevas: any[] = [];
      for (const a of entrantes) {
        const rowId = coalesceLookupKey((a as any)?.id);
        const originalKey = rowId ? componenteOriginalPorId.get(rowId) : undefined;
        if (originalKey) entrantesPorComponenteOriginal[originalKey].push(a);
        else entrantesNuevas.push(a);
      }
      // Las filas nuevas (sin contraparte previa) no tienen componente original:
      // se clasifican por sus propios datos, igual que antes.
      const partNuevas = await this.clasificarAsignaturasDocencia(entrantesNuevas);

      const devueltasSet = territorialesDevueltas && territorialesDevueltas.length > 0
        ? new Set(territorialesDevueltas.map((v) => String(v)))
        : null;

      merged.asignaturas = DOCENCIA_COMPONENT_KEYS.flatMap(key => {
        if (!allowed.has(key)) return partPrevias[key];
        const combinadas = [...entrantesPorComponenteOriginal[key], ...partNuevas[key]];
        if (key !== 'academica_territorial' || !devueltasSet) return combinadas;

        // Aprobación parcial por territorial: dentro de 'academica_territorial' solo
        // se aceptan cambios en las filas de la(s) territorial(es) efectivamente
        // devuelta(s) (`devueltasSet`); las de otras territoriales (ej. una ya
        // aprobada, o aún pendiente) se conservan intactas aunque vengan en el
        // payload del docente, y no se puede eliminarlas ni agregar filas nuevas
        // fuera de la territorial devuelta.
        const previaPorId = new Map<string, any>();
        for (const a of partPrevias[key]) {
          const rowId = coalesceLookupKey((a as any)?.id);
          if (rowId) previaPorId.set(rowId, a);
        }
        const vistos = new Set<string>();
        const resultado: any[] = [];
        for (const a of combinadas) {
          const rowId = coalesceLookupKey((a as any)?.id);
          const previa = rowId ? previaPorId.get(rowId) : undefined;
          // La territorial que decide si la fila es editable es la ORIGINAL (antes
          // de la edición), no la que venga en el payload: si se usara la entrante,
          // el docente podría "liberar" una fila bloqueada reescribiendo su
          // territorial_id por el de la territorial sí devuelta. Solo las filas
          // nuevas (sin contraparte previa) no tienen territorial original, así
          // que ahí sí se usa la propia.
          const territorialOriginal = previa
            ? coalesceLookupKey((previa as any)?.territorial_id)
            : coalesceLookupKey((a as any)?.territorial_id);
          if (territorialOriginal && devueltasSet.has(territorialOriginal)) {
            resultado.push(a);
          } else if (previa) {
            resultado.push(previa);
          } else {
            continue; // fila nueva fuera de la territorial devuelta: se descarta.
          }
          if (rowId) vistos.add(rowId);
        }
        for (const [id, previa] of previaPorId) {
          if (vistos.has(id)) continue;
          const territorialId = coalesceLookupKey((previa as any)?.territorial_id);
          if (territorialId && !devueltasSet.has(territorialId)) resultado.push(previa);
        }
        return resultado;
      });
    }
    if (!allowed.has('investigacion')) {
      preserveField('investigacion_proyecto');
      preserveField('investigacion_actividades');
    }
    // Complementarias se enruta a TRES componentes (sin programa / pregrado / posgrado,
    // ver clasificarComplementarias) pero comparte un único array `complementarias`.
    // Mismo patrón de partición que Docencia arriba: si el alcance autorizado no los
    // cubre a todos, se aceptan del payload solo los ítems de los componentes
    // autorizados y se conservan intactos los del resto.
    const complementariasAutorizada = COMPLEMENTARIAS_COMPONENT_KEYS.filter(key => allowed.has(key));
    if (complementariasAutorizada.length === 0) {
      // Complementarias ahora incluye la sección académico-administrativa; se preserva
      // también el array legacy academico_admin para PTAs no migrados.
      preserveField('complementarias');
      preserveField('academico_admin');
    } else if (complementariasAutorizada.length < COMPLEMENTARIAS_COMPONENT_KEYS.length) {
      const entrantes = Array.isArray(input.complementarias) ? input.complementarias : [];
      const [partEntrantes, partPrevias] = await Promise.all([
        this.clasificarComplementarias({ complementarias: entrantes }),
        this.clasificarComplementarias(existingData),
      ]);
      merged.complementarias = COMPLEMENTARIAS_COMPONENT_KEYS.flatMap(key =>
        allowed.has(key) ? (partEntrantes as any)[key] : (partPrevias as any)[key],
      );
      preserveField('academico_admin');
    }

    const hasAnyExtensionPermission = COMPONENT_APPROVAL_KEYS
      .filter(key => key.startsWith('ext_'))
      .some(key => allowed.has(key));
    if (!hasAnyExtensionPermission) {
      preserveField('extension_actividades');
    } else {
      const submittedExt = Array.isArray(input?.extension_actividades) ? input.extension_actividades : [];
      const existingExt = Array.isArray(existingData?.extension_actividades) ? existingData.extension_actividades : [];
      const submittedAllowed = submittedExt.filter((act: any) => allowed.has(componentKeyForExtensionSection(act?.seccion)));
      const preservedUnauthorized = existingExt.filter((act: any) => !allowed.has(componentKeyForExtensionSection(act?.seccion)));
      merged.extension_actividades = [...preservedUnauthorized, ...submittedAllowed];
    }

    return merged;
  }

  async savePTA(input: SavePtaInput, auth?: PtaAuthenticatedUser) {
    let id = coalesceString(input?.id);
    let periodo = coalesceString(input?.periodo) || '2026-1';
    const isAdminEdit = Boolean(input?._adminEdit);
    if (auth && isAdminEdit) {
      const puedeEditarComoAdmin = auth.isSuperUser
        || auth.approvesAll
        || auth.allowedComponents.length > 0
        || auth.permissions.has('pta.backoffice.editar')
        || auth.permissions.has('pta.backoffice.concertar')
        || auth.permissions.has('pta.backoffice.crear');
      if (!puedeEditarComoAdmin) {
        throw new ForbiddenException('No tienes permiso para editar PTA desde el backoffice.');
      }
    }
    let existingForDocenteEdit: PlanTrabajoAcademicoEntity | null = null;
    const allowedComponentKeys = Array.isArray(input?._allowed_component_keys)
      ? input._allowed_component_keys
        .map((key: unknown) => String(key))
        .filter((key: string) => COMPONENT_APPROVAL_KEY_SET.has(key))
      : [];
    if (isAdminEdit && id && allowedComponentKeys.length > 0) {
      const existingForRestrictedEdit = await this.ptaRepo.findOne({ where: { id } });
      if (!existingForRestrictedEdit) {
        throw new NotFoundException('PTA no encontrado');
      }
      input = await this.mergeRestrictedAdminEditInput(input, existingForRestrictedEdit, allowedComponentKeys);
      id = existingForRestrictedEdit.id;
    }
    if (!isAdminEdit && id) {
      existingForDocenteEdit = await this.ptaRepo.findOne({ where: { id } });
      if (!existingForDocenteEdit) {
        throw new NotFoundException('PTA no encontrado');
      }

      const estadoEditable = normalizeEstadoFilter(existingForDocenteEdit.estado);
      const esEstadoEditable = estadoEditable === 'BORRADOR'
        || estadoEditable === 'DEVUELTO'
        || REVISION_DOCENTE_STATES.has(existingForDocenteEdit.estado);
      if (!esEstadoEditable) {
        throw new BadRequestException(
          'Este PTA no está habilitado para edición. Debes solicitar la edición de uno o más componentes.',
        );
      }

      // La restricción se vuelve a aplicar en servidor: aunque el navegador envíe
      // campos de otros componentes, únicamente se persisten los autorizados por
      // la solicitud/devolución vigente.
      if (REVISION_DOCENTE_STATES.has(existingForDocenteEdit.estado)) {
        const devueltos = await this.ptaComponentApprovalRepo.find({
          where: {
            ptaId: existingForDocenteEdit.id,
            componente: In([...COMPONENT_APPROVAL_KEYS]),
            estado: 'devuelto',
          },
        });
        const componentesEditables = devueltos.map(row => row.componente);
        if (componentesEditables.length > 0) {
          // 'academica_territorial' devuelto por una sola territorial (de 2+ que
          // tenga el PTA) no habilita a corregir TODAS: solo la(s) efectivamente
          // devuelta(s) (fila con estado 'devuelto' en PtaTerritorialApproval).
          let territorialesDevueltas: string[] | undefined;
          if (componentesEditables.includes('academica_territorial')) {
            const territorialesPta = await this.getTerritorialesDelComponente(existingForDocenteEdit);
            if (territorialesPta.length >= 2) {
              const filasTerritorial = await this.ptaTerritorialApprovalRepo.find({
                where: { ptaId: existingForDocenteEdit.id, estado: 'devuelto' },
              });
              territorialesDevueltas = filasTerritorial.map(row => row.territorialId);
            }
          }
          input = await this.mergeRestrictedAdminEditInput(
            input,
            existingForDocenteEdit,
            componentesEditables,
            territorialesDevueltas,
          );
        }
      }
      input.docente_id = existingForDocenteEdit.docenteId;
      input.periodo = existingForDocenteEdit.periodo;
      // Guardar el formulario nunca debe realizar una transición de estado. El
      // estado vigente solo puede cambiar por updatePTAStatus (envío/reenvío) o
      // por una decisión del flujo de aprobación. Esto protege también a
      // pestañas antiguas que hayan quedado abiertas antes de una reapertura.
      input.estado = existingForDocenteEdit.estado;
      periodo = existingForDocenteEdit.periodo;
    }

    const docenteKey = coalesceString(
      input?.docente_id,
      input?.docenteId,
      input?.docente?.id,
      input?.docente?.personaId,
    );
    const fallbackTerritorial = Array.isArray(input?.asignaturas) && input.asignaturas.length > 0 ? input.asignaturas[0].territorial_id : undefined;
    const { personId: docenteId, fullName: dbName } = await this.resolveDocenteIdCached(docenteKey || '', {
      fallbackTerritorial,
      adminEdit: isAdminEdit,
      periodo,
    });
    if (existingForDocenteEdit && existingForDocenteEdit.docenteId !== docenteId) {
      throw new ForbiddenException('No puedes editar un PTA perteneciente a otro docente.');
    }
    if (auth && !isAdminEdit) {
      if (!auth.userId) throw new ForbiddenException('No fue posible identificar al docente autenticado.');
      const docenteAutenticado = await this.resolveDocenteId(auth.userId, { periodo });
      if (docenteAutenticado !== docenteId) {
        throw new ForbiddenException('No puedes guardar un PTA perteneciente a otro docente.');
      }
    }

    // Enrich identity if missing
    if (!input.docente_nombre) {
      input.docente_nombre = dbName;
    }

    let estado = coalesceString(input?.estado) || 'BORRADOR';

    // No confiar en el total enviado por el navegador: puede venir de un
    // borrador abierto antes de una modificación de cupos. La oferta académica
    // es la fuente única y se vuelve a consultar antes de validar/persistir.
    if (Array.isArray(input?.asignaturas)) {
      const asignaturasConPensum = await this.syncAsignaturasPensum(input.asignaturas, false);
      input = {
        ...input,
        asignaturas: await this.syncAsignaturasCupos(asignaturasConPensum, periodo),
      };
    }

    // Normalize state case
    if (estado.toLowerCase() === 'borrador') estado = 'Borrador';

    // Solicitud aprobada que habilita este segundo PTA; se consume tras crearlo
    // (estado → 'gestionada') para que el permiso no quede abierto indefinidamente.
    let solicitudUsada: SolicitudPtaEntity | null = null;

    // Regla legacy: máximo 1 PTA activo salvo solicitud aprobada.
    if (!id && !isAdminEdit) {
      const ESTADOS_ACTIVOS = [
        'BORRADOR',
        'Borrador',
        'PROPUESTO_POR_DIRECCION',
        'NOTIFICADO_DOCENTE',
        'ACEPTADO_DOCENTE',
        'MODIFICADO_DOCENTE',
        'OBJETADO_DOCENTE',
        'EN_CONCERTACION',
        'CONCERTADO',
        'ESCALADO_SNA',
        'Pendiente Jefatura',
        'Pendiente Decanatura',
        'Pendiente Gestión Profesoral',
        'PENDIENTE_APROBACION',
        'REVISION_DOCENTE_N1',
        'REVISION_DOCENTE_N2',
        'REVISION_DOCENTE_N3',
        'Devuelto',
        'Aprobado',
      ];

      const ptaActivo = await this.ptaRepo.findOne({
        where: { docenteId, estado: In(ESTADOS_ACTIVOS as any) } as any,
        select: { id: true, estado: true } as any,
      });

      if (ptaActivo) {
        const estadoActivo = String(ptaActivo.estado || '').toLowerCase();
        // Si el único PTA activo es un BORRADOR, el docente lo está editando/enviando:
        // reutilizamos su id para ACTUALIZARLO en vez de bloquear (el front a veces no
        // reenvía el id al guardar). Solo bloqueamos si ya hay un PTA enviado/en proceso.
        if (estadoActivo === 'borrador') {
          id = ptaActivo.id;
        } else {
          const solicitud = await this.solicitudRepo.findOne({
            where: {
              docenteId,
              estado: 'aprobado',
              tipoSolicitud: SOLICITUD_CREACION_TIPO,
            } as any,
            order: { resolucionFecha: 'DESC' as any, updatedAt: 'DESC' as any } as any,
          });
          if (!solicitud) {
            throw new BadRequestException(
              'Ya tienes un Plan de Trabajo en ejecución. Finalizá o esperá su aprobación antes de crear uno nuevo.',
            );
          }
          solicitudUsada = solicitud;
        }
      }
    }

    const horasAProgramar = await this.resolveHorasAProgramar(docenteId, input);
    // Mantener sincronizados la columna tipada y el JSON estructurado. El cliente
    // no puede imponer una bolsa distinta a la registrada en Banco de Docentes.
    input = {
      ...input,
      horas_a_programar: horasAProgramar,
      horas_asignables: horasAProgramar,
      investigacion_proyecto: input?.investigacion_proyecto
        ? {
            ...input.investigacion_proyecto,
            // Compatibilidad para consumidores anteriores: el valor recibido se
            // ignora y siempre replica la totalidad de horas del proyecto.
            resolucion_horas_justificar: Math.max(
              0,
              Math.round(Number(input.investigacion_proyecto.horas_solicitadas) || 0),
            ),
          }
        : input?.investigacion_proyecto,
      complementarias: Array.isArray(input?.complementarias)
        ? input.complementarias.map((activity: any) => activity?.consumeTotalidad === true
          ? { ...activity, horas: horasAProgramar }
          : activity)
        : input?.complementarias,
    };
    const extMult = await this.getExtMultiplicadores();
    const horas = this.computeHorasTotales(input, extMult);
    const ptaRules = (await this.getConfiguracionPTAGlobal()) || {};

    // La edición de Concertación puede conservar el mismo estado y por eso no
    // siempre pasa por la validación completa de envío. Si el revisor tiene el
    // componente de Investigación en su alcance, se aplican igualmente la regla
    // de coexistencia y sus topes antes de persistir los cambios.
    const adminPuedeEditarInvestigacion = isAdminEdit
      && (allowedComponentKeys.length === 0 || allowedComponentKeys.includes('investigacion'));
    if (adminPuedeEditarInvestigacion) {
      this.validateInvestigacionComponent(input, horas, horasAProgramar, ptaRules);
    }

    if (isPendingRoleApprovalState(estado)) {
      this.validatePtaForSubmission(input, horas, horasAProgramar, ptaRules);
    }

    const patch: Partial<PlanTrabajoAcademicoEntity> = {
      docenteId,
      periodo,
      estado,
      motivoDevolucion: input?.motivo_devolucion ?? input?.motivoDevolucion ?? null,
      observaciones: input?.observaciones_docente ?? input?.observaciones ?? null,
      datosEstructurados: input,
      horasTotales: horas.total,
      dedicacion: coalesceString(input?.dedicacion) as any,
      horasAsignables: Number.isFinite(horasAProgramar) ? Number(horasAProgramar) : null,
      semanasVinculacion: input?.semanas_vinculacion != null ? Number(input?.semanas_vinculacion) : null,
      tipoVinculacion: coalesceString(input?.tipo_vinculacion) as any,
    };

    let saved: PlanTrabajoAcademicoEntity;
    let estadoAnteriorSave: string | null = null;

    if (id) {
      const existing = await this.ptaRepo.findOne({ where: { id } });
      if (!existing) {
        saved = await this.ptaRepo.save(this.ptaRepo.create({ ...patch, id, version: 1 }));
      } else {
        estadoAnteriorSave = existing.estado;
        saved = await this.ptaRepo.save({ ...existing, ...patch });
      }
    } else {
      saved = await this.ptaRepo.save(this.ptaRepo.create({ ...patch, version: 1 }));
    }

    if (isPtaHabilitadoParaSeguimientoPorEstado(saved.estado)) {
      await this.syncResolucionProyectoInvestigacion(saved.id, input);
      await this.syncPtaSeguimientoEstado(saved.id);
    }

    // Registrar en historial cuando hay creación, cambio de estado, o edición admin.
    // La edición admin (misma etapa, sin cambio de estado) también se registra para que
    // quede trazada en la pestaña "Trazabilidad" con actor "Administrador" y su snapshot R-XX.
    const tipoAccionSave = !estadoAnteriorSave ? 'CREACION'
      : estado !== estadoAnteriorSave ? 'CAMBIO_ESTADO'
      : isAdminEdit ? 'EDICION_ADMIN'
      : 'GUARDADO';
    if (!estadoAnteriorSave || estado !== estadoAnteriorSave || !id || isAdminEdit) {
      await this.historialRepo.save(this.historialRepo.create({
        ptaId: saved.id,
        estadoAnterior: estadoAnteriorSave,
        estadoNuevo: saved.estado,
        actorId: coalesceString(input?.docente_id, input?.docenteId),
        actorRol: isAdminEdit ? 'Administrador' : 'Docente',
        tipoAccion: tipoAccionSave,
        comentarios: input?.observaciones_docente || null,
        snapshotPta: input,
        version: saved.version,
      }));
    }

    // Evento para realtime sync
    await this.logEvento({
      ptaId: saved.id,
      tipo: tipoAccionSave === 'CREACION' ? 'notificacion' : tipoAccionSave === 'CAMBIO_ESTADO' ? 'cambio_estado' : 'guardado',
      docenteId: coalesceString(input?.docente_id, input?.docenteId),
      docenteNombre: coalesceString(input?.docente_nombre),
      estadoAnterior: estadoAnteriorSave,
      estadoNuevo: saved.estado,
      actor: coalesceString(input?.docente_id, input?.docenteId),
      actorRol: isAdminEdit ? 'Administrador' : 'Docente',
      sistemaOrigen: isAdminEdit ? 'backoffice' : 'portal',
      mensaje: tipoAccionSave === 'CREACION' ? 'PTA creado' : tipoAccionSave === 'CAMBIO_ESTADO' ? `Estado: ${estadoAnteriorSave} → ${saved.estado}` : 'PTA guardado',
    });

    // "Concertar" (edición admin sobre un PTA existente, sin cambio de estado): editar y
    // enviar es, en la práctica, una devolución del/los componente(s) afectados al
    // docente. Se marca cada componente modificado como 'devuelto' con el comentario
    // del revisor, igual que en la pestaña de Aprobación, para que el docente vea qué
    // se devolvió y por qué, y solo pueda corregir eso. Requiere comentario explícito:
    // si no llega, se preserva el comportamiento anterior (edición silenciosa), para no
    // afectar otros llamadores de savePTA que no envíen este campo nuevo.
    if (isAdminEdit && id && estadoAnteriorSave !== null && estado === estadoAnteriorSave) {
      const comentarioConcertacion = coalesceString(input?._comentario_concertacion, input?.comentario_concertacion);
      if (comentarioConcertacion) {
        // Qué componentes se devuelven al docente. La fuente de verdad es SIEMPRE una
        // selección explícita, nunca una heurística:
        //   1) Restringido por permiso a UN SOLO componente → ese, sin ambigüedad.
        //   2) Restringido por permiso a VARIOS componentes (ej. un rol con
        //      "aprueba docencia y complementarias") → también exige selección
        //      explícita del admin, acotada a su alcance real. Antes se devolvían
        //      TODOS sus componentes permitidos aunque solo hubiera tocado uno
        //      (bug reportado en QA: devolver Docencia con un cambio devolvía en
        //      cascada Complementarias también, sin que el revisor lo pidiera).
        //   3) Sin restricción de permiso (aprueba todo / superusuario) → los que
        //      el admin marcó en los checkboxes del formulario.
        // NO se infieren componentes por "diff de contenido": el formulario re-serializa
        // todo el PTA al guardar, así que un componente intacto (p.ej. Docencia ya
        // aprobada) puede aparecer como "cambiado" por diferencias de serialización y
        // terminaba reabriéndose a 'devuelto' sin que el revisor lo pidiera.
        const componentesSeleccionados = Array.isArray(input?._concertacion_componentes)
          ? input._concertacion_componentes.map((k: any) => String(k)).filter((k: string) => COMPONENT_APPROVAL_KEY_SET.has(k))
          : [];
        const componentesCambiados = allowedComponentKeys.length === 1
          ? allowedComponentKeys
          : allowedComponentKeys.length > 1
            ? componentesSeleccionados.filter((k) => allowedComponentKeys.includes(k))
            : componentesSeleccionados;
        if (componentesCambiados.length > 0) {
          const devolucionResult = await this.registrarDevolucionPorConcertacion(
            saved.id,
            componentesCambiados,
            comentarioConcertacion,
            coalesceString(input?._concertacion_actor_id) || undefined,
            coalesceString(input?._concertacion_actor_nombre) || 'Revisor',
          );
          if (devolucionResult) saved = devolucionResult;
        }
      }
    }

    // Consumir la solicitud aprobada que habilitó este segundo PTA: pasa a 'gestionada'
    // para que `tienePermisoEspecial` (que solo cuenta 'aprobado') se limpie y el docente
    // no pueda crear PTAs adicionales sin una nueva solicitud aprobada.
    if (solicitudUsada) {
      try {
        solicitudUsada.estado = 'gestionada';
        solicitudUsada.notificacionLeida = true;
        await this.solicitudRepo.save(solicitudUsada);
      } catch (e: any) {
        this.logger.warn(`No se pudo consumir la solicitud ${solicitudUsada.id}: ${e?.message || e}`);
      }
    }

    return this.toPtaDto(saved, extMult);
  }

  async updatePTAStatus(
    ptaId: string,
    body: any,
    auth?: PtaAuthenticatedUser,
  ) {
    const existing = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existing) throw new NotFoundException('PTA no encontrado');
    if (['Terminado', 'TERMINADO'].includes(String(existing.estado))) {
      throw new BadRequestException('El PTA está terminado (solo lectura) y no admite cambios de estado.');
    }

    const accion = coalesceString(body?.accion, body?.tipoAccion);
    let nuevoEstado = coalesceString(body?.estado);
    let parallelApprovalResult: any = null;

    // ── Autorización server-side de la aprobación global (vía estado) ───────────
    // Modelo POR COMPONENTE: la aprobación granular se hace vía aprobar-componente.
    // La aprobación/devolución GLOBAL del PTA por estado (flujo masivo/por nivel, del
    // modelo anterior) queda reservada al aprobador integral (superusuario del sistema
    // o rol con pta.approve.all). Un aprobador por componente debe aprobar cada
    // componente individualmente. Se ignora cualquier isSuperUser/aprobarTodas del body.
    // `auth` es undefined en llamadas internas (p.ej. firma OTP), que nunca usan
    // acción "aprobar"/"devolver".
    const accionLower = (accion || '').toLowerCase();
    const esAccionAprobacion = accionLower === 'aprobar' || accionLower === 'devolver';
    const solicitudEdicionParcial = await this.solicitudRepo.findOne({
      where: {
        ptaId,
        tipoSolicitud: SOLICITUD_EDICION_TIPO,
        estado: In(['aprobado', 'en_aprobacion']),
      } as any,
      order: { updatedAt: 'DESC' as any },
    });
    if (solicitudEdicionParcial && accionLower !== 'reenviar_corregido') {
      throw new BadRequestException(
        esAccionAprobacion
          ? 'Este PTA está en una edición parcial. Debes aprobar o devolver únicamente los componentes habilitados.'
          : 'Este PTA está en una edición parcial. Solo admite el reenvío del docente y decisiones por componente.',
      );
    }
    if (solicitudEdicionParcial && accionLower === 'reenviar_corregido' && auth) {
      if (!auth.userId) throw new ForbiddenException('No fue posible identificar al docente autenticado.');
      const docenteAutenticado = await this.resolveDocenteId(auth.userId, {
        periodo: existing.periodo,
      });
      if (docenteAutenticado !== existing.docenteId) {
        throw new ForbiddenException('Solo el docente propietario puede reenviar esta edición.');
      }
    }
    if (esAccionAprobacion) {
      if (!auth) {
        throw new ForbiddenException('No autenticado para aprobar/devolver el PTA.');
      }
      if (auth.approvesAll) {
        // Aprobador integral: aprueba/devuelve todos los niveles del PTA.
        body.isSuperUser = true;
      } else {
        if (!auth.allowedComponents || auth.allowedComponents.length === 0) {
          throw new ForbiddenException('No tiene permisos de aprobación de PTA.');
        }
        // Aprobador por componente: nunca aprobación integral. Sólo puede actuar en
        // los niveles de sus componentes (derivados server-side), no en cualquiera.
        body.isSuperUser = false;
        body.aprobarTodas = false;
        const requested = Number(body?.nivelAprobacion ?? body?.nivel_aprobacion ?? body?.nivel);
        const validRequested = [1, 2, 3].includes(requested) ? requested : null;
        if (validRequested && !auth.approvalLevels.includes(validRequested)) {
          throw new ForbiddenException(
            `No tiene permiso para ${accionLower === 'aprobar' ? 'aprobar' : 'devolver'} en el nivel ${validRequested}. ` +
              `Niveles autorizados: ${auth.approvalLevels.join(', ') || 'ninguno'}.`,
          );
        }
        body.nivelAprobacion = validRequested ?? auth.approvalLevels[0];
        // Fijar la identidad del actor desde el token (integridad de auditoría).
        if (auth.userId) body.actorId = auth.userId;
      }
    }

    // Máquina de estados: calcula el siguiente estado según el actual y la acción.
    if (!nuevoEstado && accion) {
      const a = accion.toLowerCase();
      const estadoActual = existing.estado;

      if (a === 'aprobar') {
        // Aprobación paralela por roles: cada aprobador registra su aval sin
        // avanzar en cadena. El estado solo cambia a Aprobado cuando todos avalan.
        if (isPendingRoleApprovalState(estadoActual)) {
          nuevoEstado = pendingApprovalState(estadoActual);
        } else {
          // fallback para estados legacy: si el PTA está en REVISION_DOCENTE_N* (o
          // cualquier otro estado) porque uno o más componentes fueron devueltos y
          // aún no los corrige el docente, este fallback NO puede aprobar el PTA
          // completo saltándose esa devolución pendiente. Sin este candado,
          // "aprobar" caía directo a 'Aprobado' sin mirar el estado por componente
          // (bug: el proceso quedaba aprobado con una devolución de componente sin
          // resolver).
          const componentesVigentes = await this.getComponentesAprobacion(ptaId);
          const componenteDevuelto = componentesVigentes.find(c => c.estado === 'devuelto');
          if (componenteDevuelto) {
            throw new BadRequestException(
              `El componente "${componenteDevuelto.componente}" fue devuelto y está pendiente de corrección por el docente. ` +
                'No se puede aprobar el PTA hasta que sea corregido y reenviado.',
            );
          }
          nuevoEstado = 'Aprobado';
        }
      } else if (a === 'devolver') {
        // En flujo paralelo, el rol que devuelve determina el nivel de revisión.
        if (isPendingRoleApprovalState(estadoActual)) {
          nuevoEstado = pendingApprovalState(estadoActual);
        } else {
          nuevoEstado = 'Devuelto';
        }
      } else if (a.includes('rechaz')) {
        nuevoEstado = 'Rechazado';
      } else if (a === 'reenviar_corregido') {
        // Docente reenvía tras revisión: vuelve a la fase paralela de aprobación.
        nuevoEstado = 'Pendiente Jefatura';
      } else if (a.includes('reenviar')) {
        nuevoEstado = 'Pendiente Jefatura';
      } else if (a === 'avanzar_sin_cambios') {
        // Docente acepta los cambios del revisor sin modificar nada: reabre la
        // aprobación paralela para que todos los roles avalen la versión vigente.
        nuevoEstado = 'Pendiente Jefatura';
      }
    }

    if (!nuevoEstado) {
      nuevoEstado = existing.estado;
    }

    const a = accion?.toLowerCase() || '';
    const hasExplicitEstado = !!coalesceString(body?.estado);
    if (!hasExplicitEstado && (a === 'aprobar' || a === 'devolver') && isPendingRoleApprovalState(existing.estado)) {
      parallelApprovalResult = await this.applyParallelRoleApproval(existing, body, a);
      nuevoEstado = parallelApprovalResult.nuevoEstado;
    }

    if (nuevoEstado === 'Aprobado' && existing.estado !== 'Aprobado') {
      const validation = await this.getRUNDDocente(existing.docenteId);
      const criticos = ['DOCUMENTO_IDENTIDAD', 'VINCULACION', 'DEDICACION', 'ACTO_ADMINISTRATIVO'];
      const noValidados = validation.validaciones.filter(v =>
        criticos.includes(v.campo_rund) && v.estado_documento !== 'Aceptado'
      );

      if (noValidados.length > 0) {
        const nombresFaltantes = noValidados.map(v => v.campo_rund).join(', ');
        // Temporarily deactivated - not blocking PTA approval
        console.warn(
          `[RUND] Aprobación permitida de forma no bloqueante. Faltan validar soportes críticos: ${nombresFaltantes}`
        );
      }
    }

    // ── Lógica multi-jefatura territorial ──────────────────────────────────────
    if (body?.flujoSecuencial === true && existing.estado === 'Pendiente Jefatura' && (a === 'aprobar' || a === 'devolver')) {
      const aprobaciones = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });

      // Limpiar filas huérfanas: si hay >1 fila para la misma territorial, borrar duplicadas
      const byTerritorial = new Map<string, typeof aprobaciones>();
      for (const ap of aprobaciones) {
        const key = ap.territorialId || '__sin_territorial__';
        if (!byTerritorial.has(key)) byTerritorial.set(key, []);
        byTerritorial.get(key)!.push(ap);
      }
      for (const [, filas] of byTerritorial.entries()) {
        if (filas.length <= 1) continue;
        // Conservar la aprobada si existe, si no la última; borrar el resto
        const keeper = filas.find(f => f.decision !== 'pendiente') || filas[filas.length - 1];
        const toDelete = filas.filter(f => f.id !== keeper.id);
        if (toDelete.length > 0) {
          await this.aprobacionJefaturaRepo.delete(toDelete.map(f => f.id));
        }
      }

      // Releer post-limpieza
      const aprobacionesLimpias = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
      const territoriales = [...new Set(aprobacionesLimpias.map(ap => ap.territorialId).filter(Boolean))];
      const aprobacionesPendientes = aprobacionesLimpias.filter(ap => ap.decision === 'pendiente');

      // Solo aplica flujo multi-jefatura si hay 2+ territoriales DISTINTAS pendientes
      if (territoriales.length >= 2 && aprobacionesPendientes.length >= 2) {
        const actorId = coalesceString(body?.actorId, body?.actor_id);
        const isSuperUser = !!body?.isSuperUser;
        const aprobarTodas = !!body?.aprobarTodas;
        const observaciones = coalesceString(body?.observaciones, body?.comentarios);
        const hayCambios = body?.camposModificados && Object.keys(body.camposModificados).length > 0;

        // Resolver territorialId del actor
        let actorTerritorialId: string | null = coalesceString(body?.actorTerritorialId);
        if (!actorTerritorialId && actorId) {
          const docenteRow = await this.docenteRepo.findOne({ where: { id: actorId } as any });
          if ((docenteRow as any)?.territorialId) actorTerritorialId = (docenteRow as any).territorialId;
        }
        if (!actorTerritorialId && actorId) {
          const prevAprobacion = aprobacionesLimpias.find(ap => ap.jefaturaUserId === actorId);
          if (prevAprobacion) actorTerritorialId = prevAprobacion.territorialId;
        }

        if (a === 'devolver') {
          // Una devolución devuelve todas las aprobaciones
          const toUpdate = actorTerritorialId
            ? aprobacionesLimpias.filter(ap => ap.territorialId === actorTerritorialId)
            : aprobacionesLimpias;
          for (const ap of toUpdate) {
            await this.aprobacionJefaturaRepo.save({ ...ap, decision: 'devuelto', jefaturaUserId: actorId || '', comentarios: observaciones });
          }
          nuevoEstado = 'REVISION_DOCENTE_N1';
        } else {
          // aprobar
          const decision = hayCambios ? 'aprobado_con_cambios' : 'aprobado';
          if (isSuperUser || aprobarTodas || !actorTerritorialId) {
            // Sin territorial asignada o superuser → aprueba todas las pendientes
            for (const ap of aprobacionesLimpias.filter(x => x.decision === 'pendiente')) {
              await this.aprobacionJefaturaRepo.save({ ...ap, decision, jefaturaUserId: actorId || '', comentarios: observaciones || `Aprobado por ${actorId}` });
            }
          } else if (actorTerritorialId) {
            // Buscar por territorial exacta, o por usuario si ya registró antes
            const apRow = aprobacionesLimpias.find(ap => ap.decision === 'pendiente' && (ap.territorialId === actorTerritorialId || ap.jefaturaUserId === actorId));
            if (apRow) await this.aprobacionJefaturaRepo.save({ ...apRow, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          } else {
            // Fallback: aprobar la primera pendiente (con o sin jefatura asignada)
            const primero = aprobacionesLimpias.find(ap => ap.decision === 'pendiente');
            if (primero) await this.aprobacionJefaturaRepo.save({ ...primero, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          }

          // Verificar si quedan pendientes
          const pendientes = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
          const aunPendientes = pendientes.filter(ap => ap.decision !== 'aprobado' && ap.decision !== 'aprobado_con_cambios');

          if (aunPendientes.length > 0) {
            // Aprobación parcial — registrar historial y retornar sin cambiar estado
            await this.historialRepo.save(this.historialRepo.create({
              ptaId, estadoAnterior: existing.estado, estadoNuevo: existing.estado,
              actorId, actorRol: coalesceString(body?.actorRol) || 'Jefatura de Zona',
              tipoAccion: 'APROBACION_PARCIAL_JEFATURA',
              comentarios: observaciones,
              snapshotPta: existing.datosEstructurados ?? null,
              version: existing.version,
            }));
            const partialDto = this.toPtaDto(existing, await this.getExtMultiplicadores());
            await this.enrichHorasDesdeBanco([partialDto]);
            return {
              parcial: true,
              message: 'Tu aprobación fue registrada. Esperando aprobación de otras jefaturas.',
              nuevoEstado: existing.estado,
              aprobaciones: pendientes,
              pta: partialDto,
            };
          }

          // Todas aprobaron → determinar siguiente estado
          const algunaConCambios = pendientes.some(ap => ap.decision === 'aprobado_con_cambios');
          nuevoEstado = algunaConCambios ? 'REVISION_DOCENTE_N1' : 'Pendiente Decanatura';
        }
      }
    }

    // Antes de cualquier envío/reenvío, actualizar Pensum desde el catálogo.
    // Esto cubre también "avanzar sin cambios" en PTAs creados antes del campo.
    if (isPendingRoleApprovalState(nuevoEstado)) {
      const currentData = (existing.datosEstructurados as any) || {};
      if (Array.isArray(currentData.asignaturas)) {
        existing.datosEstructurados = {
          ...currentData,
          asignaturas: await this.syncAsignaturasPensum(currentData.asignaturas),
        };
      }
    }

    // ── Bloquear envío a aprobación cuando el PTA no tiene horas programadas ──────────────────────────
    if (isPendingRoleApprovalState(nuevoEstado)) {
      const ds = existing.datosEstructurados as any || {};
      const tieneTotalidad = this.readComplementariasSecciones(ds).aadm
        .some((a: any) => a?.consumeTotalidad === true);
      const horasActuales = existing.horasTotales || 0;
      if (!tieneTotalidad && horasActuales === 0) {
        throw new BadRequestException(
          'El PTA no tiene horas programadas (0h). Guarda el PTA con tus actividades antes de enviarlo a aprobación.',
        );
      }
    }

    // ── Cuando el PTA llega a aprobación, validar datos completos ──────────────────────────
    if (isPendingRoleApprovalState(nuevoEstado)) {
      const ds = existing.datosEstructurados as any || {};
      const tieneTotalidad = this.readComplementariasSecciones(ds).aadm
        .some((a: any) => a?.consumeTotalidad === true);
      if (!tieneTotalidad) {
        const asignaturas = Array.isArray(ds.asignaturas)
          ? ds.asignaturas.filter((a: any) => a?.asignatura_id)
          : [];
        if (asignaturas.length === 0) {
          throw new BadRequestException('Debe incluir al menos una asignatura válida antes de enviar el PTA a aprobación.');
        }
        for (const [idx, asig] of asignaturas.entries()) {
          const label = asig.asignatura_nombre || `Asignatura ${idx + 1}`;
          if (!asig.programa_id) {
            throw new BadRequestException(`Complete el programa de ${label} antes de enviar el PTA.`);
          }
          if (!asig.fecha_inicio || !asig.fecha_fin) {
            throw new BadRequestException(`Complete las fechas de inicio y fin de ${label} antes de enviar el PTA.`);
          }
          const inicio = new Date(`${asig.fecha_inicio}T00:00:00`);
          const fin = new Date(`${asig.fecha_fin}T00:00:00`);
          if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
            throw new BadRequestException(`El rango de fechas de ${label} no es válido.`);
          }
          const horasAsignatura = Number(asig.total_horas ?? asig.horas);
          if (!Number.isFinite(horasAsignatura) || horasAsignatura <= 0) {
            throw new BadRequestException(`La asignatura ${label} no tiene horas calculadas.`);
          }
        }
      }
    }

    if (isPendingRoleApprovalState(nuevoEstado)) {
      const ds = existing.datosEstructurados as any || {};
      const extMult = await this.getExtMultiplicadores();
      const horas = this.computeHorasTotales(ds, extMult);
      const horasAProgramar = await this.resolveHorasAProgramar(
        existing.docenteId,
        ds,
        Number((existing as any).horasAsignables),
      );
      this.validatePtaForSubmission(ds, horas, horasAProgramar, (await this.getConfiguracionPTAGlobal()) || {});
    }

    const estadoFinal = nuevoEstado || existing.estado || 'Borrador';
    const solicitudEdicionActiva = a === 'reenviar_corregido'
      ? await this.solicitudRepo.findOne({
          where: {
            ptaId,
            tipoSolicitud: SOLICITUD_EDICION_TIPO,
            // "aprobado": primer envío después de habilitar la edición.
            // "en_aprobacion": nuevo envío si un revisor devolvió nuevamente
            // uno de los componentes durante la reaprobación parcial.
            estado: In(['aprobado', 'en_aprobacion']),
          } as any,
          order: { resolucionFecha: 'DESC' as any, updatedAt: 'DESC' as any },
        })
      : null;

    const debeInicializarAprobacionesJefatura =
      isPendingRoleApprovalState(estadoFinal) &&
      (!isPendingRoleApprovalState(existing.estado) ||
        (existing.estado === 'PENDIENTE_APROBACION' && estadoFinal === 'Pendiente Jefatura'));
    if (debeInicializarAprobacionesJefatura && !parallelApprovalResult) {
      // Reenvío tras devolución PARCIAL (solo algunos componentes devueltos): se
      // conservan las aprobaciones ya otorgadas a otros componentes y solo se
      // vuelven a revisar los que el revisor devolvió. Esto permite aprobar y
      // devolver varios componentes de forma independiente sin que un reenvío
      // obligue a re-aprobar todo el PTA de nuevo.
      const veniaDeDevolucionParcial = REVISION_DOCENTE_STATES.has(existing.estado);
      const respuestaDocenteReenvio = coalesceString(body?.comentario_docente, body?.respuesta_docente);
      const respuestasDocentePorComponente = this.readRespuestasDocentePorComponente(body);
      // En una edición autorizada se conservan los avales históricos de niveles y
      // componentes no seleccionados. Solo las filas reabiertas vuelven a pendiente.
      //
      // `veniaDeDevolucionParcial` también protege aquí: al reenviar tras una
      // devolución PARCIAL no se deben borrar las firmas/avales de nivel
      // (Jefatura/Decanatura/Gestión Profesoral) ya otorgados. Antes esta llamada
      // no estaba guardada y devolver un solo componente obligaba a rehacer las
      // cuatro etapas de revisión/aprobación completas, perdiendo las firmas.
      if (!solicitudEdicionActiva && !veniaDeDevolucionParcial) {
        await this.resetParallelApprovalWorkflow(ptaId, existing.datosEstructurados);
      }
      await this.resetComponentApprovalWorkflow(ptaId, veniaDeDevolucionParcial, respuestaDocenteReenvio, respuestasDocentePorComponente);
    }

    const estadoAnterior = existing.estado;
    const nextVersion = (existing.version || 1) + 1;

    const updated = await this.ptaRepo.save({
      ...existing,
      estado: estadoFinal,
      version: nextVersion,
      motivoDevolucion: body?.motivo_devolucion ?? body?.motivoDevolucion ?? existing.motivoDevolucion,
      datosEstructurados: existing.datosEstructurados,
    });

    await this.historialRepo.save(
      this.historialRepo.create({
        ptaId,
        estadoAnterior,
        estadoNuevo: estadoFinal,
        actorId: coalesceString(body?.actorId, body?.aprobador_id, body?.resueltoPor, body?.actor_id),
        actorRol: coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol),
        tipoAccion: accion,
        comentarios: coalesceString(body?.observaciones, body?.comentarios),
        detallesTransicion: coalesceString(body?.detallesTransicion, body?.detalles_transicion),
        snapshotPta: updated.datosEstructurados ?? null,
        version: updated.version,
      }),
    );

    if (solicitudEdicionActiva) {
      solicitudEdicionActiva.estado = 'en_aprobacion';
      solicitudEdicionActiva.notificacionLeida = false;
      await this.solicitudRepo.save(solicitudEdicionActiva);
      await this.historialRepo.save(this.historialRepo.create({
        ptaId,
        estadoAnterior: estadoFinal,
        estadoNuevo: estadoFinal,
        actorId: existing.docenteId,
        actorRol: 'Docente',
        tipoAccion: 'EDICION_COMPONENTES_ENVIADA',
        comentarios: coalesceString(body?.comentario_docente)
          || 'Componentes editados y enviados nuevamente a aprobación.',
        detallesTransicion: JSON.stringify({
          solicitudId: solicitudEdicionActiva.id,
          componentes: solicitudEdicionActiva.componentes || [],
        }),
        snapshotPta: updated.datosEstructurados ?? null,
        version: updated.version,
      }));
    }

    const ds = existing.datosEstructurados as any;
    await this.logEvento({
      ptaId,
      tipo: 'cambio_estado',
      docenteId: existing.docenteId,
      docenteNombre: coalesceString(ds?.docente_nombre),
      estadoAnterior,
      estadoNuevo: estadoFinal,
      actor: coalesceString(body?.actorId, body?.actor_id),
      actorRol: coalesceString(body?.actorRol, body?.actor_rol),
      sistemaOrigen: body?.sistemaOrigen ?? 'backoffice',
      mensaje: `${estadoAnterior} → ${estadoFinal}`,
      metadata: { accion, observaciones: coalesceString(body?.observaciones, body?.comentarios) },
    });

    // Si la edición deja un componente sin contenido, la matriz histórica puede
    // autoaprobarlo (comportamiento existente para componentes con 0 horas). En
    // ese caso no debe quedar una solicitud eternamente "en reaprobación": se
    // consolida y restaura de inmediato el estado exacto que tenía el PTA.
    let estadoResultado = estadoFinal;
    let edicionAutoFinalizada = false;
    if (solicitudEdicionActiva) {
      const componentesTrasEnvio = await this.getComponentesAprobacion(ptaId);
      if (componentesTrasEnvio.length > 0 && componentesTrasEnvio.every(c => c.estado === 'aprobado')) {
        const estadoAntesDeRestaurar = updated.estado;
        const estadoRestaurado = restoreEstadoDespuesEdicion(
          solicitudEdicionActiva.estadoPtaAnterior,
        );
        updated.estado = estadoRestaurado;
        updated.version = (updated.version || 1) + 1;
        await this.ptaRepo.save(updated);

        solicitudEdicionActiva.estado = 'gestionada';
        solicitudEdicionActiva.notificacionLeida = false;
        solicitudEdicionActiva.resolucionAccion = 'edicion_componentes_aprobada_automaticamente';
        await this.solicitudRepo.save(solicitudEdicionActiva);
        await this.historialRepo.save(this.historialRepo.create({
          ptaId,
          estadoAnterior: estadoAntesDeRestaurar,
          estadoNuevo: estadoRestaurado,
          actorId: 'sistema',
          actorRol: 'Sistema',
          tipoAccion: 'EDICION_COMPONENTES_APROBADA',
          comentarios: 'Edición consolidada automáticamente: no quedaron componentes con horas pendientes de revisión.',
          detallesTransicion: JSON.stringify({
            solicitudId: solicitudEdicionActiva.id,
            componentes: solicitudEdicionActiva.componentes || [],
            aprobacionAutomatica: true,
          }),
          snapshotPta: updated.datosEstructurados ?? null,
          version: updated.version,
        }));
        await this.logEvento({
          ptaId,
          tipo: 'cambio_estado',
          docenteId: existing.docenteId,
          docenteNombre: coalesceString(ds?.docente_nombre),
          estadoAnterior: estadoAntesDeRestaurar,
          estadoNuevo: estadoRestaurado,
          actor: 'sistema',
          actorRol: 'Sistema',
          sistemaOrigen: 'backoffice',
          mensaje: 'Edición parcial consolidada automáticamente sin componentes pendientes.',
          metadata: {
            solicitudId: solicitudEdicionActiva.id,
            componentes: solicitudEdicionActiva.componentes || [],
          },
        });
        estadoResultado = estadoRestaurado;
        edicionAutoFinalizada = true;
      }
    }

    // ── Notificación: PTA entró a revisión → avisar a los aprobadores de cada
    // componente pendiente (según su permiso pta.approve.<componente>). Best-effort.
    if (debeInicializarAprobacionesJefatura && !edicionAutoFinalizada) {
      try {
        const componentes = await this.getComponentesAprobacion(ptaId);
        const pendientes = componentes
          .filter((c) => c.estado === 'pendiente')
          .map((c) => c.componente);
        if (pendientes.length > 0) {
          await this.ptaNotifications.notifyApproversPtaEnRevision({
            ptaId,
            docenteNombre: coalesceString(ds?.docente_nombre),
            periodo: coalesceString((existing as any).periodo, (ds as any)?.periodo),
            componentes: pendientes,
          });
        }
        // Confirmación al profesor: su PTA salió de Borrador y está en aprobación.
        await this.ptaNotifications.notifyProfesorPtaEnviadoAprobacion({
          ptaId,
          docenteId: existing.docenteId,
          periodo: coalesceString((existing as any).periodo, (ds as any)?.periodo),
          componentes: pendientes,
        });
      } catch (error: any) {
        this.logger.warn(`No se pudo notificar el envío a aprobación del PTA ${ptaId}: ${error?.message}`);
      }
    }

    const updatedDto = this.toPtaDto(updated, await this.getExtMultiplicadores());
    await this.enrichHorasDesdeBanco([updatedDto]);
    return {
      ...(parallelApprovalResult || {}),
      version: updated.version,
      nuevoEstado: estadoResultado,
      pta: updatedDto,
    };
  }

  async getAprobacionesJefatura(ptaId: string) {
    return this.aprobacionJefaturaRepo.find({ where: { ptaId }, order: { createdAt: 'ASC' } });
  }

  private resolveApprovalLevel(body: any): number {
    const explicit = Number(body?.nivelAprobacion ?? body?.nivel_aprobacion ?? body?.nivel);
    if ([1, 2, 3].includes(explicit)) return explicit;
    return approvalLevelFromRole(coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol));
  }

  private async ensureRoleApprovalRows(ptaId: string) {
    const existing = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    const existingKeys = new Set(existing.map(row => row.componente));
    const missing = ROLE_APPROVALS
      .filter(item => !existingKeys.has(item.key))
      .map(item => this.ptaComponentApprovalRepo.create({
        ptaId,
        componente: item.key,
        estado: 'pendiente',
        aprobadorRol: item.label,
        scope: 'nivel_aprobacion',
        scopeId: String(item.nivel),
      }));

    if (missing.length > 0) {
      await this.ptaComponentApprovalRepo.save(missing);
    }

    return this.getRoleApprovalRows(ptaId);
  }

  private async getRoleApprovalRows(ptaId: string) {
    const rows = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    return rows
      .filter(row => isRoleApprovalComponent(row.componente))
      .sort((a, b) => {
        const na = Number(roleApprovalMetaByLevel(Number(a.scopeId))?.nivel || ROLE_APPROVALS.find(x => x.key === a.componente)?.nivel || 0);
        const nb = Number(roleApprovalMetaByLevel(Number(b.scopeId))?.nivel || ROLE_APPROVALS.find(x => x.key === b.componente)?.nivel || 0);
        return na - nb;
      });
  }

  private async resetParallelApprovalWorkflow(ptaId: string, datosEstructurados: any) {
    await this.ptaComponentApprovalRepo.delete({
      ptaId,
      componente: In([...ROLE_APPROVAL_KEYS]),
    } as any);
    await this.aprobacionJefaturaRepo.delete({ ptaId });
    await this.ensureRoleApprovalRows(ptaId);
    await this.initAprobacionesJefatura(ptaId, datosEstructurados);
  }

  private readRespuestasDocentePorComponente(body: any): ComponentResponseMap {
    const source =
      body?.respuestas_docente_componentes ??
      body?.respuestasDocenteComponentes ??
      body?.respuesta_docente_componentes ??
      body?.respuestaDocentePorComponente ??
      body?.comentarios_docente_componentes;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

    return Object.entries(source).reduce<ComponentResponseMap>((acc, [componentKey, rawValue]) => {
      const value = typeof rawValue === 'object' && rawValue !== null
        ? coalesceString((rawValue as any).respuesta, (rawValue as any).comentario, (rawValue as any).observaciones)
        : coalesceString(rawValue);
      if (componentKey && value) acc[componentKey] = value;
      return acc;
    }, {});
  }

  private async resetComponentApprovalWorkflow(
    ptaId: string,
    soloComponentesDevueltos = false,
    respuestaDocente?: string | null,
    respuestasDocentePorComponente: ComponentResponseMap = {},
  ) {
    const componentKeys = [...COMPONENT_APPROVAL_KEYS, ...LEGACY_COMPONENT_APPROVAL_KEYS];
    if (soloComponentesDevueltos) {
      // Solo se re-revisan los componentes que estaban devueltos; los componentes
      // ya aprobados conservan su fila (no se borran, no vuelven a pendiente).
      // Se ACTUALIZA en el lugar (no se borra) para conservar el comentario original
      // del revisor (`comentarios`) como historial visible cuando vuelva a concertar,
      // y se adjunta la respuesta del docente sobre por qué reenvía / qué corrigió.
      const devueltos = await this.ptaComponentApprovalRepo.find({
        where: { ptaId, componente: In(componentKeys), estado: 'devuelto' },
      });
      for (const row of devueltos) {
        row.estado = 'pendiente';
        row.respuestaDocente = respuestasDocentePorComponente[row.componente] || respuestaDocente || null;
        await this.ptaComponentApprovalRepo.save(row);
      }

      // Espejo para la etapa de Revisión: si la devolución ocurrió durante la
      // revisión (no la aprobación), sus filas de PtaComponentReview también
      // deben volver a 'pendiente' para que el revisor vuelva a ver su acción.
      const revisionesDevueltas = await this.ptaComponentReviewRepo.find({
        where: { ptaId, componente: In(componentKeys), estado: 'devuelto' },
      });
      for (const row of revisionesDevueltas) {
        row.estado = 'pendiente';
        row.respuestaDocente = respuestasDocentePorComponente[row.componente] || respuestaDocente || null;
        await this.ptaComponentReviewRepo.save(row);
      }

      // Espejo por territorial: solo las territoriales que estaban 'devuelto'
      // vuelven a 'pendiente' (una territorial ya aprobada, ej. Antioquia,
      // conserva su decisión aunque Bolívar siga corrigiéndose).
      if (devueltos.some((d) => d.componente === 'academica_territorial')) {
        await this.ptaTerritorialApprovalRepo.update(
          { ptaId, estado: 'devuelto' } as any,
          { estado: 'pendiente' },
        );
      }
    } else {
      await this.ptaComponentApprovalRepo.delete({
        ptaId,
        // Incluye claves legacy (academicas_admin) para limpiar filas de PTAs no migrados.
        componente: In(componentKeys),
      } as any);
      await this.ptaComponentReviewRepo.delete({
        ptaId,
        componente: In(componentKeys),
      } as any);
      await this.ptaTerritorialApprovalRepo.delete({ ptaId } as any);
    }
    await this.getComponentesAprobacion(ptaId);
  }

  /** "Concertar" (edición admin + envío) equivale a devolver el/los componente(s)
   * afectados al docente con el comentario del revisor: reutiliza el mismo modelo de
   * aprobación por componente que ya usa la pestaña de Aprobación (PtaComponentApproval
   * en estado 'devuelto'), para que el docente vea el mismo banner y quede restringido
   * a corregir solo eso. No repite las validaciones de permisos de aprobarComponente:
   * la autorización de "Concertar" ya se resuelve en el guardado (isAdminEdit +
   * _allowed_component_keys), igual que el resto de esta acción. */
  private async registrarDevolucionPorConcertacion(
    ptaId: string,
    componentesCambiados: string[],
    comentario: string,
    actorId?: string,
    actorNombre?: string,
  ): Promise<PlanTrabajoAcademicoEntity | null> {
    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) return null;

    const ahora = new Date();
    for (const componente of componentesCambiados) {
      let approval = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente } });
      if (!approval) {
        approval = this.ptaComponentApprovalRepo.create({ ptaId, componente, estado: 'pendiente' });
      }
      approval.estado = 'devuelto';
      approval.aprobadorId = actorId || null;
      approval.aprobadorNombre = actorNombre || 'Revisor (Concertación)';
      approval.comentarios = comentario;
      approval.fechaAprobacion = ahora;
      // Nueva decisión del revisor: la respuesta del docente al ciclo anterior queda
      // obsoleta.
      approval.respuestaDocente = null;
      await this.ptaComponentApprovalRepo.save(approval);
    }

    const estadoAnterior = existingPta.estado;
    const hayN1 = componentesCambiados.some(c => COMPONENT_REVISION_STATE[c] === 'REVISION_DOCENTE_N1');
    const nuevoEstadoPta = hayN1 ? 'REVISION_DOCENTE_N1' : 'REVISION_DOCENTE_N2';

    existingPta.estado = nuevoEstadoPta;
    existingPta.version = (existingPta.version || 1) + 1;
    existingPta.motivoDevolucion = `Concertación — componente(s) devuelto(s) (${componentesCambiados.join(', ')}): ${comentario}`;
    const saved = await this.ptaRepo.save(existingPta);

    await this.historialRepo.save(this.historialRepo.create({
      ptaId,
      estadoAnterior,
      estadoNuevo: nuevoEstadoPta,
      actorId: actorId || 'Administrador',
      actorRol: actorNombre || 'Revisor',
      tipoAccion: 'DEVOLUCION_COMPONENTE',
      comentarios: comentario,
      snapshotPta: existingPta.datosEstructurados ?? null,
      version: saved.version,
    }));

    await this.logEvento({
      ptaId,
      tipo: 'cambio_estado',
      docenteId: existingPta.docenteId,
      docenteNombre: coalesceString((existingPta.datosEstructurados as any)?.docente_nombre),
      estadoAnterior,
      estadoNuevo: nuevoEstadoPta,
      actor: actorId,
      actorRol: actorNombre,
      sistemaOrigen: 'backoffice',
      mensaje: `Concertación: componente(s) ${componentesCambiados.join(', ')} devuelto(s). Estado general: ${nuevoEstadoPta}`,
      metadata: { componentes: componentesCambiados, comentario },
    });

    return saved;
  }

  private async registerJefaturaTerritorialApproval(
    ptaId: string,
    body: any,
    estado: 'aprobado' | 'aprobado_con_cambios' | 'devuelto',
  ) {
    const actorId = coalesceString(body?.actorId, body?.aprobador_id, body?.actor_id) || '';
    const observaciones = coalesceString(body?.observaciones, body?.comentarios);
    const isSuperUser = !!body?.isSuperUser;
    const aprobarTodas = !!body?.aprobarTodas;

    let rows = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
    if (rows.length === 0) {
      return { complete: true, rows };
    }

    let actorTerritorialId = coalesceString(body?.actorTerritorialId, body?.actor_territorial_id);
    if (!actorTerritorialId && actorId) {
      const docenteRow = await this.docenteRepo.findOne({ where: { id: actorId } as any });
      if ((docenteRow as any)?.territorialId) actorTerritorialId = (docenteRow as any).territorialId;
    }
    if (!actorTerritorialId && actorId) {
      const previous = rows.find(ap => ap.jefaturaUserId === actorId);
      if (previous) actorTerritorialId = previous.territorialId;
    }

    const updateRows = estado === 'devuelto'
      ? (isSuperUser || aprobarTodas
        ? rows
        : actorTerritorialId
          ? rows.filter(ap => ap.territorialId === actorTerritorialId)
          : rows.slice(0, 1))
      : (isSuperUser || aprobarTodas
        ? rows.filter(ap => ap.decision === 'pendiente')
        : actorTerritorialId
          ? rows.filter(ap => ap.decision === 'pendiente' && ap.territorialId === actorTerritorialId)
          : rows.filter(ap => ap.decision === 'pendiente').slice(0, 1));

    const effectiveRows = updateRows.length > 0
      ? updateRows
      : (estado === 'devuelto' ? rows : rows.filter(ap => ap.decision === 'pendiente').slice(0, 1));

    for (const ap of effectiveRows) {
      await this.aprobacionJefaturaRepo.save({
        ...ap,
        decision: estado,
        jefaturaUserId: actorId,
        comentarios: observaciones,
      });
    }

    rows = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
    const complete = rows.length === 0 || rows.every(ap => ['aprobado', 'aprobado_con_cambios'].includes(ap.decision));
    return { complete, rows };
  }

  private async applyParallelRoleApproval(existing: PlanTrabajoAcademicoEntity, body: any, action: 'aprobar' | 'devolver') {
    const ptaId = existing.id;
    const isSuperUser = !!body?.isSuperUser;
    const aprobarTodas = !!body?.aprobarTodas;
    const actorId = coalesceString(body?.actorId, body?.aprobador_id, body?.actor_id);
    const actorNombre = coalesceString(body?.aprobador_nombre, body?.actorNombre, body?.actor_nombre, body?.actorRol);
    const actorRol = coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol);
    const observaciones = coalesceString(body?.observaciones, body?.comentarios);
    const hayCambios = body?.camposModificados &&
      typeof body.camposModificados === 'object' &&
      Object.keys(body.camposModificados).length > 0;

    await this.ensureRoleApprovalRows(ptaId);

    const level = this.resolveApprovalLevel(body);
    if (!isSuperUser && !aprobarTodas && ![1, 2, 3].includes(level)) {
      throw new BadRequestException('No se pudo determinar el nivel de aprobación del usuario.');
    }

    if (action === 'devolver') {
      const targetLevel = isSuperUser || aprobarTodas ? (level || 1) : level;
      const meta = roleApprovalMetaByLevel(targetLevel) || roleApprovalMetaByLevel(1)!;
      const row = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente: meta.key } });
      if (row) {
        if (row.estado === 'devuelto') {
          throw new BadRequestException(
            `El nivel "${meta.label}" ya fue devuelto y está pendiente de corrección por el docente. ` +
              'No se puede volver a devolver hasta que el docente corrija y reenvíe.',
          );
        }
        await this.ptaComponentApprovalRepo.save({
          ...row,
          estado: 'devuelto',
          aprobadorId: actorId,
          aprobadorNombre: actorNombre,
          aprobadorRol: actorRol || meta.label,
          comentarios: observaciones,
          fechaAprobacion: new Date(),
          scope: 'nivel_aprobacion',
          scopeId: String(meta.nivel),
        });
      }
      if (meta.nivel === 1) {
        await this.registerJefaturaTerritorialApproval(ptaId, body, 'devuelto');
      }
      return {
        nuevoEstado: meta.revision,
        parcial: false,
        message: `PTA devuelto por ${meta.label}.`,
        aprobacionesNiveles: await this.getRoleApprovalRows(ptaId),
        aprobacionesJefatura: await this.getAprobacionesJefatura(ptaId),
      };
    }

    const targetLevels = isSuperUser || aprobarTodas ? [1, 2, 3] : [level];
    const decision = hayCambios ? 'aprobado_con_cambios' : 'aprobado';

    for (const targetLevel of targetLevels) {
      const meta = roleApprovalMetaByLevel(targetLevel);
      if (!meta) continue;

      if (targetLevel === 1) {
        const jefatura = await this.registerJefaturaTerritorialApproval(ptaId, body, decision);
        if (!jefatura.complete) {
          continue;
        }
      }

      const row = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente: meta.key } });
      if (row) {
        // No sobrescribir una devolución sin resolver: ese nivel debe quedar
        // pendiente de corrección del docente, no aprobarse de todas formas.
        if (row.estado === 'devuelto') {
          continue;
        }
        await this.ptaComponentApprovalRepo.save({
          ...row,
          estado: 'aprobado',
          aprobadorId: actorId,
          aprobadorNombre: actorNombre,
          aprobadorRol: actorRol || meta.label,
          comentarios: observaciones,
          fechaAprobacion: new Date(),
          scope: 'nivel_aprobacion',
          scopeId: String(meta.nivel),
        });
      }
    }

    const roleRows = await this.getRoleApprovalRows(ptaId);
    const allApproved = roleRows.length === ROLE_APPROVALS.length && roleRows.every(row => row.estado === 'aprobado');
    const anyReturned = roleRows.some(row => row.estado === 'devuelto');

    if (anyReturned) {
      const returned = roleRows.find(row => row.estado === 'devuelto');
      const meta = ROLE_APPROVALS.find(item => item.key === returned?.componente) || ROLE_APPROVALS[0];
      return {
        nuevoEstado: meta.revision,
        parcial: false,
        message: `PTA devuelto por ${meta.label}.`,
        aprobacionesNiveles: roleRows,
        aprobacionesJefatura: await this.getAprobacionesJefatura(ptaId),
      };
    }

    return {
      nuevoEstado: allApproved ? 'Aprobado' : pendingApprovalState(existing.estado),
      parcial: !allApproved,
      message: allApproved
        ? 'Todas las aprobaciones requeridas fueron registradas. PTA aprobado.'
        : 'Tu aprobación fue registrada. El PTA queda pendiente de las demás aprobaciones.',
      aprobacionesNiveles: roleRows,
      aprobacionesJefatura: await this.getAprobacionesJefatura(ptaId),
    };
  }

  private async initAprobacionesJefatura(ptaId: string, datosEstructurados: any) {
    // Extraer territoriales únicas de las asignaturas del PTA
    const asignaturas: any[] = datosEstructurados?.asignaturas || [];
    const territorialesIds = [...new Set(
      asignaturas.map((a: any) => a.territorial_id).filter(Boolean) as string[]
    )];

    if (territorialesIds.length <= 1) return; // Solo multi-territorial requiere registros

    for (const tId of territorialesIds) {
      const [territorial] = await this.ptaRepo.manager.query(
        `SELECT nom_seccional AS nombre FROM auth.seccionales WHERE id_seccional::text = $1 LIMIT 1`,
        [tId],
      );
      await this.aprobacionJefaturaRepo
        .createQueryBuilder()
        .insert()
        .values({
          ptaId,
          territorialId: tId,
          territorialNombre: (territorial as any)?.nombre || null,
          decision: 'pendiente',
          jefaturaUserId: '',
        })
        .orIgnore() // ON CONFLICT DO NOTHING (unique ptaId+territorialId)
        .execute()
        .catch(() => {});
    }
  }

  // ── Eventos / Realtime sync ────────────────────────────────────────────────

  private async logEvento(opts: {
    ptaId: string; tipo: string; docenteId?: string | null; docenteNombre?: string | null;
    estadoAnterior?: string | null; estadoNuevo?: string | null;
    actor?: string | null; actorRol?: string | null;
    sistemaOrigen?: string; mensaje?: string | null; metadata?: any;
  }) {
    try {
      await this.eventoRepo.save(this.eventoRepo.create({
        ptaId: opts.ptaId,
        tipo: opts.tipo,
        docenteId: opts.docenteId ?? null,
        docenteNombre: opts.docenteNombre ?? null,
        estadoAnterior: opts.estadoAnterior ?? null,
        estadoNuevo: opts.estadoNuevo ?? null,
        actor: opts.actor ?? null,
        actorRol: opts.actorRol ?? null,
        sistemaOrigen: opts.sistemaOrigen ?? 'sistema',
        mensaje: opts.mensaje ?? null,
        leidoBackoffice: false,
        leidoPortal: false,
        metadata: opts.metadata ?? null,
      }));
    } catch { /* non-critical */ }
  }

  async getSyncStatus() {
    const total = await this.eventoRepo.count();
    const unread = await this.eventoRepo.count({ where: { leidoBackoffice: false } as any });
    return { connected: true, counter: total, pending: unread, last_sync: new Date().toISOString() };
  }

  async getRecentEvents(query: any) {
    const qb = this.eventoRepo.createQueryBuilder('ev')
      .orderBy('ev.createdAt', 'DESC')
      .take(50);

    if (query?.docente_id) qb.andWhere('ev.docenteId = :did', { did: query.docente_id });
    if (query?.sistema_origen) qb.andWhere('ev.sistemaOrigen = :so', { so: query.sistema_origen });
    if (query?.since) qb.andWhere('ev.createdAt > :since', { since: new Date(query.since) });

    const rows = await qb.getMany();
    return rows.map(e => ({
      id: e.id,
      tipo: e.tipo,
      pta_id: e.ptaId,
      docente_id: e.docenteId,
      docente_nombre: e.docenteNombre,
      estado_anterior: e.estadoAnterior,
      estado_nuevo: e.estadoNuevo,
      actor: e.actor,
      actor_rol: e.actorRol,
      sistema_origen: e.sistemaOrigen,
      mensaje: e.mensaje,
      leido_backoffice: e.leidoBackoffice,
      leido_portal: e.leidoPortal,
      timestamp: e.createdAt,
      metadata: e.metadata,
    }));
  }

  async markEventsRead(eventIds: string[], sistema: string) {
    if (!eventIds?.length) return;
    const field = sistema === 'portal' ? 'leidoPortal' : 'leidoBackoffice';
    await this.eventoRepo
      .createQueryBuilder()
      .update()
      .set({ [field]: true } as any)
      .where('id IN (:...ids)', { ids: eventIds })
      .execute();
  }

  async getReporteSeguimiento(filters: any) {
    const qb = this.ptaRepo.createQueryBuilder('pta').orderBy('pta.updatedAt', 'DESC').take(500);
    if (filters?.periodo) qb.andWhere('pta.periodo = :periodo', { periodo: String(filters.periodo) });
    if (filters?.estado) qb.andWhere('pta.estado = :estado', { estado: String(filters.estado) });

    const ptas = await qb.getMany();
    const now = Date.now();

    const extMult = await this.getExtMultiplicadores();
    const detalle = ptas.map(p => {
      const dto = this.toPtaDto(p, extMult);
      const diasSinMovimiento = p.updatedAt ? Math.floor((now - new Date(p.updatedAt).getTime()) / 86400000) : 0;
      return { ...dto, diasSinMovimiento };
    });
    await this.enrichPtaSummaries(detalle);

    const alertas = {
      sinMovimiento7d: detalle.filter(p => p.diasSinMovimiento >= 7 && !['Aprobado','Rechazado','Borrador'].includes(p.estado)).length,
      sobrecarga: detalle.filter(p => (p.total_horas_programadas || 0) > (p.horas_a_programar ?? 0)).length,
      sinHoras: detalle.filter(p => (p.total_horas_programadas || 0) === 0 && p.estado !== 'Borrador').length,
      escaladosSNA: detalle.filter(p => p.estado === 'ESCALADO_SNA').length,
    };

    return { alertas, detalle, total: detalle.length, generadoEn: new Date().toISOString() };
  }

  async getEvidenciasPTA(ptaId: string) {
    const pta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (
      pta?.datosEstructurados
      && isPtaHabilitadoParaSeguimientoPorEstado(pta.estado)
    ) {
      await this.syncResolucionProyectoInvestigacion(
        ptaId,
        pta.datosEstructurados as SavePtaInput,
      );
    }
    const rows = await this.evidenciaRepo.find({ where: { ptaId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toEvidenciaDto(row));
  }

  async registrarEvidenciaPTA(ptaId: string, body: any) {
    const nombre = coalesceString(body?.nombre, body?.originalName, body?.filename) || 'evidencia';
    const tipoArchivo = coalesceString(body?.tipoArchivo, body?.tipo_archivo, body?.tipo) || 'pdf';
    const tamanioBytes = Number(body?.tamanioBytes ?? body?.tamanio_bytes ?? body?.size ?? 0) || 0;
    const storageUrl = coalesceString(body?.storageUrl, body?.storage_url, body?.url);
    const categoria = coalesceString(body?.categoria);
    const componentePta = coalesceString(body?.componentePta, body?.componente_pta);
    const horasAvance = Math.max(
      0,
      Math.round(Number(body?.horasAvance ?? body?.horas_avance ?? 0) || 0),
    );
    const esResolucionProyecto = isCategoriaResolucionProyecto(categoria);

    if (esResolucionProyecto && horasAvance > 0) {
      const pta = await this.ptaRepo.findOne({ where: { id: ptaId } });
      if (!pta) throw new NotFoundException('PTA no encontrado');
      const proyecto = (pta.datosEstructurados as any)?.investigacion_proyecto;
      const horasObjetivo = resolveHorasResolucionProyecto(proyecto);
      if (componentePta !== 'investigacion' || horasObjetivo <= 0) {
        throw new BadRequestException(
          'El PTA no tiene horas configuradas para justificar con la resolución del proyecto.',
        );
      }

      const soportesResolucion = (await this.evidenciaRepo.find({ where: { ptaId } }))
        .filter(evidencia => isCategoriaResolucionProyecto(evidencia.categoria));
      const horasReservadas = soportesResolucion.reduce((total, evidencia) => {
        if (normalizeEstadoFilter(evidencia.estado) === 'ELIMINADO') return total;
        if (normalizeEstadoFilter(evidencia.estadoRevision) === 'RECHAZADO') return total;
        return total + Math.max(0, Number(evidencia.horasAvance) || 0);
      }, 0);
      const disponibles = Math.max(horasObjetivo - horasReservadas, 0);
      if (horasAvance > disponibles) {
        throw new BadRequestException(
          `La resolución solo tiene ${disponibles}h pendientes por justificar (${horasObjetivo}h definidas).`,
        );
      }
    }

    const entity = this.evidenciaRepo.create({
      ptaId,
      nombre,
      tipoArchivo,
      tamanioBytes,
      categoria: categoria as any,
      componentePta: componentePta as any,
      seccionExtension: coalesceString(body?.seccionExtension, body?.seccion_extension) as any,
      horasAvance,
      storageUrl: storageUrl,
      subidoPor: coalesceString(body?.subidoPor, body?.subido_por) as any,
      descripcion: coalesceString(body?.descripcion) as any,
      estado: coalesceString(body?.estado) || 'activo',
      // Toda evidencia agregada durante Seguimiento requiere una decisión
      // posterior. El único soporte autoaprobado es la resolución sincronizada
      // desde la creación y aprobación del componente Investigación.
      estadoRevision: 'pendiente',
      revisadoPor: null,
      comentarioRevision: null,
    });

    const saved = await this.evidenciaRepo.save(entity);
    return this.toEvidenciaDto(saved);
  }

  async eliminarEvidenciaPTA(ptaId: string, evidenciaId: string) {
    await this.evidenciaRepo.delete({ id: evidenciaId, ptaId });
    return { deleted: true };
  }

  async revisarEvidenciaPTA(ptaId: string, evidenciaId: string, body: any) {
    const existing = await this.evidenciaRepo.findOne({ where: { id: evidenciaId, ptaId } });
    if (!existing) throw new NotFoundException('Evidencia no encontrada');

    const decision = coalesceString(body?.decision, body?.estado_revision, body?.estadoRevision);
    const estadoRevision =
      decision === 'aprobado' || decision === 'aprobada'
        ? 'aprobado'
        : decision === 'rechazado' || decision === 'rechazada'
          ? 'rechazado'
          : existing.estadoRevision;

    const updated = await this.evidenciaRepo.save({
      ...existing,
      estadoRevision,
      revisadoPor: coalesceString(body?.revisado_por, body?.revisadoPor) ?? existing.revisadoPor,
      comentarioRevision: coalesceString(body?.observaciones, body?.comentario, body?.comentarioRevision) ?? existing.comentarioRevision,
    });

    await this.syncPtaSeguimientoEstado(ptaId);

    return this.toEvidenciaDto(updated);
  }

  private async syncPtaSeguimientoEstado(ptaId: string): Promise<void> {
    const pta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!pta) return;

    const extMult = await this.getExtMultiplicadores();
    const dto = this.toPtaDto(pta, extMult) as any;
    const requeridas: Record<string, number> = {
      docencia: Number(dto.horas_docencia || 0),
      investigacion: Number(dto.horas_investigacion || 0),
      extension: Number(dto.horas_extension || 0),
      complementarias: Number(dto.horas_complementarias || 0),
    };

    const evidencias = await this.evidenciaRepo.find({ where: { ptaId } });
    const aprobadas: Record<string, number> = {
      docencia: 0,
      investigacion: 0,
      extension: 0,
      complementarias: 0,
    };

    for (const evidencia of evidencias) {
      const componente = String(evidencia.componentePta || '');
      if (!(componente in aprobadas)) continue;
      if (normalizeEstadoFilter(evidencia.estado) === 'ELIMINADO') continue;
      if (normalizeEstadoFilter(evidencia.estadoRevision) !== 'APROBADO') continue;
      aprobadas[componente] += Number(evidencia.horasAvance || 0);
    }

    const tieneHorasRequeridas = Object.values(requeridas).some(total => total > 0);
    const seguimientoCompleto = tieneHorasRequeridas && Object.entries(requeridas).every(([componente, total]) => {
      if (total <= 0) return true;
      return (aprobadas[componente] || 0) >= total;
    });

    const estadoActual = normalizeEstadoFilter(pta.estado);
    const estadosSeguimiento = new Set(['APROBADO', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'EN_EJECUCION']);
    if (seguimientoCompleto && estadosSeguimiento.has(estadoActual)) {
      pta.estado = 'Finalizado';
      await this.ptaRepo.save(pta);
      return;
    }

    if (!seguimientoCompleto && estadoActual === 'FINALIZADO') {
      pta.estado = 'Aprobado';
      await this.ptaRepo.save(pta);
    }
  }

  private puedeAdministrarSolicitudes(auth?: PtaAuthenticatedUser): boolean {
    return Boolean(
      auth?.isSuperUser
      || auth?.approvesAll
      || auth?.permissions.has('pta.backoffice.aprobar')
      || auth?.permissions.has('pta.backoffice.ver_gestion')
      || auth?.permissions.has('pta.backoffice.ver_detalle'),
    );
  }

  async crearSolicitudPTA(body: any, auth?: PtaAuthenticatedUser) {
    const docenteSolicitado = coalesceString(body?.docenteId, body?.docente_id) || '';
    const tipoSolicitud = coalesceString(body?.tipoSolicitud, body?.tipo_solicitud) === SOLICITUD_EDICION_TIPO
      || coalesceString(body?.caso) === 'edicion_pta'
      ? SOLICITUD_EDICION_TIPO
      : SOLICITUD_CREACION_TIPO;
    const esEdicion = tipoSolicitud === SOLICITUD_EDICION_TIPO;
    const ptaId = coalesceString(body?.ptaId, body?.pta_id);
    const componentes = normalizeSolicitudComponentes(body?.componentes);
    const justificacion = coalesceString(body?.justificacion) || '';
    if (justificacion.length > MAX_CARACTERES_JUSTIFICACION_SOLICITUD) {
      throw new BadRequestException('La descripción de la solicitud no puede superar los 3.000 caracteres.');
    }
    const archivosEntrada = body?.archivos == null ? [] : body.archivos;
    if (!Array.isArray(archivosEntrada) || archivosEntrada.length > 5) {
      throw new BadRequestException('Los documentos de soporte deben ser un arreglo de máximo 5 archivos.');
    }
    const archivos = archivosEntrada.map((archivo: any) => {
      const url = coalesceString(archivo?.url);
      const nombre = coalesceString(archivo?.nombre);
      const tamanio = Number(archivo?.tamanio) || 0;
      if (!/^\/uploads\/pta-solicitudes\/[A-Za-z0-9._-]+$/i.test(url || '')) {
        throw new BadRequestException('Uno de los documentos no pertenece al almacenamiento de solicitudes PTA.');
      }
      if (!/\.pdf$/i.test(nombre || '') || tamanio <= 0 || tamanio > 10 * 1024 * 1024) {
        throw new BadRequestException('Cada soporte debe ser un PDF válido de máximo 10 MB.');
      }
      return {
        url,
        nombre,
        tipo: 'pdf',
        tamanio,
      };
    });
    let pta: PlanTrabajoAcademicoEntity | null = null;

    if (esEdicion) {
      if (!ptaId) {
        throw new BadRequestException('Debes seleccionar el PTA que deseas editar.');
      }
      if (componentes.length === 0) {
        throw new BadRequestException('Selecciona al menos un componente para editar.');
      }
      if (!justificacion) {
        throw new BadRequestException('La descripción de la solicitud de edición es obligatoria.');
      }

      pta = await this.ptaRepo.findOne({ where: { id: ptaId } });
      if (!pta) throw new NotFoundException('PTA no encontrado');
    }

    // Para PTAs terminados de periodos anteriores puede existir una vinculación
    // Docente diferente por periodo. Resolver con el periodo del plan evita
    // rechazar al mismo profesor por comparar dos filas de vinculación distintas.
    const periodoSolicitud = pta?.periodo || undefined;
    const resolvedDocenteId = await this.resolveDocenteId(docenteSolicitado, {
      periodo: periodoSolicitud,
    });
    if (auth && !this.puedeAdministrarSolicitudes(auth)) {
      if (!auth.userId) throw new ForbiddenException('No fue posible identificar al docente autenticado.');
      const docenteAutenticado = await this.resolveDocenteId(auth.userId, {
        periodo: periodoSolicitud,
      });
      if (docenteAutenticado !== resolvedDocenteId) {
        throw new ForbiddenException('Solo puedes crear solicitudes para tus propios PTA.');
      }
    }

    if (esEdicion && pta) {
      if (pta.docenteId !== resolvedDocenteId) {
        throw new ForbiddenException('El PTA seleccionado no pertenece al docente solicitante.');
      }
      if (!ptaAdmiteSolicitudEdicion(pta.estado)) {
        throw new BadRequestException(
          `El PTA se encuentra en estado "${pta.estado}" y todavía no admite una solicitud de edición.`,
        );
      }

      const solicitudActiva = await this.solicitudRepo.findOne({
        where: {
          docenteId: resolvedDocenteId,
          ptaId,
          tipoSolicitud: SOLICITUD_EDICION_TIPO,
          estado: In(ESTADOS_SOLICITUD_EDICION_ACTIVA),
        } as any,
        order: { createdAt: 'DESC' as any },
      });
      if (solicitudActiva) {
        throw new BadRequestException('Ya existe una solicitud de edición activa para este PTA.');
      }
    }

    // No depender exclusivamente del formulario para los datos de contacto. El
    // id del docente permite resolver el usuario real en auth y también completa
    // solicitudes creadas desde clientes antiguos que no enviaban el correo.
    const contactoDocente = await this.ptaNotifications?.resolveUser?.(resolvedDocenteId);
    const docenteNombre = coalesceString(
      body?.docenteNombre,
      body?.docente_nombre,
      (pta?.datosEstructurados as any)?.docente_nombre,
      contactoDocente?.nombre,
    ) || '';
    const docenteEmail = coalesceString(
      contactoDocente?.email,
      body?.docenteEmail,
      body?.docente_email,
    );

    const entity = this.solicitudRepo.create({
      docenteId: resolvedDocenteId,
      docenteNombre,
      docenteEmail: docenteEmail as any,
      tipoSolicitud,
      ptaId: esEdicion ? ptaId : null,
      componentes: esEdicion ? componentes : null,
      estadoPtaAnterior: esEdicion ? pta?.estado || null : null,
      caso: coalesceString(body?.caso) || (esEdicion ? 'edicion_pta' : ''),
      razon: coalesceString(body?.razon) || (esEdicion ? 'Edición de componentes del PTA' : ''),
      justificacion,
      casoLibre: coalesceString(body?.casoLibre, body?.caso_libre) as any,
      archivos: archivos.length > 0 ? archivos : null,
      estado: 'pendiente',
    });

    let saved: SolicitudPtaEntity;
    try {
      saved = await this.solicitudRepo.save(entity);
    } catch (error: any) {
      const code = error?.code || error?.driverError?.code;
      if (esEdicion && code === '23505') {
        throw new BadRequestException('Ya existe una solicitud de edición activa para este PTA.');
      }
      throw error;
    }
    if (esEdicion && pta) {
      await this.historialRepo.save(this.historialRepo.create({
        ptaId: pta.id,
        estadoAnterior: pta.estado,
        estadoNuevo: pta.estado,
        actorId: resolvedDocenteId,
        actorRol: 'Docente',
        tipoAccion: 'SOLICITUD_EDICION_CREADA',
        comentarios: justificacion,
        detallesTransicion: JSON.stringify({
          solicitudId: saved.id,
          componentes,
          cantidadArchivos: archivos.length,
          archivos: archivos.map(archivo => ({
            url: archivo.url,
            nombre: archivo.nombre,
          })),
        }),
        snapshotPta: pta.datosEstructurados ?? null,
        version: pta.version,
      }));
      await this.logEvento({
        ptaId: pta.id,
        tipo: 'actualizacion_componente',
        docenteId: pta.docenteId,
        docenteNombre: coalesceString((pta.datosEstructurados as any)?.docente_nombre, saved.docenteNombre),
        estadoAnterior: pta.estado,
        estadoNuevo: pta.estado,
        actor: resolvedDocenteId,
        actorRol: 'Docente',
        sistemaOrigen: 'portal',
        mensaje: `Solicitud de edición creada para: ${componentes.join(', ')}`,
        metadata: { solicitudId: saved.id, componentes },
      });
    }
    return saved;
  }

  async getMisSolicitudesPTA(docenteId: string, auth?: PtaAuthenticatedUser) {
    const docenteIds = await this.resolveDocenteIdentityIds(docenteId);
    if (auth && !this.puedeAdministrarSolicitudes(auth)) {
      if (!auth.userId) throw new ForbiddenException('No fue posible identificar al docente autenticado.');
      const docenteIdsAutenticados = await this.resolveDocenteIdentityIds(auth.userId);
      if (!docenteIds.some(id => docenteIdsAutenticados.includes(id))) {
        throw new ForbiddenException('No puedes consultar solicitudes de otro docente.');
      }
    }
    return await this.solicitudRepo.find({
      where: { docenteId: In(docenteIds) },
      order: { createdAt: 'DESC' },
    });
  }

  async marcarSolicitudLeida(solicitudId: string, auth?: PtaAuthenticatedUser) {
    const existing = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!existing) throw new NotFoundException('Solicitud no encontrada');
    if (auth && !this.puedeAdministrarSolicitudes(auth)) {
      if (!auth.userId) throw new ForbiddenException('No fue posible identificar al docente autenticado.');
      const docenteIdsAutenticados = await this.resolveDocenteIdentityIds(auth.userId);
      if (!docenteIdsAutenticados.includes(existing.docenteId)) {
        throw new ForbiddenException('No puedes modificar notificaciones de otro docente.');
      }
    }
    existing.notificacionLeida = true;
    await this.solicitudRepo.save(existing);
    return { ok: true };
  }

  async resolverSolicitudPTA(solicitudId: string, body: any, auth?: PtaAuthenticatedUser) {
    if (auth && !auth.isSuperUser && !auth.approvesAll && !auth.permissions.has('pta.backoffice.aprobar')) {
      throw new ForbiddenException('No tienes permiso para resolver solicitudes del PTA.');
    }

    const existing = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!existing) throw new NotFoundException('Solicitud no encontrada');
    if (existing.estado !== 'pendiente') {
      throw new BadRequestException('Esta solicitud ya fue resuelta.');
    }

    const decision = coalesceString(body?.decision);
    if (decision !== 'aprobado' && decision !== 'denegado') {
      throw new BadRequestException('La decisión debe ser "aprobado" o "denegado".');
    }
    if (decision === 'denegado' && !coalesceString(body?.motivo)) {
      throw new BadRequestException('Debes indicar el motivo de la denegación.');
    }

    const actorId = auth?.userId || coalesceString(body?.resueltoPorId, body?.resuelto_por_id) || 'Administrador';
    const actorNombre = auth?.name || coalesceString(body?.resueltoPor) || 'Administrador';
    const actorRol = (auth?.roles || []).join(', ') || 'Administrador PTA';

    if (existing.tipoSolicitud === SOLICITUD_EDICION_TIPO) {
      if (!existing.ptaId) throw new BadRequestException('La solicitud de edición no tiene un PTA asociado.');
      const pta = await this.ptaRepo.findOne({ where: { id: existing.ptaId } });
      if (!pta) throw new NotFoundException('El PTA asociado a la solicitud ya no existe.');

      if (decision === 'denegado') {
        // Misma estrategia de bloqueo que la aprobación: dos administradores no
        // pueden aprobar y denegar simultáneamente dejando el PTA reabierto con
        // una solicitud marcada como rechazada.
        const deniedResult = await this.ptaRepo.manager.transaction(async manager => {
          const txSolicitudRepo = manager.getRepository(SolicitudPtaEntity);
          const txPtaRepo = manager.getRepository(PlanTrabajoAcademicoEntity);
          const txHistorialRepo = manager.getRepository(HistorialEstadoPtaEntity);
          const txSolicitud = await txSolicitudRepo.findOne({
            where: { id: existing.id },
            lock: { mode: 'pessimistic_write' },
          });
          const txPta = await txPtaRepo.findOne({
            where: { id: pta.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!txSolicitud || !txPta) {
            throw new NotFoundException('No fue posible resolver la solicitud.');
          }
          if (txSolicitud.estado !== 'pendiente') {
            throw new BadRequestException('Esta solicitud ya fue resuelta.');
          }

          txSolicitud.estado = 'denegado';
          txSolicitud.resolucionMotivo = coalesceString(body?.motivo) as any;
          txSolicitud.resolucionAccion = 'denegar_edicion_componentes';
          txSolicitud.resueltoPor = actorNombre;
          txSolicitud.resolucionFecha = new Date();
          txSolicitud.notificacionLeida = false;
          const denied = await txSolicitudRepo.save(txSolicitud);
          await txHistorialRepo.save(txHistorialRepo.create({
            ptaId: txPta.id,
            estadoAnterior: txPta.estado,
            estadoNuevo: txPta.estado,
            actorId,
            actorRol,
            tipoAccion: 'SOLICITUD_EDICION_DENEGADA',
            comentarios: denied.resolucionMotivo,
            detallesTransicion: JSON.stringify({
              solicitudId: denied.id,
              decision: 'denegado',
              componentes: denied.componentes || [],
              resueltoPorId: actorId,
              resueltoPor: actorNombre,
              resueltoPorRol: actorRol,
              motivoResolucion: denied.resolucionMotivo,
            }),
            snapshotPta: txPta.datosEstructurados ?? null,
            version: txPta.version,
          }));
          return { solicitud: denied, pta: txPta };
        });
        await this.logEvento({
          ptaId: deniedResult.pta.id,
          tipo: 'actualizacion_componente',
          docenteId: deniedResult.pta.docenteId,
          docenteNombre: coalesceString(
            (deniedResult.pta.datosEstructurados as any)?.docente_nombre,
            deniedResult.solicitud.docenteNombre,
          ),
          estadoAnterior: deniedResult.pta.estado,
          estadoNuevo: deniedResult.pta.estado,
          actor: actorId,
          actorRol,
          sistemaOrigen: 'backoffice',
          mensaje: 'Solicitud de edición de PTA denegada',
          metadata: {
            solicitudId: deniedResult.solicitud.id,
            componentes: deniedResult.solicitud.componentes || [],
            decision: 'denegado',
            resueltoPor: actorNombre,
            resueltoPorRol: actorRol,
            motivoResolucion: deniedResult.solicitud.resolucionMotivo,
          },
        });
        await this.ptaNotifications?.notifyProfesorSolicitudEdicionResuelta?.({
          solicitudId: deniedResult.solicitud.id,
          ptaId: deniedResult.pta.id,
          docenteId: deniedResult.pta.docenteId,
          decision: 'denegado',
          componentes: deniedResult.solicitud.componentes || [],
          resueltoPor: actorNombre,
          resueltoPorRol: actorRol,
          motivo: deniedResult.solicitud.resolucionMotivo,
          periodo: deniedResult.pta.periodo,
        });
        return deniedResult.solicitud;
      }

      if (!ptaAdmiteSolicitudEdicion(pta.estado)) {
        throw new BadRequestException(
          `El PTA cambió al estado "${pta.estado}" y ya no puede reabrirse con esta solicitud.`,
        );
      }

      const componentes = normalizeSolicitudComponentes(existing.componentes);
      const approvalKeys = expandSolicitudComponentes(componentes);
      if (approvalKeys.length === 0) {
        throw new BadRequestException('La solicitud no contiene componentes válidos para editar.');
      }
      const comentario = coalesceString(body?.motivo)
        || `Edición autorizada: ${existing.justificacion}`;

      // Materializar la matriz completa antes de reabrirla. Para PTAs históricos
      // aprobados antes de existir la aprobación granular, las filas no elegidas
      // se consolidan como aprobadas y no se envían otra vez a revisión.
      await this.getComponentesAprobacion(pta.id);

      const result = await this.ptaRepo.manager.transaction(async manager => {
        const txSolicitudRepo = manager.getRepository(SolicitudPtaEntity);
        const txPtaRepo = manager.getRepository(PlanTrabajoAcademicoEntity);
        const txApprovalRepo = manager.getRepository(PtaComponentApprovalEntity);
        const txReviewRepo = manager.getRepository(PtaComponentReviewEntity);
        const txHistorialRepo = manager.getRepository(HistorialEstadoPtaEntity);

        const txSolicitud = await txSolicitudRepo.findOne({
          where: { id: existing.id },
          lock: { mode: 'pessimistic_write' },
        });
        const txPta = await txPtaRepo.findOne({
          where: { id: pta.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!txSolicitud || !txPta) throw new NotFoundException('No fue posible resolver la solicitud.');
        if (txSolicitud.estado !== 'pendiente') {
          throw new BadRequestException('Esta solicitud ya fue resuelta.');
        }
        if (!ptaAdmiteSolicitudEdicion(txPta.estado)) {
          throw new BadRequestException(
            `El PTA cambió al estado "${txPta.estado}" y ya no puede reabrirse con esta solicitud.`,
          );
        }
        const estadoAnterior = txPta.estado;
        const nuevoEstado = approvalKeys.some(
          key => COMPONENT_REVISION_STATE[key] === 'REVISION_DOCENTE_N1',
        )
          ? 'REVISION_DOCENTE_N1'
          : 'REVISION_DOCENTE_N2';

        const currentApprovals = await txApprovalRepo.find({
          where: { ptaId: txPta.id, componente: In([...COMPONENT_APPROVAL_KEYS]) },
        });
        // Los PTA históricos aprobados antes de existir la matriz granular
        // pueden traer filas residuales pendientes; solo en esos estados se
        // consolidan los componentes no elegidos. Si el PTA sigue en su
        // aprobación inicial, cada pendiente debe conservarse exactamente para
        // no conceder avales implícitos al autorizar una corrección.
        if (ESTADOS_PTA_RESTAURABLES_EDICION.has(normalizeEstadoFilter(estadoAnterior))) {
          for (const current of currentApprovals) {
            if (approvalKeys.includes(current.componente) || current.estado === 'aprobado') continue;
            current.estado = 'aprobado';
            current.aprobadorId = current.aprobadorId || 'sistema';
            current.aprobadorNombre = current.aprobadorNombre || 'Sistema';
            current.aprobadorRol = current.aprobadorRol || 'Consolidación histórica';
            current.comentarios = current.comentarios
              || 'Aprobación conservada al iniciar una edición parcial.';
            current.fechaAprobacion = current.fechaAprobacion || new Date();
            await txApprovalRepo.save(current);
          }
        }

        for (const componente of approvalKeys) {
          let approval = await txApprovalRepo.findOne({ where: { ptaId: txPta.id, componente } });
          if (!approval) {
            approval = txApprovalRepo.create({ ptaId: txPta.id, componente, estado: 'pendiente' });
          }
          approval.estado = 'devuelto';
          approval.aprobadorId = actorId;
          approval.aprobadorNombre = actorNombre;
          approval.aprobadorRol = actorRol;
          approval.comentarios = comentario;
          approval.respuestaDocente = null;
          approval.fechaAprobacion = new Date();
          approval.scope = 'solicitud_edicion';
          approval.scopeId = txSolicitud.id;
          await txApprovalRepo.save(approval);
        }

        // La reapertura por solicitud de edición exige revisión humana NUEVA
        // antes de poder re-aprobarse: se borran las filas de revisión de los
        // componentes reabiertos para que getComponentesRevision() las
        // regenere en 'pendiente' la próxima vez que se consulten.
        await txReviewRepo.delete({
          ptaId: txPta.id,
          componente: In(approvalKeys),
        } as any);

        txPta.estado = nuevoEstado;
        txPta.version = (txPta.version || 1) + 1;
        txPta.motivoDevolucion =
          `Edición autorizada para ${componentes.join(', ')}. Solicitud ${txSolicitud.id}: ${txSolicitud.justificacion}`;
        const savedPta = await txPtaRepo.save(txPta);

        txSolicitud.estado = 'aprobado';
        txSolicitud.estadoPtaAnterior = estadoAnterior;
        txSolicitud.resolucionMotivo = comentario;
        txSolicitud.resolucionAccion = 'habilitar_edicion_componentes';
        txSolicitud.resueltoPor = actorNombre;
        txSolicitud.resolucionFecha = new Date();
        txSolicitud.notificacionLeida = false;
        const savedSolicitud = await txSolicitudRepo.save(txSolicitud);

        await txHistorialRepo.save(txHistorialRepo.create({
          ptaId: savedPta.id,
          estadoAnterior,
          estadoNuevo: nuevoEstado,
          actorId,
          actorRol,
          tipoAccion: 'SOLICITUD_EDICION_APROBADA',
          comentarios: comentario,
          detallesTransicion: JSON.stringify({
            solicitudId: savedSolicitud.id,
            componentes,
            approvalKeys,
            estadoPtaAnterior: estadoAnterior,
            decision: 'aprobado',
            resueltoPorId: actorId,
            resueltoPor: actorNombre,
            resueltoPorRol: actorRol,
            motivoResolucion: comentario,
          }),
          snapshotPta: savedPta.datosEstructurados ?? null,
          version: savedPta.version,
        }));

        return { solicitud: savedSolicitud, pta: savedPta, estadoAnterior, nuevoEstado };
      });

      await this.logEvento({
        ptaId: result.pta.id,
        tipo: 'cambio_estado',
        docenteId: result.pta.docenteId,
        docenteNombre: coalesceString((result.pta.datosEstructurados as any)?.docente_nombre, existing.docenteNombre),
        estadoAnterior: result.estadoAnterior,
        estadoNuevo: result.nuevoEstado,
        actor: actorId,
        actorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Edición autorizada para: ${componentes.join(', ')}`,
        metadata: {
          solicitudId: existing.id,
          componentes,
          approvalKeys,
          decision: 'aprobado',
          resueltoPor: actorNombre,
          resueltoPorRol: actorRol,
          motivoResolucion: result.solicitud.resolucionMotivo,
        },
      });
      await this.ptaNotifications?.notifyProfesorSolicitudEdicionResuelta?.({
        solicitudId: result.solicitud.id,
        ptaId: result.pta.id,
        docenteId: result.pta.docenteId,
        decision: 'aprobado',
        componentes,
        resueltoPor: actorNombre,
        resueltoPorRol: actorRol,
        motivo: result.solicitud.resolucionMotivo,
        periodo: result.pta.periodo,
      });
      return result.solicitud;
    }

    existing.estado = decision;
    existing.resolucionMotivo = coalesceString(body?.motivo) as any;
    existing.resolucionAccion = coalesceString(body?.accion) as any;
    existing.territorialNueva = coalesceString(body?.territorialNueva) as any;
    existing.horasPtaOriginal = body?.horasPtaOriginal ?? existing.horasPtaOriginal;
    existing.horasPtaNuevo = body?.horasPtaNuevo ?? existing.horasPtaNuevo;
    existing.resueltoPor = actorNombre;
    existing.resolucionFecha = new Date();
    await this.solicitudRepo.save(existing);
    return existing;
  }

  private async enrichSolicitudesPta(solicitudes: SolicitudPtaEntity[]): Promise<any[]> {
    if (!solicitudes.length) return solicitudes;

    const ptaIds = Array.from(new Set(
      solicitudes.map(solicitud => solicitud.ptaId).filter((id): id is string => Boolean(id)),
    ));
    const ptaContextById = new Map<string, any>();

    if (ptaIds.length > 0) {
      try {
        const ptaEntities = await this.ptaRepo.find({ where: { id: In(ptaIds) } as any });
        const ptaDtos = ptaEntities.map(entity => this.toPtaDto(entity));
        await this.enrichPtaSummaries(ptaDtos);
        for (const dto of ptaDtos) ptaContextById.set(dto.id, dto);
      } catch (error: any) {
        // La bandeja debe seguir disponible aun si un catálogo auxiliar falla.
        this.logger.warn(`No fue posible enriquecer los PTA de las solicitudes: ${error?.message || error}`);
      }
    }

    const docenteIds = Array.from(new Set(
      solicitudes.map(solicitud => solicitud.docenteId).filter(Boolean),
    ));
    const contactos = await Promise.all(docenteIds.map(async docenteId => [
      docenteId,
      await this.ptaNotifications?.resolveUser?.(docenteId),
    ] as const));
    const contactoByDocenteId = new Map(contactos);

    return solicitudes.map((solicitud) => {
      const pta = solicitud.ptaId ? ptaContextById.get(solicitud.ptaId) : null;
      const contacto = contactoByDocenteId.get(solicitud.docenteId);
      const territorialesAsignaturas = [
        ...(Array.isArray(pta?.territorialesAsignaturas) ? pta.territorialesAsignaturas : []),
        ...(Array.isArray(pta?.asignaturas)
          ? pta.asignaturas.map((asignatura: any) =>
              coalesceString(
                asignatura?.territorial_nombre,
                asignatura?.territorialNombre,
                asignatura?.territorial?.nombre,
              ))
          : []),
      ]
        .map(value => coalesceString(value))
        .filter((value): value is string => Boolean(value));
      const territoriales = Array.from(new Set(
        territorialesAsignaturas.length > 0
          ? territorialesAsignaturas
          : [coalesceString(pta?.territorial, pta?.territorial_nombre)]
              .filter((value): value is string => Boolean(value)),
      ));
      const territorial = territoriales.join(', ') || null;
      const docenteNombre = coalesceString(
        pta?.docente_nombre,
        pta?.docenteNombre,
        contacto?.nombre,
        solicitud.docenteNombre,
      ) || solicitud.docenteNombre;
      const docenteEmail = coalesceString(contacto?.email, solicitud.docenteEmail);
      const ptaResumen = pta
        ? {
            periodo: coalesceString(pta.periodo),
            estado: coalesceString(pta.estado),
            dedicacion: coalesceString(pta.dedicacion),
            horasProgramadas: Math.max(0, Number(pta.total_horas_programadas) || 0),
            horasRequeridas: Math.max(0, Number(pta.horas_a_programar) || 0),
          }
        : null;

      return {
        ...solicitud,
        docenteNombre,
        docenteEmail,
        territorial,
        territoriales,
        ptaResumen,
        docente: {
          nombreCompleto: docenteNombre,
          correoInstitucional: docenteEmail,
          territorial: territorial ? { nombre: territorial } : null,
        },
      };
    });
  }

  async getSolicitudesPTA(filters?: { estado?: string }, auth?: PtaAuthenticatedUser) {
    if (auth && !this.puedeAdministrarSolicitudes(auth)) {
      throw new ForbiddenException('No tienes permiso para consultar la bandeja global de solicitudes PTA.');
    }
    const qb = this.solicitudRepo.createQueryBuilder('s');
    const estado = coalesceString(filters?.estado)?.toLowerCase();
    if (estado) {
      qb.andWhere('LOWER(s.estado) = :estado', { estado });
    }
    qb.orderBy('s.createdAt', 'DESC');
    qb.take(500);
    const solicitudes = await qb.getMany();
    return this.enrichSolicitudesPta(solicitudes);
  }

  async deletePTA(ptaId: string) {
    const solicitudEdicionActiva = await this.solicitudRepo.findOne({
      where: {
        ptaId,
        tipoSolicitud: SOLICITUD_EDICION_TIPO,
        estado: In(ESTADOS_SOLICITUD_EDICION_ACTIVA),
      } as any,
    });
    if (solicitudEdicionActiva) {
      throw new BadRequestException(
        'No se puede eliminar un PTA mientras tenga una solicitud de edición activa.',
      );
    }
    await Promise.all([
      this.evidenciaRepo.delete({ ptaId }),
      this.historialRepo.delete({ ptaId }),
    ]);
    await this.ptaRepo.delete({ id: ptaId });
    return { deleted: true };
  }

  // ── Cierre reversible de PTAs por cambio de período académico ───────────────
  // El estado funcional se conserva antes de mostrar el PTA como 'Terminado'.
  // Así, si el período vuelve a activarse, el flujo continúa exactamente donde
  // estaba (Borrador, aprobación, concertación, seguimiento, etc.).
  async finalizarPtasPorNuevoPeriodo(nuevoCodigo?: string | null): Promise<{ finalizados: number }> {
    const codigo = coalesceString(nuevoCodigo) || '';
    const terminales = ['Terminado', 'TERMINADO', 'Finalizado', 'FINALIZADO', 'Rechazado', 'RECHAZADO'];

    const rows = await this.ptaRepo.manager.query(
      `
      UPDATE academic_work_plan."PlanTrabajoAcademico" AS p
      SET estado = 'Terminado',
          "estadoAntesCierrePeriodo" = estado,
          "cerradoPorPeriodo" = NULLIF($1, '')
      WHERE p.estado <> ALL($2::text[])
        AND ($1 = '' OR p.periodo IS DISTINCT FROM $1)
        -- Un PTA terminado que fue reabierto mediante solicitud debe poder
        -- completar su edición aunque pertenezca a un periodo anterior. Al
        -- finalizar la reaprobación recuperará por sí mismo "Terminado".
        AND NOT EXISTS (
          SELECT 1
          FROM academic_work_plan."SolicitudPTA" s
          WHERE s."ptaId" = p.id
            AND s."tipoSolicitud" = 'edicion_componentes'
            AND s.estado IN ('aprobado', 'en_aprobacion')
        )
      RETURNING p.id
      `,
      [codigo, terminales],
    );
    const finalizados = Array.isArray(rows) ? rows.length : 0;
    if (finalizados > 0) {
      this.logger.log(
        `[Período ${codigo || 'nuevo'}] ${finalizados} PTA(s) pasaron a 'Terminado' (solo lectura).`,
      );
    }
    return { finalizados };
  }

  /**
   * Restaura los PTA del periodo que vuelve a estar en curso. El fallback desde
   * datosEstructurados repara también cierres hechos por la versión anterior,
   * que sobrescribía `estado` sin guardar una copia explícita.
   */
  async restaurarPtasPorReactivacionPeriodo(codigoPeriodo?: string | null): Promise<{ restaurados: number }> {
    const codigo = coalesceString(codigoPeriodo);
    if (!codigo) return { restaurados: 0 };

    const terminales = ['Terminado', 'TERMINADO', 'Finalizado', 'FINALIZADO', 'Rechazado', 'RECHAZADO'];
    const rows = await this.ptaRepo.manager.query(
      `
      WITH restaurables AS (
        SELECT p.id,
          COALESCE(
            NULLIF(p."estadoAntesCierrePeriodo", ''),
            (
              SELECT NULLIF(h."estadoNuevo", '')
              FROM academic_work_plan."HistorialEstadoPTA" h
              WHERE h."ptaId" = p.id
              ORDER BY h."createdAt" DESC
              LIMIT 1
            ),
            NULLIF(p."datosEstructurados"->>'estado', '')
          ) AS estado_restaurado
        FROM academic_work_plan."PlanTrabajoAcademico" p
        WHERE p.periodo = $1
          AND p.estado IN ('Terminado', 'TERMINADO')
      )
      UPDATE academic_work_plan."PlanTrabajoAcademico" p
      SET estado = r.estado_restaurado,
          "estadoAntesCierrePeriodo" = NULL,
          "cerradoPorPeriodo" = NULL
      FROM restaurables r
      WHERE p.id = r.id
        AND r.estado_restaurado IS NOT NULL
        AND r.estado_restaurado <> ALL($2::text[])
      RETURNING p.id
      `,
      [codigo, terminales],
    );
    const restaurados = Array.isArray(rows) ? rows.length : 0;
    if (restaurados > 0) {
      this.logger.log(
        `[Período ${codigo}] ${restaurados} PTA(s) recuperaron su estado anterior.`,
      );
    }
    return { restaurados };
  }

  // ── Límite de aprobación: PTAs no aprobados dentro del plazo se eliminan ─────
  // El plazo (en semanas) es configurable vía la regla 'semanas_limite_aprobacion_pta'
  // (Configuraciones PTA). Se cuenta desde la fecha de inicio del PTA (createdAt).
  // Los PTA aprobados, en ejecución o terminales quedan a salvo.
  async purgarPtasVencidos(): Promise<{ eliminados: number; ids: string[]; semanas: number }> {
    const rules = (await this.getConfiguracionPTAGlobal()) || {};
    const semanas = this.getRuleNumber(rules, 'semanas_limite_aprobacion_pta', 4);
    if (!Number.isFinite(semanas) || semanas <= 0) {
      return { eliminados: 0, ids: [], semanas: 0 };
    }

    const cutoff = new Date(Date.now() - semanas * 7 * 24 * 60 * 60 * 1000);

    // Estados "a salvo": aprobado / en ejecución / terminal. El resto (borrador,
    // pendientes de aprobación, devuelto, revisión, concertación, escalado) es
    // elegible para purga si superó el plazo.
    const safe = [
      'Aprobado', 'APROBADO', 'En Firme', 'EN_FIRME', 'RADICADO',
      'EN_EJECUCION', 'EN_EJECUCIÓN', 'Terminado', 'TERMINADO', 'Finalizado', 'FINALIZADO', 'Rechazado', 'RECHAZADO',
    ];

    const vencidos = await this.ptaRepo
      .createQueryBuilder('pta')
      .where('pta.estado NOT IN (:...safe)', { safe })
      .andWhere('pta.createdAt < :cutoff', { cutoff })
      .getMany();

    const ids: string[] = [];
    for (const pta of vencidos) {
      try {
        await this.deletePTA(pta.id);
        ids.push(pta.id);
      } catch (error: any) {
        this.logger.warn(`No se pudo eliminar PTA vencido ${pta.id}: ${error?.message}`);
      }
    }

    this.lastPurgeAt = Date.now();
    if (ids.length > 0) {
      this.logger.log(
        `Purga PTA: ${ids.length} plan(es) eliminados por superar ${semanas} semana(s) sin aprobación.`,
      );
    }
    return { eliminados: ids.length, ids, semanas };
  }

  /** Ejecuta la purga de vencidos como máximo una vez por hora (sweep perezoso). */
  private purgarPtasVencidosThrottled(): void {
    const UNA_HORA = 60 * 60 * 1000;
    if (Date.now() - this.lastPurgeAt < UNA_HORA) return;
    this.lastPurgeAt = Date.now(); // marcar de inmediato para evitar barridos concurrentes
    this.purgarPtasVencidos().catch((error) =>
      this.logger.warn(`Purga PTA (sweep) falló: ${error?.message}`),
    );
  }

  async getAllPtasConEvidencias(periodo?: string) {
    const qb = this.ptaRepo.createQueryBuilder('pta');
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    qb.orderBy('pta.updatedAt', 'DESC');
    qb.take(500);
    const ptas = await qb.getMany();
    if (ptas.length === 0) return [];

    await Promise.all(
      ptas
        .filter(pta => isPtaHabilitadoParaSeguimientoPorEstado(pta.estado))
        .filter(pta => Boolean(
          coalesceString((pta.datosEstructurados as any)?.investigacion_proyecto?.resolucion_archivo_url),
        ))
        .map(pta => this.syncResolucionProyectoInvestigacion(
          pta.id,
          (pta.datosEstructurados || {}) as SavePtaInput,
        )),
    );

    const ids = ptas.map((p) => p.id);
    const evidencias = await this.evidenciaRepo
      .createQueryBuilder('ev')
      .where('ev.ptaId IN (:...ids)', { ids })
      .orderBy('ev.createdAt', 'DESC')
      .getMany();

    const evidenciasByPta: Record<string, any[]> = {};
    for (const ev of evidencias) {
      evidenciasByPta[ev.ptaId] ||= [];
      evidenciasByPta[ev.ptaId].push(this.toEvidenciaDto(ev));
    }

    const extMult = await this.getExtMultiplicadores();
    const dtos = ptas.map((pta) => ({
      ...this.toPtaDto(pta, extMult),
      evidencias: evidenciasByPta[pta.id] || [],
    }));
    await this.attachPtaReferenceDates(dtos);
    return this.sortPtasByReferenceDate(await this.enrichPtaSummaries(dtos));
  }

  async getConfiguracionPTAGlobal() {
    const keys = ['pta_rules_v2', 'global'];
    for (const key of keys) {
      const row = await this.configuracionRepo.findOne({ where: { id: key } });
      if (row?.rules != null) return this.normalizePtaRules(row.rules);
    }
    return null;
  }

  async saveConfiguracionPTAGlobal(rules: any, userId?: string) {
    this.extMultCache = null; // invalidar caché de multiplicadores al cambiar la config
    const key = 'pta_rules_v2';
    rules = this.normalizePtaRules(rules);

    // ── R7: Lock check ──────────────────────────────────────────────────
    const existing = await this.configuracionRepo.findOne({ where: { id: key } });
    if (existing?.rules?.config_bloqueada && rules?.config_bloqueada !== false) {
      return { _error: 'Configuración bloqueada. Desbloquee antes de guardar.', _warnings: [] };
    }
    const reorderedSection = findReorderedPtaSection(existing?.rules, rules);
    if (reorderedSection) {
      return {
        _error: `No se puede cambiar el orden de las columnas de ${reorderedSection}.`,
        _warnings: ['El orden de creación protege la jerarquía y la asociación de actividades, valores y horas.'],
      };
    }

    // ── R3: Validación de rangos normativos (Circular 003/2025) ──────────
    const warnings: string[] = [];
    const NORMATIVE_RANGES: Record<string, { min: number; max: number; label: string }> = {
      max_pct_investigacion: { min: 0, max: 50, label: 'Tope máx. Investigación' },
      max_horas_investigacion_global: { min: 0, max: 400, label: 'Tope global Investigación' },
      max_pct_extension: { min: 0, max: 25, label: 'Tope máx. Extensión' },
      max_horas_extension_global: { min: 0, max: 200, label: 'Tope global Extensión' },
      max_pct_complementarias: { min: 0, max: 25, label: 'Tope máx. Complementarias' },
      max_horas_complementarias_global: { min: 0, max: 200, label: 'Tope global Complementarias' },
      max_pct_aadm: { min: 0, max: 25, label: 'Tope máx. AADM' },
      max_horas_aadm_global: { min: 0, max: 200, label: 'Tope global AADM' },
      max_pct_inv_ext_combinado: { min: 0, max: 50, label: 'Tope cruzado Inv+Ext' },
      horas_base_carrera_009: { min: 600, max: 800, label: 'Horas base Acuerdo 009' },
      horas_base_carrera_003: { min: 600, max: 900, label: 'Horas base Acuerdo 003' },
      horas_semanales_tc: { min: 20, max: 48, label: 'Horas semanales TC' },
      horas_semanales_mt: { min: 10, max: 24, label: 'Horas semanales MT' },
      min_creditos_docencia: { min: 1, max: 10, label: 'Mín. créditos docencia' },
      min_pct_docencia_no_vinculados: { min: 30, max: 70, label: 'Mín. % docencia no vinculados' },
      criterio_multiplicador_docencia: { min: 1, max: 5, label: 'Multiplicador docencia' },
      dias_cierre_concertacion: { min: 1, max: 30, label: 'Días cierre concertación' },
      dias_limite_radicacion_ggp: { min: 1, max: 30, label: 'Días radicar GGP' },
      dias_verificacion_posterior: { min: 1, max: 30, label: 'Días verificación' },
      sla_consolidacion_nacional: { min: 5, max: 30, label: 'SLA consolidación nacional' },
    };

    if (rules && typeof rules === 'object') {
      const rangeErrors: string[] = [];
      for (const [field, range] of Object.entries(NORMATIVE_RANGES)) {
        const val = rules[field];
        if (val !== undefined && val !== null && val !== '') {
          const numericVal = Number(val);
          if (Number.isFinite(numericVal) && (numericVal < range.min || numericVal > range.max)) {
            rangeErrors.push(`${range.label} (${field}): valor ${numericVal} fuera del rango normativo [${range.min}-${range.max}]`);
          }
        }
      }

      const circularVersion = normalizeEstadoFilter(rules?.circular_version);
      const isCircular003 = circularVersion.includes('003') && circularVersion.includes('2025');
      if (rangeErrors.length > 0) {
        if (isCircular003) {
          return {
            _error: 'Configuracion Circular 003/2025 fuera de rango. No se guardaron los cambios.',
            _warnings: rangeErrors,
          };
        }
        warnings.push(...rangeErrors);
      }

      // ── R8: Cross-validation ────────────────────────────────────────────
      const pctSum = (rules.max_pct_investigacion || 0) + (rules.max_pct_extension || 0) + (rules.max_pct_complementarias || 0);
      if (pctSum > 100) {
        warnings.push(`Suma de porcentajes Inv(${rules.max_pct_investigacion}%) + Ext(${rules.max_pct_extension}%) + Comp(${rules.max_pct_complementarias}%) = ${pctSum}% excede 100%`);
      }
      if ((rules.horas_semanales_mt || 0) >= (rules.horas_semanales_tc || 40)) {
        warnings.push(`Horas MT (${rules.horas_semanales_mt}) deben ser menores que TC (${rules.horas_semanales_tc})`);
      }
      if ((rules.sla_consolidacion_nacional || 0) <= (rules.dias_limite_radicacion_ggp || 0)) {
        warnings.push(`SLA consolidación (${rules.sla_consolidacion_nacional}) debe ser > plazo radicación GGP (${rules.dias_limite_radicacion_ggp})`);
      }
    }

    // ── R5: Audit trail — calcular campos modificados ────────────────────
    const changedFields: string[] = [];
    if (existing?.rules && rules && typeof rules === 'object') {
      const AUDIT_SKIP = ['config_changelog', 'config_snapshots', 'fecha_inicio_semestre', 'fecha_fin_semestre'];
      for (const k of Object.keys(rules)) {
        if (AUDIT_SKIP.includes(k)) continue;
        const oldVal = existing.rules[k];
        const newVal = rules[k];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push(k);
        }
      }
    }

    // ── R12: Save snapshot before applying changes ───────────────────────
    if (changedFields.length > 0 && existing?.rules) {
      const snapshots = Array.isArray(rules.config_snapshots) ? [...rules.config_snapshots] : [];
      const { config_snapshots: _cs, config_changelog: _cl, ...snapshotData } = existing.rules;
      snapshots.push({
        fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
        usuario: userId || 'sistema',
        snapshot: snapshotData,
        label: `Antes de ${changedFields.length} cambio(s)`,
      });
      // Keep only last 10 snapshots
      rules.config_snapshots = snapshots.slice(-10);
    }

    // Append changelog entry if there are actual changes
    if (changedFields.length > 0) {
      const changelog = Array.isArray(rules.config_changelog) ? [...rules.config_changelog] : [];
      changelog.push({
        fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
        usuario: userId || 'sistema',
        campos_modificados: changedFields,
        nota: warnings.length > 0 ? `⚠ ${warnings.length} advertencia(s) normativa(s)` : undefined,
      });
      // Keep only last 50 entries
      rules.config_changelog = changelog.slice(-50);
    }

    const saved = await this.configuracionRepo.save(
      existing
        ? { ...existing, rules: rules ?? null }
        : this.configuracionRepo.create({ id: key, rules: rules ?? null }),
    );

    // ── R13: Notify on config change (fire-and-forget) ──────────────────
    if (changedFields.length > 0) {
      this.notifyConfigChange(userId || 'sistema', changedFields, warnings).catch(() => {});
    }

    // ── R14: SLA alerts check (fire-and-forget) ─────────────────────────
    if (rules?.fecha_inicio_semestre) {
      this.checkSLADeadlines(rules).catch(() => {});
    }

    return { ...(saved.rules ?? {}), _warnings: warnings.length > 0 ? warnings : undefined };
  }

  // ── R13: Notify stakeholders of config changes ──────────────────────────
  private async notifyConfigChange(usuario: string, campos: string[], warnings: string[]) {
    try {
      const payload = {
        type: 'config_pta_change',
        title: 'Configuración PTA actualizada',
        message: `${usuario} modificó ${campos.length} campo(s): ${campos.slice(0, 5).join(', ')}${campos.length > 5 ? '...' : ''}`,
        severity: warnings.length > 0 ? 'warning' : 'info',
        metadata: { campos, warnings, usuario, fecha: new Date().toISOString() },
      };
      await fetch('http://localhost:3009/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}); // non-blocking
    } catch { /* non-critical */ }
  }

  // ── R14: Check SLA deadlines and generate alerts ────────────────────────
  private async checkSLADeadlines(rules: any) {
    try {
      const fechaInicio = rules.fecha_inicio_semestre ? new Date(rules.fecha_inicio_semestre) : null;
      if (!fechaInicio || isNaN(fechaInicio.getTime())) return;

      const hoy = new Date();
      const slaFields = [
        { key: 'dias_cierre_concertacion', label: 'Cierre de concertación', dias: rules.dias_cierre_concertacion },
        { key: 'dias_limite_radicacion_ggp', label: 'Radicación GGP', dias: rules.dias_limite_radicacion_ggp },
        { key: 'sla_consolidacion_nacional', label: 'Consolidación nacional', dias: rules.sla_consolidacion_nacional },
      ];

      for (const sla of slaFields) {
        if (!sla.dias) continue;
        const deadline = new Date(fechaInicio);
        deadline.setDate(deadline.getDate() + (sla.dias * 7 / 5)); // business days to calendar days approx
        const daysLeft = Math.ceil((deadline.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) {
          await fetch('http://localhost:3009/notifications/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'sla_alert',
              title: `⏰ SLA próximo a vencer: ${sla.label}`,
              message: `Faltan ${daysLeft} día(s) para el ${sla.label} (${deadline.toLocaleDateString()})`,
              severity: daysLeft <= 3 ? 'critical' : 'warning',
            }),
          }).catch(() => {});
        }
      }
    } catch { /* non-critical */ }
  }

  // Contrato del frontend (mfe-pta): tags = Record<ptaId, {label,color}[]>,
  // notes = Record<ptaId, string>, pinned = string[], priorityOrder = string[].
  // Se aceptan también las claves legacy (saved_tags, pinned_pta_ids, favorite_views).
  private normalizeUserDataRow(row: Partial<PtaUserDataEntity>) {
    const tags = row.tags && typeof row.tags === 'object' && !Array.isArray(row.tags) ? row.tags : {};
    const notes = row.notes && typeof row.notes === 'object' && !Array.isArray(row.notes) ? row.notes : {};
    const pinned = Array.isArray(row.pinned) ? row.pinned : [];
    const priorityOrder = Array.isArray(row.priority) ? row.priority : [];
    return {
      tags,
      notes,
      pinned,
      priorityOrder,
      // alias legacy
      pinned_pta_ids: pinned,
      favorite_views: priorityOrder,
    };
  }

  async getPTAUserData(userId: string) {
    const row = await this.userDataRepo.findOne({ where: { userId } });
    if (!row) return null;
    return this.normalizeUserDataRow(row);
  }

  async savePTAUserData(userId: string, data: any) {
    const existing = await this.userDataRepo.findOne({ where: { userId } });
    const next = {
      tags: data?.tags ?? data?.saved_tags ?? existing?.tags ?? {},
      notes: data?.notes ?? existing?.notes ?? {},
      pinned: data?.pinned ?? data?.pinned_pta_ids ?? existing?.pinned ?? [],
      priority: data?.priorityOrder ?? data?.favorite_views ?? existing?.priority ?? [],
    };

    const saved = await this.userDataRepo.save(
      existing
        ? { ...existing, ...next }
        : this.userDataRepo.create({ userId, ...next }),
    );

    return this.normalizeUserDataRow(saved);
  }

  async seedPTAs() {
    const docentes = await this.docenteRepo.find({ take: 3, order: { createdAt: 'DESC' } });
    const periodo = '2026-1';
    const estados = ['BORRADOR', 'Pendiente Jefatura', 'Aprobado'];
    let created = 0;

    for (let i = 0; i < docentes.length; i++) {
      const docenteId = docentes[i]?.id;
      if (!docenteId) continue;
      const estado = estados[i % estados.length];
      await this.savePTA({
        docente_id: docenteId,
        periodo,
        estado,
        _adminEdit: true,
        docente_nombre: `Docente ${i + 1}`,
        programa: 'Programa Demo',
        territorial: 'Territorial Demo',
        horas_totales: 40,
      });
      created += 1;
    }

    return { created };
  }

  // ─────────────────────────────
  // Catálogos (migración legacy)
  // ─────────────────────────────
  async getCatalogoProgramas() {
    const progs = await this.programaRepo.find({ order: { nombre: 'ASC' } });
    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };
    return progs.map((p: any) => ({
      ...p,
      nivel: nivelFormacionMap[p.tipo] || p.tipo || 'Pregrado',
    }));
  }

  async getCatalogoAsignaturas(query?: any) {
    const q = query || {};
    const programaId = coalesceString(q.programaId, q.programa_id);
    const completo = String(q.completo || '').toLowerCase() === 'true';

    const params: any[] = [];
    const where = !completo && programaId
      ? (() => {
          params.push(programaId);
          return `WHERE a.id_programa::text = $1 OR p.id::text = $1 OR p.codigo = $1`;
        })()
      : '';

    const rows = await this.asignaturaRepo.query(
      `
      SELECT
        a.id,
        a.id_programa AS "programaId",
        a.nombre,
        a.codigo,
        a.pensum,
        a.nombre_base AS "nombreBase",
        a.creditos,
        a.horas_fijas_pta AS horas,
        a.horas_clase AS "horasClase",
        a.horas_pta AS "horasPta",
        a.id_nucleo_tematico AS "nucleoTematico",
        nt.nombre AS "nucleoTematicoNombre",
        a.id_ubicacion_semestral AS semestre_id,
        us.etiqueta AS semestre_etiqueta,
        a.modalidad,
        a.tipo_excepcion AS tipo,
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        p.id AS programa_real_id,
        p.codigo AS programa_codigo,
        p.nombre AS programa_nombre,
        p.tipo AS programa_nivel,
        p.activo AS programa_estado,
        p.id_facultad AS programa_facultad,
        p.modalidad AS programa_modalidad
      FROM academic_work_plan.asignatura a
      LEFT JOIN academic_work_plan.programa p
        ON p.id = a.id_programa
      LEFT JOIN academic_work_plan.ubicacion_semestral us
        ON us.id = a.id_ubicacion_semestral
      LEFT JOIN academic_work_plan.nucleo_tematico nt
        ON nt.id = a.id_nucleo_tematico
      ${where}
      ORDER BY a.nombre ASC
      LIMIT 5000
      `,
      params,
    );

    return rows.map((a: any) => ({
      id: a.id,
      programaId: a.programaId,
      programa_id: a.programa_real_id || a.programaId,
      nombre: a.nombre,
      nombreVisible: obtenerNombreVisibleAsignatura(a),
      codigo: a.codigo,
      pensum: a.pensum,
      pensumKey: a.pensum || '__SIN_PENSUM__',
      nombreBase: a.nombreBase,
      creditos: a.creditos,
      horas: a.horas,
      horasClase: a.horasClase,
      horasPta: a.horasPta,
      horas_clase: a.horasClase,
      horas_pta: a.horasPta,
      nucleoTematico: a.nucleoTematicoNombre || a.nucleoTematico,
      nucleo: a.nucleoTematicoNombre || 'General',
      semestre: a.semestre_etiqueta || a.semestre_id,
      modalidad: a.modalidad,
      tipo: a.tipo,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      programa: a.programa_real_id ? {
        id: a.programa_real_id,
        codigo: a.programa_codigo,
        nombre: a.programa_nombre,
        descripcion: a.programa_descripcion,
        estado: a.programa_estado,
        nivel: a.programa_nivel,
        facultad: a.programa_facultad,
        modalidad: a.programa_modalidad,
      } : null,
    }));
  }

  async getCatalogoTerritoriales(periodo?: string) {
    const params: any[] = [];
    let queryStr = '';

    if (periodo) {
      params.push(periodo);
      queryStr = `
        WITH active_sedes AS (
           SELECT DISTINCT s.id_sede
           FROM (
             SELECT mapping.id_sede
             FROM auth.sede_cetap_mapping mapping
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = mapping.id_cetap AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
             UNION
             SELECT sede.id_sede
             FROM auth.sedes sede
             INNER JOIN academic_work_plan.cetap cetap ON cetap.codigo = sede.cod_sede
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = cetap.id AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
           ) s
        )
        SELECT
          sec.id_seccional::text AS id,
          sec.nom_seccional AS nombre,
          sec.cod_seccional AS codigo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', sede.id_sede::text,
                'territorialId', sec.id_seccional::text,
                'nombre', sede.nom_sede,
                'municipio', NULL,
                'codigo', sede.cod_sede
              )
              ORDER BY sede.nom_sede
            ) FILTER (WHERE sede.id_sede IS NOT NULL AND sede.id_sede IN (SELECT id_sede FROM active_sedes)),
            '[]'::json
          ) AS sedes
        FROM auth.seccionales sec
        INNER JOIN auth.sedes sede ON sede.id_seccional = sec.id_seccional
        WHERE sede.id_sede IN (SELECT id_sede FROM active_sedes)
        GROUP BY sec.id_seccional, sec.nom_seccional, sec.cod_seccional
        ORDER BY sec.nom_seccional ASC
      `;
    } else {
      queryStr = `
        SELECT
          sec.id_seccional::text AS id,
          sec.nom_seccional AS nombre,
          sec.cod_seccional AS codigo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', sede.id_sede::text,
                'territorialId', sec.id_seccional::text,
                'nombre', sede.nom_sede,
                'municipio', NULL,
                'codigo', sede.cod_sede
              )
              ORDER BY sede.nom_sede
            ) FILTER (WHERE sede.id_sede IS NOT NULL),
            '[]'::json
          ) AS sedes
        FROM auth.seccionales sec
        LEFT JOIN auth.sedes sede ON sede.id_seccional = sec.id_seccional
        GROUP BY sec.id_seccional, sec.nom_seccional, sec.cod_seccional
        ORDER BY sec.nom_seccional ASC
      `;
    }

    return await this.ptaRepo.manager.query(queryStr, params);
  }

  async getCatalogoCetaps(query?: any) {
    const territorialId = coalesceString(query?.territorial_id, query?.territorialId);
    const periodo = coalesceString(query?.periodo);

    const params: any[] = [];
    let queryStr = '';

    if (periodo) {
      params.push(periodo); // $1
      let whereTerritorial = '';
      if (territorialId) {
        params.push(territorialId); // $2
        whereTerritorial = 'AND sede.id_seccional::text = $2';
      }
      queryStr = `
        WITH active_sedes AS (
           SELECT DISTINCT s.id_sede
           FROM (
             SELECT mapping.id_sede
             FROM auth.sede_cetap_mapping mapping
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = mapping.id_cetap AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
             UNION
             SELECT sede.id_sede
             FROM auth.sedes sede
             INNER JOIN academic_work_plan.cetap cetap ON cetap.codigo = sede.cod_sede
             INNER JOIN academic_work_plan.periodo_cetap pc ON pc.id_cetap = cetap.id AND pc.activo = TRUE
             INNER JOIN academic_work_plan.periodo_academico per ON per.id = pc.id_periodo_academico AND per.codigo = $1
           ) s
        )
        SELECT
          sede.id_sede::text AS id,
          sede.id_seccional::text AS "territorialId",
          sede.nom_sede AS nombre,
          NULL AS municipio,
          sede.cod_sede AS codigo
        FROM auth.sedes sede
        WHERE sede.id_sede IN (SELECT id_sede FROM active_sedes)
        ${whereTerritorial}
        ORDER BY sede.nom_sede ASC
      `;
    } else {
      let whereTerritorial = '';
      if (territorialId) {
        params.push(territorialId); // $1
        whereTerritorial = 'WHERE sede.id_seccional::text = $1';
      }
      queryStr = `
        SELECT
          sede.id_sede::text AS id,
          sede.id_seccional::text AS "territorialId",
          sede.nom_sede AS nombre,
          NULL AS municipio,
          sede.cod_sede AS codigo
        FROM auth.sedes sede
        ${whereTerritorial}
        ORDER BY sede.nom_sede ASC
      `;
    }

    return await this.ptaRepo.manager.query(queryStr, params);
  }

  /**
   * CETAPs filtrados por programa (via oferta_cetap_programa).
   * Retorna solo los CETAPs que tienen oferta activa para el programa dado.
   * Opcionalmente filtra por territorial (dirección territorial del cetap).
   */
  async getCetapsPorPrograma(query?: any) {
    const programaId = coalesceString(query?.programa_id, query?.programaId);
    const territorialId = coalesceString(query?.territorial_id, query?.territorialId);

    if (!programaId) {
      // Sin programa, retorna vacío (el frontend debería pasar siempre el programa)
      return [];
    }

    const params: any[] = [programaId];
    let whereExtra = '';
    if (territorialId) {
      params.push(territorialId);
      whereExtra = `AND dt.id::text = $${params.length}`;
    }

    return await this.ptaRepo.manager.query(
      `
      SELECT
        c.id::text AS id,
        c.codigo,
        c.nombre,
        c.id_direccion_territorial::text AS "territorialId",
        dt.nombre AS "territorialNombre",
        ocp.cupos_estimados AS "cuposEstimados",
        ocp.id::text AS "ofertaId"
      FROM academic_work_plan.oferta_cetap_programa ocp
      JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
      JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
      WHERE ocp.id_programa::text = $1
        AND ocp.activa = true
        AND c.activo = true
        ${whereExtra}
      ORDER BY c.nombre ASC
      `,
      params,
    );
  }

  /**
   * Programas ofertados en un CETAP dado.
   * Acepta TANTO auth.sedes.id_sede COMO academic_work_plan.cetap.id como cetapId.
   *
   * Strategy: Single query that handles both ID spaces:
   *   - Direct: cetap.id = $1  (if the caller passes academic_work_plan.cetap.id)
   *   - Bridge: auth.sedes.id_sede = $1 → match by cod_sede → cetap.codigo
   */
  async getProgramasPorSede(query?: any) {
    const sedeId = coalesceString(query?.cetap_id, query?.sede_id, query?.cetapId);
    const periodoCodigo = query?.periodo;

    if (!sedeId) {
      return [];
    }

    const params: any[] = [sedeId];
    let joinPeriodo = '';
    
    if (periodoCodigo) {
      params.push(periodoCodigo);
      joinPeriodo = `
        INNER JOIN academic_work_plan.periodo_academico per
          ON ocp.id_periodo_academico = per.id AND per.codigo = $2
      `;
    }

    console.log('[BACKEND DEBUG] getProgramasPorSede params:', { sedeId, periodoCodigo, params });

    // Single query: try direct cetap.id match OR bridge via auth.sedes.cod_sede
    const raw = await this.ptaRepo.manager.query(
      `
      SELECT DISTINCT
        p.id::text AS id,
        p.codigo,
        p.nombre,
        p.nombre_corto AS "nombreCorto",
        p.tipo,
        p.modalidad,
        p.horas_base_por_credito AS "horasBasePorCredito",
        p.horas_pregrado_central AS "horasPregradoCentral"
      FROM academic_work_plan.programa p
      INNER JOIN academic_work_plan.oferta_cetap_programa ocp
        ON ocp.id_programa = p.id AND ocp.activa = true
      ${joinPeriodo}
      INNER JOIN academic_work_plan.cetap c
        ON c.id = ocp.id_cetap AND c.activo = true
      WHERE p.activo = true
        AND (
          -- Match 1: direct cetap.id
          c.id::text = $1
          -- Match 2: bridge via auth.sedes.cod_sede -> cetap.codigo
          OR c.codigo IN (
            SELECT s.cod_sede FROM auth.sedes s WHERE s.id_sede::text = $1
          )
          -- Match 3: bridge via auth.sedes name (accent-insensitive fallback)
          OR translate(LOWER(c.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou')
             = translate(LOWER((SELECT s.nom_sede FROM auth.sedes s WHERE s.id_sede::text = $1 LIMIT 1)), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou')
        )
      ORDER BY p.nombre ASC
      `,
      params,
    );

    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };
    return raw.map((p: any) => ({
      ...p,
      nivel: nivelFormacionMap[p.tipo] || p.tipo || 'Pregrado',
    }));
  }

  /**
   * Obtiene cupos_estimados para la combinación CETAP + Programa.
   * Usado para auto-llenar el campo "Estudiantes" en el formulario PTA.
   * Acepta auth.sedes.id_sede o academic_work_plan.cetap.id como cetapId.
   */
  async getOfertaCetapPrograma(query?: any) {
    const cetapId = coalesceString(query?.cetap_id, query?.cetapId);
    const programaId = coalesceString(query?.programa_id, query?.programaId);
    const periodo = coalesceString(query?.periodo, query?.periodo_codigo, query?.periodoCodigo);

    if (!cetapId || !programaId) {
      return { cupos_estimados: null };
    }

    const rows = await this.ptaRepo.manager.query(
      `
      SELECT ocp.cupos_estimados
      FROM academic_work_plan.oferta_cetap_programa ocp
      JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
      JOIN academic_work_plan.periodo_academico pa ON pa.id = ocp.id_periodo_academico
      WHERE ocp.id_programa::text = $2
        AND ocp.activa = true
        AND ($3::text IS NULL OR pa.codigo = $3)
        AND (
          c.id::text = $1
          OR c.codigo IN (SELECT s.cod_sede FROM auth.sedes s WHERE s.id_sede::text = $1)
        )
      ORDER BY COALESCE(ocp.updated_at, ocp.created_at) DESC
      LIMIT 1
      `,
      [cetapId, programaId, periodo],
    );

    return {
      cupos_estimados: rows.length > 0 ? rows[0].cupos_estimados : null,
    };
  }

  /**
   * Refresca únicamente el dato derivado `total_estudiantes` de las asignaturas
   * PTA. Si una fila legacy no tiene CETAP/programa, o ya no existe una oferta
   * activa para el periodo, se conserva intacta para no dañar el borrador.
   */
  private async syncAsignaturasCupos(asignaturas: any[], periodo?: string | null): Promise<any[]> {
    if (!Array.isArray(asignaturas) || asignaturas.length === 0) return asignaturas;

    const requests = new Map<string, Promise<number | null>>();
    const getCupos = (cetapId: string, programaId: string) => {
      const key = `${cetapId}::${programaId}::${periodo || ''}`;
      let request = requests.get(key);
      if (!request) {
        request = this.getOfertaCetapPrograma({
          cetap_id: cetapId,
          programa_id: programaId,
          periodo,
        })
          .then(result => {
            const cupos = Number(result?.cupos_estimados);
            return Number.isInteger(cupos) && cupos > 0 ? cupos : null;
          })
          .catch((error: any) => {
            this.logger.warn(
              `No se pudieron sincronizar cupos PTA para CETAP ${cetapId} y programa ${programaId}: ${error?.message || error}`,
            );
            return null;
          });
        requests.set(key, request);
      }
      return request;
    };

    return Promise.all(asignaturas.map(async (asignatura: any) => {
      const cetapId = coalesceLookupKey(
        asignatura?.cetap_id,
        asignatura?.cetapId,
        asignatura?.sede_id,
        asignatura?.sedeId,
      );
      const programaId = coalesceLookupKey(
        asignatura?.programa_id,
        asignatura?.programaId,
        asignatura?.programa?.id,
      );
      if (!cetapId || !programaId) return asignatura;

      const cupos = await getCupos(cetapId, programaId);
      return cupos == null
        ? asignatura
        : { ...asignatura, total_estudiantes: cupos };
    }));
  }

  /**
   * Usa la asignatura del catálogo como fuente de verdad para Pensum. Así, una
   * fila legacy queda actualizada al guardarse y un cliente no puede asociar una
   * asignatura con un programa diferente al que realmente le corresponde.
   */
  private async syncAsignaturasPensum(
    asignaturas: any[],
    strict = true,
  ): Promise<any[]> {
    if (!Array.isArray(asignaturas) || asignaturas.length === 0) return asignaturas;

    const assignmentIds = [...new Set(
      asignaturas
        .map((item: any) => coalesceLookupKey(item?.asignatura_id, item?.asignaturaId))
        .filter((value): value is string => Boolean(value)),
    )];
    if (assignmentIds.length === 0) return asignaturas;

    const programIds = [...new Set(
      asignaturas
        .map((item: any) => coalesceLookupKey(
          item?.programa_id,
          item?.programaId,
          item?.programa?.id,
        ))
        .filter((value): value is string => Boolean(value)),
    )];

    const subjects = await this.asignaturaRepo.query(
      `SELECT a.id, a.id_programa, a.pensum, a.nombre, a.nombre_base,
              a.codigo, a.modalidad, a.creditos,
              us.etiqueta AS semestre,
              nt.nombre AS nucleo_tematico
       FROM academic_work_plan.asignatura a
       LEFT JOIN academic_work_plan.ubicacion_semestral us
         ON us.id = a.id_ubicacion_semestral
       LEFT JOIN academic_work_plan.nucleo_tematico nt
         ON nt.id = a.id_nucleo_tematico
       WHERE a.id::text = ANY($1::text[])
          OR a.id_programa::text = ANY($2::text[])`,
      [assignmentIds, programIds],
    );
    const byId = new Map<string, any>(
      subjects.map((subject: any) => [String(subject.id), subject]),
    );

    const normalizeIdentity = (value: unknown) => String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const nameVariants = (value: unknown) => {
      const raw = String(value ?? '').trim();
      return new Set([
        normalizeIdentity(raw),
        normalizeIdentity(raw.replace(/\s*\([^)]*\)\s*$/, '')),
      ].filter(Boolean));
    };
    const candidateMatchesName = (candidate: any, variants: Set<string>) => [
      candidate?.nombre,
      candidate?.nombre_base,
    ].some(value => {
      const candidateVariants = nameVariants(value);
      return [...candidateVariants].some(key => variants.has(key));
    });
    const unique = (candidates: any[]) => {
      const values = new Map<string, any>(
        candidates.map(candidate => [String(candidate.id), candidate]),
      );
      return values.size === 1 ? [...values.values()][0] : null;
    };

    return asignaturas.map((item: any) => {
      const assignmentId = coalesceLookupKey(item?.asignatura_id, item?.asignaturaId);
      if (!assignmentId) return item;
      const programId = coalesceLookupKey(
        item?.programa_id,
        item?.programaId,
        item?.programa?.id,
      );
      const storedPensum = coalesceString(item?.pensum);
      const programSubjects = subjects.filter(
        (candidate: any) => !programId || String(candidate.id_programa) === programId,
      );
      const pensumSubjects = storedPensum && storedPensum !== '__SIN_PENSUM__'
        ? programSubjects.filter(
            (candidate: any) => String(candidate.pensum || '').trim() === storedPensum,
          )
        : programSubjects;

      const storedCode = normalizeIdentity(
        item?.asignatura_codigo ?? item?.codigo_asignatura ?? item?.codigo,
      );
      const storedNames = nameVariants(
        item?.asignatura_nombre ?? item?.asignaturaNombre ?? item?.nombre,
      );
      const findByCode = (candidates: any[]) => storedCode
        ? unique(candidates.filter(
            (candidate: any) => normalizeIdentity(candidate.codigo) === storedCode,
          ))
        : null;
      const findByName = (candidates: any[]) => {
        if (storedNames.size === 0) return null;
        let matches = candidates.filter(
          (candidate: any) => candidateMatchesName(candidate, storedNames),
        );
        if (matches.length <= 1) return unique(matches);

        // Tras una recarga masiva puede haber nombres repetidos entre Pensum o
        // modalidades. Los metadatos ya guardados en el PTA permiten recuperar
        // la fila correcta sin exigir que el docente vuelva a seleccionarla.
        const storedNucleo = normalizeIdentity(
          item?.nucleo_tematico ?? item?.nucleoTematico ?? item?.nucleo,
        );
        const storedSemester = normalizeIdentity(item?.semestre);
        const rawModality = normalizeIdentity(item?.modalidad);
        const storedModality = ['por definir', 'sin definir', 'sin_definir'].includes(rawModality)
          ? ''
          : rawModality;
        const storedCredits = Number(item?.creditos);
        const discriminators: Array<(candidate: any) => boolean> = [];
        if (storedNucleo) {
          discriminators.push(
            candidate => normalizeIdentity(candidate?.nucleo_tematico) === storedNucleo,
          );
        }
        if (storedSemester) {
          discriminators.push(
            candidate => normalizeIdentity(candidate?.semestre) === storedSemester,
          );
        }
        if (storedModality) {
          discriminators.push(
            candidate => normalizeIdentity(candidate?.modalidad) === storedModality,
          );
        }
        if (Number.isFinite(storedCredits) && storedCredits > 0) {
          discriminators.push(candidate => Number(candidate?.creditos) === storedCredits);
        }

        for (const matchesDiscriminator of discriminators) {
          const narrowed = matches.filter(matchesDiscriminator);
          if (narrowed.length > 0) matches = narrowed;
          if (matches.length === 1) break;
        }
        return unique(matches);
      };

      const exact = byId.get(assignmentId);
      const exactMatchesProgram = exact
        && (!programId || String(exact.id_programa) === programId);
      const exactMatchesIdentity = exactMatchesProgram && (
        (!storedCode && storedNames.size === 0)
        || (storedCode && normalizeIdentity(exact.codigo) === storedCode)
        || candidateMatchesName(exact, storedNames)
      );
      const subject = findByCode(pensumSubjects)
        || findByCode(programSubjects)
        || findByName(pensumSubjects)
        || findByName(programSubjects)
        || (exactMatchesIdentity ? exact : null);

      if (!subject) {
        if (!strict) return item;
        throw new BadRequestException(
          `La asignatura guardada ya no corresponde al catálogo vigente. Seleccione nuevamente Programa, Pensum y Asignatura.`,
        );
      }

      return {
        ...item,
        programa_id: programId || String(subject.id_programa),
        asignatura_id: String(subject.id),
        asignatura_nombre: obtenerNombreVisibleAsignatura(subject) || item.asignatura_nombre,
        asignatura_codigo: subject.codigo || item.asignatura_codigo,
        pensum: String(subject.pensum || '').trim() || '__SIN_PENSUM__',
      };
    });
  }

  async getDocentesDisponibles(query?: any) {
    const periodo = coalesceString(query?.periodo);
    const docentes = await this.ptaRepo.manager.query(`
      SELECT *
      FROM (
        SELECT DISTINCT ON (d."personaId")
        d.*,
        json_build_object(
          'id', p.id_person,
          'identificacion', p.num_identificacion,
          'tipo_identificacion', p.tip_identificacion,
          'primer_nombre', p.nom_tercero,
          'primer_apellido', p.pri_apellido,
          'segundo_apellido', p.seg_apellido,
          'telefono', p.tel_celular,
          'genero', p.gen_tercero,
          'fecha_nacimiento', p.fec_nacimiento,
          'correo_alternativo', NULL,
          'usuario', json_build_object(
            'id', u.id_user,
            'email', u.username,
            'nombre', p.nom_largo,
            'activo', u.is_active
          )
        ) AS persona,
        json_build_object(
          'id', sec.id_seccional::text,
          'nombre', sec.nom_seccional,
          'codigo', sec.cod_seccional
        ) AS territorial,
        CASE
          WHEN sede.id_sede IS NULL THEN NULL
          ELSE json_build_object(
            'id', sede.id_sede::text,
            'territorialId', sede.id_seccional::text,
            'nombre', sede.nom_sede,
            'codigo', sede.cod_sede
          )
        END AS sede
        FROM academic_work_plan."Docente" d
        LEFT JOIN auth.personas p ON p.id_person = d."personaId"
        LEFT JOIN auth."user" u ON u.id_person = p.id_person
        LEFT JOIN auth.seccionales sec ON sec.id_seccional::text = COALESCE(d."territorialId", p.id_seccional::text)
        LEFT JOIN auth.sedes sede ON sede.id_sede::text = COALESCE(d."sedeId", p.id_sede::text)
        ORDER BY
          d."personaId",
          CASE WHEN $1::text IS NOT NULL AND d."periodoCarga" = $1::text THEN 0 ELSE 1 END,
          CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END,
          CASE WHEN d."periodoCarga" IS NOT NULL THEN 0 ELSE 1 END,
          d."updatedAt" DESC
      ) docentes_periodo
      ORDER BY "ordenListado" ASC NULLS LAST, "createdAt" DESC
      LIMIT 5000
    `, [periodo || null]);

    const docenteIds = docentes.map((d) => d.id);
    const ptas = docenteIds.length
      ? await this.ptaRepo.find({
          where: {
            docenteId: In(docenteIds),
            ...(periodo ? { periodo } : {}),
          } as any,
          order: { updatedAt: 'DESC' },
          take: 5000,
        })
      : [];

    const extMult = await this.getExtMultiplicadores();
    const ptaDtos = ptas.map((pta) => this.toPtaDto(pta, extMult));
    await this.enrichHorasDesdeBanco(ptaDtos);
    const ptasByDocente: Record<string, any[]> = {};
    for (const dto of ptaDtos) {
      ptasByDocente[dto.docente_id] ||= [];
      ptasByDocente[dto.docente_id].push(dto);
    }

    return docentes.map((d: any) => ({
      ...d,
      persona: d.persona
        ? {
            ...d.persona,
            usuario: this.safeUsuario(d.persona.usuario),
          }
        : null,
      territorial: d.territorial ?? null,
      sede: d.sede ?? null,
      ptas: ptasByDocente[d.id] || [],
    }));
  }

  async getOfertaAcademica(_query?: any) {
    const asignaturas = await this.asignaturaRepo.find({
      relations: { programaRel: true },
      order: { nombre: 'ASC' },
      take: 5000,
    });
    return asignaturas.map(asignatura => ({
      ...asignatura,
      nombreVisible: obtenerNombreVisibleAsignatura(asignatura),
    }));
  }

  async getCatalogoRolesInvestigacion() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.inv_roles) && rules.inv_roles.length > 0) return rules.inv_roles;
    return [
      { id: 'ROL_001', nombre: 'INVESTIGADOR LÍDER DE PROYECTO', horas_max: 400, pct_max: 50 },
      { id: 'ROL_002', nombre: 'COINVESTIGADOR', horas_max: 300, pct_max: 37.5 },
      { id: 'ROL_003', nombre: 'ASISTENTE DE INVESTIGACIÓN NIVEL II', horas_max: 200, pct_max: 25 },
    ];
  }

  async getCatalogoActividadesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (rules?.ext_actividades && typeof rules.ext_actividades === 'object' && Object.keys(rules.ext_actividades).length > 0) {
      return this.normalizeExtensionActivities(rules.ext_actividades);
    }
    // Fallback: actividades por defecto idénticas a defaultPTARules
    return this.normalizeExtensionActivities({
      capacitacion: [
        { id: 'CAP_01', nombre: 'Orientación de Talleres', max_horas: 16 },
        { id: 'CAP_02', nombre: 'Orientación de Seminarios', max_horas: 32 },
        { id: 'CAP_03', nombre: 'Orientación de Cursos', max_horas: 64 },
        { id: 'CAP_04', nombre: 'Orientación de Diplomados', max_horas: 160 },
      ],
      seleccion: [
        {
          id: 'SEL_01',
          nombre: 'Revisión y validación de estructuras de prueba',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de validación', tipo: 'hasta', horas: 2 },
          ],
        },
        {
          id: 'SEL_02',
          nombre: 'Definición y operacionalización de constructos',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de validación', tipo: 'hasta', horas: 2 },
          ],
        },
        {
          id: 'SEL_03',
          nombre: 'Construcción y validación de casos',
          items: [
            { nombre: 'Capacitación', tipo: 'fija', horas: 2 },
            { nombre: 'Construcción de casos', tipo: 'hasta', horas: 4 },
            { nombre: 'Sesiones de revisión de casos', tipo: 'hasta', horas: 3 },
            { nombre: 'Sesiones de validación de casos', tipo: 'hasta', horas: 3 },
          ],
        },
        {
          id: 'SEL_04',
          nombre: 'Validación de ítems',
          items: [
            { nombre: 'Capacitación', tipo: 'fija', horas: 2 },
            { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1 },
          ],
        },
        {
          id: 'SEL_05',
          nombre: 'Análisis de evidencias de validez en instrumentos de medición',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_06',
          nombre: 'Grupos de discusión sobre instrumentos de medición',
          items: [
            { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
            { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_07',
          nombre: 'Jurados — Prueba de Conocimientos (Componente escrito)',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Asistir y fungir como Jurado (Jornada completa)', tipo: 'fija', horas: 12 },
          ],
        },
        {
          id: 'SEL_08',
          nombre: 'Jurados — Prueba de Conocimientos (Pruebas de ejecución / oral)',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Asistir y fungir como Jurado (Jornada completa)', tipo: 'fija', horas: 12 },
          ],
        },
        {
          id: 'SEL_09',
          nombre: 'Jurados — Valoración de Antecedentes',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Revisión y validación de hojas de vida', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_10',
          nombre: 'Jurados — Entrevista',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Aplicación y registro de entrevistas', tipo: 'hasta', horas: 1.5 },
          ],
        },
        {
          id: 'SEL_11',
          nombre: 'Jurados — Reclamaciones / Recursos de reposición',
          items: [
            { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
            { nombre: 'Revisión y respuesta a reclamaciones', tipo: 'hasta', horas: 2 },
          ],
        },
      ],
      fortalecimiento: [
        {
          id: 'FOR_01',
          nombre: 'Retroalimentación línea temática (Asistencia Técnica)',
          items: [
            { nombre: 'Análisis de anexos técnicos de las líneas temáticas', tipo: 'hasta', horas: 80 }
          ]
        },
        {
          id: 'FOR_02',
          nombre: 'Batería de indicadores (Asistencia Técnica)',
          items: [
            { nombre: 'Proponer/presentar batería de indicadores', tipo: 'hasta', horas: 80 }
          ]
        },
        {
          id: 'FOR_03',
          nombre: 'Planeación del desarrollo del proyecto (Rediseño)',
          items: [
            { nombre: 'Análisis de info primaria e instrumentos de recolección', tipo: 'hasta', horas: 40 },
            { nombre: 'Organización y presentación del plan de trabajo', tipo: 'hasta', horas: 40 }
          ]
        },
        {
          id: 'FOR_04',
          nombre: 'Análisis y diagnóstico institucional (Rediseño)',
          items: [
            { nombre: 'Recolección, análisis y control de info en campo', tipo: 'hasta', horas: 80 },
            { nombre: 'Análisis de factores externos e internos', tipo: 'hasta', horas: 80 },
            { nombre: 'Análisis de info asociada a la producción (cargas de trabajo)', tipo: 'hasta', horas: 100 }
          ]
        },
        {
          id: 'FOR_05',
          nombre: 'Arquitectura institucional (Rediseño)',
          items: [
            { nombre: 'Análisis de procesos, productos, estructura, planta y manual', tipo: 'hasta', horas: 100 }
          ]
        },
        {
          id: 'FOR_06',
          nombre: 'Actos administrativos y acompañamiento (Rediseño)',
          items: [
            { nombre: 'Elaboración de actos administrativos y orientación de trámite', tipo: 'hasta', horas: 40 }
          ]
        }
      ],
      // Estas sub-secciones traen sus ítems reales desde el catálogo de completaciones
      // (antes venían con items:[] y dependían del backfill; ahora son autosuficientes).
      laboratorio_innovacion: EXTENSION_ACTIVITY_COMPLETIONS.laboratorio_innovacion,
      investigacion_aplicada: EXTENSION_ACTIVITY_COMPLETIONS.investigacion_aplicada,
      alto_gobierno: EXTENSION_ACTIVITY_COMPLETIONS.alto_gobierno,
    });
  }

  async getCatalogoSeccionesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.ext_secciones) && rules.ext_secciones.length > 0) return rules.ext_secciones;
    // Fallback: secciones fijas segun Circular 003/2025.
    return normalizeExtensionSections(null);
  }

  async getCatalogoActividadesInvestigacion() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.inv_actividades) && rules.inv_actividades.length > 0) {
      return rules.inv_actividades.map((a: any) => ({ ...a, max_horas: a.horas_max }));
    }
    // Fallback normativo — Tabla 4, Circular 003/2025
    return [
      { id: 'INV_ACT_001', nombre: 'Líder de Semillero de Investigación reconocido por la SNI', horas_max: 120, max_horas: 120 },
      { id: 'INV_ACT_002', nombre: 'Enlace Territorial de Investigaciones', horas_max: 200, max_horas: 200, pct_max: 25 },
      { id: 'INV_ACT_003', nombre: 'Líder o Director de Grupo de Investigación (avalado por SNI)', horas_max: 200, max_horas: 200, pct_max: 25 },
      { id: 'INV_ACT_004', nombre: 'Par Evaluador de Propuestas de Proyecto de Investigación', horas_max: 20, max_horas: 20, por_unidad: true },
      { id: 'INV_ACT_005', nombre: 'Par Evaluador de Resultados y/o Productos de Investigación', horas_max: 20, max_horas: 20, por_unidad: true },
      { id: 'INV_ACT_006', nombre: 'Diseño de Cursos de Formación en Investigación (PNFI)', horas_max: 32, max_horas: 32, por_unidad: true },
      { id: 'INV_ACT_007', nombre: 'Capacitador en Cursos de Formación en Investigación (PNFI)', horas_max: 32, max_horas: 32, por_unidad: true },
      { id: 'INV_ACT_008', nombre: 'Producción Individual de Artículo Científico (proyecto finalizado)', horas_max: 96, max_horas: 96, por_unidad: true },
      { id: 'INV_ACT_009', nombre: 'Producción Individual de Libro (mín. 3 capítulos, proyecto finalizado)', horas_max: 144, max_horas: 144, por_unidad: true },
    ];
  }

  // Aplana una actividad de comp_actividades_v2 al shape plano que consume el catálogo
  // ({ id, nombre, max_horas, min_horas?, consumeTotalidad }).
  private flattenCompV2Section(rules: any, sectionKey: string): any[] {
    const v2 = rules?.comp_actividades_v2;
    const arr = v2 && typeof v2 === 'object' ? v2[sectionKey] : null;
    const sections = Array.isArray(rules?.comp_secciones) && rules.comp_secciones.length > 0
      ? rules.comp_secciones
      : FIXED_COMP_SECCIONES;
    const section = sections.find((item: any) => String(item?.key) === sectionKey)
      || FIXED_COMP_SECCIONES.find(item => item.key === sectionKey);
    return Array.isArray(arr)
      ? arr.map((activity: any) => flattenConfiguredComplementaryActivity(
          activity,
          section,
          sectionKey === 'academico_administrativas',
        ))
      : [];
  }

  async getCatalogoActividadesComplementarias() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (rules?.comp_actividades_v2 && typeof rules.comp_actividades_v2 === 'object'
      && Object.prototype.hasOwnProperty.call(rules.comp_actividades_v2, 'complementarias_docencia')) {
      return this.flattenCompV2Section(rules, 'complementarias_docencia');
    }
    if (Array.isArray(rules?.comp_actividades) && rules.comp_actividades.length > 0) return rules.comp_actividades;
    // Fallback: derivar de la sección v2 (por si dejan de escribirse los arrays legacy).
    return this.flattenCompV2Section(rules, 'complementarias_docencia');
  }

  async getCatalogoActividadesAcademicoAdmin() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (rules?.comp_actividades_v2 && typeof rules.comp_actividades_v2 === 'object'
      && Object.prototype.hasOwnProperty.call(rules.comp_actividades_v2, 'academico_administrativas')) {
      return this.flattenCompV2Section(rules, 'academico_administrativas');
    }
    if (Array.isArray(rules?.aadm_actividades) && rules.aadm_actividades.length > 0) return rules.aadm_actividades;
    return this.flattenCompV2Section(rules, 'academico_administrativas');
  }

  // Catálogo agrupado por sección para la pestaña unificada de Complementarias del docente.
  // Devuelve las secciones (parametrizables desde config) y sus actividades.
  async getCatalogoComplementariasAgrupado() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    const secciones = Array.isArray(rules?.comp_secciones) && rules.comp_secciones.length > 0
      ? rules.comp_secciones
      : FIXED_COMP_SECCIONES;
    const actividades: Record<string, any[]> = {};
    for (const sec of secciones) {
      const key = sec?.key;
      if (!key) continue;
      if (key === 'complementarias_docencia') {
        actividades[key] = await this.getCatalogoActividadesComplementarias();
      } else if (key === 'academico_administrativas') {
        actividades[key] = await this.getCatalogoActividadesAcademicoAdmin();
      } else {
        actividades[key] = this.flattenCompV2Section(rules, key);
      }
    }
    return { secciones, actividades };
  }

  async getEstadisticas(periodo?: string | null) {
    const qb = this.ptaRepo.createQueryBuilder('pta').select(['pta.estado']);
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    const ptas = await qb.getMany();

    const total = ptas.length;
    const estadoCounts: Record<string, number> = {};
    for (const p of ptas) {
      const e = (p as any).estado || 'SIN_ESTADO';
      estadoCounts[e] = (estadoCounts[e] || 0) + 1;
    }

    const totalAprobados = (estadoCounts['Aprobado'] || 0) + (estadoCounts['APROBADO'] || 0);
    const totalRechazados = (estadoCounts['Rechazado'] || 0) + (estadoCounts['RECHAZADO'] || 0) + (estadoCounts['Devuelto'] || 0);
    const totalPendientes = total - totalAprobados - totalRechazados;

    const totalDocentes = await this.docenteRepo.count();

    return {
      totalDocentes,
      totalAprobados,
      totalPendientes,
      totalRechazados,
      porPrograma: [],
      porSede: [],
      total,
      estadoCounts,
      periodo: periodo || null,
    };
  }

  // ─────────────────────────────
  // OTP (firma electrónica) — migración legacy
  // ─────────────────────────────
  private resolveNotificationsBaseUrl(): string {
    const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) return direct.replace(/\/$/, '');
    if ((process.env.NODE_ENV || 'development') !== 'production') return 'http://localhost:3009';
    return 'http://notifications-service:3009';
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async sendFirmaOtpEmail(input: {
    to: string;
    code: string;
    fullName: string;
    periodo?: string | null;
    etapaLabel?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    const subject = 'Código de validación - Plan de Trabajo Académico ESAP';
    const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60000));
    const fullName = this.escapeHtml(input.fullName || 'docente');
    const periodo = input.periodo ? this.escapeHtml(input.periodo) : null;
    const etapaLabel = input.etapaLabel ? this.escapeHtml(input.etapaLabel) : null;
    const code = this.escapeHtml(input.code);
    const text = [
      `Hola ${input.fullName || 'docente'},`,
      '',
      `Tu código de validación para firmar el PTA es: ${input.code}`,
      input.periodo ? `Periodo: ${input.periodo}` : null,
      input.etapaLabel ? `Proceso: ${input.etapaLabel}` : null,
      `Este código vence en ${minutes} minutos.`,
      '',
      'Si no solicitaste este código, ignora este mensaje.',
    ].filter(Boolean).join('\n');
    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#eef2f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
          <tr>
            <td align="center">
              <table width="560" cellspacing="0" cellpadding="0" border="0" role="presentation" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="height:6px;background-color:#3b82f6;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="background-color:#0f49b5;padding:26px 28px 22px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td>
                          <div style="font-size:21px;font-weight:800;line-height:1;color:#ffffff;letter-spacing:0.2px;">ESAP</div>
                          <div style="margin-top:6px;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#bfdbfe;">Plan de Trabajo Académico</div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="display:inline-block;padding:5px 14px;border-radius:999px;background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:700;">Firma PTA</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 10px 28px;">
                    <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.25;font-weight:800;color:#111827;">Código de validación</h1>
                    <p style="margin:0 0 26px 0;font-size:14px;line-height:1.65;color:#667085;">
                      Hola ${fullName}. Ingresa este código para continuar con la firma de tu Plan de Trabajo Académico. Es de un solo uso y tiene vigencia limitada.
                    </p>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;min-width:210px;padding:18px 16px;border-radius:9px;border:2px solid #bfdbfe;background-color:#eff6ff;text-align:center;">
                            <span style="font-size:30px;line-height:1;font-weight:800;letter-spacing:10px;color:#1d4ed8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">${code}</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="margin-top:24px;margin-bottom:20px;">
                      ${periodo ? `
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Periodo:</strong> ${periodo}
                        </td>
                      </tr>` : ''}
                      ${etapaLabel ? `
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Proceso:</strong> ${etapaLabel}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Vigencia:</strong> ${minutes} minutos
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="margin:0 0 24px 0;background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;line-height:1.5;color:#92400e;">
                          <strong>Importante:</strong> Si no solicitaste este código, puedes ignorar este mensaje con seguridad.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#98a2b3;">ESAP — Escuela Superior de Administración Pública</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      const response = await fetch(`${baseUrl}/api/v1/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: input.to, subject, text, html }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`notifications-service ${response.status}: ${body}`);
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      this.logger.warn(`No se pudo enviar OTP de firma PTA a ${input.to}: ${message}`);
      throw new InternalServerErrorException('No se pudo enviar el código de validación al correo registrado.');
    }
  }

  private buildFirmaOtpKey(input: { verificationId?: string | null; ptaId?: string | null; docenteId?: string | null }): string {
    const verificationId = coalesceString(input.verificationId);
    if (verificationId) return verificationId;

    const ptaId = coalesceString(input.ptaId);
    if (ptaId) return `pta:${ptaId}`;

    const docenteId = coalesceString(input.docenteId);
    if (docenteId) return `docente:${docenteId}`;

    throw new BadRequestException('Se requiere ptaId o docenteId para generar el código de firma.');
  }

  async requestFirmaDocenteOtp(payload: {
    ptaId?: string | null;
    docenteId?: string | null;
    periodo?: string | null;
    etapaLabel?: string | null;
  }) {
    const docenteId = coalesceString(payload?.docenteId);
    if (!docenteId) throw new BadRequestException('docenteId es requerido para enviar el código de firma.');

    const docente = await this.fetchAuthDocenteInfo(docenteId);
    if (!docente.email && !this.MOCK_FIRMA_OTP) {
      throw new BadRequestException('El docente no tiene correo registrado para enviar el código de validación.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const verificationId = this.buildFirmaOtpKey({ ptaId: payload?.ptaId, docenteId });

    this.logger.log(`🔑 [PRUEBAS] Código de firma generado para ${docente.email || 'docente sin correo'}: ${code}`);

    // El correo con el código SIEMPRE se intenta enviar cuando hay email registrado
    // (aunque MOCK_FIRMA_OTP esté activo). El mock solo relaja la *validación* del
    // código, no debe impedir que el docente reciba el OTP en su correo.
    if (docente.email) {
      try {
        await this.sendFirmaOtpEmail({
          to: docente.email,
          code,
          fullName: docente.fullName,
          periodo: payload?.periodo,
          etapaLabel: payload?.etapaLabel,
          expiresAt,
        });
      } catch (emailError) {
        const isDev = (process.env.NODE_ENV || 'development') !== 'production';
        if (isDev) {
          this.logger.warn(`⚠️  [DEV] Email de firma OTP falló — código OTP para ${docente.email}: ${code}`);
          this.logger.warn(`⚠️  [DEV] Usa este código para firmar en desarrollo local.`);
        } else {
          throw emailError;
        }
      }
    }

    this.otpStore.set(verificationId, { code, expiresAt });

    return {
      verificationId,
      expiresAt: expiresAt.toISOString(),
      email: docente.email ? this.maskEmail(docente.email) : 'correo no registrado',
      devCode: code,
    };
  }

  /**
   * Solicita un OTP de firma para el APROBADOR/CONCERTADOR que va a avalar el PTA.
   * A diferencia del OTP de docente, el firmante NO es el dueño del PTA sino el
   * usuario autenticado que oprime "Aprobar" (Jefatura, Decanatura, Gestión
   * Profesoral, etc.), por eso se resuelve con adminEdit (sin exigir rol DOCENTE)
   * y se envía el código al correo de ESE usuario. La clave del OTP incluye el
   * userId para que no colisione con el OTP del docente sobre el mismo PTA.
   */
  async requestFirmaAprobadorOtp(payload: {
    ptaId?: string | null;
    userId?: string | null;
    periodo?: string | null;
    etapaLabel?: string | null;
  }) {
    const userId = coalesceString(payload?.userId);
    if (!userId) throw new BadRequestException('userId es requerido para enviar el código de firma del aprobador.');

    const aprobador = await this.fetchAuthDocenteInfo(userId, { adminEdit: true });
    if (!aprobador.email && !this.MOCK_FIRMA_OTP) {
      throw new BadRequestException('El aprobador no tiene correo registrado para enviar el código de validación.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const ptaId = coalesceString(payload?.ptaId);
    const verificationId = ptaId ? `pta:${ptaId}:aprobador:${userId}` : `aprobador:${userId}`;

    this.logger.log(`🔑 [PRUEBAS] Código de firma (aprobador) generado para ${aprobador.email || 'aprobador sin correo'}: ${code}`);

    if (aprobador.email) {
      try {
        await this.sendFirmaOtpEmail({
          to: aprobador.email,
          code,
          fullName: aprobador.fullName,
          periodo: payload?.periodo,
          etapaLabel: payload?.etapaLabel,
          expiresAt,
        });
      } catch (emailError) {
        const isDev = (process.env.NODE_ENV || 'development') !== 'production';
        if (isDev) {
          this.logger.warn(`⚠️  [DEV] Email de firma OTP (aprobador) falló — código OTP para ${aprobador.email}: ${code}`);
          this.logger.warn(`⚠️  [DEV] Usa este código para firmar en desarrollo local.`);
        } else {
          throw emailError;
        }
      }
    }

    this.otpStore.set(verificationId, { code, expiresAt });

    return {
      verificationId,
      expiresAt: expiresAt.toISOString(),
      email: aprobador.email ? this.maskEmail(aprobador.email) : 'correo no registrado',
      devCode: code,
    };
  }

  verifyFirmaDocenteOtp(payload: { verificationId?: string | null; code?: string | null }) {
    const verificationId = coalesceString(payload?.verificationId);
    if (!verificationId) throw new BadRequestException('verificationId es requerido.');
    this.verifyOtp(verificationId, String(payload?.code || ''), { consume: true });
    return { verified: true };
  }

  generateOtp(ptaId: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(ptaId, { code, expiresAt });
    // En producción esto debería enviarse por correo/SMS. Por ahora se loguea para dev.
    // eslint-disable-next-line no-console
    console.log(`[OTP][PTA] ${ptaId} → código: ${code} | expira: ${expiresAt.toISOString()}`);
    return { expiresAt: expiresAt.toISOString() };
  }

  verifyOtp(ptaId: string, otp: string, { consume }: { consume: boolean }) {
    if (!otp || String(otp).length !== 6) {
      throw new Error('OTP inválido. Debe tener 6 dígitos.');
    }

    // MOCK: cualquier código de 6 dígitos avanza el flujo. No se valida contra
    // el código generado ni la expiración. Útil para pruebas mientras el envío
    // real de correo no esté disponible.
    if (this.MOCK_FIRMA_OTP) {
      this.logger.warn(`[MOCK-OTP] Validación de firma mockeada para "${ptaId}" — cualquier código de 6 dígitos es aceptado.`);
      if (consume) this.otpStore.delete(ptaId);
      return true;
    }

    const stored = this.otpStore.get(ptaId);
    if (!stored) {
      throw new Error('No hay código activo para este PTA. Genera uno nuevo.');
    }
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(ptaId);
      throw new Error('El código expiró (5 min). Genera uno nuevo.');
    }
    if (stored.code !== String(otp)) {
      throw new Error('Código incorrecto. Verifica e intenta de nuevo.');
    }

    if (consume) this.otpStore.delete(ptaId);
    return true;
  }

  async signWithOtp(ptaId: string, payload: { otp: string; nuevoEstado?: string }) {
    this.verifyOtp(ptaId, payload?.otp, { consume: true });

    const existing = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existing) throw new NotFoundException('PTA no encontrado');

    const estadoDestino = coalesceString(payload?.nuevoEstado) || 'Pendiente Jefatura';
    const updated = await this.updatePTAStatus(ptaId, { estado: estadoDestino, actorId: existing.docenteId, actorRol: 'Docente' });

    const certNumber =
      'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

    return {
      pta: updated.pta,
      certificado: certNumber,
      signedAt: new Date().toISOString(),
    };
  }

  /**
   * Horas por componente + indicador de si el PTA tiene ALGUNA actividad cargada.
   * Extraído de getComponentesAprobacion para poder reutilizarlo también desde
   * getRequiredSubsecciones (etapa de Revisión), sin duplicar el cálculo.
   */
  private async computeHorasPorComponente(ds: any): Promise<{
    horasPorComponente: Record<string, number>;
    hayActividades: boolean;
  }> {
    const asignaturas: any[] = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
    const invActs: any[] = Array.isArray(ds.investigacion_actividades) ? ds.investigacion_actividades : [];
    const extActs: any[] = Array.isArray(ds.extension_actividades) ? ds.extension_actividades : [];
    const { docencia: compDocencia, aadm: compAadm } = this.readComplementariasSecciones(ds);

    // Docencia se enruta por nivel de programa (academica_pregrado/academica_posgrado),
    // igual que Extensión se enruta por sección — requiere el join a
    // academic_work_plan.programa.tipo.
    const {
      pregrado: hDocenciaPregrado,
      posgrado: hDocenciaPosgrado,
      territorial: hDocenciaTerritorial,
    } = await this.splitHorasDocenciaPorNivel(asignaturas);
    const hInv = Number(ds.investigacion_proyecto?.horas_solicitadas || 0) +
      invActs.reduce((s: number, a: any) => s + (Number(a?.horas_total ?? a?.horas) || 0), 0);
    // Complementarias se enruta por programa asociado (sin programa/pregrado/posgrado,
    // ver clasificarComplementarias), igual patrón que Docencia por nivel arriba.
    const part = await this.clasificarComplementarias(ds);
    const sumarHoras = (arr: any[]) => arr.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hCompNinguno = sumarHoras(part.complementarias);
    const hCompPregrado = sumarHoras(part.complementarias_pregrado);
    const hCompPosgrado = sumarHoras(part.complementarias_posgrado);

    const extMult = await this.getExtMultiplicadores();
    const extBySeccion = (secciones: string[]) =>
      extActs
        .filter((a: any) => secciones.includes(normalizeExtensionSectionKey(a?.seccion)))
        .reduce((s: number, a: any) => {
          const m = this.multiplicadorDeExt(a, extMult);
          const h = m === 1
            ? Number(a?.horas ?? 0)
            : Number(a?.horas_ejecutadas ?? a?.horas ?? 0) * m;
          return s + h;
        }, 0);

    // Nota: las actividades de extensión se canonizan a las 4 secciones fijas
    // (normalizeExtensionSectionKey mapea cualquier sección desconocida a
    // 'fortalecimiento'), por lo que no existe componente comodín "otras".

    const horasPorComponente: Record<string, number> = {
      academica_pregrado: hDocenciaPregrado,
      academica_posgrado: hDocenciaPosgrado,
      academica_territorial: hDocenciaTerritorial,
      investigacion: hInv,
      ext_capacitacion: extBySeccion(['capacitacion']),
      ext_procesos: extBySeccion(['seleccion']),
      ext_fortalecimiento: extBySeccion(['fortalecimiento']),
      ext_gobierno: extBySeccion(['alto_gobierno']),
      complementarias: hCompNinguno,
      complementarias_pregrado: hCompPregrado,
      complementarias_posgrado: hCompPosgrado,
    };

    // Si todos los arrays están vacíos, probablemente hay un problema de datos
    // (e.g. actividades filtradas incorrectamente al guardar). No auto-aprobar nada.
    const totalActividades =
      asignaturas.length + invActs.length + extActs.length + compDocencia.length + compAadm.length;
    const hayActividades = totalActividades > 0;

    return { horasPorComponente, hayActividades };
  }

  /** Normaliza un nombre de seccional para comparar sin acentos ni separadores. */
  private normalizeSeccionalNombre(value: any): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  /**
   * De un conjunto de `territorial_id` (auth.seccionales.id_seccional), devuelve los
   * que corresponden a una Dirección Territorial, es decir los que NO son Sede
   * Central. En auth.seccionales conviven dos filas de sede central ('Sede Central'
   * y 'SEDE_CENTRAL'), por eso se compara por nombre normalizado y no por id/código.
   *
   * Si la consulta falla se devuelve un set vacío: todo se trata como Sede Central,
   * que es exactamente el comportamiento previo a la separación territorial (no se
   * pierde ni se bloquea nada).
   */
  private async resolveTerritorialIdsNoCentrales(ids: string[]): Promise<Set<string>> {
    const result = new Set<string>();
    if (ids.length === 0) return result;
    try {
      const rows = await this.ptaRepo.manager.query(
        `SELECT id_seccional::text AS id, nom_seccional AS nombre
           FROM auth.seccionales
          WHERE id_seccional::text = ANY($1::text[])`,
        [ids],
      );
      for (const row of rows || []) {
        if (this.normalizeSeccionalNombre(row?.nombre) !== 'sedecentral') {
          result.add(String(row.id));
        }
      }
    } catch (err: any) {
      this.logger?.warn?.(
        `No se pudieron resolver las seccionales para enrutar Docencia: ${err?.message || err}`,
      );
    }
    return result;
  }

  /**
   * Enruta las asignaturas de Docencia a sus tres componentes de aprobación.
   *
   * La territorialidad MANDA sobre el nivel: una asignatura dictada en una Dirección
   * Territorial va a `academica_territorial` (la revisa el Coordinador Territorial y
   * la aprueba la Jefatura de la Territorial) aunque sea de pregrado o posgrado. Solo
   * lo dictado en Sede Central se separa por `programa.tipo` en pregrado/posgrado.
   *
   * Las asignaturas cuyo programa no se puede resolver caen en pregrado, igual que
   * antes, para no perderlas del cálculo.
   */
  private async clasificarAsignaturasDocencia(asignaturas: any[]): Promise<{
    academica_pregrado: any[];
    academica_posgrado: any[];
    academica_territorial: any[];
  }> {
    const out = {
      academica_pregrado: [] as any[],
      academica_posgrado: [] as any[],
      academica_territorial: [] as any[],
    };
    if (!Array.isArray(asignaturas) || asignaturas.length === 0) return out;

    const programaIds = Array.from(new Set(
      asignaturas
        .map((a: any) => coalesceLookupKey(a?.programa_id))
        .filter((v): v is string => !!v),
    ));
    let tipoPorId = new Map<string, string>();
    if (programaIds.length > 0) {
      const programas = await this.programaRepo.find({ where: { id: In(programaIds) } as any });
      tipoPorId = new Map(programas.map((p) => [String(p.id), p.tipo]));
    }

    const territorialIds = Array.from(new Set(
      asignaturas
        .map((a: any) => coalesceLookupKey(a?.territorial_id))
        .filter((v): v is string => !!v),
    ));
    const noCentrales = await this.resolveTerritorialIdsNoCentrales(territorialIds);

    for (const a of asignaturas) {
      const territorialId = coalesceLookupKey(a?.territorial_id);
      if (territorialId && noCentrales.has(territorialId)) {
        out.academica_territorial.push(a);
        continue;
      }
      const programaId = coalesceLookupKey(a?.programa_id);
      const tipo = programaId ? tipoPorId.get(programaId) : undefined;
      if (tipo && POSGRADO_PROGRAMA_TIPOS.has(tipo)) out.academica_posgrado.push(a);
      else out.academica_pregrado.push(a);
    }
    return out;
  }

  /**
   * Enruta las actividades de Complementarias (docencia + académico-administrativas
   * fusionadas, ver readComplementariasSecciones) según el `nivel_programa`
   * configurado para su TIPO de actividad en el catálogo (comp_actividades_v2, ver
   * flattenConfiguredComplementaryActivity). Es un eje de configuración, no de
   * captura: el docente no elige programa, cada tipo de actividad ya trae la
   * etiqueta puesta una sola vez en Configuración de Reglas PTA.
   *
   * Sin etiqueta (o actividad no encontrada en el catálogo) → 'complementarias'
   * (catch-all: mismo componente/permiso que existía antes del split, sin cambios).
   */
  private async clasificarComplementarias(ds: any): Promise<{
    complementarias_pregrado: any[];
    complementarias_posgrado: any[];
    complementarias: any[];
  }> {
    const out = {
      complementarias_pregrado: [] as any[],
      complementarias_posgrado: [] as any[],
      complementarias: [] as any[],
    };
    const { all } = this.readComplementariasSecciones(ds);
    if (all.length === 0) return out;

    const [catDocencia, catAadm] = await Promise.all([
      this.getCatalogoActividadesComplementarias(),
      this.getCatalogoActividadesAcademicoAdmin(),
    ]);
    const nivelPorActividadId = new Map<string, 'pregrado' | 'posgrado'>();
    for (const act of [...catDocencia, ...catAadm]) {
      const nivel = normalizeNivelProgramaComplementaria(act?.nivel_programa);
      if (act?.id && nivel) nivelPorActividadId.set(String(act.id), nivel);
    }

    for (const item of all) {
      const actividadId = coalesceLookupKey(item?.actividad_id ?? item?.id);
      const nivel = actividadId ? nivelPorActividadId.get(actividadId) : undefined;
      if (nivel === 'pregrado') out.complementarias_pregrado.push(item);
      else if (nivel === 'posgrado') out.complementarias_posgrado.push(item);
      else out.complementarias.push(item);
    }
    return out;
  }

  /** Nombres legibles de un conjunto de seccionales, para mensajes de error. */
  private async resolveNombresSeccionales(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    try {
      const rows = await this.ptaRepo.manager.query(
        `SELECT nom_seccional AS nombre
           FROM auth.seccionales
          WHERE id_seccional::text = ANY($1::text[])`,
        [ids],
      );
      const nombres = (rows || []).map((r: any) => String(r?.nombre || '')).filter(Boolean);
      return nombres.length > 0 ? nombres : ids;
    } catch {
      return ids;
    }
  }

  /** Igual que resolveNombresSeccionales, pero indexado por id (para anotar cada fila con su nombre). */
  private async resolveNombrePorSeccionalId(ids: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (ids.length === 0) return result;
    try {
      const rows = await this.ptaRepo.manager.query(
        `SELECT id_seccional::text AS id, nom_seccional AS nombre
           FROM auth.seccionales
          WHERE id_seccional::text = ANY($1::text[])`,
        [ids],
      );
      for (const r of rows || []) {
        if (r?.id) result.set(String(r.id), String(r?.nombre || r.id));
      }
    } catch {
      // Best-effort: si falla, el llamador cae al id como nombre.
    }
    return result;
  }

  /** Distintas territoriales presentes en las asignaturas del componente `academica_territorial` de un PTA. */
  private async getTerritorialesDelComponente(existingPta: PlanTrabajoAcademicoEntity): Promise<string[]> {
    const pares = await this.getTerritorialNivelPairsDelComponente(existingPta);
    return Array.from(new Set(pares.map((p) => p.territorialId)));
  }

  /**
   * Distintos pares (territorial, nivel) presentes en las asignaturas del
   * componente `academica_territorial` de un PTA. Dentro de este bucket, cada
   * asignatura conserva su propio nivel (pregrado/posgrado) — derivado con el
   * mismo criterio que ya usa clasificarAsignaturasDocencia para Sede Central
   * (programa.tipo vía POSGRADO_PROGRAMA_TIPOS) — para que cada combinación
   * (territorial, nivel) pueda revisarse/aprobarse de forma independiente (ver
   * migración 397/398 y assertAlcanceTerritorial).
   */
  private async getTerritorialNivelPairsDelComponente(
    existingPta: PlanTrabajoAcademicoEntity,
  ): Promise<Array<{ territorialId: string; nivel: PTANivelDocencia }>> {
    const ds = (existingPta.datosEstructurados as any) || {};
    const asignaturas = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
    const part = await this.clasificarAsignaturasDocencia(asignaturas);
    const territoriales = part.academica_territorial;
    if (territoriales.length === 0) return [];

    const programaIds = Array.from(new Set(
      territoriales.map((a: any) => coalesceLookupKey(a?.programa_id)).filter((v): v is string => !!v),
    ));
    let tipoPorId = new Map<string, string>();
    if (programaIds.length > 0) {
      const programas = await this.programaRepo.find({ where: { id: In(programaIds) } as any });
      tipoPorId = new Map(programas.map((p) => [String(p.id), p.tipo]));
    }

    const vistos = new Set<string>();
    const result: Array<{ territorialId: string; nivel: PTANivelDocencia }> = [];
    for (const a of territoriales) {
      const territorialId = coalesceLookupKey(a?.territorial_id);
      if (!territorialId) continue;
      const programaId = coalesceLookupKey(a?.programa_id);
      const tipo = programaId ? tipoPorId.get(programaId) : undefined;
      const nivel: PTANivelDocencia = tipo && POSGRADO_PROGRAMA_TIPOS.has(tipo) ? 'posgrado' : 'pregrado';
      const key = `${territorialId}::${nivel}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      result.push({ territorialId, nivel });
    }
    return result;
  }

  /**
   * Alcance territorial: un revisor/aprobador de "Docencia - Territorial" solo puede
   * actuar sobre las asignaturas de SU territorial Y de su nivel autorizado
   * (pregrado/posgrado, migración 397) — cada combinación (territorial, nivel) es
   * una unidad de decisión independiente.
   *
   * El permiso `pta.*.academica.territorial.{pregrado|posgrado}` habilita el
   * componente para ese nivel, pero NO dice cuál territorial; esa se toma de la
   * seccional de la persona (auth.personas.id_seccional), siguiendo la convención
   * ya documentada en `auth.role.alcance` para JEFATURA_TERRITORIAL. Sin esta
   * verificación, un rol de Antioquia podía revisar/aprobar las asignaturas de
   * Chocó o Huila; sin la verificación de nivel, un revisor de solo pregrado
   * podía dar por resuelto el posgrado de su misma territorial.
   *
   * Decisión PARCIAL por (territorial, nivel): si el PTA tiene 2+ pares distintos
   * (ej. pregrado de Antioquia y posgrado de Bolívar), un actor con alcance sobre
   * uno solo puede actuar igual — pero solo sobre el/los suyo(s); el resto queda
   * intacto (ver aprobarComponenteTerritorialParcial / revisarComponenteTerritorialParcial).
   * Antes esto lanzaba un error y bloqueaba la acción por completo para todos.
   *
   * Fail-closed: si el usuario no tiene seccional resuelta, no tiene el permiso
   * de ningún nivel, o su combinación (territorial, nivel) no tiene NINGUNA
   * asignatura en este PTA, no puede actuar sobre el componente.
   *
   * Devuelve `null` cuando no aplica (no es el componente territorial, es
   * superusuario, o el PTA no tiene asignaturas territoriales), o el detalle de
   * alcance para que el llamador sepa sobre qué pares puede decidir.
   */
  private async assertAlcanceTerritorial(
    componente: string,
    existingPta: PlanTrabajoAcademicoEntity,
    auth: PtaAuthenticatedUser,
    accion: 'revisar' | 'aprobar',
  ): Promise<{
    pares: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
    propios: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
  } | null> {
    if (componente !== 'academica_territorial') return null;

    const pares = await this.getTerritorialNivelPairsDelComponente(existingPta);
    if (pares.length === 0) return null;
    if (auth.isSuperUser) return { pares, propios: pares };

    const territorialesPropias = new Set((auth.territorialIds || []).map((v) => String(v)));
    if (territorialesPropias.size === 0) {
      throw new ForbiddenException(
        `No tiene una territorial asignada, por lo que no puede ${accion} el componente de Docencia territorial. `
        + 'La territorial se toma de la seccional registrada para la persona.',
      );
    }

    const nivelesPropios = new Set(
      accion === 'aprobar' ? (auth.allowedNivelesTerritorialAprobar || []) : (auth.allowedNivelesTerritorialRevisar || []),
    );
    if (nivelesPropios.size === 0) {
      throw new ForbiddenException(
        `No tiene el permiso de nivel (pregrado/posgrado) requerido para ${accion} el componente de Docencia territorial.`,
      );
    }

    const propios = pares.filter((p) => territorialesPropias.has(p.territorialId) && nivelesPropios.has(p.nivel));
    if (propios.length === 0) {
      const nombres = await this.resolveNombresSeccionales(Array.from(new Set(pares.map((p) => p.territorialId))));
      throw new ForbiddenException(
        `Solo puede ${accion} las asignaturas de Docencia de su propia territorial y nivel autorizado. `
        + `Este PTA incluye asignaturas de: ${nombres.join(', ')}.`,
      );
    }

    return { pares, propios };
  }

  /** Crea en 'pendiente' las filas de PtaTerritorialApproval que falten para los pares (territorial, nivel) dados. */
  private async ensureTerritorialApprovalRows(
    ptaId: string,
    pares: Array<{ territorialId: string; nivel: PTANivelDocencia }>,
  ): Promise<PtaTerritorialApprovalEntity[]> {
    if (pares.length === 0) return [];
    const territorialIds = Array.from(new Set(pares.map((p) => p.territorialId)));
    const existing = await this.ptaTerritorialApprovalRepo.find({ where: { ptaId, territorialId: In(territorialIds) } });
    const existingKeys = new Set(existing.map((r) => `${r.territorialId}::${r.nivel}`));
    const missing = pares.filter((p) => !existingKeys.has(`${p.territorialId}::${p.nivel}`));
    if (missing.length === 0) return existing;
    const nombrePorId = await this.resolveNombrePorSeccionalId(missing.map((p) => p.territorialId));
    const nuevas = missing.map((p) => this.ptaTerritorialApprovalRepo.create({
      ptaId,
      territorialId: p.territorialId,
      territorialNombre: nombrePorId.get(p.territorialId) || null,
      nivel: p.nivel,
      estado: 'pendiente',
    }));
    try {
      const guardadas = await this.ptaTerritorialApprovalRepo.save(nuevas);
      return [...existing, ...guardadas];
    } catch {
      // Carrera entre dos peticiones concurrentes (ej. dos GET de estado casi
      // simultáneos) creando la(s) misma(s) fila(s): la violación de
      // uq_pta_territorial_nivel es esperable, no un error real. Se relee de la
      // BD en vez de propagar el 500.
      return this.ptaTerritorialApprovalRepo.find({ where: { ptaId, territorialId: In(territorialIds) } });
    }
  }

  /** Estado de aprobación por (territorial, nivel) del componente `academica_territorial`, para el frontend. */
  async getTerritorialApprovalStatus(ptaId: string) {
    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) {
      throw new NotFoundException('PTA no encontrado');
    }
    const pares = await this.getTerritorialNivelPairsDelComponente(existingPta);
    if (pares.length === 0) return [];
    const rows = await this.ensureTerritorialApprovalRows(ptaId, pares);
    return pares.map(({ territorialId, nivel }) => {
      const row = rows.find((r) => r.territorialId === territorialId && r.nivel === nivel);
      return {
        territorialId,
        territorialNombre: row?.territorialNombre || territorialId,
        nivel,
        estado: row?.estado || 'pendiente',
        actorNombre: row?.actorNombre || null,
        comentarios: row?.comentarios || null,
        fechaDecision: row?.fechaDecision || null,
      };
    });
  }

  /** Crea en 'pendiente' las filas de PtaTerritorialReview que falten para los pares (territorial, nivel) dados. */
  private async ensureTerritorialReviewRows(
    ptaId: string,
    pares: Array<{ territorialId: string; nivel: PTANivelDocencia }>,
  ): Promise<PtaTerritorialReviewEntity[]> {
    if (pares.length === 0) return [];
    const territorialIds = Array.from(new Set(pares.map((p) => p.territorialId)));
    const existing = await this.ptaTerritorialReviewRepo.find({ where: { ptaId, territorialId: In(territorialIds) } });
    const existingKeys = new Set(existing.map((r) => `${r.territorialId}::${r.nivel}`));
    const missing = pares.filter((p) => !existingKeys.has(`${p.territorialId}::${p.nivel}`));
    if (missing.length === 0) return existing;
    const nombrePorId = await this.resolveNombrePorSeccionalId(missing.map((p) => p.territorialId));
    const nuevas = missing.map((p) => this.ptaTerritorialReviewRepo.create({
      ptaId,
      territorialId: p.territorialId,
      territorialNombre: nombrePorId.get(p.territorialId) || null,
      nivel: p.nivel,
      estado: 'pendiente',
    }));
    try {
      const guardadas = await this.ptaTerritorialReviewRepo.save(nuevas);
      return [...existing, ...guardadas];
    } catch {
      return this.ptaTerritorialReviewRepo.find({ where: { ptaId, territorialId: In(territorialIds) } });
    }
  }

  /** Estado de revisión por (territorial, nivel) del componente `academica_territorial`, para el frontend. */
  async getTerritorialReviewStatus(ptaId: string) {
    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) {
      throw new NotFoundException('PTA no encontrado');
    }
    const pares = await this.getTerritorialNivelPairsDelComponente(existingPta);
    if (pares.length === 0) return [];
    const rows = await this.ensureTerritorialReviewRows(ptaId, pares);
    return pares.map(({ territorialId, nivel }) => {
      const row = rows.find((r) => r.territorialId === territorialId && r.nivel === nivel);
      return {
        territorialId,
        territorialNombre: row?.territorialNombre || territorialId,
        nivel,
        estado: row?.estado || 'pendiente',
        revisorNombre: row?.revisorNombre || null,
        comentarios: row?.comentarios || null,
        fechaRevision: row?.fechaRevision || null,
      };
    });
  }

  /**
   * Aprobación/devolución PARCIAL por (territorial, nivel) del componente
   * `academica_territorial`. Se invoca desde aprobarComponente justo después de
   * assertAlcanceTerritorial, ANTES de la lógica ordinaria de fila única
   * (PtaComponentApproval).
   *
   * - Devuelve `undefined` cuando el llamador debe seguir con la lógica ordinaria SIN
   *   ningún cambio de comportamiento: no hay 2+ pares (caso de siempre), la
   *   decisión es una devolución (siempre se propaga: el componente completo vuelve
   *   al docente, igual que cualquier otro componente — mergeRestrictedAdminEditInput
   *   luego restringe la edición a solo la territorial devuelta), o ya quedaron TODOS
   *   los pares resueltos en 'aprobado' (se consolida como un aprobado normal).
   * - Devuelve un resultado ya armado cuando la aprobación queda PARCIAL (aún faltan
   *   pares por resolver): no toca la fila consolidada ni el estado del PTA, solo
   *   registra la decisión del/los par(es) del actor.
   */
  private async aprobarComponenteTerritorialParcial(
    ptaId: string,
    componente: string,
    existingPta: PlanTrabajoAcademicoEntity,
    auth: PtaAuthenticatedUser,
    estado: string,
    body: any,
    alcance: {
      pares: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
      propios: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
    } | null,
  ): Promise<{ approval: PtaTerritorialApprovalEntity; estadoGeneral: string } | undefined> {
    if (componente !== 'academica_territorial' || !alcance || alcance.pares.length < 2) {
      return undefined;
    }
    const { pares, propios } = alcance;
    const keyOf = (territorialId: string, nivel: string) => `${territorialId}::${nivel}`;

    const rows = await this.ensureTerritorialApprovalRows(ptaId, pares);
    const rowByKey = new Map(rows.map((r) => [keyOf(r.territorialId, r.nivel), r]));

    const requestedTerritorialId = coalesceString(body?.territorialId, body?.territorial_id);
    const requestedNivel = coalesceString(body?.nivel) as any as PTANivelDocencia | undefined;
    let targets: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
    if (requestedTerritorialId) {
      const candidatos = propios.filter((p) => p.territorialId === requestedTerritorialId
        && (!requestedNivel || p.nivel === requestedNivel));
      if (candidatos.length === 0) {
        throw new ForbiddenException('No tiene permiso para decidir sobre esta territorial/nivel.');
      }
      targets = candidatos;
    } else if (auth.isSuperUser && estado === 'aprobado') {
      // Superusuario sin territorial/nivel explícitos: aprueba todos los pares que sigan pendientes.
      targets = pares.filter((p) => (rowByKey.get(keyOf(p.territorialId, p.nivel))?.estado || 'pendiente') === 'pendiente');
    } else {
      targets = propios;
    }

    const actorId = auth.userId || coalesceString(body?.aprobadorId, body?.aprobador_id);
    const actorNombre = auth.name || coalesceString(body?.aprobadorNombre, body?.aprobador_nombre);
    const actorRol = coalesceString(body?.aprobadorRol, body?.aprobador_rol) || (auth.roles || []).join(', ') || null;
    const comentarios = coalesceString(body?.comentarios, body?.observaciones);

    for (const { territorialId, nivel } of targets) {
      const key = keyOf(territorialId, nivel);
      let row = rowByKey.get(key);
      if (!row) {
        row = this.ptaTerritorialApprovalRepo.create({ ptaId, territorialId, nivel, estado: 'pendiente' });
      }
      row.estado = estado;
      row.actorId = actorId;
      row.actorNombre = actorNombre;
      row.actorRol = actorRol;
      row.comentarios = comentarios;
      row.fechaDecision = new Date();
      row = await this.ptaTerritorialApprovalRepo.save(row);
      rowByKey.set(key, row);
    }

    if (estado === 'devuelto') {
      // Se propaga: el llamador aplica la devolución ordinaria del componente
      // completo (fila consolidada + estado del PTA).
      return undefined;
    }

    const todasAprobadas = pares.every((p) => rowByKey.get(keyOf(p.territorialId, p.nivel))?.estado === 'aprobado');
    if (todasAprobadas) {
      return undefined;
    }

    // Aprobación parcial: quedan pares pendientes/devueltos. No se toca la fila
    // consolidada de PtaComponentApproval ni el estado del PTA, pero sí queda
    // trazabilidad de que este/estos par(es) fue(ron) aprobado(s).
    const pendientes = pares.filter((p) => rowByKey.get(keyOf(p.territorialId, p.nivel))?.estado !== 'aprobado');
    const pendientesNombres = await this.resolveNombresSeccionales(Array.from(new Set(pendientes.map((p) => p.territorialId))));
    const targetsLabel = targets.map((t) => `${t.territorialId}:${t.nivel}`);
    await this.historialRepo.save(this.historialRepo.create({
      ptaId,
      estadoAnterior: existingPta.estado,
      estadoNuevo: existingPta.estado,
      actorId: actorId || 'sistema',
      actorRol: actorRol || 'Aprobador',
      tipoAccion: 'APROBACION_COMPONENTE',
      comentarios,
      detallesTransicion: JSON.stringify({
        componente,
        estado,
        paresResueltos: targetsLabel,
        paresPendientes: pendientes.map((p) => `${p.territorialId}:${p.nivel}`),
      }),
      snapshotPta: existingPta.datosEstructurados ?? null,
      version: existingPta.version,
    }));
    this.logger.log(
      `Aprobación parcial de "${componente}" en PTA ${ptaId}: par(es) territorial/nivel resueltos ahora [${targetsLabel.join(', ')}], `
      + `quedan pendientes: ${pendientesNombres.join(', ')}.`,
    );

    const approvalRow = rowByKey.get(keyOf(targets[0].territorialId, targets[0].nivel)) || rows[0];
    return { approval: approvalRow, estadoGeneral: existingPta.estado };
  }

  /**
   * Revisión/devolución PARCIAL por (territorial, nivel) del componente
   * `academica_territorial`, en la etapa de Revisión (preaprobación). Espejo de
   * aprobarComponenteTerritorialParcial: antes de esta función, revisarComponente
   * exigía que el revisor cubriera TODOS los pares (territorial, nivel) del PTA
   * antes de dejarlo marcar "revisado" — bloqueo total en vez de partición (bug
   * reportado: un revisor de una sola territorial/nivel quedaba bloqueado por
   * completo cuando el PTA mezclaba varias).
   *
   * Solo actúa sobre estado === 'revisado' — la devolución en la etapa de
   * Revisión ya delega por completo a aprobarComponente (que aplica su propia
   * partición territorial vía aprobarComponenteTerritorialParcial), así que esta
   * función no necesita replicar esa rama.
   *
   * - Devuelve `undefined` cuando el llamador debe seguir con la lógica ordinaria
   *   de una sola fila (PtaComponentReview): no hay 2+ pares, no es 'revisado', o
   *   ya quedaron TODOS los pares en 'revisado' (se consolida como revisado normal).
   * - Devuelve un resultado ya armado cuando la revisión queda PARCIAL.
   */
  private async revisarComponenteTerritorialParcial(
    ptaId: string,
    componente: string,
    auth: PtaAuthenticatedUser,
    estado: string,
    body: any,
    alcance: {
      pares: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
      propios: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
    } | null,
  ): Promise<{ review: PtaTerritorialReviewEntity } | undefined> {
    if (componente !== 'academica_territorial' || estado !== 'revisado' || !alcance || alcance.pares.length < 2) {
      return undefined;
    }
    const { pares, propios } = alcance;
    const keyOf = (territorialId: string, nivel: string) => `${territorialId}::${nivel}`;

    const rows = await this.ensureTerritorialReviewRows(ptaId, pares);
    const rowByKey = new Map(rows.map((r) => [keyOf(r.territorialId, r.nivel), r]));

    const requestedTerritorialId = coalesceString(body?.territorialId, body?.territorial_id);
    const requestedNivel = coalesceString(body?.nivel) as any as PTANivelDocencia | undefined;
    let targets: Array<{ territorialId: string; nivel: PTANivelDocencia }>;
    if (requestedTerritorialId) {
      const candidatos = propios.filter((p) => p.territorialId === requestedTerritorialId
        && (!requestedNivel || p.nivel === requestedNivel));
      if (candidatos.length === 0) {
        throw new ForbiddenException('No tiene permiso para revisar esta territorial/nivel.');
      }
      targets = candidatos;
    } else if (auth.isSuperUser) {
      targets = pares.filter((p) => rowByKey.get(keyOf(p.territorialId, p.nivel))?.estado !== 'revisado');
    } else {
      targets = propios;
    }

    const revisorId = auth.userId || coalesceString(body?.revisorId, body?.revisor_id);
    const revisorNombre = auth.name || coalesceString(body?.revisorNombre, body?.revisor_nombre);
    const revisorRol = coalesceString(body?.revisorRol, body?.revisor_rol) || (auth.roles || []).join(', ') || null;
    const comentarios = coalesceString(body?.comentarios, body?.observaciones);

    for (const { territorialId, nivel } of targets) {
      const key = keyOf(territorialId, nivel);
      let row = rowByKey.get(key);
      if (!row) {
        row = this.ptaTerritorialReviewRepo.create({ ptaId, territorialId, nivel, estado: 'pendiente' });
      }
      row.estado = 'revisado';
      row.revisorId = revisorId;
      row.revisorNombre = revisorNombre;
      row.revisorRol = revisorRol;
      row.comentarios = comentarios;
      row.fechaRevision = new Date();
      row = await this.ptaTerritorialReviewRepo.save(row);
      rowByKey.set(key, row);
    }

    const todasRevisadas = pares.every((p) => rowByKey.get(keyOf(p.territorialId, p.nivel))?.estado === 'revisado');
    if (todasRevisadas) {
      return undefined;
    }

    const pendientes = pares.filter((p) => rowByKey.get(keyOf(p.territorialId, p.nivel))?.estado !== 'revisado');
    const pendientesNombres = await this.resolveNombresSeccionales(Array.from(new Set(pendientes.map((p) => p.territorialId))));
    this.logger.log(
      `Revisión parcial de "${componente}" en PTA ${ptaId}: par(es) territorial/nivel revisados ahora `
      + `[${targets.map((t) => `${t.territorialId}:${t.nivel}`).join(', ')}], quedan pendientes: ${pendientesNombres.join(', ')}.`,
    );

    const reviewRow = rowByKey.get(keyOf(targets[0].territorialId, targets[0].nivel)) || rows[0];
    return { review: reviewRow };
  }

  /** Horas de Docencia por componente (pregrado / posgrado / territorial). */
  private async splitHorasDocenciaPorNivel(
    asignaturas: any[],
  ): Promise<{ pregrado: number; posgrado: number; territorial: number }> {
    if (!asignaturas.length) return { pregrado: 0, posgrado: 0, territorial: 0 };
    const part = await this.clasificarAsignaturasDocencia(asignaturas);
    const sumar = (arr: any[]) =>
      arr.reduce((s: number, a: any) => s + (Number(a?.total_horas ?? a?.horas) || 0), 0);
    return {
      pregrado: sumar(part.academica_pregrado),
      posgrado: sumar(part.academica_posgrado),
      territorial: sumar(part.academica_territorial),
    };
  }

  /**
   * Subsecciones de revisión que aplican a un PTA concreto para un componente dado
   * (etapa de Revisión/preaprobación). Con Docencia ya dividida en dos componentes
   * reales (academica_pregrado/academica_posgrado), el único componente que sigue
   * necesitando subsecciones es Complementarias (aprobación unificada, pero dos
   * subtipos de contenido). Todos los demás (incluida Docencia) son de revisión
   * única ('general'), exigida solo si el componente tiene horas cargadas — mismo
   * criterio que la auto-aprobación de componentes vacíos.
   */
  private async getRequiredSubsecciones(componente: string, ds: any): Promise<string[]> {
    const posibles = REVIEW_SUBSECCIONES_BY_COMPONENT[componente as PTAComponentKey] || [];

    if (COMPLEMENTARIAS_COMPONENT_KEYS.includes(componente as PTAComponentKey)) {
      const part = await this.clasificarComplementarias(ds);
      const items: any[] = (part as any)[componente] || [];
      const requeridas: string[] = [];
      if (items.some((item) => this.normalizeCompSeccion(item?.seccion, item) !== 'academico_administrativas')) {
        requeridas.push('docencia');
      }
      if (items.some((item) => this.normalizeCompSeccion(item?.seccion, item) === 'academico_administrativas')) {
        requeridas.push('academico_administrativas');
      }
      return requeridas;
    }

    // Resto de componentes de revisión única (academica_pregrado, academica_posgrado,
    // investigacion, ext_*): solo si tienen horas cargadas.
    const { horasPorComponente } = await this.computeHorasPorComponente(ds);
    return (horasPorComponente[componente] || 0) > 0 ? posibles : [];
  }

  /**
   * Filas de revisión (etapa previa a la aprobación) por componente/subsección,
   * materializando las que falten. Una subsección solo aparece aquí si
   * getRequiredSubsecciones determinó que el PTA realmente tiene contenido en
   * ella — las subsecciones sin actividad simplemente no generan fila y quedan
   * satisfechas "por vacío" (igual criterio que la auto-aprobación de
   * componentes vacíos en getComponentesAprobacion).
   */
  async getComponentesRevision(ptaId: string) {
    const ptaEntity = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!ptaEntity) throw new NotFoundException('PTA no encontrado');
    const ds = (ptaEntity.datosEstructurados as any) || {};

    const existingReviews = await this.ptaComponentReviewRepo.find({ where: { ptaId } });
    const reviewByKey = new Map(existingReviews.map((r) => [`${r.componente}:${r.subseccion}`, r]));

    const toSave: PtaComponentReviewEntity[] = [];
    const result: PtaComponentReviewEntity[] = [];

    for (const componente of COMPONENT_APPROVAL_KEYS) {
      const requeridas = await this.getRequiredSubsecciones(componente, ds);

      for (const subseccion of requeridas) {
        const key = `${componente}:${subseccion}`;
        let row = reviewByKey.get(key);
        if (!row) {
          row = this.ptaComponentReviewRepo.create({
            ptaId,
            componente,
            subseccion,
            estado: 'pendiente',
          });
          reviewByKey.set(key, row);
          toSave.push(row);
        }
        result.push(row);
      }
    }

    if (toSave.length > 0) {
      await this.ptaComponentReviewRepo.save(toSave);
    }

    return result;
  }

  async getComponentesAprobacion(ptaId: string) {
    const list = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    const componentList = list.filter(item => !isRoleApprovalComponent(item.componente));

    // Fetch PTA content to determine which components have hours
    const ptaEntity = await this.ptaRepo.findOne({ where: { id: ptaId } });
    const ds = (ptaEntity?.datosEstructurados as any) || {};

    const { horasPorComponente, hayActividades } = await this.computeHorasPorComponente(ds);
    const todosComponentes = Object.keys(horasPorComponente);

    const byComponent = new Map(componentList.map(item => [item.componente, item]));
    const toSave: PtaComponentApprovalEntity[] = [];

    for (const c of todosComponentes) {
      const tieneHoras = horasPorComponente[c] > 0;
      const existing = byComponent.get(c);
      // La ausencia de horas permite la aprobación automática en el flujo
      // ordinario, pero nunca cuando el componente fue reabierto expresamente
      // por una solicitud de edición. En ese caso debe existir una nueva
      // decisión humana aunque el docente lo reenvíe sin modificar datos.
      const requiereReaprobacionManual =
        existing?.scope === 'solicitud_edicion'
        && ['pendiente', 'devuelto'].includes(String(existing.estado || '').toLowerCase());
      const autoAprobar = hayActividades && !tieneHoras && !requiereReaprobacionManual;

      if (!existing) {
        const item = this.ptaComponentApprovalRepo.create({
          ptaId,
          componente: c,
          estado: autoAprobar ? 'aprobado' : 'pendiente',
          ...(autoAprobar ? {
            aprobadorNombre: 'Sistema',
            comentarios: 'Sin actividades - aprobacion automatica',
            fechaAprobacion: new Date(),
          } : {}),
        });
        byComponent.set(c, item);
        toSave.push(item);
        continue;
      }

      if (autoAprobar && existing.estado === 'pendiente') {
        existing.estado = 'aprobado';
        existing.aprobadorNombre = existing.aprobadorNombre || 'Sistema';
        existing.comentarios = existing.comentarios || 'Sin actividades - aprobacion automatica';
        existing.fechaAprobacion = existing.fechaAprobacion || new Date();
        toSave.push(existing);
      }
    }

    if (toSave.length > 0) {
      await this.ptaComponentApprovalRepo.save(toSave);
    }

    return todosComponentes
      .map(c => byComponent.get(c))
      .filter((item): item is PtaComponentApprovalEntity => !!item);
  }

  /**
   * Etapa de Revisión (preaprobación): un revisor marca una subsección de un
   * componente como 'revisado' o 'devuelto', ANTES de que el aprobador final
   * pueda aprobar el componente completo (ver el bloqueo estructural agregado
   * en aprobarComponente()).
   */
  /**
   * Bloquea decisiones sobre un componente mientras el docente todavía lo
   * está editando y también cuando OTRO componente del PTA fue devuelto.
   *
   * La primera validación es especialmente importante para la edición
   * parcial: al aprobar la solicitud, sus componentes quedan en `devuelto`
   * con scope `solicitud_edicion`, pero aún no deben poder revisarse. Solo el
   * reenvío del docente cambia la solicitud a `en_aprobacion`. Sin este
   * candado, una solicitud de Investigación (un único componente interno)
   * podía marcarse como revisada antes de que el docente guardara los cambios,
   * y esa revisión obsoleta sobrevivía al reenvío.
   */
  private async assertComponenteDisponibleParaDecision(ptaId: string, componenteActual: string) {
    const componentes = await this.getComponentesAprobacion(ptaId);
    const componenteVigente = componentes.find((c) => c.componente === componenteActual);

    if (componenteVigente?.scope === 'solicitud_edicion') {
      const solicitudId = coalesceString(componenteVigente.scopeId);
      if (!solicitudId) {
        throw new BadRequestException('La reaprobación no tiene una solicitud de edición asociada.');
      }

      const solicitud = await this.solicitudRepo.findOne({
        where: {
          id: solicitudId,
          ptaId,
          tipoSolicitud: SOLICITUD_EDICION_TIPO,
        } as any,
      });
      if (!solicitud) {
        throw new BadRequestException('No se encontró la solicitud que habilitó esta edición.');
      }
      if (solicitud.estado === 'aprobado') {
        throw new BadRequestException(
          'El docente todavía no ha enviado los cambios de este componente a reaprobación.',
        );
      }
      if (solicitud.estado === 'en_aprobacion') {
        const componentesAutorizados = expandSolicitudComponentes(
          normalizeSolicitudComponentes(solicitud.componentes),
        );
        if (!componentesAutorizados.includes(componenteActual)) {
          throw new ForbiddenException(
            'Este componente no forma parte de la solicitud de edición autorizada.',
          );
        }
      }
    }

    const otroDevuelto = componentes.find(
      (c) => c.componente !== componenteActual && c.estado === 'devuelto',
    );
    if (otroDevuelto) {
      throw new BadRequestException(
        `El componente "${otroDevuelto.componente}" fue devuelto y está pendiente de corrección por el docente. ` +
          'No se pueden aprobar, devolver ni revisar otros componentes hasta que el PTA sea corregido y reenviado a revisión.',
      );
    }
  }

  async revisarComponente(ptaId: string, body: any, auth?: PtaAuthenticatedUser) {
    const componente = coalesceString(body?.componente);
    const subseccion = coalesceString(body?.subseccion) || 'general';
    const estado = coalesceString(body?.estado); // 'revisado' o 'devuelto'
    if (!componente || !estado) {
      throw new BadRequestException('Componente y estado son requeridos');
    }
    if (!COMPONENT_APPROVAL_KEY_SET.has(componente)) {
      throw new BadRequestException(`Componente PTA no soportado: ${componente}`);
    }
    if (!['revisado', 'devuelto'].includes(estado)) {
      throw new BadRequestException('El estado de la revisión debe ser "revisado" o "devuelto".');
    }

    const subseccionesValidas = REVIEW_SUBSECCIONES_BY_COMPONENT[componente as PTAComponentKey] || [];
    if (!subseccionesValidas.includes(subseccion as any)) {
      throw new BadRequestException(`Subsección de revisión no válida para "${componente}": ${subseccion}`);
    }

    // ── Autorización server-side (mismo principio que aprobarComponente) ──────
    if (!auth) {
      throw new ForbiddenException('No autenticado para revisar componentes del PTA.');
    }
    if (
      !auth.isSuperUser &&
      !auth.reviewsAll &&
      !auth.allowedReviewSubsecciones.includes(`${componente}:${subseccion}`)
    ) {
      const permisoRequerido = reviewPermissionFor(componente, subseccion);
      throw new ForbiddenException(
        `No tiene permisos para revisar el componente "${componente}" (${subseccion}) del PTA.` +
          (permisoRequerido ? ` Se requiere el permiso: ${permisoRequerido}.` : ''),
      );
    }

    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) {
      throw new NotFoundException('PTA no encontrado');
    }
    if (['Terminado', 'TERMINADO'].includes(String(existingPta.estado))) {
      throw new BadRequestException('El PTA está terminado (solo lectura) y no admite cambios.');
    }

    // Alcance territorial: el permiso habilita el componente, pero la territorial
    // y el nivel (pregrado/posgrado) concretos los define la seccional y los
    // permisos de la persona.
    const alcanceTerritorialRevision = await this.assertAlcanceTerritorial(componente, existingPta, auth, 'revisar');

    // Revisión PARCIAL por (territorial, nivel): si el PTA mezcla 2+ pares en
    // 'academica_territorial', cada uno se resuelve por separado (ver
    // PtaTerritorialReviewEntity) y la fila consolidada de PtaComponentReview
    // (más abajo) solo se completa cuando TODOS los pares queden en 'revisado'.
    // Antes de esto, un revisor con alcance sobre un solo par quedaba bloqueado
    // por completo al intentar marcar "revisado" si el PTA incluía otro par que
    // no le pertenecía.
    const resultadoParcialTerritorialRevision = await this.revisarComponenteTerritorialParcial(
      ptaId, componente, auth, estado, body, alcanceTerritorialRevision,
    );
    if (resultadoParcialTerritorialRevision) {
      return { review: resultadoParcialTerritorialRevision.review, estadoGeneral: existingPta.estado };
    }

    await this.assertComponenteDisponibleParaDecision(ptaId, componente);

    const ds = (existingPta.datosEstructurados as any) || {};
    const requeridas = await this.getRequiredSubsecciones(componente, ds);
    if (!requeridas.includes(subseccion)) {
      throw new BadRequestException(
        `La subsección "${subseccion}" de "${componente}" no aplica a este PTA (sin actividad o ya satisfecha).`,
      );
    }

    const comentarios = coalesceString(body?.comentarios, body?.observaciones);
    if (estado === 'devuelto' && !comentarios) {
      throw new BadRequestException('Debe indicar un comentario para devolver el componente en revisión.');
    }

    let review = await this.ptaComponentReviewRepo.findOne({ where: { ptaId, componente, subseccion } });
    if (!review) {
      review = this.ptaComponentReviewRepo.create({ ptaId, componente, subseccion, estado: 'pendiente' });
    }

    review.estado = estado;
    // Identidad del revisor siempre desde el token (integridad de auditoría),
    // igual que ya hace aprobarComponente con el aprobador.
    review.revisorId = auth.userId || coalesceString(body?.revisorId, body?.revisor_id);
    review.revisorNombre = auth.name || coalesceString(body?.revisorNombre, body?.revisor_nombre);
    review.revisorRol = coalesceString(body?.revisorRol, body?.revisor_rol) || (auth.roles || []).join(', ') || null;
    review.comentarios = comentarios;
    review.fechaRevision = new Date();
    review.respuestaDocente = null;

    await this.ptaComponentReviewRepo.save(review);

    let estadoGeneral = existingPta.estado;

    if (estado === 'devuelto') {
      // Devolver en la etapa de Revisión debe tener el mismo efecto visible que
      // devolver en la etapa de Aprobación: el componente (completo) vuelve al
      // docente para editar. Se reutiliza aprobarComponente() para no duplicar
      // esa transición de estado/historial/notificación; el permiso ya se validó
      // arriba contra pta.review.*, así que se amplía `allowedComponents` con el
      // componente actual para no volver a exigir pta.approve.* (el revisor puede
      // no tenerlo).
      //
      // isSuperUser se sintetiza solo cuando el revisor YA tenía alcance global
      // (isSuperUser real, o `pta.review.all`): ese caso sí debe poder devolver
      // sin restricción territorial, igual que antes. Un revisor con permiso
      // territorial puntual (ej. Coordinador de Bolívar) conserva su
      // `isSuperUser` real (false), para que assertAlcanceTerritorial /
      // aprobarComponenteTerritorialParcial lo acoten a SU territorial — de lo
      // contrario, sintetizar isSuperUser:true a ciegas también se filtraba al
      // alcance territorial y le permitía devolver (y pisar el estado de) la
      // territorial de OTRO revisor.
      const resultado = await this.aprobarComponente(
        ptaId,
        {
          componente,
          estado: 'devuelto',
          comentarios: review.comentarios,
          aprobadorId: review.revisorId,
          aprobadorNombre: review.revisorNombre,
          aprobadorRol: review.revisorRol,
          // Marca la etapa para que la notificación al docente diga que la
          // devolución ocurrió en Revisión (preaprobación) y no en Aprobación.
          _etapaDevolucion: 'revision',
        },
        {
          ...auth,
          isSuperUser: auth.isSuperUser || !!auth.reviewsAll,
          allowedComponents: [...(auth.allowedComponents || []), componente as any],
        } as PtaAuthenticatedUser,
      );
      estadoGeneral = resultado.estadoGeneral;
    } else {
      // 'revisado' no cambia el estado global del PTA, pero igual se registra en
      // la trazabilidad (mismo criterio que las aprobaciones parciales).
      await this.historialRepo.save(this.historialRepo.create({
        ptaId,
        estadoAnterior: existingPta.estado,
        estadoNuevo: existingPta.estado,
        actorId: review.revisorId || 'sistema',
        actorRol: review.revisorRol || 'Revisor',
        tipoAccion: 'REVISION_COMPONENTE',
        comentarios: review.comentarios,
        detallesTransicion: JSON.stringify({ componente, subseccion, estado }),
        snapshotPta: existingPta.datosEstructurados ?? null,
        version: existingPta.version,
      }));

      await this.logEvento({
        ptaId,
        tipo: 'revision_componente',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior: existingPta.estado,
        estadoNuevo: existingPta.estado,
        actor: review.revisorId,
        actorRol: review.revisorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Revisión de ${componente} (${subseccion}) marcada como ${estado}`,
        metadata: { componente, subseccion, estado, comentarios: review.comentarios },
      });
    }

    return { review, estadoGeneral };
  }

  async aprobarComponente(ptaId: string, body: any, auth?: PtaAuthenticatedUser) {
    const componente = coalesceString(body?.componente);
    const estado = coalesceString(body?.estado); // 'aprobado' o 'devuelto'
    if (!componente || !estado) {
      throw new BadRequestException('Componente y estado son requeridos');
    }
    if (!COMPONENT_APPROVAL_KEY_SET.has(componente)) {
      throw new BadRequestException(`Componente PTA no soportado: ${componente}`);
    }
    if (!['aprobado', 'devuelto'].includes(estado)) {
      throw new BadRequestException('El estado del componente debe ser "aprobado" o "devuelto".');
    }

    // ── Autorización server-side ──────────────────────────────────────────────
    // La autorización se resuelve desde los permisos reales del usuario (auth.ptaAuth,
    // poblado por PtaAuthGuard a partir de auth.role_permissions), NO desde el body.
    // Esto impide que un cliente se auto-otorgue permisos enviando isSuperUser=true
    // o componentesAutorizados manipulados.
    if (!auth) {
      // Defensa en profundidad: el guard debería haber poblado esto siempre.
      throw new ForbiddenException('No autenticado para aprobar componentes del PTA.');
    }
    if (!auth.isSuperUser && !auth.allowedComponents.includes(componente as any)) {
      const permisoRequerido = COMPONENT_PERMISSION[componente as keyof typeof COMPONENT_PERMISSION];
      throw new ForbiddenException(
        `No tiene permisos para aprobar el componente "${componente}" del PTA.` +
          (permisoRequerido ? ` Se requiere el permiso: ${permisoRequerido}.` : ''),
      );
    }

    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) {
      throw new NotFoundException('PTA no encontrado');
    }
    if (['Terminado', 'TERMINADO'].includes(String(existingPta.estado))) {
      throw new BadRequestException('El PTA está terminado (solo lectura) y no admite cambios.');
    }

    // Alcance territorial: un aprobador de Docencia territorial solo puede aprobar
    // las asignaturas de su propia territorial (aplica también a la devolución).
    // Ver aprobarComponenteTerritorialParcial más abajo para la aprobación parcial
    // cuando el PTA tiene 2+ territoriales distintas.
    const alcanceTerritorial = await this.assertAlcanceTerritorial(componente, existingPta, auth, 'aprobar');

    await this.assertComponenteDisponibleParaDecision(ptaId, componente);

    // ── Bloqueo estructural: no se puede aprobar sin revisión previa completa ──
    // Esto aplica sin importar qué permiso tenga quien llama (no es solo un
    // candado de UI): la etapa de Revisión es un requisito de datos, no un
    // permiso adicional. Solo bloquea la transición a 'aprobado'; una
    // devolución (por el aprobador, o reutilizada desde revisarComponente) sigue
    // permitida aunque falte revisión.
    if (estado === 'aprobado') {
      const dsParaRevision = (existingPta.datosEstructurados as any) || {};
      const requeridas = await this.getRequiredSubsecciones(componente, dsParaRevision);
      if (requeridas.length > 0) {
        const revisiones = await this.ptaComponentReviewRepo.find({ where: { ptaId, componente } });
        const pendientes = requeridas.filter((sub) => {
          const row = revisiones.find((r) => r.subseccion === sub);
          return !row || row.estado !== 'revisado';
        });
        if (pendientes.length > 0) {
          throw new BadRequestException(
            `El componente "${componente}" tiene revisión(es) pendiente(s) (${pendientes.join(', ')}) y no puede aprobarse todavía.`,
          );
        }
      }
    }

    let approval = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente } });
    if (!approval) {
      approval = this.ptaComponentApprovalRepo.create({
        ptaId,
        componente,
        estado: 'pendiente',
      });
    }

    // ── Bloqueo de auto-devolución: ni aprobar ni devolver de nuevo mientras el
    // PROPIO componente ya está devuelto y pendiente de corrección por el
    // docente. `assertSinDevolucionPendienteEnOtroComponente` (arriba) solo
    // cubre OTROS componentes; sin este candado, un usuario podía aprobar el
    // componente igual (dejando el PTA aprobado con una devolución sin
    // resolver) o generar una segunda devolución duplicada sobre el mismo
    // registro. Se libera automáticamente cuando el docente corrige y reenvía
    // (resetComponentApprovalWorkflow vuelve el estado a 'pendiente').
    if (approval.estado === 'devuelto') {
      throw new BadRequestException(
        `El componente "${componente}" ya fue devuelto y está pendiente de corrección por el docente. ` +
          'No se puede aprobar ni volver a devolver hasta que el docente corrija y reenvíe el componente.',
      );
    }

    // Aprobación parcial por territorial: si "academica_territorial" tiene 2+
    // territoriales distintas en este PTA, cada una se resuelve por separado y la
    // fila consolidada (`approval`, arriba) solo se completa cuando TODAS quedan
    // 'aprobado'. Devuelve un resultado ya armado cuando la decisión queda parcial
    // (corta aquí); `undefined` cuando debe seguir la lógica ordinaria de abajo sin
    // cambios (caso de siempre: 0/1 territorial, una devolución, o ya se resolvieron
    // todas en el mismo sentido).
    const resultadoParcialTerritorial = await this.aprobarComponenteTerritorialParcial(
      ptaId, componente, existingPta, auth, estado, body, alcanceTerritorial,
    );
    if (resultadoParcialTerritorial) {
      return resultadoParcialTerritorial;
    }

    // El alcance especial se asigna únicamente al aprobar una solicitud de
    // edición. Un cliente no puede reemplazarlo por "territorial" ni inventarlo.
    // Además, los componentes no se pueden revisar antes de que el docente haya
    // enviado formalmente sus cambios (solicitud en estado en_aprobacion).
    const scopeVigente = coalesceString(approval.scope);
    const scopeIdVigente = coalesceString(approval.scopeId);
    if (scopeVigente === 'solicitud_edicion') {
      if (!scopeIdVigente) {
        throw new BadRequestException('La reaprobación no tiene una solicitud de edición asociada.');
      }
      const solicitudScope = await this.solicitudRepo.findOne({
        where: {
          id: scopeIdVigente,
          ptaId,
          tipoSolicitud: SOLICITUD_EDICION_TIPO,
        } as any,
      });
      if (!solicitudScope) {
        throw new BadRequestException('No se encontró la solicitud que habilitó esta edición.');
      }
      if (solicitudScope.estado !== 'en_aprobacion') {
        if (solicitudScope.estado === 'aprobado') {
          throw new BadRequestException(
            'El docente todavía no ha enviado los cambios de este componente a reaprobación.',
          );
        }
        // El scope ya cumplió su ciclo. Una devolución posterior pertenece al
        // flujo ordinario y puede adoptar el alcance enviado por el backoffice.
        approval.scope = coalesceString(body?.scope);
        approval.scopeId = coalesceString(body?.scopeId, body?.scope_id);
      } else {
        const componentesScope = expandSolicitudComponentes(
          normalizeSolicitudComponentes(solicitudScope.componentes),
        );
        if (!componentesScope.includes(componente)) {
          throw new ForbiddenException(
            'Este componente no forma parte de la solicitud de edición autorizada.',
          );
        }
        approval.scope = 'solicitud_edicion';
        approval.scopeId = solicitudScope.id;
      }
    } else {
      const requestedScope = coalesceString(body?.scope);
      if (requestedScope === 'solicitud_edicion') {
        throw new ForbiddenException(
          'El alcance de edición parcial solo puede ser asignado por una solicitud aprobada.',
        );
      }
      approval.scope = requestedScope;
      approval.scopeId = coalesceString(body?.scopeId, body?.scope_id);
    }

    approval.estado = estado;
    // La identidad del aprobador proviene del token (integridad de auditoría), con
    // fallback al body para compatibilidad.
    approval.aprobadorId = auth.userId || coalesceString(body?.aprobadorId, body?.aprobador_id);
    approval.aprobadorNombre = auth.name || coalesceString(body?.aprobadorNombre, body?.aprobador_nombre);
    approval.aprobadorRol = coalesceString(body?.aprobadorRol, body?.aprobador_rol) || (auth.roles || []).join(', ') || null;
    approval.comentarios = coalesceString(body?.comentarios, body?.observaciones);
    approval.fechaAprobacion = new Date();
    // Nueva decisión del revisor: la respuesta del docente al ciclo anterior queda
    // obsoleta.
    approval.respuestaDocente = null;

    await this.ptaComponentApprovalRepo.save(approval);

    // Recalcular estado consolidado del PTA
    const todosComponentes = await this.getComponentesAprobacion(ptaId);
    
    const estadoActualPta = existingPta.estado;
    let nuevoEstadoPta = estadoActualPta;
    const hayDevueltos = todosComponentes.some(c => c.estado === 'devuelto');
    const todosAprobados = todosComponentes.every(c => c.estado === 'aprobado');
    const solicitudEdicionEnAprobacion = todosAprobados
      ? await this.solicitudRepo.findOne({
          where: {
            ptaId,
            tipoSolicitud: SOLICITUD_EDICION_TIPO,
            estado: 'en_aprobacion',
          } as any,
          order: { updatedAt: 'DESC' as any },
        })
      : null;

    if (hayDevueltos) {
      nuevoEstadoPta = COMPONENT_REVISION_STATE[componente] || 'Devuelto';
    } else if (todosAprobados) {
      nuevoEstadoPta = solicitudEdicionEnAprobacion
        ? restoreEstadoDespuesEdicion(solicitudEdicionEnAprobacion.estadoPtaAnterior)
        : isPendingRoleApprovalState(estadoActualPta) ? 'Aprobado' : estadoActualPta;
    }

    if (existingPta.estado !== nuevoEstadoPta) {
      const estadoAnterior = existingPta.estado;
      existingPta.estado = nuevoEstadoPta;
      existingPta.version = (existingPta.version || 1) + 1;
      
      if (hayDevueltos) {
        existingPta.motivoDevolucion = `Componente ${componente} devuelto: ${approval.comentarios || 'Sin comentarios'}`;
      }

      if (nuevoEstadoPta === 'Pendiente Jefatura') {
        await this.initAprobacionesJefatura(ptaId, existingPta.datosEstructurados);
      }

      await this.ptaRepo.save(existingPta);

      // Registrar historial de estados
      await this.historialRepo.save(
        this.historialRepo.create({
          ptaId,
          estadoAnterior,
          estadoNuevo: nuevoEstadoPta,
          actorId: approval.aprobadorId || 'sistema',
          actorRol: approval.aprobadorRol || 'Aprobador',
          tipoAccion: solicitudEdicionEnAprobacion && todosAprobados
            ? 'EDICION_COMPONENTES_APROBADA'
            : estado === 'aprobado' ? 'APROBACION_COMPONENTE' : 'DEVOLUCION_COMPONENTE',
          comentarios: approval.comentarios,
          detallesTransicion: JSON.stringify({
            componente,
            estado,
            solicitudId: solicitudEdicionEnAprobacion?.id || null,
            componentesSolicitud: solicitudEdicionEnAprobacion?.componentes || [],
          }),
          snapshotPta: existingPta.datosEstructurados ?? null,
          version: existingPta.version,
        }),
      );

      // Registrar evento realtime
      const ds = existingPta.datosEstructurados as any;
      await this.logEvento({
        ptaId,
        tipo: 'cambio_estado',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior,
        estadoNuevo: nuevoEstadoPta,
        actor: approval.aprobadorId,
        actorRol: approval.aprobadorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Componente ${componente} ${estado}. Estado general: ${nuevoEstadoPta}`,
        metadata: {
          componente,
          estado,
          comentarios: approval.comentarios,
          solicitudId: solicitudEdicionEnAprobacion?.id,
        },
      });
    } else {
      // También se registra en HistorialEstadoPTA aunque el estado global no cambie:
      // la aprobación es parcial por componente y debe aparecer en Trazabilidad.
      await this.historialRepo.save(this.historialRepo.create({
        ptaId,
        estadoAnterior: existingPta.estado,
        estadoNuevo: existingPta.estado,
        actorId: approval.aprobadorId || 'sistema',
        actorRol: approval.aprobadorRol || 'Aprobador',
        tipoAccion: solicitudEdicionEnAprobacion && todosAprobados
          ? 'EDICION_COMPONENTES_APROBADA'
          : estado === 'aprobado' ? 'APROBACION_COMPONENTE' : 'DEVOLUCION_COMPONENTE',
        comentarios: approval.comentarios,
        detallesTransicion: JSON.stringify({
          componente,
          estado,
          solicitudId: solicitudEdicionEnAprobacion?.id || null,
          componentesSolicitud: solicitudEdicionEnAprobacion?.componentes || [],
        }),
        snapshotPta: existingPta.datosEstructurados ?? null,
        version: existingPta.version,
      }));

      // Registrar evento de actualización de componente sin cambiar estado global
      const ds = existingPta.datosEstructurados as any;
      await this.logEvento({
        ptaId,
        tipo: 'actualizacion_componente',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior: existingPta.estado,
        estadoNuevo: existingPta.estado,
        actor: approval.aprobadorId,
        actorRol: approval.aprobadorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Componente ${componente} actualizado a ${estado}`,
        metadata: { componente, estado, comentarios: approval.comentarios },
      });
    }

    if (solicitudEdicionEnAprobacion && todosAprobados) {
      solicitudEdicionEnAprobacion.estado = 'gestionada';
      solicitudEdicionEnAprobacion.notificacionLeida = false;
      solicitudEdicionEnAprobacion.resolucionAccion = 'edicion_componentes_aprobada';
      await this.solicitudRepo.save(solicitudEdicionEnAprobacion);
    }

    // ── Notificación de vuelta al profesor cuando el componente fue APROBADO.
    // Texto: "Esta componente ha sido aprobada por [Nombre del aprobador]". Best-effort.
    if (estado === 'aprobado') {
      try {
        await this.ptaNotifications.notifyProfesorComponenteAprobado({
          ptaId,
          docenteId: existingPta.docenteId,
          componente,
          aprobadorNombre: approval.aprobadorNombre,
        });
      } catch (error: any) {
        this.logger.warn(`No se pudo notificar al profesor del PTA ${ptaId}: ${error?.message}`);
      }
    } else if (estado === 'devuelto') {
      // Espejo de la notificación de aprobación: si al docente se le avisa cuando
      // le aprueban un componente, con más razón cuando se lo DEVUELVEN, porque
      // ahí sí debe actuar. `_etapaDevolucion` lo setea revisarComponente cuando la
      // devolución ocurre en la etapa de Revisión (preaprobación).
      try {
        await this.ptaNotifications.notifyProfesorComponenteDevuelto({
          ptaId,
          docenteId: existingPta.docenteId,
          componente,
          revisorNombre: approval.aprobadorNombre,
          comentarios: approval.comentarios,
          etapa: coalesceString(body?._etapaDevolucion) === 'revision' ? 'revision' : 'aprobacion',
        });
      } catch (error: any) {
        this.logger.warn(`No se pudo notificar la devolución al profesor del PTA ${ptaId}: ${error?.message}`);
      }
    }

    return {
      approval,
      estadoGeneral: nuevoEstadoPta,
    };
  }

  /**
   * Aprobación masiva: aprueba, para cada PTA de `ptaIds`, cada componente de
   * `componentes` que esté aplicable y pendiente. Reutiliza `aprobarComponente`
   * por combinación (ptaId, componente) para no duplicar ninguna regla de
   * negocio (permiso, alcance territorial, revisión previa, bloqueo por
   * devolución cruzada) — este método solo orquesta el lote y clasifica cada
   * intento como aprobado/omitido/fallido, sin abortar el resto si uno falla.
   *
   * `componentes` es deliberadamente genérico (no depende de un "grupo" con
   * nombre): la agrupación en botones por permiso (Docencia Pregrado,
   * Investigación, Extensión x4, etc.) es una decisión de UI en el frontend;
   * la autorización real sigue siendo, como siempre, por componente individual.
   */
  async aprobarComponentesLote(body: any, auth?: PtaAuthenticatedUser) {
    if (!auth) {
      throw new ForbiddenException('No autenticado para aprobar componentes del PTA.');
    }

    const ptaIds: string[] = Array.isArray(body?.ptaIds)
      ? Array.from(new Set<string>(
          (body.ptaIds as unknown[])
            .map((v) => coalesceString(v))
            .filter((v): v is string => !!v),
        ))
      : [];
    const componentes: string[] = Array.isArray(body?.componentes)
      ? Array.from(new Set<string>(
          (body.componentes as unknown[])
            .map((v) => coalesceString(v))
            .filter((v): v is string => !!v),
        ))
      : [];

    if (ptaIds.length === 0) {
      throw new BadRequestException('Debe indicar al menos un PTA para la aprobación masiva.');
    }
    if (componentes.length === 0) {
      throw new BadRequestException('Debe indicar al menos un componente para la aprobación masiva.');
    }
    const componenteInvalido = componentes.find((c) => !COMPONENT_APPROVAL_KEY_SET.has(c));
    if (componenteInvalido) {
      throw new BadRequestException(`Componente PTA no soportado: ${componenteInvalido}`);
    }

    type ResultadoLote = {
      ptaId: string;
      componente: string;
      estado: 'aprobado' | 'omitido' | 'fallido';
      motivo?: string;
    };
    const resultados: ResultadoLote[] = [];

    for (const ptaId of ptaIds) {
      // Verificación de existencia explícita: getComponentesAprobacion() no valida
      // que el PTA exista — con datosEstructurados vacío igual autocrea filas de
      // aprobación 'pendiente', y ese INSERT termina violando la FK de
      // PtaComponentApproval hacia un ptaId que no existe. Cortar aquí evita ese
      // error de base de datos crudo y deja un motivo legible.
      const existePta = await this.ptaRepo.exists({ where: { id: ptaId } });
      if (!existePta) {
        for (const componente of componentes) {
          resultados.push({ ptaId, componente, estado: 'fallido', motivo: 'PTA no encontrado' });
        }
        continue;
      }

      let componentesDelPta: Awaited<ReturnType<PtaService['getComponentesAprobacion']>>;
      try {
        componentesDelPta = await this.getComponentesAprobacion(ptaId);
      } catch (error) {
        const motivo = error instanceof Error ? error.message : 'PTA no encontrado';
        for (const componente of componentes) {
          resultados.push({ ptaId, componente, estado: 'fallido', motivo });
        }
        continue;
      }
      const estadoPorComponente = new Map(componentesDelPta.map((c: any) => [c.componente, c.estado]));

      for (const componente of componentes) {
        const estadoActual = estadoPorComponente.get(componente);
        if (estadoActual === undefined) {
          resultados.push({ ptaId, componente, estado: 'omitido', motivo: 'No aplica a este PTA' });
          continue;
        }
        if (estadoActual === 'aprobado') {
          resultados.push({ ptaId, componente, estado: 'omitido', motivo: 'Ya estaba aprobado' });
          continue;
        }
        if (estadoActual === 'devuelto') {
          resultados.push({
            ptaId,
            componente,
            estado: 'omitido',
            motivo: 'Devuelto: pendiente de corrección del docente',
          });
          continue;
        }
        try {
          // Mismo body que enviaría la aprobación individual (ver
          // ejecutarAprobacionComponente en PTADetallePanelBackoffice.tsx): la
          // identidad real (aprobadorId/aprobadorNombre) la impone auth server-side
          // igual que allá, pero aprobadorRol sí se respeta desde el body — sin
          // pasarlo, la trazabilidad de un componente aprobado en lote mostraría el
          // rol crudo del token en vez del mismo rótulo que dejaría la aprobación
          // individual.
          await this.aprobarComponente(ptaId, {
            componente,
            estado: 'aprobado',
            comentarios: body?.comentarios,
            aprobadorId: body?.aprobadorId,
            aprobadorNombre: body?.aprobadorNombre,
            aprobadorRol: body?.aprobadorRol,
          }, auth);
          resultados.push({ ptaId, componente, estado: 'aprobado' });
        } catch (error) {
          resultados.push({
            ptaId,
            componente,
            estado: 'fallido',
            motivo: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }
    }

    const resumen = resultados.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.estado === 'aprobado') acc.aprobados += 1;
        else if (r.estado === 'omitido') acc.omitidos += 1;
        else acc.fallidos += 1;
        return acc;
      },
      { total: 0, aprobados: 0, omitidos: 0, fallidos: 0 },
    );

    return { resumen, resultados };
  }

  async getRUNDDocente(docenteId: string) {
    let docente = await this.docenteRepo.findOne({
      where: [{ id: docenteId }, { personaId: docenteId }]
    });

    if (!docente) {
      try {
        const info = await this.fetchAuthDocenteInfo(docenteId, { adminEdit: true });
        if (info && info.personId) {
          docente = await this.docenteRepo.findOne({
            where: [{ id: info.personId }, { personaId: info.personId }]
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    const valRows = await this.ptaRepo.manager.query(
      `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
      [docente.id]
    );

    if (valRows.length === 0) {
      const camposSoporte = [
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
        { campo: 'ULTIMA_EVALUACION', tipo: 'EVALUACION' }
      ];

      for (const item of camposSoporte) {
        await this.ptaRepo.manager.query(
          `INSERT INTO academic_work_plan.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo]
        );
      }

      const reQuery = await this.ptaRepo.manager.query(
        `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
        [docente.id]
      );
      valRows.push(...reQuery);
    }

    const total = valRows.length;
    const aceptados = valRows.filter((r: any) => r.estado_documento === 'Aceptado').length;
    const completitud = total > 0 ? Math.round((aceptados / total) * 100) : 0;

    return {
      docenteId: docente.id,
      personaId: docente.personaId,
      completitud,
      validaciones: valRows.map((r: any) => ({
        id: r.id,
        campo_rund: r.campo_rund,
        tipo_documento_soporte: r.tipo_documento_soporte,
        estado_documento: r.estado_documento,
        fecha_carga: r.fecha_carga,
        fecha_validacion: r.fecha_validacion,
        validado_por: r.validado_por,
        observacion: r.observacion
      }))
    };
  }

  async syncRUNDDocuments(docenteId: string, documentos: any[]) {
    let docente = await this.docenteRepo.findOne({
      where: [{ id: docenteId }, { personaId: docenteId }]
    });

    if (!docente) {
      try {
        const info = await this.fetchAuthDocenteInfo(docenteId, { adminEdit: true });
        if (info && info.personId) {
          docente = await this.docenteRepo.findOne({
            where: [{ id: info.personId }, { personaId: info.personId }]
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    await this.getRUNDDocente(docente.id);

    const catMap: Record<string, string> = {
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
      evaluacion: 'EVALUACION'
    };

    const stateMap: Record<string, string> = {
      validado: 'Aceptado',
      aprobado: 'Aceptado',
      aceptado: 'Aceptado',
      pendiente: 'Pendiente',
      rechazado: 'Rechazado',
      vencido: 'Rechazado',
      'sin cargar': 'Sin cargar',
      'no aplica': 'No aplica'
    };

    for (const doc of documentos) {
      const cat = String(doc.categoria || '').toLowerCase().trim();
      const rawState = String(doc.estado || '').toLowerCase().trim();
      const targetSupportType = catMap[cat];
      const targetState = stateMap[rawState] || 'Sin cargar';

      if (targetSupportType) {
        await this.ptaRepo.manager.query(
          `UPDATE academic_work_plan.validacion_documental
           SET estado_documento = $1,
               id_documento_carpeta = $2,
               fecha_carga = COALESCE($3, fecha_carga),
               fecha_validacion = COALESCE($4, fecha_validacion),
               validado_por = COALESCE($5, validado_por),
               observacion = COALESCE($6, observacion),
               updated_at = now()
           WHERE docente_id = $7 AND tipo_documento_soporte = $8`,
          [
            targetState,
            doc.id || null,
            doc.fecha_subida || new Date().toISOString(),
            doc.fecha_validacion || (targetState === 'Aceptado' ? new Date().toISOString() : null),
            doc.validado_por || null,
            doc.comentarios || null,
            docente.id,
            targetSupportType
          ]
        );
      }
    }

    return this.getRUNDDocente(docente.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Dashboard KPIs — real data from PTAs
  // ═══════════════════════════════════════════════════════════════════
  async getDashboardKPIs(periodo?: string): Promise<any> {
    const targetPeriodo = periodo || '2025-2';

    // 1. Fetch all PTAs for the period
    const ptas = await this.ptaRepo.find({ where: { periodo: targetPeriodo } });
    const horasDtos = ptas.map((pta) => this.toPtaDto(pta));
    await this.enrichHorasDesdeBanco(horasDtos);
    const horasAsignablesPorPta = new Map(
      horasDtos.map((dto) => [String(dto.id), Number(dto.horas_a_programar) || 0]),
    );

    // 2. Pipeline counts
    const pipeline = {
      borrador: 0,
      propuestos: 0,
      concertacion: 0,
      pendienteJefatura: 0,
      pendienteDecanatura: 0,
      pendienteGestion: 0,
      aprobados: 0,
      rechazados: 0,
    };
    const estadoCounts: Record<string, number> = {};

    for (const pta of ptas) {
      const est = pta.estado || 'BORRADOR';
      estadoCounts[est] = (estadoCounts[est] || 0) + 1;

      if (est === 'BORRADOR' || est === 'Borrador') pipeline.borrador++;
      else if (est === 'PROPUESTO' || est === 'Propuesto') pipeline.propuestos++;
      else if (est === 'EN_CONCERTACION') pipeline.concertacion++;
      else if (est === 'Pendiente Jefatura') pipeline.pendienteJefatura++;
      else if (est === 'Pendiente Decanatura') pipeline.pendienteDecanatura++;
      else if (est === 'Pendiente Gestión Profesoral') pipeline.pendienteGestion++;
      else if (est === 'Aprobado') pipeline.aprobados++;
      else if (est === 'Rechazado' || est === 'Devuelto') pipeline.rechazados++;
    }

    // 3. Hours statistics from datosEstructurados
    let totalDocencia = 0, totalInv = 0, totalExt = 0, totalComp = 0;
    let totalHorasAsignables = 0, totalHorasProgramadas = 0;

    for (const pta of ptas) {
      const ds = pta.datosEstructurados || {};
      const asig = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
      const inv = Array.isArray(ds.investigacion) ? ds.investigacion : [];
      const ext = Array.isArray(ds.extension) ? ds.extension : [];
      const comp = Array.isArray(ds.complementarias) ? ds.complementarias : [];

      const hDoc = asig.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hInv = inv.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hExt = ext.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hComp = comp.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
      const hTotal = pta.horasTotales || (hDoc + hInv + hExt + hComp);
      const hAsign = horasAsignablesPorPta.get(String(pta.id)) ?? 0;

      totalDocencia += hDoc;
      totalInv += hInv;
      totalExt += hExt;
      totalComp += hComp;
      totalHorasProgramadas += hTotal;
      totalHorasAsignables += hAsign;
    }

    const promedioUtilizacion = totalHorasAsignables > 0
      ? Math.round((totalHorasProgramadas / totalHorasAsignables) * 100)
      : 0;

    const horasStats = {
      docenciaHoras: totalDocencia,
      investigacionHoras: totalInv,
      extensionHoras: totalExt,
      complementariasHoras: totalComp,
      totalProgramadas: totalHorasProgramadas,
      totalAsignables: totalHorasAsignables,
      promedioUtilizacion,
    };

    // 4. Weekly trend (last 8 weeks)
    const weeklyTrend: Array<{ semana: string; creados: number; aprobados: number }> = [];
    const now = new Date();
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const creados = ptas.filter(p => {
        const d = new Date(p.createdAt);
        return d >= weekStart && d < weekEnd;
      }).length;

      const aprobados = ptas.filter(p => {
        const d = new Date(p.updatedAt);
        return p.estado === 'Aprobado' && d >= weekStart && d < weekEnd;
      }).length;

      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      weeklyTrend.push({ semana: label, creados, aprobados });
    }

    // 5. Top docentes by hours
    const docenteHoras: Record<string, { id: string; horas: number; estado: string }> = {};
    for (const pta of ptas) {
      const h = pta.horasTotales || 0;
      if (!docenteHoras[pta.docenteId] || docenteHoras[pta.docenteId].horas < h) {
        docenteHoras[pta.docenteId] = { id: pta.docenteId, horas: h, estado: pta.estado };
      }
    }
    const topDocentes = Object.values(docenteHoras)
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10)
      .map((d, i) => ({ rank: i + 1, docenteId: d.id, nombre: `Docente ${d.id.slice(0, 6)}`, horas: d.horas, estado: d.estado }));

    // 6. Average approval time (days from creation to 'Aprobado')
    const aprobados = ptas.filter(p => p.estado === 'Aprobado');
    let tiempoPromedioAprobacion = 0;
    if (aprobados.length > 0) {
      const totalDays = aprobados.reduce((sum, p) => {
        const diff = (new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      tiempoPromedioAprobacion = Math.round(totalDays / aprobados.length);
    }

    // 7. Catalog info
    let totalProgramas = 0;
    let totalAsignaturas = 0;
    try {
      totalProgramas = await this.programaRepo.count();
      totalAsignaturas = await this.asignaturaRepo.count();
    } catch { /* tables may not exist */ }

    return {
      total: ptas.length,
      pipeline,
      horasStats,
      estadoCounts,
      weeklyTrend,
      topDocentes,
      tiempoPromedioAprobacion,
      catalogoInfo: { totalProgramas, totalAsignaturas },
    };
  }
}
