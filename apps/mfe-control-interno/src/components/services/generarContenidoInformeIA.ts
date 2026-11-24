/**
 * ============================================================
 * SERVICIO: CONTENIDO DEL INFORME DE AUDITORÍA
 * ============================================================
 *
 * El informe solo lleva lo registrado en la auditoría (EFDS-2455). Antes este
 * servicio rellenaba objetivo, alcance, contexto, marco normativo, procesos,
 * fortalezas, recomendaciones, conclusiones y hasta un hallazgo con textos de
 * otro informe (o generados con IA si había llave). Ahora no genera nada: las
 * secciones sin datos quedan para que el auditor las desarrolle.
 */

import type { AuditoriaBasicaPDF, HallazgoPDF } from './exportarPDFInformeAuditoria';

// ─── Tipos de respuesta estructurada ─────────────────────────────────────────

export interface PlanAccionIA {
  resumen?: string;
  observaciones?: string[];
  items: Array<{
    actividad: string;
    proceso: string;
    indicador: string;
    metaProgramada: string;
    metaEjecutada: string;
    cumplimiento: string;
  }>;
}

export interface ProcesoAuditadoIA {
  idFoco?: string;
  categoria: string;
  numero: number;
  nombre: string;
  objetivo: string;
  riesgos: string[];
  componentes: Array<{ 
    titulo: string; 
    contenido: string; 
    tabla?: {
      titulo: string;
      tipo: 'planAccion' | 'pqrsdf' | 'general';
      datos: any;
    }
  }>;
  hallazgosIndices?: number[];
}

export interface PaginaInformeIA {
  numero: number;
  tipo: 'OFICIO' | 'PORTADA' | 'CONTENIDO' | 'FIRMAS';
  encabezado: string;
  contenido: string;
  piePagina: string;
}

export interface ContenidoInformeIA {
  objetivo: string;
  alcance: string;
  declaracion: string;
  contextoGeneral: string;
  descripcionUnidad: string;
  marcoNormativo: string[] | { generales: string[], especificas: string[] };
  procesosAuditados: ProcesoAuditadoIA[];
  planesMejoramiento: string;
  aspectosRelevantes: string;
  evaluacionControlInterno: string;
  fortalezas: string[];
  recomendacionesPorCategoria: Array<{ categoria: string; items: string[] }>;
  conclusiones: string;
  hallazgos?: HallazgoPDF[];
  paginas?: PaginaInformeIA[];
}

/** Contenido vacío: el informe no completa secciones con textos que no se registraron (EFDS-2455). */
function contenidoVacio(): ContenidoInformeIA {
  return {
    objetivo: '',
    alcance: '',
    declaracion: '',
    contextoGeneral: '',
    descripcionUnidad: '',
    marcoNormativo: { generales: [], especificas: [] },
    procesosAuditados: [],
    planesMejoramiento: '',
    aspectosRelevantes: '',
    evaluacionControlInterno: '',
    fortalezas: [],
    recomendacionesPorCategoria: [],
    conclusiones: '',
  };
}

export async function generarContenidoInformeIA(
  _auditoria: AuditoriaBasicaPDF,
  _hallazgos: HallazgoPDF[],
  _onProgress?: (msg: string) => void,
): Promise<ContenidoInformeIA> {
  return contenidoVacio();
}

export function aplicarContenidoIA(auditoria: AuditoriaBasicaPDF, _contenido: ContenidoInformeIA): AuditoriaBasicaPDF {
  const real = <T>(v: T | undefined | null, f: T): T => (v !== undefined && v !== null && v !== '' ? v : f);
  return {
    ...auditoria,
    // Los objetivos son opcionales: si no se registraron, el informe no inventa uno (EFDS-2419)
    objetivo: real(auditoria.objetivo, 'No registrado'),
  };
}
