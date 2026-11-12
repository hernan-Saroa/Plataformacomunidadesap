import type { RundSupportGroup } from '../components/pta/banco-docentes/RundSupportList';
import { RUND_MAX_EVIDENCES_PER_TYPE } from './rundEvidenceRules';

/**
 * Códigos y nomenclaturas de los soportes según el archivo CODIFICACION.xlsx del GGP.
 * Solo la carpeta 01 tiene código numérico por nivel: x.y.1 es el título base y x.y.2, x.y.3… los adicionales.
 * El resto de soportes trae únicamente el patrón del nombre del archivo.
 */
type Nivel = { base: string; nombre: string; adicional: string; patron: string; adicionalPatron: string };
const NIVELES: Record<string, Nivel> = {
  diploma_bachiller: { base: '1.0', nombre: 'Bachiller', adicional: 'Bachiller', patron: 'BACHILLER_COLEGIO', adicionalPatron: 'BACHILLER_ADICIONAL_COLEGIO' },
  diploma_pregrado: { base: '1.1', nombre: 'Pregrado', adicional: 'Pregrado adicional', patron: 'PREGRADO_UNIVERSIDAD', adicionalPatron: 'PREGRADO_ADICIONAL_UNIVERSIDAD' },
  diploma_especializacion: { base: '1.2', nombre: 'Especialización', adicional: 'Especialización adicional', patron: 'ESPECIALIZACION_UNIVERSIDAD', adicionalPatron: 'ESPECIALIZACION_ADICIONAL_UNIVERSIDAD' },
  diploma_maestria: { base: '1.3', nombre: 'Maestría', adicional: 'Maestría adicional', patron: 'MAGISTER_UNIVERSIDAD', adicionalPatron: 'MAGISTER_ADICIONAL_UNIVERSIDAD' },
  diploma_doctorado: { base: '1.4', nombre: 'Doctorado', adicional: 'Doctorado adicional', patron: 'DOCTORADO_UNIVERSIDAD', adicionalPatron: 'DOCTORADO_ADICIONAL_UNIVERSIDAD' },
  certificado_posdoctoral: { base: '1.5', nombre: 'Posdoctorado', adicional: 'Posdoctorado adicional', patron: 'POSDOCTORADO_UNIVERSIDAD', adicionalPatron: 'POSDOCTORADO_ADICIONAL_UNIVERSIDAD' },
};

const PATRON_NOVEDADES = 'AÑO_NÚMERO DE FOLIO_CONCEPTO BREVE_APELLIDOS DOCENTE';
const PATRONES: Record<string, string> = {
  documento_identidad: 'TIPOLOGÍA_NÚMERO DE DOCUMENTO',
  tarjeta_profesional: 'TP_NÚMERO DE FOLIO_NÚMERO DE TARJETA PROFESIONAL',
  hoja_vida: 'HV_NOMBRE DOCENTE',
  experiencia_docente: 'AÑO_NÚMERO DE FOLIO_UNIVERSIDAD',
  experiencia_laboral: 'AÑO_NÚMERO DE FOLIO_ENTIDAD/EMPRESA',
  experiencia_investigativa: 'AÑO_NÚMERO DE FOLIO_UNIVERSIDAD',
  productividad_academica: 'AÑO_NÚMERO DE FOLIO_TIPO DE PRODUCTO_APELLIDOS DOCENTE',
  dominio_segunda_lengua: 'IDIOMA_NIVEL_NOMBRE DOCENTE',
  formacion_no_formal: 'TIPOLOGÍA_AÑO_NOMBRE DOCENTE',
  estudio_hoja_vida: 'ESTUDIO_HV_FOLIO_FORMA DE VINCULACIÓN_NOMBRE DOCENTE',
  documento_no_valido: 'DUPLICADO_',
  acto_administrativo_vinculacion: PATRON_NOVEDADES, resolucion_convocatoria: PATRON_NOVEDADES, contrato: PATRON_NOVEDADES,
  acto_administrativo_dedicacion: PATRON_NOVEDADES, acto_administrativo_situacion: PATRON_NOVEDADES,
  acto_adscripcion_territorial: PATRON_NOVEDADES, resolucion_escalafon: PATRON_NOVEDADES, resolucion_puntaje_salarial: PATRON_NOVEDADES,
};

