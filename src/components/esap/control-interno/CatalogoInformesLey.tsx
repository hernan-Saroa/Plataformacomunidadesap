/**
 * CATÁLOGO DE INFORMES DE LEY - 16 INFORMES NORMATIVOS
 * Sistema crítico que gestiona el catálogo completo de informes de ley
 * Casos de Uso: 5 (Informes de Ley y Seguimiento)
 * 
 * Incluye:
 * - Catálogo de 16 informes normativos
 * - Periodicidad configurada por informe
 * - Vinculación a roles del Plan Anual
 * - Base normativa
 */

import { Scale, FileText, Calendar, Shield, TrendingUp, Users, Database } from 'lucide-react';

// ============ TIPOS ============

export type PeriodicidadInforme = 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';
export type RolPlanAnual = 'enfoque-prevencion' | 'evaluacion-gestion' | 'seguimiento' | 'relacion-control-externo' | 'gestion-conocimiento' | null;

export interface InformeLeyNormativo {
  id: string;
  codigo: string;
  nombre: string;
  nombreCorto: string;
  baseNormativa: string;
  articuloEspecifico: string;
  periodicidad: PeriodicidadInforme;
  mesGeneracion: number | number[]; // Mes(es) en que se genera (1-12)
  diasAnticipacion: number; // Días de anticipación para recordatorio
  responsableRol: string; // Rol responsable en la OCI
  formatoPlantilla: string; // ID de la plantilla
  datosAutomaticos: boolean; // Si puede llenarse automáticamente
  requiereIntegracionExterna: boolean; // Si requiere datos externos (ej. DAF)
  fuentesExternas: string[]; // Fuentes de datos externas
  destinatarios: string[]; // A quién se envía
  vinculacionRol: RolPlanAnual; // Rol del Decreto 648 al que pertenece
  plazoEntrega: string; // Descripción del plazo
  activo: boolean;
  observaciones: string;
  urlReferencia: string; // URL con más información
}

// ============ CATÁLOGO COMPLETO DE 16 INFORMES DE LEY ============

