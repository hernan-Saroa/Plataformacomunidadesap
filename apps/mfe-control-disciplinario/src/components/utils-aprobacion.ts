/**
 * UTILIDADES COMPARTIDAS PARA APROBACIÓN DE DOCUMENTOS
 * Funciones helper para convertir procesos y generar contenido
 */

import type { BorradorPendiente, AccionRevision } from './ModalRevisionAuto';

// ==================== INTERFACES LOCALES ====================

export interface ProcesoKanban {
  id: string;
  numeroProceso: string;
  denunciado: string | { nombre: string; [key: string]: any };
  etapaActual: string;
  prioridad: 'alta' | 'media' | 'baja';
  profesionalAsignado: {
    nombre: string;
    email: string;
    [key: string]: any;
  };
  fechaCreacion: string;
  borradores?: Array<{
    id: string;
    contenido?: string;
    observaciones?: string;
    version?: number;
  }>;
  [key: string]: any;
}

// ==================== MAPAS DE DATOS ====================

export const MAPA_TITULOS_DOCUMENTOS: Record<string, string> = {
  'Valoración': 'Auto de Valoración',
  'Indagación Preliminar': 'Auto de Indagación Preliminar',
  'Indagación': 'Auto de Indagación Preliminar',
  'Investigación': 'Auto de Apertura de Investigación',
  'Juzgamiento': 'Auto de Juzgamiento',
  'Archivo': 'Auto de Archivo',
  'Inhibitorio': 'Auto de Inhibitorio',
  'Cesación de Procedimiento': 'Auto de Cesación de Procedimiento',
  'Fallo': 'Fallo Disciplinario'
};

export const MAPA_PLANTILLAS: Record<string, string> = {
  'Valoración': 'Plantilla Auto de Valoración',
  'Indagación Preliminar': 'Plantilla Auto de Indagación Preliminar',
  'Indagación': 'Plantilla Auto de Indagación Preliminar',
  'Investigación': 'Plantilla Auto de Apertura de Investigación',
  'Juzgamiento': 'Plantilla Auto de Juzgamiento',
  'Archivo': 'Plantilla Auto de Archivo',
  'Inhibitorio': 'Plantilla Auto de Inhibitorio',
  'Cesación de Procedimiento': 'Plantilla Auto de Cesación',
  'Fallo': 'Plantilla Fallo Disciplinario'
};

// ==================== FUNCIONES DE CONVERSIÓN ====================

/**
 * Convierte un proceso del Kanban a formato BorradorPendiente
 * para el modal de Revisión y Aprobación
 */
