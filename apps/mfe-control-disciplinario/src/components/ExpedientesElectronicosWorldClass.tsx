/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  EXPEDIENTE ELECTRÓNICO - CONTROL INTERNO DISCIPLINARIO     ║
 * ║  🎯 Vista Principal: Cronológica | Vista Auxiliar: Carpetas ║
 * ║  📋 HOJA DE CONTROL: Índice Electrónico con 10 campos      ║
 * ║  🖥️  DISEÑO WORLD-CLASS: Desktop-First 1366px-1920px       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Search, Download, Upload, ChevronRight, ChevronDown, FileText,
  Eye, EyeOff, Calendar, User, AlertCircle, Trash2,
  FileCheck, FileWarning, Scale, Gavel, AlertTriangle, Shield,
  MessageSquare, Bell, X, Clock, Folders,
  ArrowUp, ArrowDown, History, Info,
  Paperclip, Send, FileSpreadsheet, List, Printer, Share2, Loader2, Play, ExternalLink,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ModalCompartirExpediente } from './ModalCompartirExpediente';
import { ModalSubirDocumento } from './ModalSubirDocumento';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { buildApiUrl, API_MODE } from '../../../config/environment';
import { toast } from 'sonner';
import * as mammoth from 'mammoth';
import { authService } from '../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

// ============ INTERFACES ============

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  icon: typeof FileText;
  color: string;
  colorBg: string;
}

/**
 * ✅ ESTRUCTURA COMPLETA DE DOCUMENTO - HOJA DE CONTROL (10 CAMPOS)
 * Basado en estándar de archivo electrónico para procesos disciplinarios
 */
interface Documento {
  id: string;
  // 1. DESCRIPCIÓN DEL DOCUMENTO PRINCIPAL
  descripcionPrincipal: string;
  // 2. TIPOLOGÍA DOCUMENTAL
  tipologiaDocumental: string;
  // 3. ANEXOS DEL DOCUMENTO PRINCIPAL
  anexos: string;
  // 4. FECHA DE CREACIÓN DEL DOCUMENTO
  fechaCreacion: string; // Formato: YYYYMMDD
  // 5. FECHA DE INCORPORACIÓN AL EXPEDIENTE
  fechaIncorporacion: string; // Formato: YYYYMMDD
  // 6. IMAGEN / PÁGINA DE INICIO
  paginaInicio: number;
  // 7. IMAGEN / PÁGINA FINAL
  paginaFinal: number;
  // 8. FORMATO
  formato: string; // PDF, DOCX, JPG, etc.
  // 9. TAMAÑO EN KILOBYTES
  tamanoKB: string;
  // 10. ACCESO (nombre del archivo)
  archivoAcceso: string;
  
// Campos adicionales para la aplicación
   tipo: string; // ID del tipo de documento
   tipoNombre: string;
   fechaSubida: string; // ISO format para ordenamiento
   subidoPor: string;
   expedienteId: string;
   radicado: string;
   downloadUrl?: string; // URL de descarga directa (para documentos de noticia)
   processId?: string; // ID del proceso (opcional, puede ser null para documentos de noticia)
   fileType?: string;
   fileSize?: number;
   versiones?: any[];
   metadatos?: any;
 }

interface ExpedienteElectronico {
  id: string;
  radicado: string;
  estado: 'valoracion' | 'indagacion' | 'investigacion' | 'juzgamiento' | 'finalizado';
  nombreDisciplinado: string;
  tipoProceso: string;
  responsable: string;
  fechaInicio: string;
  totalDocumentos: number;
  documentosPorTipo: Record<string, number>;
}

// ============ DATOS DE EJEMPLO ============

const TIPOS_DOCUMENTO: TipoDocumento[] = [
  { id: 'queja', nombre: 'Quejas y Denuncias', descripcion: 'Denuncias presentadas contra funcionarios', icon: FileWarning, color: '#EF4444', colorBg: '#FEE2E2' },
  { id: 'apertura', nombre: 'Auto de Apertura', descripcion: 'Autos de apertura de procesos disciplinarios', icon: FileCheck, color: '#3B82F6', colorBg: '#DBEAFE' },
  { id: 'pruebas', nombre: 'Pruebas y Testimonios', descripcion: 'Documentos probatorios, evidencias, anexos', icon: Paperclip, color: '#10B981', colorBg: '#D1FAE5' },
  { id: 'informes', nombre: 'Informes de Investigación', descripcion: 'Informes técnicos y de investigación', icon: FileText, color: '#8B5CF6', colorBg: '#EDE9FE' },
  { id: 'pliego', nombre: 'Pliego de Cargos', descripcion: 'Pliegos de cargos formulados', icon: Scale, color: '#F59E0B', colorBg: '#FEF3C7' },
  { id: 'descargos', nombre: 'Descargos', descripcion: 'Contestaciones y respuestas al pliego', icon: MessageSquare, color: '#06B6D4', colorBg: '#CFFAFE' },
  { id: 'fallos', nombre: 'Fallos y Decisiones', descripcion: 'Sentencias, fallos, providencias judiciales', icon: Gavel, color: '#EC4899', colorBg: '#FCE7F3' },
  { id: 'recursos', nombre: 'Recursos', descripcion: 'Recursos de apelación, reposición, súplica', icon: AlertTriangle, color: '#F97316', colorBg: '#FFEDD5' },
  { id: 'notificaciones', nombre: 'Notificaciones', descripcion: 'Oficios, notificaciones, comunicaciones', icon: Bell, color: '#64748B', colorBg: '#F1F5F9' },
  { id: 'oficios', nombre: 'Oficios', descripcion: 'Oficios internos y externos', icon: Send, color: '#0891B2', colorBg: '#CFFAFE' }
];

const EXPEDIENTES_EJEMPLO: ExpedienteElectronico[] = [
  {
    id: 'exp-001',
    radicado: 'CD-2025-001',
    estado: 'investigacion',
    nombreDisciplinado: 'Carlos Ramírez Gómez',
    tipoProceso: 'Presunta Irregularidad Administrativa',
    responsable: 'Dra. María González Pérez',
    fechaInicio: '2024-10-15',
    totalDocumentos: 15,
    documentosPorTipo: { queja: 1, apertura: 1, pruebas: 8, informes: 2, pliego: 1, descargos: 1, fallos: 0, recursos: 0, notificaciones: 1, oficios: 0 }
  },
  {
    id: 'exp-002',
    radicado: 'CD-2025-002',
    estado: 'indagacion',
    nombreDisciplinado: 'Ana Lucía Torres Díaz',
    tipoProceso: 'Presunto Incumplimiento de Deberes',
    responsable: 'Dr. Juan Pérez López',
    fechaInicio: '2024-11-20',
    totalDocumentos: 6,
    documentosPorTipo: { queja: 1, apertura: 1, pruebas: 3, informes: 1, pliego: 0, descargos: 0, fallos: 0, recursos: 0, notificaciones: 0, oficios: 0 }
  },
  {
    id: 'exp-003',
    radicado: 'CD-2024-087',
    estado: 'finalizado',
    nombreDisciplinado: 'Roberto Méndez Suárez',
    tipoProceso: 'Presunto Abuso de Autoridad',
    responsable: 'Dra. Patricia Rodríguez',
    fechaInicio: '2024-03-10',
    totalDocumentos: 22,
    documentosPorTipo: { queja: 1, apertura: 1, pruebas: 12, informes: 3, pliego: 1, descargos: 1, fallos: 1, recursos: 1, notificaciones: 1, oficios: 1 }
  },
  {
    id: 'exp-004',
    radicado: 'CD-2025-003',
    estado: 'valoracion',
    nombreDisciplinado: 'Sandra Jiménez Castro',
    tipoProceso: 'Presunta Negligencia',
    responsable: 'Dr. Miguel Ángel Sánchez',
    fechaInicio: '2025-01-08',
    totalDocumentos: 3,
    documentosPorTipo: { queja: 1, apertura: 0, pruebas: 2, informes: 0, pliego: 0, descargos: 0, fallos: 0, recursos: 0, notificaciones: 0, oficios: 0 }
  }
];

/**
 * ✅ DOCUMENTOS CON HOJA DE CONTROL COMPLETA (10 CAMPOS)
 */