export const CATALOGO_INFORMES_LEY: InformeLeyNormativo[] = [
  // ========== INFORMES ANUALES (6) ==========
  {
    id: 'inf-ley-001',
    codigo: 'INF-PORM',
    nombre: 'Informe Pormenorizado del Estado del Control Interno',
    nombreCorto: 'Informe Pormenorizado',
    baseNormativa: 'Ley 1474 de 2011 (Estatuto Anticorrupción)',
    articuloEspecifico: 'Art. 9 - Informe Pormenorizado',
    periodicidad: 'semestral',
    mesGeneracion: [2, 8], // Febrero y Agosto
    diasAnticipacion: 15,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-pormenorizado-dafp',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Consejo Superior', 'DAFP', 'Contraloría General'],
    vinculacionRol: 'enfoque-prevencion',
    plazoEntrega: 'Últimos 5 días hábiles de febrero y agosto',
    activo: true,
    observaciones: 'Informe más importante de Control Interno. Formato DAFP obligatorio.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=43292'
  },
  {
    id: 'inf-ley-002',
    codigo: 'INF-ANUAL-OCI',
    nombre: 'Informe Anual de Gestión de la Oficina de Control Interno',
    nombreCorto: 'Informe Anual OCI',
    baseNormativa: 'Decreto 648 de 2017',
    articuloEspecifico: 'Art. 14 - Informes de la Oficina de Control Interno',
    periodicidad: 'anual',
    mesGeneracion: [2], // Febrero del año siguiente
    diasAnticipacion: 20,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-anual-oci',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Consejo Superior', 'Rectoría', 'Comunidad Universitaria'],
    vinculacionRol: 'enfoque-prevencion',
    plazoEntrega: 'Antes del 28 de febrero',
    activo: true,
    observaciones: 'Presenta resultados de gestión anual de la OCI según Decreto 648.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=79816'
  },
  {
    id: 'inf-ley-003',
    codigo: 'INF-FUR',
    nombre: 'Informe de Funcionamiento del Sistema de Gestión Institucional (FUR)',
    nombreCorto: 'Informe FUR',
    baseNormativa: 'Decreto 1537 de 2001',
    articuloEspecifico: 'Art. 8 - Informe de Gestión',
    periodicidad: 'anual',
    mesGeneracion: [3], // Marzo
    diasAnticipacion: 15,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-fur-dafp',
    datosAutomaticos: false,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Dirección Administrativa y Financiera (DAF)', 'Planeación'],
    destinatarios: ['DAFP', 'Consejo Superior'],
    vinculacionRol: 'enfoque-prevencion',
    plazoEntrega: 'Antes del 31 de marzo',
    activo: true,
    observaciones: 'Requiere datos del Excel suministrado por DAF. Formato DAFP.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4383'
  },
  {
    id: 'inf-ley-004',
    codigo: 'INF-ANUAL-MECI',
    nombre: 'Informe Anual del Estado del Modelo Estándar de Control Interno (MECI)',
    nombreCorto: 'Informe Anual MECI',
    baseNormativa: 'Decreto 943 de 2014',
    articuloEspecifico: 'Art. 10 - Evaluación del MECI',
    periodicidad: 'anual',
    mesGeneracion: [2],
    diasAnticipacion: 15,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-meci',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Consejo Superior', 'DAFP', 'Dirección'],
    vinculacionRol: 'evaluacion-gestion',
    plazoEntrega: 'Febrero de cada año',
    activo: true,
    observaciones: 'Evaluación anual del funcionamiento del MECI en la entidad.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=58785'
  },
  {
    id: 'inf-ley-005',
    codigo: 'INF-ANUAL-CALIDAD',
    nombre: 'Informe Anual de Revisión por la Dirección del Sistema de Gestión de Calidad',
    nombreCorto: 'Revisión Dirección SGC',
    baseNormativa: 'NTC ISO 9001:2015',
    articuloEspecifico: 'Requisito 9.3 - Revisión por la Dirección',
    periodicidad: 'anual',
    mesGeneracion: [1], // Enero
    diasAnticipacion: 10,
    responsableRol: 'Profesional Universitario OCI',
    formatoPlantilla: 'plantilla-revision-direccion-sgc',
    datosAutomaticos: true,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Comité de Calidad', 'Procesos certificados'],
    destinatarios: ['Comité de Calidad', 'Rectoría', 'Directores'],
    vinculacionRol: 'seguimiento',
    plazoEntrega: 'Última semana de enero',
    activo: true,
    observaciones: 'Presentación en Comité de Calidad. Requisito ISO 9001.',
    urlReferencia: 'https://www.iso.org/iso-9001-quality-management.html'
  },
  {
    id: 'inf-ley-006',
    codigo: 'INF-ANUAL-ANTICORRUPCION',
    nombre: 'Informe de Avance del Plan Anticorrupción y de Atención al Ciudadano',
    nombreCorto: 'Informe Anticorrupción',
    baseNormativa: 'Ley 1474 de 2011 y Decreto 1081 de 2015',
    articuloEspecifico: 'Art. 73 - Plan Anticorrupción',
    periodicidad: 'semestral',
    mesGeneracion: [6, 12], // Junio y Diciembre
    diasAnticipacion: 10,
    responsableRol: 'Profesional Especializado OCI',
    formatoPlantilla: 'plantilla-anticorrupcion',
    datosAutomaticos: false,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Todas las dependencias', 'Transparencia'],
    destinatarios: ['Consejo Superior', 'DAFP', 'Procuraduría'],
    vinculacionRol: 'enfoque-prevencion',
    plazoEntrega: 'Últimos 5 días hábiles de junio y diciembre',
    activo: true,
    observaciones: 'Seguimiento a mapa de riesgos de corrupción y gestión de PQRS.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=43292'
  },

  // ========== INFORMES TRIMESTRALES (4) ==========
  {
    id: 'inf-ley-007',
    codigo: 'INF-TRIM-AUSTERIDAD',
    nombre: 'Informe Trimestral de Austeridad del Gasto Público',
    nombreCorto: 'Austeridad del Gasto',
    baseNormativa: 'Decreto 1737 de 1998 y Circular Externa 100-011 DAFP',
    articuloEspecifico: 'Art. 3 - Austeridad en el Gasto',
    periodicidad: 'trimestral',
    mesGeneracion: [4, 7, 10, 1], // Abril, Julio, Octubre, Enero
    diasAnticipacion: 7,
    responsableRol: 'Profesional Especializado OCI',
    formatoPlantilla: 'plantilla-austeridad',
    datosAutomaticos: true,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Dirección Financiera', 'Contabilidad', 'SIIF'],
    destinatarios: ['DAFP', 'Rectoría', 'Contraloría'],
    vinculacionRol: 'evaluacion-gestion',
    plazoEntrega: 'Primeros 10 días del mes siguiente al trimestre',
    activo: true,
    observaciones: 'Requiere datos financieros del SIIF. Formato Excel DAFP.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=1260'
  },
  {
    id: 'inf-ley-008',
    codigo: 'INF-TRIM-SEGUIMIENTO-SGC',
    nombre: 'Informe Trimestral de Seguimiento al Sistema de Gestión de Calidad',
    nombreCorto: 'Seguimiento Trimestral SGC',
    baseNormativa: 'NTC ISO 9001:2015',
    articuloEspecifico: 'Requisito 9.1 - Seguimiento, medición, análisis y evaluación',
    periodicidad: 'trimestral',
    mesGeneracion: [3, 6, 9, 12], // Marzo, Junio, Septiembre, Diciembre
    diasAnticipacion: 7,
    responsableRol: 'Profesional Universitario OCI',
    formatoPlantilla: 'plantilla-seguimiento-sgc',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Comité de Calidad', 'Rectoría'],
    vinculacionRol: 'seguimiento',
    plazoEntrega: 'Última semana del trimestre',
    activo: true,
    observaciones: 'Presentación en Comité de Calidad trimestral.',
    urlReferencia: 'https://www.iso.org/iso-9001-quality-management.html'
  },
  {
    id: 'inf-ley-009',
    codigo: 'INF-TRIM-PLANES-MEJORA',
    nombre: 'Informe Trimestral de Seguimiento a Planes de Mejoramiento',
    nombreCorto: 'Seguimiento Planes Mejora',
    baseNormativa: 'Procedimiento Interno OCI - MECI',
    articuloEspecifico: 'Componente de Mejoramiento',
    periodicidad: 'trimestral',
    mesGeneracion: [3, 6, 9, 12],
    diasAnticipacion: 10,
    responsableRol: 'Todos los Profesionales OCI',
    formatoPlantilla: 'plantilla-seguimiento-planes',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Rectoría', 'Directores', 'Áreas auditadas'],
    vinculacionRol: 'seguimiento',
    plazoEntrega: 'Primeros 15 días del mes siguiente',
    activo: true,
    observaciones: 'Seguimiento a hallazgos de auditorías internas y externas.',
    urlReferencia: ''
  },
  {
    id: 'inf-ley-010',
    codigo: 'INF-TRIM-INDICADORES',
    nombre: 'Informe Trimestral de Indicadores de Gestión OCI',
    nombreCorto: 'Indicadores OCI',
    baseNormativa: 'Decreto 648 de 2017',
    articuloEspecifico: 'Art. 12 - Indicadores de Gestión',
    periodicidad: 'trimestral',
    mesGeneracion: [3, 6, 9, 12],
    diasAnticipacion: 7,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-indicadores-oci',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Consejo Superior', 'Rectoría'],
    vinculacionRol: 'gestion-conocimiento',
    plazoEntrega: 'Primera semana del mes siguiente',
    activo: true,
    observaciones: 'Medición de cumplimiento del Plan Anual de Auditoría.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=79816'
  },

  // ========== INFORMES MENSUALES (3) ==========
  {
    id: 'inf-ley-011',
    codigo: 'INF-MENS-CONTRATACION',
    nombre: 'Informe Mensual de Revisión de Procesos de Contratación',
    nombreCorto: 'Revisión Contratos',
    baseNormativa: 'Ley 80 de 1993 y Ley 1150 de 2007',
    articuloEspecifico: 'Art. 26 Ley 80 - Control y vigilancia',
    periodicidad: 'mensual',
    mesGeneracion: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Todos los meses
    diasAnticipacion: 5,
    responsableRol: 'Profesional Especializado OCI',
    formatoPlantilla: 'plantilla-revision-contratos',
    datosAutomaticos: false,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Oficina Jurídica', 'Dirección Administrativa', 'SECOP'],
    destinatarios: ['Oficina Jurídica', 'Dirección Administrativa', 'Rectoría'],
    vinculacionRol: 'evaluacion-gestion',
    plazoEntrega: 'Primeros 10 días del mes siguiente',
    activo: true,
    observaciones: 'Revisión de legalidad y cumplimiento normativo de contratos.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=304'
  },
  {
    id: 'inf-ley-012',
    codigo: 'INF-MENS-PQRS',
    nombre: 'Informe Mensual de Seguimiento a PQRS',
    nombreCorto: 'Seguimiento PQRS',
    baseNormativa: 'Ley 1755 de 2015 (Código de Procedimiento Administrativo)',
    articuloEspecifico: 'Art. 14 - Términos de respuesta',
    periodicidad: 'mensual',
    mesGeneracion: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    diasAnticipacion: 3,
    responsableRol: 'Técnico Administrativo OCI',
    formatoPlantilla: 'plantilla-pqrs',
    datosAutomaticos: true,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Atención al Ciudadano', 'Sistema PQRS'],
    destinatarios: ['Rectoría', 'Jefe Atención al Ciudadano'],
    vinculacionRol: 'seguimiento',
    plazoEntrega: 'Primeros 5 días del mes',
    activo: true,
    observaciones: 'Verifica cumplimiento de términos legales de respuesta.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=62985'
  },
  {
    id: 'inf-ley-013',
    codigo: 'INF-MENS-DERECHOS-AUTOR',
    nombre: 'Informe Mensual de Seguimiento a Derechos de Autor y Licenciamiento',
    nombreCorto: 'Derechos de Autor',
    baseNormativa: 'Ley 23 de 1982 y Circular Externa 016 de 2002 DAFP',
    articuloEspecifico: 'Art. 52 - Uso legal de software',
    periodicidad: 'mensual',
    mesGeneracion: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    diasAnticipacion: 5,
    responsableRol: 'Profesional Universitario OCI',
    formatoPlantilla: 'plantilla-derechos-autor',
    datosAutomaticos: false,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Dirección de TI', 'Inventario de software'],
    destinatarios: ['Director de TI', 'Rectoría', 'Oficina Jurídica'],
    vinculacionRol: 'enfoque-prevencion',
    plazoEntrega: 'Primeros 10 días del mes',
    activo: true,
    observaciones: 'Verificación de licenciamiento de software institucional.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=3431'
  },

  // ========== INFORMES ESPECIALES / BAJO DEMANDA (3) ==========
  {
    id: 'inf-ley-014',
    codigo: 'INF-ESP-ENTES-CONTROL',
    nombre: 'Informes a Entes de Control Externo (Contraloría, Procuraduría, Fiscalía)',
    nombreCorto: 'Entes de Control',
    baseNormativa: 'Ley 42 de 1993 y Ley 610 de 2000',
    articuloEspecifico: 'Art. 12 Ley 42 - Colaboración',
    periodicidad: 'anual', // Pero puede ser bajo demanda
    mesGeneracion: [12], // Diciembre, pero puede variar
    diasAnticipacion: 5,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-entes-control',
    datosAutomaticos: false,
    requiereIntegracionExterna: true,
    fuentesExternas: ['Todas las dependencias según requerimiento'],
    destinatarios: ['Contraloría', 'Procuraduría', 'Fiscalía', 'CGR'],
    vinculacionRol: 'relacion-control-externo',
    plazoEntrega: 'Según requerimiento del ente',
    activo: true,
    observaciones: 'Respuesta a requerimientos específicos de entes de control.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6438'
  },
  {
    id: 'inf-ley-015',
    codigo: 'INF-ESP-CONSEJO-SUPERIOR',
    nombre: 'Informes Especiales al Consejo Superior Universitario',
    nombreCorto: 'Informes Consejo Superior',
    baseNormativa: 'Estatuto Orgánico ESAP',
    articuloEspecifico: 'Art. 15 - Atribuciones Consejo Superior',
    periodicidad: 'trimestral', // O bajo demanda
    mesGeneracion: [3, 6, 9, 12],
    diasAnticipacion: 10,
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-consejo-superior',
    datosAutomaticos: true,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Consejo Superior Universitario'],
    vinculacionRol: 'relacion-control-externo',
    plazoEntrega: 'Según convocatoria',
    activo: true,
    observaciones: 'Presentaciones especiales en sesiones del Consejo Superior.',
    urlReferencia: ''
  },
  {
    id: 'inf-ley-016',
    codigo: 'INF-ESP-HALLAZGOS-CRITICOS',
    nombre: 'Informe Especial de Hallazgos Críticos o Alertas Tempranas',
    nombreCorto: 'Alertas Tempranas',
    baseNormativa: 'Decreto 648 de 2017',
    articuloEspecifico: 'Art. 6 - Función de advertencia',
    periodicidad: 'anual', // Pero es bajo demanda cuando hay hallazgo crítico
    mesGeneracion: [12], // N/A - Cuando se requiera
    diasAnticipacion: 0, // Inmediato
    responsableRol: 'Jefe OCI',
    formatoPlantilla: 'plantilla-alerta-temprana',
    datosAutomaticos: false,
    requiereIntegracionExterna: false,
    fuentesExternas: [],
    destinatarios: ['Rector', 'Consejo Superior', 'Dependencia afectada'],
    vinculacionRol: 'enfoque-prevencion',
    plazoEntrega: 'Inmediato al detectar hallazgo crítico',
    activo: true,
    observaciones: 'Función de advertencia ante riesgos inminentes o hallazgos críticos.',
    urlReferencia: 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=79816'
  }
];

