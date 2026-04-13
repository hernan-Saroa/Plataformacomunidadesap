/**
 * HELPERS Y UTILIDADES - MÓDULO CONTROL INTERNO
 * 
 * Funciones auxiliares reutilizables para cálculos, formateo,
 * transformaciones y operaciones comunes.
 */

// ==================== FORMATEO DE FECHAS ====================

/**
 * Formatea una fecha a formato colombiano (DD/MM/YYYY)
 */
export function formatearFecha(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea una fecha con hora
 */
export function formatearFechaHora(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea una fecha en formato relativo (hace 2 días, hace 3 horas, etc.)
 */
export function formatearFechaRelativa(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const ahora = new Date();
  const diffMs = ahora.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 30) {
    return formatearFecha(date);
  } else if (diffDays > 0) {
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffMins > 0) {
    return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  } else {
    return 'Hace un momento';
  }
}

/**
 * Obtiene el nombre del mes en español
 */
export function obtenerNombreMes(mes: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes];
}

/**
 * Calcula días entre dos fechas
 */
export function calcularDiasEntre(fechaInicio: string | Date, fechaFin: string | Date): number {
  const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
  const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;
  
  const diffTime = fin.getTime() - inicio.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Calcula días restantes hasta una fecha
 */
export function calcularDiasRestantes(fechaVencimiento: string | Date): number {
  const hoy = new Date();
  return calcularDiasEntre(hoy, fechaVencimiento);
}

// ==================== FORMATEO DE NÚMEROS ====================

/**
 * Formatea un número como porcentaje
 */
export function formatearPorcentaje(valor: number, decimales: number = 0): string {
  return `${valor.toFixed(decimales)}%`;
}

/**
 * Formatea un número con separadores de miles
 */
export function formatearNumero(valor: number): string {
  return valor.toLocaleString('es-CO');
}

/**
 * Formatea un valor monetario en pesos colombianos
 */
export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(valor);
}

/**
 * Redondea un número a decimales específicos
 */
export function redondear(valor: number, decimales: number = 2): number {
  return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
}

// ==================== CÁLCULOS DE LISTAS DE CHEQUEO ====================

/**
 * Calcula el porcentaje de cumplimiento de una lista
 */
export function calcularCumplimientoLista(lista: any): {
  cumplimiento: number;
  itemsCumple: number;
  itemsNoCumple: number;
  itemsNoAplica: number;
  itemsPendientes: number;
  totalItems: number;
  totalAplicables: number;
} {
  let itemsCumple = 0;
  let itemsNoCumple = 0;
  let itemsNoAplica = 0;
  let totalItems = 0;
  
  lista.secciones?.forEach((seccion: any) => {
    seccion.items?.forEach((item: any) => {
      totalItems++;
      if (item.respuesta === 'cumple') itemsCumple++;
      else if (item.respuesta === 'no-cumple') itemsNoCumple++;
      else if (item.respuesta === 'no-aplica') itemsNoAplica++;
    });
  });
  
  const itemsRespondidos = itemsCumple + itemsNoCumple + itemsNoAplica;
  const itemsPendientes = totalItems - itemsRespondidos;
  const totalAplicables = itemsRespondidos - itemsNoAplica;
  
  const cumplimiento = totalAplicables > 0 
    ? Math.round((itemsCumple / totalAplicables) * 100)
    : 0;
  
  return {
    cumplimiento,
    itemsCumple,
    itemsNoCumple,
    itemsNoAplica,
    itemsPendientes,
    totalItems,
    totalAplicables
  };
}

/**
 * Calcula el progreso de diligenciamiento
 */
export function calcularProgresoLista(lista: any): number {
  let itemsRespondidos = 0;
  let totalItems = 0;
  
  lista.secciones?.forEach((seccion: any) => {
    seccion.items?.forEach((item: any) => {
      totalItems++;
      if (item.respuesta) itemsRespondidos++;
    });
  });
  
  return totalItems > 0 ? Math.round((itemsRespondidos / totalItems) * 100) : 0;
}

// ==================== CÁLCULOS DE PLANES DE MEJORAMIENTO ====================

/**
 * Calcula el avance promedio de un plan de mejoramiento
 */
export function calcularAvancePlan(acciones: any[]): number {
  if (!acciones || acciones.length === 0) return 0;
  
  const sumaAvances = acciones.reduce((sum, accion) => sum + (accion.avance || 0), 0);
  return Math.round(sumaAvances / acciones.length);
}