export function convertirProcesoABorrador(proceso: ProcesoKanban): BorradorPendiente {
  const titulo = obtenerTituloDocumento(proceso.etapaActual);
  const plantilla = obtenerPlantilla(proceso.etapaActual);
  const version = obtenerVersion(proceso);
  const observaciones = obtenerObservaciones(proceso);
  const contenido = generarContenidoAuto(proceso);
  const historial = generarHistorial(proceso);
  const tiempoEspera = calcularTiempoEspera(proceso);

  // Obtener nombre del denunciado (puede ser string o objeto)
  const nombreDenunciado = typeof proceso.denunciado === 'string' 
    ? proceso.denunciado 
    : proceso.denunciado.nombre;

  return {
    id: proceso.id,
    numeroProceso: proceso.numeroProceso,
    titulo,
    plantilla,
    version,
    fechaEnvio: new Date().toISOString(),
    profesional: {
      nombre: proceso.profesionalAsignado.nombre,
      email: proceso.profesionalAsignado.email
    },
    observacionesProfesional: observaciones,
    contenido,
    denunciado: nombreDenunciado,
    etapa: proceso.etapaActual,
    prioridad: proceso.prioridad,
    estado: 'pendiente_revision',
    historial,
    tiempoEspera
  };
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Obtiene el título del documento según la etapa
 */
export function obtenerTituloDocumento(etapa: string): string {
  return MAPA_TITULOS_DOCUMENTOS[etapa] || `Documento de ${etapa}`;
}

/**
 * Obtiene la plantilla según la etapa
 */
export function obtenerPlantilla(etapa: string): string {
  return MAPA_PLANTILLAS[etapa] || `Plantilla ${etapa}`;
}

/**
 * Obtiene la versión del borrador (si existe)
 */
export function obtenerVersion(proceso: ProcesoKanban): number {
  if (proceso.borradores && proceso.borradores.length > 0) {
    const versiones = proceso.borradores.map(b => b.version || 1);
    return Math.max(...versiones);
  }
  return 1;
}

/**
 * Obtiene las observaciones del profesional
 */
export function obtenerObservaciones(proceso: ProcesoKanban): string {
  if (proceso.borradores && proceso.borradores.length > 0) {
    const ultimoBorrador = proceso.borradores[proceso.borradores.length - 1];
    if (ultimoBorrador.observaciones) {
      return ultimoBorrador.observaciones;
    }
  }
  return 'Documento listo para revisión y aprobación del Jefe de OCID.';
}

/**
 * Genera el contenido del auto según la etapa y datos del proceso
 */
export function generarContenidoAuto(proceso: ProcesoKanban): string {
  // Si ya existe contenido en el borrador, usarlo
  if (proceso.borradores && proceso.borradores.length > 0) {
    const ultimoBorrador = proceso.borradores[proceso.borradores.length - 1];
    if (ultimoBorrador.contenido) {
      return ultimoBorrador.contenido;
    }
  }

  // Obtener nombre del denunciado
  const nombreDenunciado = typeof proceso.denunciado === 'string' 
    ? proceso.denunciado 
    : proceso.denunciado.nombre;

  // Generar contenido según la etapa
  const titulo = obtenerTituloDocumento(proceso.etapaActual);
  const fecha = new Date();
  const dia = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-CO', { month: 'long' });
  const año = fecha.getFullYear();

  // Contenido base
  let contenido = `${titulo.toUpperCase()}\n\n`;
  contenido += `PROCESO No: ${proceso.numeroProceso}\n`;
  contenido += `DENUNCIADO/INVESTIGADO: ${nombreDenunciado}\n`;
  contenido += `ETAPA: ${proceso.etapaActual}\n\n`;
  
  contenido += `La Oficina de Control Interno Disciplinario de la ESAP, en uso de sus facultades legales,\n\n`;
  
  contenido += `CONSIDERANDO:\n\n`;

  // Considerandos según etapa
  if (proceso.etapaActual === 'Valoración') {
    contenido += `PRIMERO: Que mediante noticia disciplinaria se puso en conocimiento presuntos hechos que podrían constituir falta disciplinaria.\n\n`;
    contenido += `SEGUNDO: Que los hechos ameritan valoración para determinar si procede iniciar indagación preliminar.\n\n`;
  } else if (proceso.etapaActual === 'Indagación Preliminar' || proceso.etapaActual === 'Indagación') {
    contenido += `PRIMERO: Que mediante noticia disciplinaria se puso en conocimiento presuntos hechos de conducta irregular.\n\n`;
    contenido += `SEGUNDO: Que los hechos descritos ameritan indagación preliminar para establecer si se configura falta disciplinaria conforme a la Ley 734 de 2002.\n\n`;
  } else if (proceso.etapaActual === 'Investigación') {
    contenido += `PRIMERO: Que se ha completado la indagación preliminar y existen elementos probatorios que configuran falta disciplinaria.\n\n`;
    contenido += `SEGUNDO: Que procede abrir investigación disciplinaria formal contra el servidor público.\n\n`;
  } else if (proceso.etapaActual === 'Archivo') {
    contenido += `PRIMERO: Que no se encontraron elementos probatorios que configuren falta disciplinaria.\n\n`;
    contenido += `SEGUNDO: Que procede archivar el presente proceso disciplinario.\n\n`;
  } else {
    contenido += `PRIMERO: [Considerando generado automáticamente - Editar según corresponda]\n\n`;
    contenido += `SEGUNDO: [Considerando generado automáticamente - Editar según corresponda]\n\n`;
  }

  contenido += `RESUELVE:\n\n`;

  // Resuelve según etapa
  if (proceso.etapaActual === 'Indagación Preliminar' || proceso.etapaActual === 'Indagación') {
    contenido += `ARTÍCULO PRIMERO: ABRIR INDAGACIÓN PRELIMINAR en contra de ${nombreDenunciado}.\n\n`;
    contenido += `ARTÍCULO SEGUNDO: NOTIFÍQUESE el presente auto al investigado.\n\n`;
  } else if (proceso.etapaActual === 'Investigación') {
    contenido += `ARTÍCULO PRIMERO: ABRIR INVESTIGACIÓN DISCIPLINARIA en contra de ${nombreDenunciado}.\n\n`;
    contenido += `ARTÍCULO SEGUNDO: FORMULAR CARGOS por las faltas establecidas en la Ley 734 de 2002.\n\n`;
    contenido += `ARTÍCULO TERCERO: NOTIFÍQUESE personalmente al investigado.\n\n`;
  } else if (proceso.etapaActual === 'Archivo') {
    contenido += `ARTÍCULO PRIMERO: ARCHIVAR el presente proceso disciplinario por no configurarse falta disciplinaria.\n\n`;
    contenido += `ARTÍCULO SEGUNDO: NOTIFÍQUESE el presente auto.\n\n`;
  } else {
    contenido += `ARTÍCULO PRIMERO: [Resuelve generado automáticamente - Editar según corresponda]\n\n`;
    contenido += `ARTÍCULO SEGUNDO: NOTIFÍQUESE el presente auto.\n\n`;
  }

  contenido += `Dado en Bogotá D.C., a los ${dia} días del mes de ${mes} de ${año}.\n\n`;
  contenido += `_______________________________\n`;
  contenido += `JEFE OFICINA DE CONTROL INTERNO DISCIPLINARIO\n`;
  contenido += `ESAP`;

  return contenido;
}

/**
 * Genera el historial del proceso
 */
export function generarHistorial(proceso: ProcesoKanban): AccionRevision[] {
  const historial: AccionRevision[] = [];

  // Acción inicial: recibido
  historial.push({
    id: `h-${Date.now()}-1`,
    tipo: 'recibido',
    usuario: proceso.profesionalAsignado.nombre,
    fecha: new Date().toISOString(),
    descripcion: 'Borrador enviado para revisión',
    detalles: { version: obtenerVersion(proceso) }
  });

  return historial;
}

/**
 * Calcula el tiempo de espera desde la creación del proceso
 */
export function calcularTiempoEspera(proceso: ProcesoKanban): string {
  const ahora = new Date();
  const creado = new Date(proceso.fechaCreacion);
  const diff = ahora.getTime() - creado.getTime();
  
  const minutos = Math.floor(diff / (1000 * 60));
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (dias > 0) {
    const horasRestantes = horas % 24;
    return `${dias}d ${horasRestantes}h`;
  }
  
  if (horas > 0) {
    const minutosRestantes = minutos % 60;
    return `${horas}h ${minutosRestantes}m`;
  }
  
  return `${minutos}m`;
}

/**
 * Valida que un proceso tenga los datos mínimos para aprobación
 */
export function validarProcesoParaAprobacion(proceso: ProcesoKanban): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  if (!proceso.numeroProceso) {
    errores.push('Falta número de proceso');
  }

  if (!proceso.denunciado) {
    errores.push('Falta denunciado/investigado');
  }

  if (!proceso.etapaActual) {
    errores.push('Falta etapa actual');
  }

  if (!proceso.profesionalAsignado || !proceso.profesionalAsignado.nombre) {
    errores.push('Falta profesional asignado');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Obtiene el color del badge según la prioridad
 */
export function obtenerColorPrioridad(prioridad: 'alta' | 'media' | 'baja'): { bg: string; text: string } {
  const colores = {
    alta: { bg: '#FEE2E2', text: '#DC2626' },
    media: { bg: '#FEF3C7', text: '#D97706' },
    baja: { bg: '#DBEAFE', text: '#2563EB' }
  };
  return colores[prioridad];
}

/**
 * Formatea una fecha a formato legible en español
 */
export function formatearFecha(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Genera un ID único para acciones de historial
 */
export function generarIdHistorial(): string {
  return `h-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}