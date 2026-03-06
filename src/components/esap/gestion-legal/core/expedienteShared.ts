/**
 * expedienteShared.ts - Datos y helpers compartidos entre ModalExpediente y ModalProcesoDisciplinario
 * ✅ Categorías de documentos unificadas
 * ✅ Helpers de semáforo y progreso
 * ✅ Sugerencias de tipos de documento por categoría
 */

import {
  FolderOpen, BookOpen, Shield, Mail, Stamp, Eye, Share2, Bell, File
} from 'lucide-react';

// ==================== CATEGORÍAS DE DOCUMENTOS ====================

export const CATEGORIAS_DOCUMENTOS = [
  { id: 'todos', nombre: 'Todos', icono: FolderOpen, color: '#003DA5' },
  { id: 'actas', nombre: 'Actas', icono: BookOpen, color: '#7C3AED' },
  { id: 'evidencias', nombre: 'Evidencias', icono: Shield, color: '#059669' },
  { id: 'oficios', nombre: 'Oficios', icono: Mail, color: '#D97706' },
  { id: 'autos', nombre: 'Autos', icono: Stamp, color: '#DC2626' },
  { id: 'pruebas', nombre: 'Pruebas', icono: Eye, color: '#0891B2' },
  { id: 'comunicaciones', nombre: 'Comunicaciones', icono: Share2, color: '#4F46E5' },
  { id: 'notificaciones', nombre: 'Notificaciones', icono: Bell, color: '#EA580C' },
  { id: 'documentos', nombre: 'Documentos Generales', icono: File, color: '#6B7280' },
] as const;

export type CategoriaDocumentoId = typeof CATEGORIAS_DOCUMENTOS[number]['id'];

// ==================== SUGERENCIAS POR CATEGORÍA ====================

export const SUGERENCIAS_TIPO_DOCUMENTO: Record<string, string[]> = {
  actas: ['Acta de Audiencia', 'Acta de Conciliación', 'Acta de Comité', 'Acta de Notificación', 'Acta de Reparto'],
  evidencias: ['Evidencia Documental', 'Certificación', 'Contrato', 'Prueba Fotográfica', 'Declaración Testimonial'],
  oficios: ['Oficio de Solicitud', 'Oficio de Remisión', 'Oficio de Citación', 'Oficio de Respuesta', 'Oficio de Requerimiento'],
  autos: ['Auto Admisorio', 'Auto de Pruebas', 'Auto de Archivo', 'Auto Interlocutorio', 'Auto de Apertura'],
  pruebas: ['Prueba Documental', 'Prueba Pericial', 'Prueba Testimonial', 'Inspección Judicial'],
  comunicaciones: ['Comunicación Interna', 'Comunicación Externa', 'Memorando', 'Circular', 'Informe de Gestión'],
  notificaciones: ['Notificación Personal', 'Notificación por Estado', 'Citación a Audiencia', 'Edicto', 'Notificación por Aviso'],
  documentos: ['Demanda', 'Contestación', 'Memorial', 'Poder Especial', 'Alegatos', 'Concepto Jurídico', 'Resolución', 'Pliego de Cargos'],
};

// ==================== HELPERS ====================

export interface SemaforoInfo {
  color: string;
  label: string;
  bg: string;
}

export function getSemaforoColor(diasRestantes: number): SemaforoInfo {
  if (diasRestantes <= 5) return { color: '#DC2626', label: 'Crítico', bg: '#FEE2E2' };
  if (diasRestantes <= 15) return { color: '#F59E0B', label: 'Próximo', bg: '#FEF3C7' };
  return { color: '#10B981', label: 'En término', bg: '#D1FAE5' };
}

export function calcularProgreso(diasTotales: number, diasRestantes: number) {
  const porcentajeTiempoRaw = Math.round(((diasTotales - diasRestantes) / diasTotales) * 100);
  const porcentajeTiempo = Math.min(100, Math.max(0, porcentajeTiempoRaw));
  const procesoVencido = porcentajeTiempoRaw > 100;
  return { porcentajeTiempoRaw, porcentajeTiempo, procesoVencido };
}

export function formatCuantia(cuantia: number | undefined): string {
  if (!cuantia) return 'No determinada';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cuantia);
}

// ==================== INTERFACES COMPARTIDAS ====================

export interface DocumentoExpediente {
  id: number | string;
  nombre: string;
  fecha: string;
  tipo: string;
  tamaño: string;
  firmante?: string;
  categoria: string;
  url?: string;
}

export interface ActuacionExpediente {
  id: number | string;
  fecha: string;
  tipo: string;
  descripcion: string;
  responsable: string;
  estado: string;
  colorBorde?: string;
  hora?: string;
}