/**
 * Calcula el estado de una acción según fechas y avance
 */
export function calcularEstadoAccion(accion: any): {
  estado: 'programada' | 'en-ejecucion' | 'vencida' | 'completada' | 'atrasada';
  diasRestantes: number;
  porcentajeEsperado: number;
} {
  const hoy = new Date();
  const inicio = new Date(accion.fechaInicio);
  const fin = new Date(accion.fechaFin);
  
  const diasRestantes = calcularDiasEntre(hoy, fin);
  const diasTotales = calcularDiasEntre(inicio, fin);
  const diasTranscurridos = calcularDiasEntre(inicio, hoy);
  
  // Calcular avance esperado según tiempo transcurrido
  let porcentajeEsperado = 0;
  if (hoy >= inicio && hoy <= fin) {
    porcentajeEsperado = Math.round((diasTranscurridos / diasTotales) * 100);
  } else if (hoy > fin) {
    porcentajeEsperado = 100;
  }
  
  // Determinar estado
  let estado: 'programada' | 'en-ejecucion' | 'vencida' | 'completada' | 'atrasada';
  
  if (accion.avance === 100) {
    estado = 'completada';
  } else if (hoy > fin) {
    estado = 'vencida';
  } else if (hoy < inicio) {
    estado = 'programada';
  } else if (accion.avance < porcentajeEsperado - 10) { // 10% de tolerancia
    estado = 'atrasada';
  } else {
    estado = 'en-ejecucion';
  }
  
  return {
    estado,
    diasRestantes,
    porcentajeEsperado
  };
}

// ==================== CÁLCULOS DE INFORMES DE LEY ====================

/**
 * Calcula el próximo vencimiento de un informe según su periodicidad
 */
export function calcularProximoVencimiento(
  periodicidad: string,
  diaPresentacion: number,
  fechaBase?: Date
): Date {
  const base = fechaBase || new Date();
  let proximoVencimiento = new Date(base);
  
  switch (periodicidad) {
    case 'mensual':
      proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 1);
      proximoVencimiento.setDate(diaPresentacion);
      break;
      
    case 'bimestral':
      proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 2);
      proximoVencimiento.setDate(diaPresentacion);
      break;
      
    case 'trimestral':
      proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 3);
      proximoVencimiento.setDate(diaPresentacion);
      break;
      
    case 'cuatrimestral':
      proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 4);
      proximoVencimiento.setDate(diaPresentacion);
      break;
      
    case 'semestral':
      proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 6);
      proximoVencimiento.setDate(diaPresentacion);
      break;
      
    case 'anual':
      proximoVencimiento.setFullYear(proximoVencimiento.getFullYear() + 1);
      proximoVencimiento.setDate(diaPresentacion);
      break;
  }
  
  return proximoVencimiento;
}

/**
 * Calcula el período actual según la periodicidad
 */
export function calcularPeriodoActual(periodicidad: string, fecha?: Date): string {
  const base = fecha || new Date();
  const año = base.getFullYear();
  const mes = base.getMonth() + 1;
  
  switch (periodicidad) {
    case 'mensual':
      return `${año}-${mes.toString().padStart(2, '0')}`;
      
    case 'bimestral':
      const bimestre = Math.ceil(mes / 2);
      return `${año}-B${bimestre}`;
      
    case 'trimestral':
      const trimestre = Math.ceil(mes / 3);
      return `${año}-Q${trimestre}`;
      
    case 'cuatrimestral':
      const cuatrimestre = Math.ceil(mes / 4);
      return `${año}-C${cuatrimestre}`;
      
    case 'semestral':
      const semestre = Math.ceil(mes / 6);
      return `${año}-S${semestre}`;
      
    case 'anual':
      return `${año}`;
      
    default:
      return año.toString();
  }
}

/**
 * Calcula estadísticas de cumplimiento de informes
 */