// ============ FUNCIONES AUXILIARES ============

/**
 * Obtiene los informes que deben generarse en un mes específico
 */
export function obtenerInformesDelMes(mes: number): InformeLeyNormativo[] {
  return CATALOGO_INFORMES_LEY.filter(informe => {
    if (!informe.activo) return false;

    if (Array.isArray(informe.mesGeneracion)) {
      return informe.mesGeneracion.includes(mes);
    } else {
      return informe.mesGeneracion === mes;
    }
  });
}

/**
 * Obtiene informes por periodicidad
 */
export function obtenerInformesPorPeriodicidad(periodicidad: PeriodicidadInforme): InformeLeyNormativo[] {
  return CATALOGO_INFORMES_LEY.filter(inf => inf.periodicidad === periodicidad && inf.activo);
}

/**
 * Obtiene informes por rol del Plan Anual
 */
export function obtenerInformesPorRol(rol: RolPlanAnual): InformeLeyNormativo[] {
  return CATALOGO_INFORMES_LEY.filter(inf => inf.vinculacionRol === rol && inf.activo);
}

/**
 * Calcula la próxima fecha de generación de un informe
 */
export function calcularProximaFechaGeneracion(informe: InformeLeyNormativo): Date {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1; // 1-12
  const añoActual = hoy.getFullYear();

  const mesesGeneracion = Array.isArray(informe.mesGeneracion)
    ? informe.mesGeneracion
    : [informe.mesGeneracion];

  // Buscar el próximo mes de generación
  let proximoMes = mesesGeneracion.find(m => m >= mesActual);
  let proximoAño = añoActual;

  if (!proximoMes) {
    // Si no hay mes futuro este año, tomar el primero del siguiente año
    proximoMes = mesesGeneracion[0];
    proximoAño = añoActual + 1;
  }

  // Último día del mes
  return new Date(proximoAño, proximoMes, 0);
}