export interface TareaExpediente {
  id: number | string;
  titulo: string;
  descripcion: string;
  vencimiento: string;
  diasRestantes: number;
  prioridad: string;
  responsable: string;
  estado: string;
}

export interface NotaExpediente {
  id: number | string;
  fecha: string;
  autor: string;
  nota: string;
  tipo: string;
}

// ==================== PLANTILLAS DOCUMENTALES (BIBLIOTECA) ====================

export interface PlantillaDocumental {
  id: number;
  nombre: string;
  categoria: string;
  modulo: 'defensa-judicial' | 'juzgamiento' | 'ambos';
  formato: string;
  tamaño: string;
  version: string;
  fechaCreacion?: string;
  fechaActualizacion: string;
  autor: string;
  descripcion: string;
  descargas: number;
  activa: boolean;
}

/**
 * Plantillas compartidas desde la Biblioteca de Plantillas (Configuraciones SIGL)
 * ✅ 21 plantillas mock: 8 categorías × ambos módulos
 * ✅ Consumidas por TabDocumentosExpediente y BibliotecaPlantillas
 */
export const PLANTILLAS_BIBLIOTECA: PlantillaDocumental[] = [
  // Actas
  { id: 1, nombre: 'Acta de Audiencia de Conciliación', categoria: 'actas', modulo: 'defensa-judicial', formato: 'DOCX', tamaño: '245 KB', version: '2.1', fechaActualizacion: '15/02/2026', autor: 'Oficina Jurídica', descripcion: 'Plantilla oficial para actas de audiencia de conciliación prejudicial y judicial', descargas: 34, activa: true },
  { id: 2, nombre: 'Acta de Comité de Conciliación', categoria: 'actas', modulo: 'ambos', formato: 'DOCX', tamaño: '312 KB', version: '3.0', fechaActualizacion: '20/01/2026', autor: 'Secretaría General', descripcion: 'Formato estándar del comité de conciliación según Decreto 1716 de 2009', descargas: 56, activa: true },
  { id: 3, nombre: 'Acta de Descargos Disciplinarios', categoria: 'actas', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '189 KB', version: '1.5', fechaActualizacion: '05/02/2026', autor: 'Control Disciplinario', descripcion: 'Acta para audiencia de descargos en proceso disciplinario verbal', descargas: 28, activa: true },
  { id: 4, nombre: 'Acta de Notificación Personal', categoria: 'actas', modulo: 'ambos', formato: 'DOCX', tamaño: '156 KB', version: '2.0', fechaActualizacion: '10/01/2026', autor: 'Oficina Jurídica', descripcion: 'Constancia de notificación personal de decisiones judiciales y disciplinarias', descargas: 45, activa: true },
  // Oficios
  { id: 5, nombre: 'Oficio de Contestación de Demanda', categoria: 'oficios', modulo: 'defensa-judicial', formato: 'DOCX', tamaño: '378 KB', version: '4.2', fechaActualizacion: '18/02/2026', autor: 'Grupo Defensa Judicial', descripcion: 'Plantilla membretada para contestación de demandas con formato institucional completo', descargas: 89, activa: true },
  { id: 6, nombre: 'Oficio Remisorio a Juzgado', categoria: 'oficios', modulo: 'defensa-judicial', formato: 'DOCX', tamaño: '198 KB', version: '2.3', fechaActualizacion: '12/02/2026', autor: 'Oficina Jurídica', descripcion: 'Oficio de remisión de documentos y pruebas a despachos judiciales', descargas: 67, activa: true },
  { id: 7, nombre: 'Oficio de Citación Disciplinaria', categoria: 'oficios', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '167 KB', version: '1.8', fechaActualizacion: '08/02/2026', autor: 'Control Disciplinario', descripcion: 'Citación formal al disciplinado para audiencia o diligencia', descargas: 41, activa: true },
  { id: 8, nombre: 'Oficio de Requerimiento de Información', categoria: 'oficios', modulo: 'ambos', formato: 'DOCX', tamaño: '203 KB', version: '2.0', fechaActualizacion: '01/02/2026', autor: 'Oficina Jurídica', descripcion: 'Solicitud formal de información a dependencias internas y entidades externas', descargas: 53, activa: true },
  // Autos
  { id: 9, nombre: 'Auto de Apertura de Investigación', categoria: 'autos', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '289 KB', version: '3.1', fechaActualizacion: '15/02/2026', autor: 'Control Disciplinario', descripcion: 'Auto motivado de apertura de investigación disciplinaria según Ley 1952 de 2019', descargas: 38, activa: true },
  { id: 10, nombre: 'Auto de Decreto de Pruebas', categoria: 'autos', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '234 KB', version: '2.5', fechaActualizacion: '10/02/2026', autor: 'Control Disciplinario', descripcion: 'Auto para decretar y practicar pruebas en proceso disciplinario', descargas: 29, activa: true },
  { id: 11, nombre: 'Auto de Archivo', categoria: 'autos', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '198 KB', version: '2.0', fechaActualizacion: '05/02/2026', autor: 'Control Disciplinario', descripcion: 'Auto de archivo de actuación disciplinaria por causal legal', descargas: 22, activa: true },
  // Comunicaciones
  { id: 12, nombre: 'Comunicación Interna de Seguimiento', categoria: 'comunicaciones', modulo: 'ambos', formato: 'DOCX', tamaño: '145 KB', version: '1.3', fechaActualizacion: '19/02/2026', autor: 'Oficina Jurídica', descripcion: 'Formato de comunicación interna para seguimiento de procesos entre dependencias', descargas: 31, activa: true },
  { id: 13, nombre: 'Informe de Gestión Procesal', categoria: 'comunicaciones', modulo: 'defensa-judicial', formato: 'DOCX', tamaño: '412 KB', version: '2.8', fechaActualizacion: '15/02/2026', autor: 'Grupo Defensa Judicial', descripcion: 'Informe periódico del estado de los procesos judiciales activos', descargas: 47, activa: true },
  // Notificaciones
  { id: 14, nombre: 'Notificación por Aviso', categoria: 'notificaciones', modulo: 'ambos', formato: 'DOCX', tamaño: '178 KB', version: '1.5', fechaActualizacion: '12/02/2026', autor: 'Oficina Jurídica', descripcion: 'Formato de notificación por aviso cuando no es posible la notificación personal', descargas: 25, activa: true },
  { id: 15, nombre: 'Notificación por Edicto', categoria: 'notificaciones', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '210 KB', version: '2.0', fechaActualizacion: '08/02/2026', autor: 'Control Disciplinario', descripcion: 'Formato de notificación por edicto en proceso disciplinario', descargas: 19, activa: true },
  // Pruebas
  { id: 16, nombre: 'Formato de Cadena de Custodia', categoria: 'pruebas', modulo: 'ambos', formato: 'DOCX', tamaño: '267 KB', version: '1.2', fechaActualizacion: '19/02/2026', autor: 'Oficina Jurídica', descripcion: 'Formato para documentar la cadena de custodia de evidencia documental y digital', descargas: 15, activa: true },
  { id: 17, nombre: 'Solicitud de Práctica de Pruebas', categoria: 'pruebas', modulo: 'defensa-judicial', formato: 'DOCX', tamaño: '223 KB', version: '2.1', fechaActualizacion: '14/02/2026', autor: 'Grupo Defensa Judicial', descripcion: 'Memorial de solicitud de práctica de pruebas ante despacho judicial', descargas: 36, activa: true },
  // Evidencias
  { id: 18, nombre: 'Inventario de Evidencia Documental', categoria: 'evidencias', modulo: 'ambos', formato: 'XLSX', tamaño: '156 KB', version: '1.0', fechaActualizacion: '19/02/2026', autor: 'Oficina Jurídica', descripcion: 'Formato de inventario y control de evidencia documental incorporada al expediente', descargas: 21, activa: true },
  // Documentos Generales
  { id: 19, nombre: 'Poder Especial para Actuar', categoria: 'documentos', modulo: 'defensa-judicial', formato: 'DOCX', tamaño: '189 KB', version: '3.0', fechaActualizacion: '10/02/2026', autor: 'Oficina Jurídica', descripcion: 'Poder especial para representación judicial de la ESAP ante despachos judiciales', descargas: 72, activa: true },
  { id: 20, nombre: 'Pliego de Cargos', categoria: 'documentos', modulo: 'juzgamiento', formato: 'DOCX', tamaño: '345 KB', version: '2.5', fechaActualizacion: '18/02/2026', autor: 'Control Disciplinario', descripcion: 'Formato de formulación de cargos disciplinarios según Ley 1952 de 2019', descargas: 33, activa: true },
  { id: 21, nombre: 'Concepto Jurídico', categoria: 'documentos', modulo: 'ambos', formato: 'DOCX', tamaño: '267 KB', version: '2.0', fechaActualizacion: '15/02/2026', autor: 'Oficina Jurídica', descripcion: 'Formato para emisión de conceptos jurídicos sobre consultas institucionales', descargas: 44, activa: true },
];