export function calcularEstadisticasInformes(entregas: any[]): {
  cumplimiento: number;
  entregasATiempo: number;
  entregasTardias: number;
  entregasPendientes: number;
  promedioAnticiDias: number;
} {
  const hoy = new Date();
  
  const completadas = entregas.filter(e => e.estado === 'entregado');
  const entregasATiempo = completadas.filter(e => {
    const fechaEntrega = new Date(e.fechaEntrega);
    const fechaVenc = new Date(e.fechaVencimiento);
    return fechaEntrega <= fechaVenc;
  }).length;
  
  const entregasTardias = completadas.length - entregasATiempo;
  const entregasPendientes = entregas.filter(e => e.estado === 'pendiente' || e.estado === 'en-proceso').length;
  
  // Calcular promedio de días de anticipación
  let sumaAntici = 0;
  completadas.forEach(e => {
    const fechaEntrega = new Date(e.fechaEntrega);
    const fechaVenc = new Date(e.fechaVencimiento);
    const dias = calcularDiasEntre(fechaEntrega, fechaVenc);
    if (dias > 0) sumaAntici += dias;
  });
  
  const promedioAnticiDias = completadas.length > 0 
    ? Math.round(sumaAntici / completadas.length)
    : 0;
  
  const cumplimiento = entregas.length > 0
    ? Math.round((completadas.length / entregas.length) * 100)
    : 0;
  
  return {
    cumplimiento,
    entregasATiempo,
    entregasTardias,
    entregasPendientes,
    promedioAnticiDias
  };
}

// ==================== UTILIDADES DE TEXTO ====================

/**
 * Trunca un texto a una longitud máxima
 */