const DOCUMENTOS_CRONOLOGICOS: Documento[] = [
  {
    id: 'doc-001',
    descripcionPrincipal: 'AUTO No. 178 del 15/01/2025, por el cual se ordena la apertura de investigación disciplinaria contra el funcionario Carlos Ramírez Gómez',
    tipologiaDocumental: 'Auto de Apertura',
    anexos: 'PDF',
    fechaCreacion: '20250115',
    fechaIncorporacion: '20250115',
    paginaInicio: 1,
    paginaFinal: 5,
    formato: 'PDF',
    tamanoKB: '245 KB',
    archivoAcceso: '20250115_AutAbrInv001.pdf',
    tipo: 'apertura',
    tipoNombre: 'Auto de Apertura',
    fechaSubida: '2025-01-15T09:30:00',
    subidoPor: 'Dra. María González',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-002',
    descripcionPrincipal: 'QUEJA CIUDADANA radicada el 14/01/2025, presentada por Pedro Sánchez Ruiz, denunciando presuntas irregularidades administrativas',
    tipologiaDocumental: 'Queja',
    anexos: 'PDF con anexos fotográficos',
    fechaCreacion: '20250114',
    fechaIncorporacion: '20250114',
    paginaInicio: 1,
    paginaFinal: 8,
    formato: 'PDF',
    tamanoKB: '1245 KB',
    archivoAcceso: '20250114_QuejaCiu001.pdf',
    tipo: 'queja',
    tipoNombre: 'Quejas y Denuncias',
    fechaSubida: '2025-01-14T14:20:00',
    subidoPor: 'Sistema Web',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-003',
    descripcionPrincipal: 'PRUEBA DOCUMENTAL - Intercambio de correos electrónicos del periodo 01/11/2024 al 30/11/2024',
    tipologiaDocumental: 'Pruebas y Testimonios',
    anexos: 'PDF',
    fechaCreacion: '20250116',
    fechaIncorporacion: '20250116',
    paginaInicio: 1,
    paginaFinal: 15,
    formato: 'PDF',
    tamanoKB: '567 KB',
    archivoAcceso: '20250116_PrueCorreos.pdf',
    tipo: 'pruebas',
    tipoNombre: 'Pruebas y Testimonios',
    fechaSubida: '2025-01-16T11:45:00',
    subidoPor: 'Dr. Juan Pérez',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-004',
    descripcionPrincipal: 'TESTIMONIO rendido por María López Díaz (Testigo 1) el día 17/01/2025 ante el Despacho de Control Interno Disciplinario',
    tipologiaDocumental: 'Pruebas y Testimonios',
    anexos: 'PDF',
    fechaCreacion: '20250117',
    fechaIncorporacion: '20250117',
    paginaInicio: 1,
    paginaFinal: 12,
    formato: 'PDF',
    tamanoKB: '890 KB',
    archivoAcceso: '20250117_TestTes1.pdf',
    tipo: 'pruebas',
    tipoNombre: 'Pruebas y Testimonios',
    fechaSubida: '2025-01-17T08:15:00',
    subidoPor: 'Dra. María González',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-005',
    descripcionPrincipal: 'INFORME PRELIMINAR de investigación disciplinaria, donde se analizan las conductas presuntamente irregulares',
    tipologiaDocumental: 'Informes de Investigación',
    anexos: 'PDF con anexos técnicos',
    fechaCreacion: '20250118',
    fechaIncorporacion: '20250118',
    paginaInicio: 1,
    paginaFinal: 28,
    formato: 'PDF',
    tamanoKB: '2150 KB',
    archivoAcceso: '20250118_InfPrelim.pdf',
    tipo: 'informes',
    tipoNombre: 'Informes de Investigación',
    fechaSubida: '2025-01-18T16:30:00',
    subidoPor: 'Dra. María González',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-006',
    descripcionPrincipal: 'PLIEGO DE CARGOS formulado contra Carlos Ramírez Gómez por presunta violación al régimen disciplinario',
    tipologiaDocumental: 'Pliego de Cargos',
    anexos: 'PDF',
    fechaCreacion: '20250120',
    fechaIncorporacion: '20250120',
    paginaInicio: 1,
    paginaFinal: 22,
    formato: 'PDF',
    tamanoKB: '1845 KB',
    archivoAcceso: '20250120_PliegCarg.pdf',
    tipo: 'pliego',
    tipoNombre: 'Pliego de Cargos',
    fechaSubida: '2025-01-20T10:00:00',
    subidoPor: 'Dra. María González',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-007',
    descripcionPrincipal: 'NOTIFICACIÓN PERSONAL del Pliego de Cargos realizada el 21/01/2025 al investigado',
    tipologiaDocumental: 'Notificaciones',
    anexos: 'PDF con constancia de recibido',
    fechaCreacion: '20250121',
    fechaIncorporacion: '20250121',
    paginaInicio: 1,
    paginaFinal: 3,
    formato: 'PDF',
    tamanoKB: '156 KB',
    archivoAcceso: '20250121_NotifPlieg.pdf',
    tipo: 'notificaciones',
    tipoNombre: 'Notificaciones',
    fechaSubida: '2025-01-21T09:00:00',
    subidoPor: 'Sistema',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-008',
    descripcionPrincipal: 'ESCRITO DE DESCARGOS presentado por Carlos Ramírez Gómez el 25/01/2025, en el cual controvierte los cargos formulados',
    tipologiaDocumental: 'Descargos',
    anexos: 'PDF con pruebas documentales',
    fechaCreacion: '20250125',
    fechaIncorporacion: '20250125',
    paginaInicio: 1,
    paginaFinal: 35,
    formato: 'PDF',
    tamanoKB: '3280 KB',
    archivoAcceso: '20250125_Descargos.pdf',
    tipo: 'descargos',
    tipoNombre: 'Descargos',
    fechaSubida: '2025-01-25T15:45:00',
    subidoPor: 'Carlos Ramírez',
    expedienteId: 'exp-001',
    radicado: 'CD-2025-001'
  },
  {
    id: 'doc-009',
    descripcionPrincipal: 'QUEJA INTERNA presentada por el Jefe Inmediato el 10/01/2025 por presunto incumplimiento de deberes',
    tipologiaDocumental: 'Queja',
    anexos: 'PDF',
    fechaCreacion: '20250110',
    fechaIncorporacion: '20250110',
    paginaInicio: 1,
    paginaFinal: 6,
    formato: 'PDF',
    tamanoKB: '678 KB',
    archivoAcceso: '20250110_QuejaInt002.pdf',
    tipo: 'queja',
    tipoNombre: 'Quejas y Denuncias',
    fechaSubida: '2025-01-10T10:30:00',
    subidoPor: 'Jefe Directo',
    expedienteId: 'exp-002',
    radicado: 'CD-2025-002'
  },
  {
    id: 'doc-010',
    descripcionPrincipal: 'AUTO No. 185 del 12/01/2025, por el cual se ordena la apertura de indagación preliminar',
    tipologiaDocumental: 'Auto de Apertura',
    anexos: 'PDF',
    fechaCreacion: '20250112',
    fechaIncorporacion: '20250112',
    paginaInicio: 1,
    paginaFinal: 4,
    formato: 'PDF',
    tamanoKB: '234 KB',
    archivoAcceso: '20250112_AutAbrInd002.pdf',
    tipo: 'apertura',
    tipoNombre: 'Auto de Apertura',
    fechaSubida: '2025-01-12T11:00:00',
    subidoPor: 'Dr. Juan Pérez',
    expedienteId: 'exp-002',
    radicado: 'CD-2025-002'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ExpedientesElectronicosWorldClass() {
  const hasAccess = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPIDENTE_ELECTRONICO_MANAGE);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl shadow-sm border m-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600 max-w-md">
          No tiene los permisos necesarios para acceder al módulo de expedientes electrónicos.
          Por favor, contacte al administrador del sistema si cree que esto es un error.
        </p>
      </div>
    );
  }

  // ✅ Estados para datos del backend
  const [expedientes, setExpedientes] = useState<ExpedienteElectronico[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [showModalSubirDocumento, setShowModalSubirDocumento] = useState(false);
  const [showModalHojaControl, setShowModalHojaControl] = useState(false);
  const [documentoHojaControl, setDocumentoHojaControl] = useState<Documento | null>(null);
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState<string>('');
  // const [vistaActual, setVistaActual] = useState<'cronologica' | 'carpetas'>('cronologica');
  const [vistaActual, setVistaActual] = useState<'cronologica'>('cronologica');
  const [ordenCronologico, setOrdenCronologico] = useState<'desc' | 'asc'>('desc');
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<string>('todos');
  const [expedientesExpandidos, setExpedientesExpandidos] = useState<Set<string>>(new Set());
  
  // ✅ NUEVO: Estado para modal de compartir expediente
  const [showModalCompartir, setShowModalCompartir] = useState(false);
  const [expedienteParaCompartir, setExpedienteParaCompartir] = useState<ExpedienteElectronico | null>(null);

  // ✅ NUEVO: Estado para modal de visor de documentos
  const [showModalVisor, setShowModalVisor] = useState(false);
  const [documentoParaVer, setDocumentoParaVer] = useState<Documento | null>(null);
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null);
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [esDocumentoConvertido, setEsDocumentoConvertido] = useState(false);
  const [documentoParaEliminar, setDocumentoParaEliminar] = useState<Documento | null>(null);
  const [eliminandoDocumento, setEliminandoDocumento] = useState(false);

  // ✅ Función para cargar datos del backend
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener todos los procesos del backend
      const procesosBackend = await disciplinaryService.getAllProcesos();
      
      // Transformar datos del backend al formato del componente
      const procesosTransformados: ExpedienteElectronico[] = procesosBackend.map((proceso: any) => {
        // Mapear etapas del backend a estados del componente
        const estadoMap: Record<string, ExpedienteElectronico['estado']> = {
          'VALORACION': 'valoracion',
          'INDAGACION_PREVIA': 'indagacion',
          'INDAGACION': 'indagacion',
          'INVESTIGACION': 'investigacion',
          'EVALUACION': 'investigacion',
          'JUZGAMIENTO': 'juzgamiento',
          'FALLO': 'finalizado',
          'SEGUNDA_INSTANCIA': 'finalizado'
        };
        
        return {
          id: proceso.id,
          radicado: proceso.radicadoProceso,
          estado: estadoMap[proceso.etapaActual] || 'valoracion',
          nombreDisciplinado: proceso.news?.disciplinable?.nombre || 'Sin nombre',
          tipoProceso: proceso.news?.hechos?.substring(0, 50) || 'Proceso Disciplinario',
          responsable: proceso.abogadoAsignado?.nombre || proceso.abogadoAsignadoNombre || 'Sin asignar',
          fechaInicio: proceso.createdAt ? new Date(proceso.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          totalDocumentos: 0, // Se actualizará al cargar documentos
          documentosPorTipo: {}
        };
      });
      
      setExpedientes(procesosTransformados);
      
      // Cargar documentos para cada proceso
      const todosDocumentos: Documento[] = [];
      for (const proceso of procesosBackend.slice(0, 10)) { // Limitar a 10 procesos para evitar muchas llamadas
        try {
          const docsResponse = await disciplinaryService.getDocumentosExpediente(proceso.id);
          if (docsResponse?.documentos) {
            const documentosFiltrados = docsResponse.documentos.filter((doc: any) => {
              const estadoAuto = doc.metadatos?.estado;
              if (!estadoAuto) return true; // No es un auto digital, mostrar siempre
              return ['APROBADO', 'FIRMADO', 'NOTIFICADO'].includes(estadoAuto);
            });
            documentosFiltrados.forEach((doc: any) => {
              // Mapear tipo de documento del backend
              const tipoMap: Record<string, string> = {
                'auto': 'apertura',
                'evidencia': 'pruebas',
                'oficio': 'oficios',
                'notificacion': 'notificaciones',
                'acta': 'informes',
                'otro': 'informes'
              };
              
todosDocumentos.push({
                 id: doc.id,
                 descripcionPrincipal: doc.nombre || doc.descripcion || 'Documento sin descripción',
                 tipologiaDocumental: doc.tipo || 'Documento',
                 anexos: doc.fileType || 'PDF',
                 fechaCreacion: doc.fechaCarga ? new Date(doc.fechaCarga).toISOString().replace(/[-:]/g, '').split('T')[0] : new Date().toISOString().replace(/[-:]/g, '').split('T')[0],
                 fechaIncorporacion: doc.fechaCarga ? new Date(doc.fechaCarga).toISOString().replace(/[-:]/g, '').split('T')[0] : new Date().toISOString().replace(/[-:]/g, '').split('T')[0],
                 paginaInicio: 1,
                 paginaFinal: doc.tamaño ? Math.ceil(parseInt(doc.tamaño.replace(/[^0-9]/g, '')) / 50) : 1,
                 formato: doc.fileType?.split('/')[1]?.toUpperCase() || 'PDF',
                 tamanoKB: doc.tamaño || '0 KB',
                 archivoAcceso: doc.archivoNombre || doc.nombre || 'documento.pdf',
                 tipo: tipoMap[doc.tipo] || 'informes',
                 tipoNombre: doc.tipo || 'Documento',
                 fechaSubida: doc.fechaCarga || new Date().toISOString(),
                 subidoPor: doc.usuarioCarga || 'Sistema',
                 expedienteId: proceso.id,
                 radicado: proceso.radicadoProceso,
                 downloadUrl: doc.downloadUrl, // Para documentos de noticia
                 processId: doc.processId,
                 fileType: doc.fileType,
                 fileSize: doc.fileSize,
                 versiones: doc.versiones,
                 metadatos: doc.metadatos
               });
            });
          }
        } catch (docError) {
          console.warn(`Error cargando documentos del proceso ${proceso.id}:`, docError);
        }
      }
      
      setDocumentos(todosDocumentos);
      
      // Actualizar total de documentos por proceso y documentos por tipo
      const docsPorProceso = new Map<string, number>();
      const docsPorTipoPorProceso = new Map<string, Record<string, number>>();
      
      todosDocumentos.forEach(doc => {
        // Contar total por proceso
        docsPorProceso.set(doc.expedienteId, (docsPorProceso.get(doc.expedienteId) || 0) + 1);
        
        // Contar por tipo
        if (!docsPorTipoPorProceso.has(doc.expedienteId)) {
          docsPorTipoPorProceso.set(doc.expedienteId, {});
        }
        const tipos = docsPorTipoPorProceso.get(doc.expedienteId)!;
        tipos[doc.tipo] = (tipos[doc.tipo] || 0) + 1;
      });
      
      setExpedientes(prev => prev.map(exp => ({
        ...exp,
        totalDocumentos: docsPorProceso.get(exp.id) || 0,
        documentosPorTipo: docsPorTipoPorProceso.get(exp.id) || {}
      })));
      
    } catch (err: any) {
      console.error('Error cargando datos del backend:', err);
      setError(err.message || 'Error al cargar los datos del servidor');
      toast.error('Error al cargar los expedientes electrónicos');
      // Usar datos de ejemplo como fallback
      setExpedientes(EXPEDIENTES_EJEMPLO);
      setDocumentos(DOCUMENTOS_CRONOLOGICOS);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Toggle expandir/colapsar expediente
  const toggleExpediente = (expedienteId: string) => {
    setExpedientesExpandidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expedienteId)) {
        newSet.delete(expedienteId);
      } else {
        newSet.add(expedienteId);
      }
      return newSet;
    });
  };

  // Expandir todos los expedientes
  const expandirTodos = () => {
    const todosLosIds = expedientes.map(e => e.id);
    setExpedientesExpandidos(new Set(todosLosIds));
  };

  // Colapsar todos los expedientes
  const colapsarTodos = () => {
    setExpedientesExpandidos(new Set());
  };

  const expedientesFiltrados = expedientes.filter(exp => {
    const cumpleFiltro = filtroEstado === 'todos' || exp.estado === filtroEstado;
    const cumpleBusqueda = busqueda === '' || 
      exp.radicado.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.nombreDisciplinado.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  // ✅ Agrupar documentos por expediente/proceso
  const documentosPorExpediente = React.useMemo(() => {
    // Filtrar documentos
    const docsFiltrados = documentos.filter(doc => {
      const cumpleBusqueda = busqueda === '' || 
        doc.descripcionPrincipal.toLowerCase().includes(busqueda.toLowerCase()) ||
        doc.radicado.toLowerCase().includes(busqueda.toLowerCase()) ||
        doc.tipoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        doc.archivoAcceso.toLowerCase().includes(busqueda.toLowerCase());
      const cumpleTipoDoc = filtroTipoDoc === 'todos' || doc.tipo === filtroTipoDoc;
      const expediente = expedientes.find(e => e.id === doc.expedienteId);
      const cumpleFiltroExpediente = filtroEstado === 'todos' || expediente?.estado === filtroEstado;
      return cumpleBusqueda && cumpleTipoDoc && cumpleFiltroExpediente;
    });

    // Agrupar por expediente
    const grupos: Record<string, Documento[]> = {};
    docsFiltrados.forEach(doc => {
      if (!grupos[doc.expedienteId]) {
        grupos[doc.expedienteId] = [];
      }
      grupos[doc.expedienteId].push(doc);
    });

    // Ordenar documentos dentro de cada expediente cronológicamente
    Object.keys(grupos).forEach(expId => {
      grupos[expId].sort((a, b) => {
        const fechaA = new Date(a.fechaSubida).getTime();
        const fechaB = new Date(b.fechaSubida).getTime();
        return ordenCronologico === 'desc' ? fechaB - fechaA : fechaA - fechaB;
      });
    });

    // Ordenar los expedientes por la fecha del documento más reciente/antiguo
    const expedientesOrdenados = Object.keys(grupos).sort((expIdA, expIdB) => {
      const docsA = grupos[expIdA];
      const docsB = grupos[expIdB];
      if (docsA.length === 0 || docsB.length === 0) return 0;
      
      const fechaA = new Date(docsA[0].fechaSubida).getTime();
      const fechaB = new Date(docsB[0].fechaSubida).getTime();
      return ordenCronologico === 'desc' ? fechaB - fechaA : fechaA - fechaB;
    });

    return expedientesOrdenados.map(expId => ({
      expedienteId: expId,
      expediente: expedientes.find(e => e.id === expId)!,
      documentos: grupos[expId]
    }));
  }, [documentos, busqueda, filtroTipoDoc, filtroEstado, ordenCronologico, expedientes]);

  const getEstadoConfig = (estado: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      valoracion: { label: 'Valoración', color: '#3B82F6', bg: '#DBEAFE' },
      indagacion: { label: 'Indagación', color: '#F59E0B', bg: '#FEF3C7' },
      investigacion: { label: 'En Proceso', color: '#10B981', bg: '#D1FAE5' },
      juzgamiento: { label: 'Juzgamiento', color: '#EC4899', bg: '#FCE7F3' },
      finalizado: { label: 'Finalizado', color: '#64748B', bg: '#F1F5F9' }
    };
    return configs[estado] || { label: 'Desconocido', color: '#9CA3AF', bg: '#F3F4F6' };
  };

  const getTipoDocumentoConfig = (tipoId: string) => TIPOS_DOCUMENTO.find(t => t.id === tipoId) || TIPOS_DOCUMENTO[0];

  const formatearFechaHora = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return {
      fecha: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      hora: fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatearFechaHojaControl = (fechaYYYYMMDD: string) => {
    if (!fechaYYYYMMDD || fechaYYYYMMDD.length !== 8) return fechaYYYYMMDD;
    const year = fechaYYYYMMDD.substring(0, 4);
    const month = fechaYYYYMMDD.substring(4, 6);
    const day = fechaYYYYMMDD.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  const handleSubirDocumento = (tipoId: string) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_FILES_UPLOAD)) {
      toast.error('No tiene permisos para subir documentos');
      return;
    }
    setTipoDocumentoSeleccionado(tipoId);
    setShowModalSubirDocumento(true);
  };

  // ✅ Handler para confirmar documentos cargados desde el ModalSubirDocumento
  const handleConfirmarDocumentos = (documentos: any[]) => {
    console.log('Documentos cargados:', documentos);
    // Aquí iría la lógica para agregar los documentos al expediente
    // Por ahora solo mostramos el toast de confirmación
    setShowModalSubirDocumento(false);
  };

  const handleVerHojaControl = (doc: Documento) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPEDIENTE_ELECTRONICO_VIEW_HOJA_CONTROL)) {
      toast.error('No tiene permisos para ver la hoja de control');
      return;
    }
    setDocumentoHojaControl(doc);
    setShowModalHojaControl(true);
  };

  /**
   * ✅ GENERAR PDF DE HOJA DE CONTROL CON DISEÑO CORPORATIVO ESAP
   */
  const generarPDFHojaControl = (doc: Documento) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPEDIENTE_ELECTRONICO_DOWNLOAD_HOJA_CONTROL)) {
      toast.error('No tiene permisos para descargar la hoja de control');
      return;
    }
    const pdf = new jsPDF();
    const expediente = expedientes.find(e => e.id === doc.expedienteId);
    
    // Colores corporativos ESAP
    const azulESAP = [0, 61, 165]; // #003DA5
    const azulClaro = [41, 98, 255]; // #2962FF
    const gris = [107, 114, 128];
    
    // ✅ ENCABEZADO CORPORATIVO
    pdf.setFillColor(...azulESAP);
    pdf.rect(0, 0, 210, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 105, 12, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.text('Control Interno Disciplinario', 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('HOJA DE CONTROL - ÍNDICE ELECTRÓNICO', 105, 28, { align: 'center' });
    
    // ✅ INFORMACIÓN DEL EXPEDIENTE
    let y = 45;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Expediente: ${doc.radicado}`, 20, y);
    if (expediente) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(`NED: ${expediente.nombreDisciplinado}`, 20, y + 6);
      pdf.text(`Tipo de Proceso: ${expediente.tipoProceso}`, 20, y + 12);
    }
    
    y += 25;
    
    // ✅ LÍNEA SEPARADORA
    pdf.setDrawColor(...azulClaro);
    pdf.setLineWidth(0.5);
    pdf.line(20, y, 190, y);
    
    y += 10;
    
    // ✅ CAMPOS DE LA HOJA DE CONTROL (10 CAMPOS)
    const campos = [
      { num: 1, label: 'DESCRIPCIÓN DEL DOCUMENTO PRINCIPAL', value: doc.descripcionPrincipal },
      { num: 2, label: 'TIPOLOGÍA DOCUMENTAL', value: doc.tipologiaDocumental },
      { num: 3, label: 'ANEXOS DEL DOCUMENTO PRINCIPAL', value: doc.anexos },
      { num: 4, label: 'FECHA DE CREACIÓN DEL DOCUMENTO', value: formatearFechaHojaControl(doc.fechaCreacion) },
      { num: 5, label: 'FECHA DE INCORPORACIÓN AL EXPEDIENTE', value: formatearFechaHojaControl(doc.fechaIncorporacion) },
      { num: 6, label: 'IMAGEN / PÁGINA DE INICIO', value: doc.paginaInicio.toString() },
      { num: 7, label: 'IMAGEN / PÁGINA FINAL', value: doc.paginaFinal.toString() },
      { num: 8, label: 'FORMATO', value: doc.formato },
      { num: 9, label: 'TAMAÑO EN KILOBYTES', value: doc.tamanoKB },
      { num: 10, label: 'ACCESO', value: doc.archivoAcceso }
    ];
    
    campos.forEach((campo, index) => {
      // Encabezado del campo
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, y, 170, 8, 'F');
      
      pdf.setTextColor(...azulESAP);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${campo.num}. ${campo.label}:`, 22, y + 5);
      
      // Valor del campo
      y += 10;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      
      // Manejo de texto largo
      const maxWidth = 170;
      const lines = pdf.splitTextToSize(campo.value, maxWidth);
      lines.forEach((line: string, lineIndex: number) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 22, y + (lineIndex * 5));
      });
      
      y += (lines.length * 5) + 5;
      
      // Línea separadora
      if (index < campos.length - 1) {
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(20, y, 190, y);
        y += 5;
      }
    });
    
    // ✅ PIE DE PÁGINA
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(...gris);
      pdf.setFont('helvetica', 'normal');
      
      const footerY = 285;
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, 20, footerY);
      pdf.text(`Página ${i} de ${totalPages}`, 190, footerY, { align: 'right' });
      
      pdf.setDrawColor(...gris);
      pdf.setLineWidth(0.3);
      pdf.line(20, footerY - 3, 190, footerY - 3);
    }
    
    // ✅ DESCARGAR PDF
    const nombreArchivo = `HojaControl_${doc.radicado}_${doc.archivoAcceso.replace('.pdf', '')}.pdf`;
    pdf.save(nombreArchivo);
  };

  /**
   * ✅ EXPORTAR ÍNDICE COMPLETO DEL EXPEDIENTE
   */
  const exportarIndiceExpediente = (expedienteId: string) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPEDIENTE_ELECTRONICO_DOWNLOAD_DOC)) {
      toast.error('No tiene permisos para descargar el índice del expediente');
      return;
    }
    const expediente = expedientes.find(e => e.id === expedienteId);
    if (!expediente) return;
    
    const docsExpediente = documentos.filter(d => d.expedienteId === expedienteId)
      .sort((a, b) => new Date(a.fechaSubida).getTime() - new Date(b.fechaSubida).getTime());
    
    const pdf = new jsPDF();
    const azulESAP = [0, 61, 165];
    const azulClaro = [41, 98, 255];
    const gris = [107, 114, 128];
    
    // ENCABEZADO
    pdf.setFillColor(...azulESAP);
    pdf.rect(0, 0, 210, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 105, 12, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text('Control Interno Disciplinario', 105, 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text('ÍNDICE ELECTRÓNICO COMPLETO DEL EXPEDIENTE', 105, 28, { align: 'center' });
    
    // INFORMACIÓN DEL EXPEDIENTE
    let y = 45;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Expediente: ${expediente.radicado}`, 20, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`NED: ${expediente.nombreDisciplinado}`, 20, y + 6);
    pdf.text(`Tipo de Proceso: ${expediente.tipoProceso}`, 20, y + 12);
    pdf.text(`Total de Documentos: ${docsExpediente.length}`, 20, y + 18);
    
    y += 30;
    pdf.setDrawColor(...azulClaro);
    pdf.setLineWidth(0.5);
    pdf.line(20, y, 190, y);
    y += 10;
    
    // TABLA DE DOCUMENTOS
    docsExpediente.forEach((doc, index) => {
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      
      // Número de documento
      pdf.setFillColor(240, 248, 255);
      pdf.rect(20, y, 170, 8, 'F');
      pdf.setTextColor(...azulESAP);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`DOCUMENTO ${index + 1}`, 22, y + 5);
      
      y += 10;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      const info = [
        `Descripción: ${doc.descripcionPrincipal}`,
        `Tipología: ${doc.tipologiaDocumental}`,
        `Fecha Creación: ${formatearFechaHojaControl(doc.fechaCreacion)} | Incorporación: ${formatearFechaHojaControl(doc.fechaIncorporacion)}`,
        `Páginas: ${doc.paginaInicio} - ${doc.paginaFinal} | Formato: ${doc.formato} | Tamaño: ${doc.tamanoKB}`,
        `Archivo: ${doc.archivoAcceso}`
      ];
      
      info.forEach((linea, idx) => {
        const lines = pdf.splitTextToSize(linea, 165);
        lines.forEach((line: string) => {
          pdf.text(line, 22, y);
          y += 4;
        });
      });
      
      y += 3;
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.line(20, y, 190, y);
      y += 5;
    });
    
    // PIE DE PÁGINA
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(...gris);
      const footerY = 285;
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, 20, footerY);
      pdf.text(`Página ${i} de ${totalPages}`, 190, footerY, { align: 'right' });
      pdf.setDrawColor(...gris);
      pdf.setLineWidth(0.3);
      pdf.line(20, footerY - 3, 190, footerY - 3);
    }
    
    pdf.save(`IndiceElectronico_${expediente.radicado}.pdf`);
  };

  /**
   * ✅ GENERAR EXCEL DE HOJA DE CONTROL INDIVIDUAL CON DISEÑO CORPORATIVO ESAP
   */
  const generarExcelHojaControl = (doc: Documento) => {
    const expediente = expedientes.find(e => e.id === doc.expedienteId);
    
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Datos para la hoja
    const datosHoja: any[][] = [
      // ENCABEZADO CORPORATIVO
      ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
      ['CONTROL INTERNO DISCIPLINARIO'],
      ['HOJA DE CONTROL - ÍNDICE ELECTRÓNICO'],
      [],
      // INFORMACIÓN DEL EXPEDIENTE
      ['INFORMACIÓN DEL EXPEDIENTE'],
      ['Expediente:', doc.radicado],
      expediente ? ['NED:', expediente.nombreDisciplinado] : [],
      expediente ? ['Tipo de Proceso:', expediente.tipoProceso] : [],
      expediente ? ['Responsable:', expediente.responsable] : [],
      [],
      // HOJA DE CONTROL - 10 CAMPOS
      ['HOJA DE CONTROL DEL DOCUMENTO'],
      [],
      ['CAMPO', 'VALOR'],
      ['1. DESCRIPCIÓN DEL DOCUMENTO PRINCIPAL', doc.descripcionPrincipal],
      ['2. TIPOLOGÍA DOCUMENTAL', doc.tipologiaDocumental],
      ['3. ANEXOS DEL DOCUMENTO PRINCIPAL', doc.anexos],
      ['4. FECHA DE CREACIÓN DEL DOCUMENTO', formatearFechaHojaControl(doc.fechaCreacion)],
      ['5. FECHA DE INCORPORACIÓN AL EXPEDIENTE', formatearFechaHojaControl(doc.fechaIncorporacion)],
      ['6. IMAGEN / PÁGINA DE INICIO', doc.paginaInicio.toString()],
      ['7. IMAGEN / PÁGINA FINAL', doc.paginaFinal.toString()],
      ['8. FORMATO', doc.formato],
      ['9. TAMAÑO EN KILOBYTES', doc.tamanoKB],
      ['10. ACCESO', doc.archivoAcceso],
      [],
      ['Generado el:', new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO')],
    ];
    
    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datosHoja);
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 45 },  // Columna A (Campo)
      { wch: 80 }   // Columna B (Valor)
    ];
    
    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja de Control');
    
    // Descargar archivo
    const nombreArchivo = `HojaControl_${doc.radicado}_${doc.archivoAcceso.replace('.pdf', '')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  /**
   * ✅ EXPORTAR ÍNDICE COMPLETO DEL EXPEDIENTE EN EXCEL
   */
  const exportarIndiceExpedienteExcel = (expedienteId: string) => {
    const expediente = expedientes.find(e => e.id === expedienteId);
    if (!expediente) return;
    
    const docsExpediente = documentos.filter(d => d.expedienteId === expedienteId)
      .sort((a, b) => new Date(a.fechaSubida).getTime() - new Date(b.fechaSubida).getTime());
    
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Datos para la hoja
    const datosHoja: any[][] = [
      // ENCABEZADO CORPORATIVO
      ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
      ['CONTROL INTERNO DISCIPLINARIO'],
      ['ÍNDICE ELECTRÓNICO COMPLETO DEL EXPEDIENTE'],
      [],
      // INFORMACIÓN DEL EXPEDIENTE
      ['INFORMACIÓN DEL EXPEDIENTE'],
      ['Expediente:', expediente.radicado],
      ['NED:', expediente.nombreDisciplinado],
      ['Tipo de Proceso:', expediente.tipoProceso],
      ['Responsable:', expediente.responsable],
      ['Fecha de Inicio:', expediente.fechaInicio],
      ['Total de Documentos:', docsExpediente.length.toString()],
      [],
      // ENCABEZADOS DE LA TABLA
      [
        'N°',
        '1. DESCRIPCIÓN',
        '2. TIPOLOGÍA',
        '3. ANEXOS',
        '4. F. CREACIÓN',
        '5. F. INCORPORACIÓN',
        '6. PÁG. INICIO',
        '7. PÁG. FINAL',
        '8. FORMATO',
        '9. TAMAÑO',
        '10. ACCESO'
      ]
    ];
    
    // Agregar cada documento
    docsExpediente.forEach((doc, index) => {
      datosHoja.push([
        (index + 1).toString(),
        doc.descripcionPrincipal,
        doc.tipologiaDocumental,
        doc.anexos,
        formatearFechaHojaControl(doc.fechaCreacion),
        formatearFechaHojaControl(doc.fechaIncorporacion),
        doc.paginaInicio.toString(),
        doc.paginaFinal.toString(),
        doc.formato,
        doc.tamanoKB,
        doc.archivoAcceso
      ]);
    });
    
    // Agregar pie de página
    datosHoja.push([]);
    datosHoja.push(['Generado el:', new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO')]);
    
    // Crear hoja de cálculo
    const ws = XLSX.utils.aoa_to_sheet(datosHoja);
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 5 },   // N°
      { wch: 60 },  // Descripción
      { wch: 25 },  // Tipología
      { wch: 25 },  // Anexos
      { wch: 12 },  // F. Creación
      { wch: 14 },  // F. Incorporación
      { wch: 10 },  // Pág. Inicio
      { wch: 10 },  // Pág. Final
      { wch: 10 },  // Formato
      { wch: 12 },  // Tamaño
      { wch: 35 }   // Acceso
    ];
    
    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Índice Electrónico');
    
    // Descargar archivo
    XLSX.writeFile(wb, `IndiceElectronico_${expediente.radicado}.xlsx`);
  };

  // ✅ HELPER: Detectar tipo de archivo por extensión
  const getFileType = (filename: string): 'pdf' | 'video' | 'audio' | 'image' | 'document' | 'spreadsheet' | 'html' | 'other' => {
    if (!filename) return 'other';
    const ext = filename.toLowerCase().split('.').pop() || '';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(ext)) return 'document';
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return 'spreadsheet';
    if (['html', 'htm'].includes(ext)) return 'html';
    return 'other';
  };

  // ✅ HELPER: Obtener color según tipo de archivo
  const getFileTypeColor = (filename: string): string => {
    const type = getFileType(filename);
    const colors: Record<string, string> = {
      pdf: '#EF4444',     // Rojo
      video: '#8B5CF6',   // Morado
      audio: '#EC4899',   // Rosa
      image: '#10B981',   // Verde
      document: '#3B82F6', // Azul
      spreadsheet: '#F59E0B', // Amarillo
      html: '#06B6D4',    // Cyan
      other: '#6B7280'    // Gris
    };
    return colors[type] || colors.other;
  };

  // ✅ HELPER: Obtener nombre para mostrar según tipo de archivo
  const getFileTypeDisplayName = (filename: string): string => {
    const type = getFileType(filename);
    const names: Record<string, string> = {
      pdf: 'PDF',
      video: 'Video',
      audio: 'Audio',
      image: 'Imagen',
      document: 'Documento',
      spreadsheet: 'Hoja de Cálculo',
      html: 'HTML',
      other: 'Archivo'
    };
    return names[type] || names.other;
  };

// ✅ HELPER: Abrir archivo según su tipo - abre el modal con visor
   const abrirArchivo = async (doc: Documento) => {
     setDocumentoParaVer(doc);
     setCargandoDocumento(true);
     setShowModalVisor(true);
     
     try {
       let downloadUrl: string;
       // Si el documento tiene una URL de descarga directa (documentos de noticia), usarla
       // De lo contrario, usar el endpoint del proceso
       if (doc.downloadUrl) {
         downloadUrl = disciplinaryService.getAbsoluteFileUrl(doc.downloadUrl);
       } else {
         const restPath = `/disciplinary-processes/${doc.expedienteId}/documents/${doc.id}/download?view=true`;
         downloadUrl = buildApiUrl('control-disciplinario', API_MODE === 'direct' ? restPath : `/api/v1${restPath}`);
       }
       const response = await fetch(downloadUrl, {
         method: 'GET',
         credentials: 'include',
       });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();

      // Check if it's a DOCX file and convert to HTML for display
      if (blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await blob.arrayBuffer();
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const htmlContent = result.value;
          const docxHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: white; min-height: 100vh;">
              <style>
                .docx-content { max-width: 800px; margin: 0 auto; }
                .docx-content p { margin-bottom: 10px; line-height: 1.5; }
                .docx-content h1, .docx-content h2, .docx-content h3 { margin-top: 20px; margin-bottom: 10px; }
                .docx-content ul, .docx-content ol { margin-left: 20px; }
                .docx-content table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                .docx-content td, .docx-content th { border: 1px solid #ddd; padding: 8px; }
                .docx-content th { background-color: #f5f5f5; }
              </style>
              <div class="docx-content">
                ${htmlContent}
              </div>
            </div>
          `;
          const htmlBlob = new Blob([docxHtml], { type: 'text/html' });
          const url = window.URL.createObjectURL(htmlBlob);
          setDocumentoUrl(url);
          setEsDocumentoConvertido(true);
        } catch (conversionError) {
          console.error('Error converting DOCX to HTML:', conversionError);
          // Fallback to original blob
          const url = window.URL.createObjectURL(blob);
          setDocumentoUrl(url);
          setEsDocumentoConvertido(false);
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        setDocumentoUrl(url);
        setEsDocumentoConvertido(false);
      }
      
      toast.info(`Abriendo ${getFileTypeDisplayName(doc.archivoAcceso)}...`);
    } catch (error: any) {
      console.error('Error al cargar documento:', error);
      toast.error('Error al cargar documento', {
        description: error.message || 'No se pudo cargar el documento'
      });
    } finally {
      setCargandoDocumento(false);
    }
  };

// ✅ HELPER: Descargar documento según su tipo
   const descargarDocumento = async (doc: Documento) => {
     try {
       toast.loading('Descargando documento...', { id: 'download' });

       let downloadUrl: string;
       // Si el documento tiene una URL de descarga directa (documentos de noticia), usarla
       if (doc.downloadUrl) {
         downloadUrl = disciplinaryService.getAbsoluteFileUrl(doc.downloadUrl);
       } else {
         const restPath = `/disciplinary-processes/${doc.expedienteId}/documents/${doc.id}/download`;
         downloadUrl = buildApiUrl('control-disciplinario', API_MODE === 'direct' ? restPath : `/api/v1${restPath}`);
       }
       const response = await fetch(downloadUrl, {
         method: 'GET',
         credentials: 'include',
       });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.archivoAcceso;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Descarga completada', {
        id: 'download',
        description: doc.archivoAcceso
      });
    } catch (error: any) {
      console.error('Error al descargar:', error);
      toast.error('Error al descargar', {
        id: 'download',
        description: error.message || 'No se pudo descargar el documento'
      });
    }
  };

  const confirmarEliminarDocumento = async () => {
    if (!documentoParaEliminar) return;
    setEliminandoDocumento(true);
    try {
      await disciplinaryService.deleteDocumento(documentoParaEliminar.expedienteId, documentoParaEliminar.id);
      setDocumentos(prev => prev.filter(d => d.id !== documentoParaEliminar.id));
      toast.success('Documento eliminado', { description: documentoParaEliminar.descripcionPrincipal });
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.message || 'No se pudo eliminar el documento' });
    } finally {
      setEliminandoDocumento(false);
      setDocumentoParaEliminar(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ✅ Header World-Class - Compacto Desktop-First */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
              <FolderOpen size={20} style={{ color: '#003DA5' }} />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: '#003DA5' }}>
                Expediente Electrónico
              </h1>
              <p className="text-xs text-gray-600 leading-tight mt-0.5">
                {vistaActual === 'cronologica' ? 'Archivo cronológico con hoja de control' : 'Gestión documental por carpetas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-gray-600 leading-tight">Documentos</p>
              <p className="text-base font-bold leading-tight" style={{ color: '#003DA5' }}>{documentos.length}</p>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs text-gray-600 leading-tight">Expedientes</p>
              <p className="text-base font-bold text-green-700 leading-tight">{expedientes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Toggle de Vistas */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-gray-100 p-0.5 rounded-md">
            <button
              onClick={() => setVistaActual('cronologica')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                vistaActual === 'cronologica' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Cronológica
              {vistaActual === 'cronologica' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">PRINCIPAL</span>}
            </button>
            {/* <button
              onClick={() => setVistaActual('carpetas')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                vistaActual === 'carpetas' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Folders className="w-3.5 h-3.5" />
              Carpetas
              {vistaActual === 'carpetas' && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">AUXILIAR</span>}
            </button> */}
          </div>
          {vistaActual === 'cronologica' && (
            <button
              onClick={() => setOrdenCronologico(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 rounded-md border border-gray-300 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50"
            >
              {ordenCronologico === 'desc' ? <><ArrowDown className="w-3.5 h-3.5" /> Más Reciente</> : <><ArrowUp className="w-3.5 h-3.5" /> Más Antiguo</>}
            </button>
          )}
        </div>
      </div>

      {/* ✅ Barra de Herramientas */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={vistaActual === 'cronologica' ? "Buscar documento, descripción, archivo..." : "Buscar expediente..."}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-700">Estado:</span>
            {[
              { id: 'todos', label: 'Todos', count: expedientes.length },
              { id: 'valoracion', label: 'Valoración', count: expedientes.filter(e => e.estado === 'valoracion').length },
              { id: 'investigacion', label: 'En Proceso', count: expedientes.filter(e => e.estado === 'investigacion').length },
              { id: 'finalizado', label: 'Finalizados', count: expedientes.filter(e => e.estado === 'finalizado').length }
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => setFiltroEstado(filtro.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${filtroEstado === filtro.id ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                style={filtroEstado === filtro.id ? { background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' } : {}}
              >
                {filtro.label} ({filtro.count})
              </button>
            ))}
          </div>
        </div>
        {vistaActual === 'cronologica' && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-gray-200">
            <span className="text-xs font-bold text-gray-700">Tipo:</span>
            <button
              onClick={() => setFiltroTipoDoc('todos')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${filtroTipoDoc === 'todos' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Todos ({documentos.length})
            </button>
            {TIPOS_DOCUMENTO.map((tipo) => {
              const count = documentos.filter(d => d.tipo === tipo.id).length;
              return (
                <button
                  key={tipo.id}
                  onClick={() => setFiltroTipoDoc(tipo.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${filtroTipoDoc === tipo.id ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                  style={filtroTipoDoc === tipo.id ? { backgroundColor: tipo.color } : {}}
                >
                  {tipo.nombre} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          {/* ✅ Estado de carga */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-sm font-bold text-gray-700">Cargando expedientes electrónicos...</p>
              <p className="text-xs text-gray-500 mt-1">Obteniendo datos del servidor</p>
            </div>
          )}

          {/* ✅ Estado de error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-sm font-bold text-gray-700">Error al cargar los datos</p>
              <p className="text-xs text-red-500 mt-1 mb-4">{error}</p>
              <button
                onClick={cargarDatos}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* ✅ Contenido normal */}
          {!loading && !error && (
            <AnimatePresence mode="wait">
              {vistaActual === 'cronologica' ? (
                <motion.div key="cronologica" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {documentosPorExpediente.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-700">No se encontraron documentos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Info className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-900 leading-tight">Vista Cronológica Organizada por Proceso</p>
                          <p className="text-xs text-blue-700 leading-tight">{documentosPorExpediente.reduce((acc, exp) => acc + exp.documentos.length, 0)} documento(s) en {documentosPorExpediente.length} expediente(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={expandirTodos}
                          className="px-2.5 py-1.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                          title="Expandir todos los expedientes"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          Expandir Todos
                        </button>
                        <button
                          onClick={colapsarTodos}
                          className="px-2.5 py-1.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold transition flex items-center gap-1"
                          title="Colapsar todos los expedientes"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          Colapsar Todos
                        </button>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 pl-2 border-l border-blue-300">
                          <Clock className="w-3.5 h-3.5" />
                          {ordenCronologico === 'desc' ? 'Más reciente' : 'Más antiguo'}
                        </div>
                      </div>
                    </div>
                    
                    {/* ✅ AGRUPACIÓN POR EXPEDIENTE/PROCESO */}
                    {documentosPorExpediente.map((grupo) => (
                      <div key={grupo.expedienteId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        {/* Header del Expediente - Clickeable para expandir/colapsar */}
                        <div 
                          className="px-3 py-2.5 border-b border-gray-200 cursor-pointer hover:bg-blue-100/50 transition"
                          style={{ background: 'linear-gradient(135deg, #F0F7FF 0%, #E0EDFF 100%)' }}
                        >
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex items-center gap-2.5 flex-1"
                              onClick={() => toggleExpediente(grupo.expedienteId)}
                            >
                              {/* Icono de expandir/colapsar */}
                              <motion.div
                                animate={{ rotate: expedientesExpandidos.has(grupo.expedienteId) ? 0 : -90 }}
                                transition={{ duration: 0.2 }}
                                className="flex-shrink-0"
                              >
                                <ChevronDown className="w-5 h-5 text-blue-700" />
                              </motion.div>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                                {grupo.expediente.radicado.split('-')[2]}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <h3 className="text-sm font-bold" style={{ color: '#003DA5' }}>{grupo.expediente.radicado}</h3>
                                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ color: getEstadoConfig(grupo.expediente.estado).color, backgroundColor: getEstadoConfig(grupo.expediente.estado).bg }}>
                                    {getEstadoConfig(grupo.expediente.estado).label}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                    {grupo.documentos.length} doc(s)
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-gray-700">NED: {grupo.expediente.nombreDisciplinado}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpedienteParaCompartir(grupo.expediente);
                                  setShowModalCompartir(true);
                                }}
                                className="px-2.5 py-1.5 rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition text-xs font-bold flex items-center gap-1.5"
                                title="Compartir Expediente"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                Compartir
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportarIndiceExpedienteExcel(grupo.expedienteId);
                                }}
                                className="px-2.5 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Exportar Índice del Expediente (Excel)"
                                disabled={!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPEDIENTE_ELECTRONICO_DOWNLOAD_DOC)}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Exportar Índice
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Documentos del Expediente - Animado */}
                        <AnimatePresence>
                          {expedientesExpandidos.has(grupo.expedienteId) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="divide-y divide-gray-100">
                                {grupo.documentos.map((doc, index) => {
                            const tipoConfig = getTipoDocumentoConfig(doc.tipo);
                            const Icon = tipoConfig.icon;
                            const { fecha, hora } = formatearFechaHora(doc.fechaSubida);
                            return (
                              <div key={doc.id} className="px-3 py-2.5 hover:bg-gray-50 transition border-l-3" style={{ borderLeftColor: tipoConfig.color, borderLeftWidth: '3px' }}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${tipoConfig.color} 0%, ${tipoConfig.color}dd 100%)` }}>
                                      {index + 1}
                                    </div>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: tipoConfig.colorBg }}>
                                      <Icon className="w-4 h-4" style={{ color: tipoConfig.color }} />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-xs font-bold text-gray-900 mb-1 leading-tight">{doc.descripcionPrincipal}</h3>
                                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                        <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ color: tipoConfig.color, backgroundColor: tipoConfig.colorBg }}>
                                          {tipoConfig.nombre}
                                        </span>
                                        <span className="text-xs text-gray-500">• Inc: {formatearFechaHojaControl(doc.fechaIncorporacion)}</span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
                                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />Creación: {formatearFechaHojaControl(doc.fechaCreacion)}</div>
                                        <div className="flex items-center gap-1"><FileText className="w-3 h-3" />Pág. {doc.paginaInicio}-{doc.paginaFinal}</div>
                                        <div className="flex items-center gap-1">{doc.tamanoKB}</div>
                                        <div className="flex items-center gap-1"><User className="w-3 h-3" />{doc.subidoPor}</div>
                                      </div>
                                      <p className="text-xs text-gray-600 font-mono">{doc.archivoAcceso}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleVerHojaControl(doc)}
                                      className="p-1.5 rounded-md hover:bg-blue-50 transition"
                                      title="Ver Hoja de Control"
                                    >
                                      <List className="w-3.5 h-3.5 text-blue-600" />
                                    </button>
                                    <button
                                      onClick={() => generarExcelHojaControl(doc)}
                                      className="p-1.5 rounded-md hover:bg-green-50 transition"
                                      title="Descargar Hoja de Control (Excel)"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                                    </button>
                                    {/* ✅ Botón único con lógica condicional para abrir archivo */}
                                    <button 
                                      onClick={() => abrirArchivo(doc)}
                                      className="p-1.5 rounded-md hover:bg-gray-100" 
                                      title={`Ver ${getFileTypeDisplayName(doc.archivoAcceso)}`}
                                    >
                                      {getFileType(doc.archivoAcceso) === 'video' || getFileType(doc.archivoAcceso) === 'audio' ? (
                                        <Play className="w-3.5 h-3.5" style={{ color: getFileTypeColor(doc.archivoAcceso) }} />
                                      ) : getFileType(doc.archivoAcceso) === 'image' ? (
                                        <Eye className="w-3.5 h-3.5" style={{ color: getFileTypeColor(doc.archivoAcceso) }} />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5" style={{ color: getFileTypeColor(doc.archivoAcceso) }} />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => descargarDocumento(doc)}
                                      className="p-1.5 rounded-md hover:bg-gray-100"
                                      title="Descargar documento"
                                    >
                                      <Download className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => setDocumentoParaEliminar(doc)}
                                      className="p-1.5 rounded-md hover:bg-red-50 transition"
                                      title="Eliminar documento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="carpetas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {expedientesFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-700">No se encontraron expedientes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Folders className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-orange-900 leading-tight">Vista por Carpetas</p>
                          <p className="text-xs text-orange-700 leading-tight">{expedientesFiltrados.length} expediente(s)</p>
                        </div>
                      </div>
                    </div>
                    {expedientesFiltrados.map((expediente) => (
                      <div key={expediente.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-3 py-2.5 border-b border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                                {expediente.radicado.split('-')[2]}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <h3 className="text-sm font-bold text-gray-900">{expediente.radicado}</h3>
                                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ color: getEstadoConfig(expediente.estado).color, backgroundColor: getEstadoConfig(expediente.estado).bg }}>
                                    {getEstadoConfig(expediente.estado).label}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-gray-700">NED: {expediente.nombreDisciplinado}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setExpedienteParaCompartir(expediente);
                                  setShowModalCompartir(true);
                                }}
                                className="px-2.5 py-1.5 rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition text-xs font-bold flex items-center gap-1.5"
                                title="Compartir Expediente"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                Compartir
                              </button>
                              <button
                                onClick={() => exportarIndiceExpedienteExcel(expediente.id)}
                                className="px-2.5 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition text-xs font-bold flex items-center gap-1.5"
                                title="Exportar Índice Electrónico (Excel)"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Índice Excel
                              </button>
                              <button
                                onClick={() => setExpedienteSeleccionado(expedienteSeleccionado === expediente.id ? null : expediente.id)}
                                className="px-2.5 py-1.5 rounded-md text-white font-bold text-xs hover:shadow-lg flex items-center gap-1.5"
                                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                              >
                                {expedienteSeleccionado === expediente.id ? <><EyeOff className="w-3.5 h-3.5" /> Ocultar</> : <><Eye className="w-3.5 h-3.5" /> Ver</>}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-gray-500" />
                              <div><p className="text-xs text-gray-500">Tipo:</p><p className="text-xs font-bold text-gray-900 truncate">{expediente.tipoProceso}</p></div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                              <div><p className="text-xs text-gray-500">Responsable:</p><p className="text-xs font-bold text-gray-900 truncate">{expediente.responsable}</p></div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              <div><p className="text-xs text-gray-500">Inicio:</p><p className="text-xs font-bold text-gray-900">{expediente.fechaInicio}</p></div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-gray-500" />
                              <div><p className="text-xs text-gray-500">Documentos:</p><p className="text-xs font-bold text-gray-900">{expediente.totalDocumentos}</p></div>
                            </div>
                          </div>
                        </div>
                        {expedienteSeleccionado === expediente.id && (
                          <div className="px-3 py-2.5 bg-gray-50">
                            <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                              Documentos por Tipo
                            </h4>
                            <div className="space-y-1.5">
                              {TIPOS_DOCUMENTO.map((tipo) => {
                                const Icon = tipo.icon;
                                const cantidad = expediente.documentosPorTipo[tipo.id] || 0;
                                return (
                                  <div key={tipo.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border-l-4 hover:shadow-sm transition" style={{ borderLeftColor: tipo.color }}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: tipo.colorBg }}>
                                        <Icon className="w-4 h-4" style={{ color: tipo.color }} />
                                      </div>
                                      <div><p className="text-xs font-bold text-gray-900">{tipo.nombre}</p><p className="text-xs text-gray-500">{tipo.descripcion}</p></div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ color: tipo.color, backgroundColor: tipo.colorBg }}>{cantidad}</span>
                                      {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_FILES_UPLOAD) && (
                                        <button onClick={() => handleSubirDocumento(tipo.id)} className="p-1.5 rounded-md hover:bg-gray-100"><Upload className="w-3.5 h-3.5 text-gray-600" /></button>
                                      )}
                                      <button className="p-1.5 rounded-md hover:bg-gray-100"><ChevronRight className="w-3.5 h-3.5 text-gray-600" /></button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ✅ MODAL: HOJA DE CONTROL */}
      {showModalHojaControl && documentoHojaControl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Hoja de Control - Índice Electrónico</h3>
                  <p className="text-xs text-blue-100">Expediente: {documentoHojaControl.radicado}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generarExcelHojaControl(documentoHojaControl)}
                  className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Exportar Excel
                </button>
                <button
                  onClick={() => generarPDFHojaControl(documentoHojaControl)}
                  className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
                <button onClick={() => setShowModalHojaControl(false)} className="p-1.5 hover:bg-white/20 rounded-md">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {[
                { num: 1, label: 'DESCRIPCIÓN DEL DOCUMENTO PRINCIPAL', value: documentoHojaControl.descripcionPrincipal },
                { num: 2, label: 'TIPOLOGÍA DOCUMENTAL', value: documentoHojaControl.tipologiaDocumental },
                { num: 3, label: 'ANEXOS DEL DOCUMENTO PRINCIPAL', value: documentoHojaControl.anexos },
                { num: 4, label: 'FECHA DE CREACIÓN DEL DOCUMENTO', value: formatearFechaHojaControl(documentoHojaControl.fechaCreacion) },
                { num: 5, label: 'FECHA DE INCORPORACIÓN AL EXPEDIENTE', value: formatearFechaHojaControl(documentoHojaControl.fechaIncorporacion) },
                { num: 6, label: 'IMAGEN / PÁGINA DE INICIO', value: documentoHojaControl.paginaInicio.toString() },
                { num: 7, label: 'IMAGEN / PÁGINA FINAL', value: documentoHojaControl.paginaFinal.toString() },
                { num: 8, label: 'FORMATO', value: documentoHojaControl.formato },
                { num: 9, label: 'TAMAÑO EN KILOBYTES', value: documentoHojaControl.tamanoKB },
                { num: 10, label: 'ACCESO', value: documentoHojaControl.archivoAcceso }
              ].map((campo) => (
                <div key={campo.num} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-lg p-3">
                  <p className="text-xs font-bold text-blue-900 mb-1">{campo.num}. {campo.label}:</p>
                  <p className="text-xs text-gray-900 pl-4">{campo.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ MODAL: VISOR DE DOCUMENTOS - Showing documents in modal based on file type */}
      {showModalVisor && documentoParaVer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => { setShowModalVisor(false); setDocumentoUrl(null); setEsDocumentoConvertido(false); }}>
          <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  {getFileType(documentoParaVer.archivoAcceso) === 'video' || getFileType(documentoParaVer.archivoAcceso) === 'audio' ? (
                    <Play className="w-5 h-5 text-white" />
                  ) : getFileType(documentoParaVer.archivoAcceso) === 'image' ? (
                    <FileText className="w-5 h-5 text-white" />
                  ) : (
                    <Eye className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {esDocumentoConvertido ? 'Documento Word (Convertido)' : getFileTypeDisplayName(documentoParaVer.archivoAcceso)}
                  </h3>
                  <p className="text-xs text-blue-100">{documentoParaVer.descripcionPrincipal.substring(0, 60)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {documentoUrl && (
                  <button
                    onClick={() => window.open(documentoUrl, '_blank')}
                    className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Nueva pestaña
                  </button>
                )}
                <button 
                  onClick={() => { setShowModalVisor(false); setDocumentoUrl(null); setEsDocumentoConvertido(false); }}
                  className="p-1.5 hover:bg-white/20 rounded-md"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            
            {/* Content - Viewer based on file type */}
            <div className="flex-1 overflow-auto" style={{ minHeight: '400px', maxHeight: '70vh' }}>
              {cargandoDocumento ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-sm font-bold text-gray-700">Cargando documento...</p>
                  <p className="text-xs text-gray-500 mt-1">Por favor espere</p>
                </div>
              ) : documentoUrl ? (
                <>
                  {/* PDF Viewer */}
                  {getFileType(documentoParaVer.archivoAcceso) === 'pdf' && (
                    <iframe
                      src={documentoUrl}
                      className="w-full"
                      style={{ height: '65vh', minHeight: '400px', border: 'none' }}
                      title="Visor PDF"
                    />
                  )}
                  
                  {/* Video Player */}
                  {getFileType(documentoParaVer.archivoAcceso) === 'video' && (
                    <video
                      src={documentoUrl}
                      controls
                      autoPlay
                      className="w-full h-full max-h-[70vh]"
                    >
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  )}
                  
                  {/* Audio Player */}
                  {getFileType(documentoParaVer.archivoAcceso) === 'audio' && (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-100">
                      <Play className="w-16 h-16 text-purple-600 mb-4" />
                      <audio
                        src={documentoUrl}
                        controls
                        autoPlay
                        className="w-full max-w-md"
                      >
                        Tu navegador no soporta la reproducción de audio.
                      </audio>
                    </div>
                  )}
                  
                  {/* Image Viewer */}
                  {getFileType(documentoParaVer.archivoAcceso) === 'image' && (
                    <div className="flex items-center justify-center h-full p-4 bg-gray-100">
                      <img
                        src={documentoUrl}
                        alt={documentoParaVer.descripcionPrincipal}
                        className="max-w-full max-h-[65vh] object-contain"
                      />
                    </div>
                  )}
                  
                  {/* HTML Viewer */}
                  {(getFileType(documentoParaVer.archivoAcceso) === 'html' || esDocumentoConvertido) && (
                    <iframe
                      src={documentoUrl}
                      className="w-full"
                      style={{ height: '65vh', minHeight: '500px', border: 'none' }}
                      title="Visor HTML"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  )}

                  {/* Document/Other - Show in iframe or offer download */}
                  {['document', 'spreadsheet', 'other'].includes(getFileType(documentoParaVer.archivoAcceso)) && !esDocumentoConvertido && (
                    <div className="flex flex-col items-center justify-center h-64 p-8">
                      <FileText className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        Vista previa no disponible
                      </p>
                      <p className="text-sm text-gray-600 mb-6 text-center">
                        El tipo de archivo "{getFileTypeDisplayName(documentoParaVer.archivoAcceso)}" no tiene vista previa en el navegador.
                      </p>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = documentoUrl;
                          link.download = documentoParaVer.archivoAcceso;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4" />
                        Descargar archivo
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-lg font-semibold text-gray-700 mb-2">Error al cargar</p>
                  <p className="text-sm text-gray-500">No se pudo cargar el documento</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div className="text-xs text-gray-500">
                <span className="font-semibold">{documentoParaVer.tipoNombre}</span> • {documentoParaVer.tamanoKB}
              </div>
              <div className="flex gap-2">
                {documentoUrl && (
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = documentoUrl;
                      link.download = documentoParaVer.archivoAcceso;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </button>
                )}
                <button
                  onClick={() => { setShowModalVisor(false); setDocumentoUrl(null); setEsDocumentoConvertido(false); }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal confirmación eliminación de documento */}
      {documentoParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Eliminar documento</h3>
                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              ¿Está seguro que desea eliminar <strong>{documentoParaEliminar.descripcionPrincipal}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDocumentoParaEliminar(null)}
                disabled={eliminandoDocumento}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarDocumento}
                disabled={eliminandoDocumento}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {eliminandoDocumento ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal Subir Documento/Evidencia - USANDO COMPONENTE COMPLETO */}
      {showModalSubirDocumento && (
        <ModalSubirDocumento
          proceso={{
            numero: expedientesFiltrados[0]?.radicado || 'CD-2025-XXX',
            etapaActual: 'Investigación'
          }}
          onClose={() => setShowModalSubirDocumento(false)}
          onConfirm={handleConfirmarDocumentos}
        />
      )}

      {/* ✅ MODAL: COMPARTIR EXPEDIENTE */}
      {showModalCompartir && expedienteParaCompartir && (
        <ModalCompartirExpediente
          expediente={{
            id: expedienteParaCompartir.id,
            radicado: expedienteParaCompartir.radicado,
            nombreDisciplinado: expedienteParaCompartir.nombreDisciplinado,
            estado: expedienteParaCompartir.estado
          }}
          onClose={() => {
            setShowModalCompartir(false);
            setExpedienteParaCompartir(null);
          }}
        />
      )}
    </div>
  );
}