export type RundEstadoSoporte = 'Sin cargar' | 'En revisión' | 'Aprobado' | 'Devuelto';

export type RundFilaSoporte = {
  clave: string;
  tipoSoporte: string;
  codigo: string;
  soporte: string;
  nomenclatura: string;
  archivo: string | null;
  estado: RundEstadoSoporte;
  grupo: RundSupportGroup;
  evidencia?: any;
  /** Posición de la evidencia dentro del punto (1 = título base, 2 en adelante = adicionales). */
  numero: number;
  /** Última fila del soporte: es donde se ofrece "Agregar otro". */
  ultima: boolean;
  puedeCargar: boolean;
  puedeAgregar: boolean;
};

export const estadoDeEvidencia = (evidencia?: any): RundEstadoSoporte => {
  if (!evidencia) return 'Sin cargar';
  if (evidencia.estado === 'Aprobado') return 'Aprobado';
  if (evidencia.estado === 'Rechazado') return 'Devuelto';
  return 'En revisión';
};

/** Código x.y.n de la carpeta 01; las demás carpetas no tienen código numérico. */
export const codigoSoporte = (tipoSoporte: string, numero: number): string => {
  const nivel = NIVELES[tipoSoporte];
  return nivel ? `${nivel.base}.${numero}` : '—';
};

export function nomenclaturaSoporte(tipoSoporte: string, numero: number): string {
  const nivel = NIVELES[tipoSoporte];
  if (nivel) return `${nivel.base}.${numero}_${numero === 1 ? nivel.patron : nivel.adicionalPatron}`;
  return PATRONES[tipoSoporte] || '—';
}

export function nombreSoporte(grupo: RundSupportGroup, numero: number): string {
  const nivel = NIVELES[grupo.field.tipoSoporte];
  if (nivel) return numero === 1 ? nivel.nombre : nivel.adicional;
  return grupo.fields.length === 1 ? grupo.field.campo : grupo.field.documento;
}

/**
 * Una fila por evidencia vigente. Un soporte sin archivos tiene una fila base "Sin cargar"; al cargar más
 * archivos se generan 1.3.1, 1.3.2, 1.3.3… sin un número fijo de espacios.
 */
export function filasSoportes(grupos: RundSupportGroup[]): RundFilaSoporte[] {
  return grupos.flatMap(grupo => {
    const evidencias = grupo.evidences;
    const lista: Array<any | undefined> = evidencias.length ? evidencias : [undefined];
    return lista.map((evidencia, indice) => {
      const numero = indice + 1;
      const tipo = grupo.field.tipoSoporte;
      return {
        clave: `${tipo}:${evidencia?.id ?? 'base'}`,
        tipoSoporte: tipo,
        codigo: codigoSoporte(tipo, numero),
        soporte: nombreSoporte(grupo, numero),
        nomenclatura: nomenclaturaSoporte(tipo, numero),
        archivo: evidencia ? (evidencia.nombre_archivo || evidencia.nombreArchivo || 'Archivo sin nombre') : null,
        estado: estadoDeEvidencia(evidencia),
        grupo,
        evidencia,
        numero,
        ultima: numero === lista.length,
        puedeCargar: grupo.canManage && grupo.canUpload,
        puedeAgregar: grupo.canManage && grupo.canUpload && evidencias.length > 0 && evidencias.length < RUND_MAX_EVIDENCES_PER_TYPE,
      };
    });
  });
}

export const totalSoportesCarpeta = (grupos: RundSupportGroup[]) => grupos.length;