export function truncarTexto(texto: string, longitudMaxima: number): string {
  if (texto.length <= longitudMaxima) return texto;
  return texto.substring(0, longitudMaxima) + '...';
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizarPalabras(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

/**
 * Genera un slug a partir de un texto
 */
export function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extrae iniciales de un nombre
 */
export function obtenerIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

// ==================== UTILIDADES DE ARRAYS ====================

/**
 * Agrupa un array por una propiedad
 */
export function agruparPor<T>(array: T[], propiedad: keyof T): Record<string, T[]> {
  return array.reduce((grupos, item) => {
    const clave = String(item[propiedad]);
    if (!grupos[clave]) {
      grupos[clave] = [];
    }
    grupos[clave].push(item);
    return grupos;
  }, {} as Record<string, T[]>);
}

/**
 * Ordena un array por una propiedad
 */
export function ordenarPor<T>(
  array: T[],
  propiedad: keyof T,
  direccion: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const valorA = a[propiedad];
    const valorB = b[propiedad];
    
    if (valorA < valorB) return direccion === 'asc' ? -1 : 1;
    if (valorA > valorB) return direccion === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filtra y elimina duplicados
 */
export function eliminarDuplicados<T>(array: T[], propiedad?: keyof T): T[] {
  if (!propiedad) {
    return Array.from(new Set(array));
  }
  
  const vistos = new Set();
  return array.filter(item => {
    const clave = item[propiedad];
    if (vistos.has(clave)) {
      return false;
    }
    vistos.add(clave);
    return true;
  });
}

// ==================== UTILIDADES DE GENERACIÓN ====================

/**
 * Genera un ID único
 */
export function generarId(prefijo: string = 'ID'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefijo}-${timestamp}-${random}`;
}

/**
 * Genera un código único con formato específico
 */
export function generarCodigo(prefijo: string, longitud: number = 6): string {
  const timestamp = Date.now().toString().slice(-longitud);
  return `${prefijo}-${timestamp}`;
}

/**
 * Genera un color aleatorio para avatares
 */
export function generarColorAvatar(nombre: string): string {
  const colores = [
    '#003DA5', // Azul ESAP
    '#0052CC',
    '#2563eb',
    '#7c3aed',
    '#dc2626',
    '#ea580c',
    '#16a34a',
    '#0891b2'
  ];
  
  const index = nombre.charCodeAt(0) % colores.length;
  return colores[index];
}

// ==================== UTILIDADES DE DESCARGA ====================

/**
 * Descarga un archivo desde un blob
 */
export function descargarArchivo(blob: Blob, nombreArchivo: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Descarga datos como JSON
 */
export function descargarJSON(datos: any, nombreArchivo: string): void {
  const json = JSON.stringify(datos, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  descargarArchivo(blob, nombreArchivo);
}

/**
 * Descarga datos como CSV
 */
export function descargarCSV(datos: any[], nombreArchivo: string): void {
  if (datos.length === 0) return;
  
  // Obtener headers
  const headers = Object.keys(datos[0]);
  const csvHeaders = headers.join(',');
  
  // Convertir datos a filas CSV
  const csvRows = datos.map(row =>
    headers.map(header => {
      const valor = row[header];
      // Escapar comillas y comas
      const valorStr = String(valor).replace(/"/g, '""');
      return `"${valorStr}"`;
    }).join(',')
  );
  
  const csv = [csvHeaders, ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  descargarArchivo(blob, nombreArchivo);
}

// ==================== UTILIDADES DE ESTADO ====================

/**
 * Obtiene el color según el nivel de cumplimiento
 */
export function obtenerColorCumplimiento(porcentaje: number): string {
  if (porcentaje >= 90) return 'text-green-700 bg-green-100';
  if (porcentaje >= 70) return 'text-blue-700 bg-blue-100';
  if (porcentaje >= 50) return 'text-yellow-700 bg-yellow-100';
  return 'text-red-700 bg-red-100';
}

/**
 * Obtiene el color según días restantes
 */
export function obtenerColorDiasRestantes(dias: number): string {
  if (dias < 0) return 'text-red-700 bg-red-100';
  if (dias <= 3) return 'text-orange-700 bg-orange-100';
  if (dias <= 7) return 'text-yellow-700 bg-yellow-100';
  return 'text-green-700 bg-green-100';
}

/**
 * Obtiene el ícono según el estado
 */
export function obtenerIconoEstado(estado: string): string {
  const iconos: Record<string, string> = {
    'pendiente': '⏳',
    'en-proceso': '🔄',
    'completado': '✅',
    'vencido': '❌',
    'rechazado': '🚫',
    'aprobado': '✓',
    'borrador': '📝'
  };
  
  return iconos[estado] || '•';
}

// ==================== UTILIDADES DE LOCAL STORAGE ====================

/**
 * Guarda datos en localStorage con vencimiento
 */
export function guardarEnCache(clave: string, datos: any, duracionMinutos: number = 60): void {
  const expiracion = new Date().getTime() + duracionMinutos * 60 * 1000;
  const item = {
    datos,
    expiracion
  };
  localStorage.setItem(clave, JSON.stringify(item));
}

/**
 * Obtiene datos de localStorage verificando vencimiento
 */
export function obtenerDeCache<T>(clave: string): T | null {
  const itemStr = localStorage.getItem(clave);
  if (!itemStr) return null;
  
  try {
    const item = JSON.parse(itemStr);
    const ahora = new Date().getTime();
    
    if (ahora > item.expiracion) {
      localStorage.removeItem(clave);
      return null;
    }
    
    return item.datos as T;
  } catch {
    return null;
  }
}

/**
 * Limpia caché expirado
 */
export function limpiarCacheExpirado(): void {
  const ahora = new Date().getTime();
  
  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    if (!clave) continue;
    
    try {
      const itemStr = localStorage.getItem(clave);
      if (!itemStr) continue;
      
      const item = JSON.parse(itemStr);
      if (item.expiracion && ahora > item.expiracion) {
        localStorage.removeItem(clave);
      }
    } catch {
      // Ignorar items que no son del formato esperado
    }
  }
}

export default {
  // Fechas
  formatearFecha,
  formatearFechaHora,
  formatearFechaRelativa,
  obtenerNombreMes,
  calcularDiasEntre,
  calcularDiasRestantes,
  
  // Números
  formatearPorcentaje,
  formatearNumero,
  formatearMoneda,
  redondear,
  
  // Listas de chequeo
  calcularCumplimientoLista,
  calcularProgresoLista,
  
  // Planes de mejoramiento
  calcularAvancePlan,
  calcularEstadoAccion,
  
  // Informes de ley
  calcularProximoVencimiento,
  calcularPeriodoActual,
  calcularEstadisticasInformes,
  
  // Texto
  truncarTexto,
  capitalizarPalabras,
  generarSlug,
  obtenerIniciales,
  
  // Arrays
  agruparPor,
  ordenarPor,
  eliminarDuplicados,
  
  // Generación
  generarId,
  generarCodigo,
  generarColorAvatar,
  
  // Descarga
  descargarArchivo,
  descargarJSON,
  descargarCSV,
  
  // Estado
  obtenerColorCumplimiento,
  obtenerColorDiasRestantes,
  obtenerIconoEstado,
  
  // Cache
  guardarEnCache,
  obtenerDeCache,
  limpiarCacheExpirado
};