/**
 * Obtiene estadísticas del catálogo
 */
export function obtenerEstadisticasCatalogo() {
  const total = CATALOGO_INFORMES_LEY.length;
  const activos = CATALOGO_INFORMES_LEY.filter(i => i.activo).length;
  
  const porPeriodicidad = {
    mensual: obtenerInformesPorPeriodicidad('mensual').length,
    bimestral: obtenerInformesPorPeriodicidad('bimestral').length,
    trimestral: obtenerInformesPorPeriodicidad('trimestral').length,
    cuatrimestral: obtenerInformesPorPeriodicidad('cuatrimestral').length,
    semestral: obtenerInformesPorPeriodicidad('semestral').length,
    anual: obtenerInformesPorPeriodicidad('anual').length
  };

  const conDatosAutomaticos = CATALOGO_INFORMES_LEY.filter(i => i.datosAutomaticos && i.activo).length;
  const requierenIntegracion = CATALOGO_INFORMES_LEY.filter(i => i.requiereIntegracionExterna && i.activo).length;

  return {
    total,
    activos,
    porPeriodicidad,
    conDatosAutomaticos,
    requierenIntegracion
  };
}

// ============ EXPORTAR ============

export default CATALOGO_INFORMES_LEY;

// ============ COMPONENTE REACT VISUAL ============

import { useState } from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Search, Filter, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Componente visual del Catálogo de Informes de Ley
 * Muestra la tabla completa de 16 informes normativos con filtros y búsqueda
 */
export function CatalogoInformesLey() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<PeriodicidadInforme | 'todos'>('todos');
  const [informeExpandido, setInformeExpandido] = useState<string | null>(null);

  const informesFiltrados = CATALOGO_INFORMES_LEY.filter(informe => {
    const matchBusqueda = 
      informe.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      informe.nombreCorto.toLowerCase().includes(busqueda.toLowerCase()) ||
      informe.baseNormativa.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchPeriodicidad = filtroPeriodicidad === 'todos' || informe.periodicidad === filtroPeriodicidad;
    
    return matchBusqueda && matchPeriodicidad && informe.activo;
  });

  const estadisticas = obtenerEstadisticasCatalogo();

  const getPeriodicidadColor = (periodicidad: PeriodicidadInforme) => {
    const colores: Record<PeriodicidadInforme, string> = {
      'mensual': '#EF4444',
      'bimestral': '#F59E0B',
      'trimestral': '#3B82F6',
      'cuatrimestral': '#8B5CF6',
      'semestral': '#10B981',
      'anual': '#6B7280'
    };
    return colores[periodicidad];
  };

  const getPeriodicidadLabel = (periodicidad: PeriodicidadInforme) => {
    const labels: Record<PeriodicidadInforme, string> = {
      'mensual': 'Mensual',
      'bimestral': 'Bimestral',
      'trimestral': 'Trimestral',
      'cuatrimestral': 'Cuatrimestral',
      'semestral': 'Semestral',
      'anual': 'Anual'
    };
    return labels[periodicidad];
  };

  return (
    <div className="space-y-6">
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border-2" style={{ borderColor: '#8B5CF6', background: '#F3E8FF' }}>
          <p className="text-xs font-bold text-gray-700">Total</p>
          <p className="text-2xl font-black" style={{ color: '#8B5CF6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-3 border-2" style={{ borderColor: '#EF4444', background: '#FEE2E2' }}>
          <p className="text-xs font-bold text-gray-700">Mensual</p>
          <p className="text-2xl font-black" style={{ color: '#EF4444' }}>{estadisticas.porPeriodicidad.mensual}</p>
        </Card>
        <Card className="p-3 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-xs font-bold text-gray-700">Bimestral</p>
          <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.porPeriodicidad.bimestral}</p>
        </Card>
        <Card className="p-3 border-2" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
          <p className="text-xs font-bold text-gray-700">Trimestral</p>
          <p className="text-2xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.porPeriodicidad.trimestral}</p>
        </Card>
        <Card className="p-3 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-xs font-bold text-gray-700">Semestral</p>
          <p className="text-2xl font-black" style={{ color: '#10B981' }}>{estadisticas.porPeriodicidad.semestral}</p>
        </Card>
        <Card className="p-3 border-2" style={{ borderColor: '#6B7280', background: '#F3F4F6' }}>
          <p className="text-xs font-bold text-gray-700">Anual</p>
          <p className="text-2xl font-black" style={{ color: '#6B7280' }}>{estadisticas.porPeriodicidad.anual}</p>
        </Card>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar informe
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, código o base normativa..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Periodicidad
            </label>
            <select
              value={filtroPeriodicidad}
              onChange={(e) => setFiltroPeriodicidad(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="todos">Todas las periodicidades</option>
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="cuatrimestral">Cuatrimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        </div>
      </Card>

      {/* LISTA DE INFORMES */}
      <div className="space-y-3">
        {informesFiltrados.map(informe => {
          const expandido = informeExpandido === informe.id;
          
          return (
            <Card 
              key={informe.id} 
              className="p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setInformeExpandido(expandido ? null : informe.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{informe.codigo}</Badge>
                    <Badge 
                      style={{ 
                        background: getPeriodicidadColor(informe.periodicidad), 
                        color: 'white' 
                      }}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {getPeriodicidadLabel(informe.periodicidad)}
                    </Badge>
                  </div>

                  <h4 className="font-black text-gray-900 mb-1">{informe.nombreCorto}</h4>
                  <p className="text-sm text-gray-600 mb-2">{informe.nombre}</p>

                  {expandido && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-bold text-gray-700">Base Normativa:</p>
                          <p className="text-gray-600">{informe.baseNormativa}</p>
                          {informe.articuloEspecifico && (
                            <p className="text-xs text-gray-500 mt-1">{informe.articuloEspecifico}</p>
                          )}
                        </div>

                        <div>
                          <p className="font-bold text-gray-700">Destinatarios:</p>
                          <p className="text-gray-600">{informe.destinatarios.join(', ')}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-700">Responsable:</p>
                          <p className="text-gray-600">{informe.responsableRol}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-700">Anticipación:</p>
                          <p className="text-gray-600">{informe.diasAnticipacion} días</p>
                        </div>
                      </div>

                      {informe.descripcion && (
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <p className="text-sm text-gray-700">{informe.descripcion}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Ver Plantilla
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm">
                  {expandido ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {informesFiltrados.length === 0 && (
        <Card className="p-12 text-center">
          <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron informes que coincidan con los filtros</p>
        </Card>
      )}
    </div>
  );
}