
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder, FolderOpen, FileText, Upload, Download, Search, Eye,
  ChevronRight, ChevronDown, Plus, Filter, Calendar, User,
  Archive, CheckCircle2, AlertCircle, Clock,
  File, FolderCheck, FileCheck, Scale, Gavel, FileQuestion,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalExpedienteConsulta } from './ModalExpedienteConsulta';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';
import { ModalSIGL } from '../design-system/ModalSIGL';
import {
  CATEGORIAS_DOCUMENTOS,
  SUGERENCIAS_TIPO_DOCUMENTO,
} from '../core/expedienteShared';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { legalService } from '../../../../services/api/legal.service';
import { ModalSeleccionTipo } from './ModalSeleccionTipo';
import { ModalAutos } from './ModalAutos';
import { ModalActas } from './ModalActas';
import { ModalEvidencias } from './ModalEvidencias';
import { ModalOficios } from './ModalOficios';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';
import { ModalSubirRespuesta } from './ModalSubirRespuesta';
import { VisorDocumentoModal } from './VisorDocumentoModal';


import { buildApiUrl, getServiceUrl, API_MODE } from '../../../../config/environment';
import { isViewableInBrowser } from '../../../../utils/fileUtils';

// Helper to build correct file URL for both direct and gateway modes
// Direct mode: http://localhost:3008/files/{filename}
// Gateway mode: http://gateway:3000/legal/files/{filename} (NOT /legal/api/v1/files!)
const getFileUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;

  const baseUrl = getServiceUrl('legal');

  // Extract filename from various path formats
  let filename = url;
  if (url.includes('/files/')) {
    filename = url.split('/files/').pop() || url;
  } else if (url.includes('/legal/')) {
    filename = url.split('/').pop() || url;
  } else if (url.includes('/')) {
    filename = url.split('/').pop() || url;
  }

  // Limpiar prefijos incorrectos
  filename = filename.replace(/^\/+/, '');

  // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
  const prefix = API_MODE === 'direct' ? '' : '/legal';
  return `${baseUrl}${prefix}/files/${filename}`;
};

// URL base para archivos del servicio legal (uploads, etc.)
// Gateway rutea /legal/uploads/* -> backend /uploads/*
const LEGAL_BASE_URL = (() => {
  const baseUrl = getServiceUrl('legal');
  const prefix = API_MODE === 'direct' ? '' : '/legal';
  return `${baseUrl}${prefix}`;
})();

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type TipoProceso =
  | 'DEFENSA_JUDICIAL'
  | 'JUZGAMIENTO'
  | 'ASESORIA'
  | 'PROCESOS_COACTIVOS'
  | 'ORGANOS_CONTROL'
  | 'OTRO';

type TipoDocumento =
  | 'ACTAS'
  | 'EVIDENCIAS'
  | 'OFICIOS'
  | 'AUTOS'
  | 'PRUEBAS'
  | 'COMUNICACIONES'
  | 'NOTIFICACIONES'
  | 'OTROS';

interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  tipoArchivo: string;
  tamanio: string;
  fechaCreacion: string;
  autor: string;
  // Campos adicionales para lógica de negocio
  url?: string;
}

interface Expediente {
  id: string;
  radicado: string;
  nombreProceso: string;
  tipoProceso: TipoProceso;
  fechaInicio: string;
  fechaActualizacion: string;
  estado: 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO';
  responsable: string;
  totalDocumentos: number;
  documentos: Documento[];
}

type VistaActual = 'expedientes' | 'estadisticas';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TIPOS DE DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

export const TIPOS_DOCUMENTO = [
  {
    id: 'ACTAS' as TipoDocumento,
    nombre: 'Actas',
    descripcion: 'Actas de audiencias, reuniones, diligencias',
    color: 'yellow',
    icon: FileText
  },
  {
    id: 'EVIDENCIAS' as TipoDocumento,
    nombre: 'Evidencias',
    descripcion: 'Material probatorio y evidencias',
    color: 'green',
    icon: FolderCheck
  },
  {
    id: 'OFICIOS' as TipoDocumento,
    nombre: 'Oficios',
    descripcion: 'Oficios enviados y recibidos',
    color: 'teal',
    icon: File
  },
  {
    id: 'AUTOS' as TipoDocumento,
    nombre: 'Autos',
    descripcion: 'Autos judiciales, providencias, decretos',
    color: 'violet',
    icon: Gavel
  },
  {
    id: 'PRUEBAS' as TipoDocumento,
    nombre: 'Pruebas',
    descripcion: 'Documentos probatorios y pruebas',
    color: 'blue',
    icon: FolderCheck
  },
  {
    id: 'COMUNICACIONES' as TipoDocumento,
    nombre: 'Comunicaciones',
    descripcion: 'Comunicaciones internas y externas',
    color: 'indigo',
    icon: FileCheck
  },
  {
    id: 'NOTIFICACIONES' as TipoDocumento,
    nombre: 'Notificaciones',
    descripcion: 'Notificaciones judiciales y extrajudiciales',
    color: 'pink',
    icon: Archive
  },
  {
    id: 'OTROS' as TipoDocumento,
    nombre: 'Documentos Generales',
    descripcion: 'Demandas, contestaciones, sentencias y otros documentos',
    color: 'gray',
    icon: File
  }
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK (REDUCIDOS PARA OPTIMIZACIÓN)
// ════════════════════════════════════════════════════════════════════════════

const EXPEDIENTES_MOCK: Expediente[] = [
  // Ejemplo mínimo de expediente para referencia
  {
    id: 'exp-dj-001',
    radicado: 'PJ-2025-001',
    nombreProceso: 'Proceso de Ejemplo',
    tipoProceso: 'DEFENSA_JUDICIAL',
    fechaInicio: '2024-10-15',
    fechaActualizacion: '2025-01-12',
    estado: 'EN_PROCESO',
    responsable: 'Abogado Responsable',
    totalDocumentos: 3,
    documentos: [
      { id: 'd1', nombre: 'Documento 1.pdf', tipo: 'DEMANDA', tipoArchivo: 'PDF', tamanio: '1.2 MB', fechaCreacion: '2024-10-15', autor: 'Usuario' },
    ]
  },
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ExpedientesModuloSIGL() {
  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();
  
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('expedientes');
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estado para el visor de documentos
  const [visorOpen, setVisorOpen] = useState(false);
  const [documentoVisor, setDocumentoVisor] = useState<Documento | null>(null);

  const handleVerDocumentoCentralizado = (doc: Documento) => {
    let url = doc.url;

    if (url && !url.startsWith('http') && !url.startsWith('blob:')) {
      // Caso especial: /legal/files/ en cualquier parte
      if (url.includes('/legal/files/')) {
        const filename = url.split('/').pop();
        url = getFileUrl(filename);
      } else {
        // Limpiar prefijos incorrectos (sin ^ para coincidir en cualquier posición)
        url = url.replace(/\/legal\//gi, '/').replace(/\/api\/legal\//gi, '/');

        if (url.startsWith('/files/') || !url.includes('/')) {
          const filename = url.split('/').pop();
          url = getFileUrl(filename);
        } else if (url.startsWith('/uploads') || url.startsWith('uploads')) {
          const cleanPath = url.startsWith('/') ? url : `/${url}`;
          url = `${LEGAL_BASE_URL}${cleanPath}`;
        } else {
          url = `${LEGAL_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        }
      }
    }

    setDocumentoVisor({ ...doc, url });
    setVisorOpen(true);
  };

  // Helper para mapear estado del backend al frontend
  const mapEstado = (estadoBackend: string = ''): 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO' => {
    const estado = estadoBackend.toUpperCase();
    if (['FINALIZADO', 'CERRADO', 'ARCHIVADO', 'PRESCRITO', 'RESUELTA', 'RECHAZADA'].some(s => estado.includes(s))) return 'FINALIZADO';
    if (['EN_PROCESO', 'TRAMITE', 'EJECUCION', 'INDAGACION', 'INVESTIGACION', 'VALORACION', 'ASIGNADA'].some(s => estado.includes(s))) return 'EN_PROCESO';
    return 'ACTIVO';
  };

  // Helper para mapear tipo de documento según nombre/tipo backend
  const mapearTipoDocumento = (nombre: string = '', tipo: string = ''): TipoDocumento => {
    const texto = (nombre + ' ' + tipo).toUpperCase();
    if (texto.includes('DEMANDA')) return 'DEMANDA';
    if (texto.includes('CONTESTACION') || texto.includes('RESPUESTA')) return 'CONTESTACION';
    if (texto.includes('EVIDENCIA')) return 'EVIDENCIAS';
    if (texto.includes('PRUEBA') || texto.includes('TESTIMONIO')) return 'PRUEBAS';
    if (texto.includes('SENTENCIA') || texto.includes('FALLO') || texto.includes('AUTO')) return 'SENTENCIAS';
    if (texto.includes('TUTELA')) return 'TUTELAS';
    if (texto.includes('RECURSO') || texto.includes('APELACION') || texto.includes('REPOSICION')) return 'RECURSOS';
    if (texto.includes('CONCEPTO') || texto.includes('MEMORIAL') || texto.includes('ALEGATO')) return 'CONCEPTOS';
    if (texto.includes('ACTA')) return 'ACTAS';
    if (texto.includes('NOTIFICACION') || texto.includes('CITACION')) return 'NOTIFICACIONES';
    if (texto.includes('OFICIO') || texto.includes('CARTA')) return 'OFICIOS';
    return 'OTROS';
  };

  // Helper para normalizar URLs de documentos
  const normalizarDocUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;

    // Caso especial: /legal/files/ en cualquier parte de la URL
    if (url.includes('/legal/files/')) {
      const filename = url.split('/').pop();
      return getFileUrl(filename);
    }

    // Limpiar prefijos incorrectos (sin ^ para que coincida en cualquier posición)
    let cleanUrl = url.replace(/\/legal\//gi, '/').replace(/\/api\/legal\//gi, '/');

    // Construir URL absoluta
    if (cleanUrl.startsWith('/files/') || !cleanUrl.includes('/')) {
      const filename = cleanUrl.split('/').pop();
      return getFileUrl(filename);
    } else if (cleanUrl.startsWith('/uploads') || cleanUrl.startsWith('uploads')) {
      const cleanPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
      return `${LEGAL_BASE_URL}${cleanPath}`;
    } else {
      return `${LEGAL_BASE_URL}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
    }
  };

  const cargarExpedientes = async () => {
    try {
      setCargando(true);

      // Fetch concurrent from ALL legal services
      const [legalRes, juzgamientoRes, asesoriaRes, ocRes, coactivosRes] = await Promise.allSettled([
        legalService.getExpedientes(),
        legalService.getJuzgamientoProcesos(),
        legalService.getConsultasJuridicas(),
        legalService.getRequerimientosOC(),
        legalService.getProcesosCoactivos()
      ]);

      const nuevosExpedientes: Expediente[] = [];

      // 1. Procesar DEFENSA JUDICIAL (Excluyendo Disciplinario)
      if (legalRes.status === 'fulfilled') {
        const procesosJudiciales = legalRes.value;
        for (const proc of procesosJudiciales) {
          if (proc.jurisdiccion?.toUpperCase() === 'DISCIPLINARIO' || proc.tipoProceso?.toUpperCase() === 'DISCIPLINARIO') {
            continue;
          }

          let docsExp: Documento[] = [];
          try {
            // Cargar Documentos y Evidencias en paralelo
            const [docsRes, evidenciasRes] = await Promise.allSettled([
              legalService.getDocumentos(proc.id),
              legalService.getEvidencias(proc.id)
            ]);

            const docs = docsRes.status === 'fulfilled' && Array.isArray(docsRes.value) ? docsRes.value : [];
            const evidencias = evidenciasRes.status === 'fulfilled' && Array.isArray(evidenciasRes.value) ? evidenciasRes.value : [];

            // Mapear Documentos Generales
            const docsMapeados: Documento[] = docs.map((d: any) => {
              const tipoInicial = d.tipo ? mapearTipoDocumento(d.nombre || '', d.tipo) : mapearTipoDocumento(d.nombre || '', 'OTROS');
              const tipoFinal = (tipoInicial === 'PRUEBAS') ? 'EVIDENCIAS' : tipoInicial;

              return {
                id: d.id,
                nombre: d.nombre || d.nombreArchivo || 'Documento sin nombre',
                tipo: tipoFinal,
                tipoArchivo: d.tipoArchivo || d.archivoMimeType?.split('/')[1]?.toUpperCase() || 'PDF',
                tamanio: d.tamanio || (d.archivoTamano ? (d.archivoTamano / 1024).toFixed(0) + ' KB' : 'N/A'),
                fechaCreacion: d.fechaCreacion || d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                autor: d.autor || d.subidoPor || 'Sistema',
                url: normalizarDocUrl(d.url || d.archivoUrl)
              };
            });

            // Mapear Evidencias (Entidad separada del backend)
            const evidenciasMapeadas: Documento[] = evidencias.map((e: any) => ({
              id: e.id,
              nombre: e.descripcion || e.archivoNombre || 'Evidencia sin nombre',
              tipo: 'EVIDENCIAS' as TipoDocumento,
              tipoArchivo: e.tipoArchivo || 'PDF',
              tamanio: e.archivoTamano ? (e.archivoTamano / 1024).toFixed(0) + ' KB' : 'N/A',
              fechaCreacion: e.fechaPresentacion?.split('T')[0] || e.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              autor: e.aportadoPor || 'Sistema',
              url: normalizarDocUrl(e.archivoUrl)
            }));

            docsExp = [...docsMapeados, ...evidenciasMapeadas];

          } catch (error) {
            console.warn(`Error cargando documentos/evidencias para expediente judicial ${proc.id}`, error);
          }

          let tipoProc: TipoProceso = 'DEFENSA_JUDICIAL';
          if (proc.tipoProceso === 'Procesos Coactivos') tipoProc = 'PROCESOS_COACTIVOS';
          else if (proc.tipoProceso === 'Otro') tipoProc = 'OTRO';

          nuevosExpedientes.push({
            id: proc.id,
            radicado: proc.radicado,
            nombreProceso: `${proc.jurisdiccion || 'Proceso'} - ${proc.demandante} vs ${proc.demandado}`,
            tipoProceso: tipoProc,
            fechaInicio: proc.createdAt?.split('T')[0],
            fechaActualizacion: proc.updatedAt?.split('T')[0],
            estado: mapEstado(proc.estado),
            responsable: proc.abogadoSustanciador || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        }
      }

      // 2. Procesar JUZGAMIENTO (Local Legal Service)
      if (juzgamientoRes.status === 'fulfilled') {
        const procesosJuzgamiento = juzgamientoRes.value;
        procesosJuzgamiento.forEach(proc => {
          // Backend devuelve 'documentos' como merge de 'actuaciones' + 'evidencias'
          // Actuaciones tienen: documentoNombre, documentoUrl, tipoActuacion
          // Evidencias tienen: archivoNombre, archivoUrl, tipo
          const docsExp: Documento[] = (proc.documentos || []).map((d: any) => {
            // Determinar tipo basado en tipoActuacion
            const tipoActuacion = (d.tipoActuacion || '').toUpperCase();

            // Mapear tipoActuacion a TipoDocumento válido
            let tipoFinal: TipoDocumento;
            if (tipoActuacion === 'OTROS' || tipoActuacion === 'OTRO') {
              tipoFinal = 'OTROS';
            } else if (tipoActuacion === 'EVIDENCIA' || tipoActuacion === 'EVIDENCIAS' || tipoActuacion === 'PRUEBAS') {
              tipoFinal = 'EVIDENCIAS'; // Para Juzgamiento, PRUEBAS y EVIDENCIAS van a la carpeta Evidencias
            } else if (tipoActuacion === 'DOCUMENTO' || !tipoActuacion) {
              tipoFinal = 'PRUEBAS'; // Documentos generales van a PRUEBAS
            } else {
              // Intentar mapear otros tipos conocidos
              tipoFinal = mapearTipoDocumento(d.documentoNombre || '', tipoActuacion);
            }

            // Obtener nombre correcto (actuaciones usan documentoNombre, evidencias usan archivoNombre o descripcion)
            const nombre = d.documentoNombre || d.archivoNombre || d.descripcion || 'Documento sin nombre';

            // Obtener URL correcto
            let url = d.documentoUrl || d.archivoUrl || d.url;

            // Si no hay URL pero hay nombre de archivo, construir ruta al controlador de archivos
            if (!url && d.documentoNombre) {
              url = `/files/${d.documentoNombre}`;
            }

            // Normalización robusta de URLs
            if (url && !url.startsWith('http') && !url.startsWith('blob:')) {
              // Limpiar prefijos incorrectos - NO usar ^ para que coincida en cualquier posición
              if (url.includes('/legal/files/')) {
                const filename = url.split('/').pop();
                url = getFileUrl(filename);
              } else {
                url = url.replace(/\/legal\//gi, '/').replace(/\/api\/legal\//gi, '/');

                // Construir URL absoluta
                if (url.startsWith('/files/') || !url.includes('/')) {
                  const filename = url.split('/').pop();
                  url = getFileUrl(filename);
                } else if (url.startsWith('/uploads') || url.startsWith('uploads')) {
                  const cleanPath = url.startsWith('/') ? url : `/${url}`;
                  url = `${LEGAL_BASE_URL}${cleanPath}`;
                } else {
                  url = `${LEGAL_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
                }
              }
            }

            return {
              id: d.id,
              nombre: nombre,
              tipo: tipoFinal,
              tipoArchivo: d.tipoArchivo || 'PDF',
              tamanio: d.archivoTamano ? (d.archivoTamano / 1024).toFixed(0) + ' KB' : 'N/A',
              fechaCreacion: d.fechaActuacion?.split('T')[0] || d.fechaPresentacion?.split('T')[0] || d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              autor: d.usuarioResponsable || d.aportadoPor || 'Juzgamiento',
              url: url
            };
          });

          nuevosExpedientes.push({
            id: proc.id,
            radicado: proc.radicado,
            nombreProceso: `Disciplinario - ${proc.etapa}`,
            tipoProceso: 'JUZGAMIENTO',
            fechaInicio: new Date().toISOString().split('T')[0],
            fechaActualizacion: new Date().toISOString().split('T')[0],
            estado: 'EN_PROCESO',
            responsable: proc.abogadoAsignado || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        });
      }

      // 3. Procesar ASESORIA JURIDICA (Consultas)
      if (asesoriaRes.status === 'fulfilled') {
        const consultas = asesoriaRes.value;
        for (const cons of consultas) {
          let docsExp: Documento[] = [];
          try {
            const docs = await legalService.getDocumentosConsulta(cons.id);
            if (Array.isArray(docs)) {
              docsExp = docs.map(d => ({
                id: d.id,
                nombre: d.nombre,
                // Si el tipo viene vacío, intentamos inferirlo del nombre, o default a OTROS
                tipo: d.tipo ? mapearTipoDocumento(d.nombre, d.tipo) : mapearTipoDocumento(d.nombre, 'OTROS'),
                tipoArchivo: d.archivoMimeType?.split('/')[1]?.toUpperCase() || 'PDF', // Default
                tamanio: d.archivoTamano ? (d.archivoTamano / 1024).toFixed(0) + ' KB' : 'Unknown',
                fechaCreacion: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                autor: d.subidoPor || 'Sistema',
                url: d.archivoUrl
              }));
            }
          } catch (error) {
            console.warn(`Error cargando documentos para consulta ${cons.id}`, error);
          }

          nuevosExpedientes.push({
            id: cons.id,
            radicado: cons.codigo || cons.id.substring(0, 8).toUpperCase(),
            nombreProceso: cons.asunto || 'Consulta Jurídica',
            tipoProceso: 'ASESORIA',
            fechaInicio: cons.createdAt?.split('T')[0],
            fechaActualizacion: cons.updatedAt?.split('T')[0],
            estado: mapEstado(cons.estado),
            responsable: cons.abogadoResponsable?.nombre || cons.responsable || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        }
      }

      // 4. Procesar ORGANOS DE CONTROL (Requerimientos)
      if (ocRes.status === 'fulfilled') {
        const requerimientosOC = ocRes.value;
        requerimientosOC.forEach(req => {
          const docsExp: Documento[] = (req.documentos || []).map((d: any) => ({
            id: d.id,
            nombre: d.nombre,
            tipo: mapearTipoDocumento(d.nombre, d.tipoDocumento),
            tipoArchivo: d.archivoUrl ? d.archivoUrl.split('.').pop()?.toUpperCase() : 'PDF',
            tamanio: 'Unknown',
            fechaCreacion: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
            autor: d.subidoPor || 'Sistema',
            url: d.archivoUrl
          }));

          nuevosExpedientes.push({
            id: req.id,
            radicado: req.radicadoExterno || req.codigo || req.id.substring(0, 8).toUpperCase(),
            nombreProceso: `OC - ${req.entidad || 'Entidad'} - ${req.asunto}`,
            tipoProceso: 'ORGANOS_CONTROL',
            fechaInicio: req.fechaRadicacion?.split('T')[0] || req.createdAt?.split('T')[0],
            fechaActualizacion: req.updatedAt?.split('T')[0],
            estado: mapEstado(req.estado),
            responsable: req.responsable || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        });
      }

      // 5. Procesar PROCESOS COACTIVOS
      if (coactivosRes.status === 'fulfilled') {
        const procesosCoactivos = coactivosRes.value;
        for (const proc of procesosCoactivos) {
          let docsExp: Documento[] = [];
          try {
            // Cargar adjuntos del proceso coactivo
            const adjuntos = await legalService.getCoactivoAdjuntos(proc.id);
            docsExp = (Array.isArray(adjuntos) ? adjuntos : []).map((d: any) => {
              // Usar tipo del backend directamente si es válido, sino usar mapeo
              let docTipo = d.tipo?.toUpperCase() || '';
              const tiposValidos = ['DEMANDA', 'CONTESTACION', 'EVIDENCIAS', 'PRUEBAS', 'SENTENCIAS', 'TUTELAS', 'RECURSOS', 'CONCEPTOS', 'ACTAS', 'NOTIFICACIONES', 'OFICIOS', 'OTROS', 'DOCUMENTO'];
              if (!tiposValidos.includes(docTipo)) {
                docTipo = mapearTipoDocumento(d.nombreOriginal || '', docTipo);
              }
              if (docTipo === 'DOCUMENTO') docTipo = 'OTROS';

              return {
                id: d.id,
                nombre: d.nombreOriginal || d.nombre || 'Documento sin nombre',
                tipo: docTipo as TipoDocumento,
                tipoArchivo: d.extension?.toUpperCase() || d.mimeType?.split('/')[1]?.toUpperCase() || 'PDF',
                tamanio: d.tamano ? `${(d.tamano / 1024).toFixed(0)} KB` : 'N/A',
                fechaCreacion: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                autor: d.subidoPor || 'Usuario',
                url: normalizarDocUrl(d.archivoUrl || d.url || (d.nombreArchivo ? `/files/${d.nombreArchivo}` : ''))
              };
            });
          } catch (error) {
            console.warn(`Error cargando adjuntos coactivo ${proc.id}`, error);
          }

          nuevosExpedientes.push({
            id: proc.id,
            radicado: proc.radicado || proc.proceso?.substring(0, 10) || proc.id.substring(0, 8).toUpperCase(),
            nombreProceso: `Coactivo - ${proc.deudor || proc.titulo || 'Sin deudor'}`,
            tipoProceso: 'PROCESOS_COACTIVOS',
            fechaInicio: proc.fechaInicio?.split('T')[0] || proc.createdAt?.split('T')[0],
            fechaActualizacion: proc.updatedAt?.split('T')[0],
            estado: mapEstado(proc.estado || 'ACTIVO'),
            responsable: proc.abogado || proc.funcionario || 'No asignado',
            totalDocumentos: docsExp.length,
            documentos: docsExp
          });
        }
      }

      setExpedientes(nuevosExpedientes);

    } catch (error) {
      console.error('Error cargando expedientes:', error);
      toast.error('Error al cargar expedientes electrónicos');
    } finally {
      setCargando(false);
    }
  };

  // Estados para modales especializados
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<Expediente | null>(null);
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [modalSeleccionOpen, setModalSeleccionOpen] = useState(false);
  const [modalAutosOpen, setModalAutosOpen] = useState(false);
  const [modalActasOpen, setModalActasOpen] = useState(false);
  const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
  const [modalOficiosOpen, setModalOficiosOpen] = useState(false);

  // ✅ Estado para el nuevo modal de Subir Documento (estilo TabDocumentosExpediente)
  const [modalSubirDocOpen, setModalSubirDocOpen] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('documentos');
  const [nuevoTipoDocumento, setNuevoTipoDocumento] = useState('');
  const [modalRespuestaOpen, setModalRespuestaOpen] = useState(false);
  const [modalCargarOpen, setModalCargarOpen] = useState(false); // Generic

  const handleCargarClick = (exp: Expediente) => {
    setExpedienteSeleccionado(exp);
    setNuevaCategoria('documentos');
    setNuevoTipoDocumento('');
    setModalSubirDocOpen(true);
  };

  // ✅ Upload handler del nuevo modal (estilo TabDocumentosExpediente)
  const ejecutarSubidaDocumento = () => {
    if (!nuevoTipoDocumento.trim()) {
      toast.error('Tipo de documento requerido', {
        description: 'Debe indicar el tipo de documento a cargar'
      });
      return;
    }
    if (!expedienteSeleccionado) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.zip,.rar,.7z,.pptx,.ppt,.csv,.txt,.rtf';

    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        // Map categoria to TIPOS_DOCUMENTO id for the existing handleGenericUpload
        const tipoMap: Record<string, string> = {
          actas: 'ACTAS', evidencias: 'EVIDENCIAS', oficios: 'OFICIOS',
          autos: 'AUTOS', pruebas: 'PRUEBAS', comunicaciones: 'OTROS',
          notificaciones: 'NOTIFICACIONES', documentos: 'OTROS'
        };
        const tipoId = tipoMap[nuevaCategoria] || 'OTROS';
        handleGenericUpload(file, tipoId);
        setModalSubirDocOpen(false);
        setNuevoTipoDocumento('');
        setNuevaCategoria('documentos');
      }
    };
    input.click();
  };

  const handleTipoSelected = (tipoId: string) => {
    if (!expedienteSeleccionado) return;
    setSelectedTipoId(tipoId);

    console.log('Tipo seleccionado:', tipoId);

    switch (tipoId) {
      case 'ACTAS':
        setModalActasOpen(true);
        break;
      case 'SENTENCIAS':
      case 'AUTOS':
      case 'FALLOS':
        setModalAutosOpen(true);
        break;
      case 'PRUEBAS':
      case 'EVIDENCIAS':
        setModalEvidenciasOpen(true);
        break;
      case 'OFICIOS':
        setModalOficiosOpen(true);
        break;
      case 'RESPUESTA':
        setModalRespuestaOpen(true);
        break;
      case 'OTROS':
      default:
        setModalCargarOpen(true);
        break;
    }
  };

  useEffect(() => {
    cargarExpedientes();
  }, []);

  const handleGenericUpload = async (file: File, tipoId: string) => {
    if (!expedienteSeleccionado) return;
    const expediente = expedienteSeleccionado;

    try {
      toast.promise(
        async () => {
          if (expediente.tipoProceso === 'DEFENSA_JUDICIAL' || expediente.tipoProceso === 'OTRO') {
            // Carga para Defensa Judicial
            const formData = new FormData();
            formData.append('archivo', file); // Backend espera 'archivo', no 'file'
            formData.append('expedienteId', expediente.id);
            formData.append('tipo', tipoId); // Enviar el ID del tipo (ej: DEMANDA) como tipo string
            formData.append('nombre', file.name);
            await legalService.crearDocumento(formData);

          } else if (expediente.tipoProceso === 'JUZGAMIENTO') {
            // Carga para Juzgamiento (Legal Service)
            await legalService.uploadJuzgamientoDocumento(
              expediente.radicado, // Usa radicado como ID
              file,
              tipoId, // tipo
              `Cargado desde Expedientes Electrónicos` // descripcion
            );
          } else if (expediente.tipoProceso === 'ASESORIA') {
            // Carga para Asesoría
            const formData = new FormData();
            formData.append('archivo', file); // Backend espera 'archivo', no 'file'
            formData.append('nombre', file.name);
            formData.append('tipoDocumento', tipoId);
            await legalService.uploadDocumentoConsulta(expediente.id, formData);
          } else if (expediente.tipoProceso === 'PROCESOS_COACTIVOS') {
            // Carga para Procesos Coactivos
            await legalService.uploadCoactivoAdjunto(
              expediente.id,
              file,
              tipoId,
              `Cargado desde Expedientes Electrónicos`
            );
          }

          // Recargar expedientes para ver el nuevo documento
          await cargarExpedientes();
        },
        {
          loading: 'Subiendo documento...',
          success: 'Documento cargado exitosamente',
          error: 'Error al cargar documento'
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'EXP-999',
      codigo: 'EXP-DJ-2024-999',
      nombre: 'Expediente Demanda Laboral - Juan Pérez vs ESAP',
      tipo: 'Expediente',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-01T16:30:00'),
      usuarioArchivo: 'Dr. Carlos Mendoza',
      motivoArchivo: 'Proceso finalizado con sentencia favorable. Todos los documentos digitalizados y respaldados en sistema central',
      metadatos: {
        'Radicado': 'PJ-2023-045',
        'Tipo Proceso': 'Defensa Judicial - Laboral',
        'Total Documentos': '47',
        'Sentencia': 'Favorable a ESAP',
        'Fecha Finalización': '01/12/2024',
        'Responsable': 'Dr. Carlos Mendoza García'
      }
    }
  ]);

  // ✅ Función para restaurar un expediente archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando expediente:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Expediente restaurado exitosamente');
  };

  // ✅ Función para eliminar permanentemente un expediente
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente expediente:', itemId);
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    toast.success('Expediente eliminado permanentemente');
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Expedientes Electrónicos
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Sistema Integrado de Gestión Legal (SIGL v5.0)
          </p>
        </div>

        {/* Navegación Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <TabButton
            active={vistaActiva === 'expedientes'}
            onClick={() => setVistaActiva('expedientes')}
            icon={<Folder className="w-4 h-4" />}
            label="Expedientes por Proceso"
            badge={expedientes.length.toString()}
          />
          <TabButton
            active={vistaActiva === 'estadisticas'}
            onClick={() => setVistaActiva('estadisticas')}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Estadísticas"
          />
        </div>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {cargando ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Cargando expedientes...</span>
            </div>
          ) : (
            <>
              {vistaActiva === 'expedientes' &&
                <VistaExpedientes
                  expedientes={expedientes}
                  onUpload={handleCargarClick}
                  onViewDoc={handleVerDocumentoCentralizado}
                />
              }
              {vistaActiva === 'estadisticas' &&
                <VistaEstadisticas
                  expedientes={expedientes}
                />
              }
            </>
          )}
        </motion.div>
      </AnimatePresence>
      {/* Modales Especializados */}
      {expedienteSeleccionado && (
        <>
          <ModalSeleccionTipo
            isOpen={modalSeleccionOpen}
            onClose={() => setModalSeleccionOpen(false)}
            tipoProceso={expedienteSeleccionado.tipoProceso}
            tiposDocumento={TIPOS_DOCUMENTO}
            onSelectTipo={handleTipoSelected}
          />

          <ModalAutos
            isOpen={modalAutosOpen}
            onClose={() => setModalAutosOpen(false)}
            expediente={{ ...expedienteSeleccionado, uuid: expedienteSeleccionado.id } as any}
            modulo='espediente-sigl'
          />

          <ModalActas
            isOpen={modalActasOpen}
            onClose={() => setModalActasOpen(false)}
            expediente={{ ...expedienteSeleccionado, uuid: expedienteSeleccionado.id } as any}
            modulo='espediente-sigl'
          />

          <ModalEvidencias
            isOpen={modalEvidenciasOpen}
            onClose={() => setModalEvidenciasOpen(false)}
            expediente={{ ...expedienteSeleccionado, uuid: expedienteSeleccionado.id } as any}
            modulo='espediente-sigl'
          />

          <ModalOficios
            isOpen={modalOficiosOpen}
            onClose={() => setModalOficiosOpen(false)}
            expediente={{ ...expedienteSeleccionado, uuid: expedienteSeleccionado.id } as any}
            modulo='espediente-sigl'
          />

          {modalRespuestaOpen && (
            <ModalSubirRespuesta
              isOpen={modalRespuestaOpen}
              onClose={() => setModalRespuestaOpen(false)}
              requerimiento={{
                id: expedienteSeleccionado.id,
                numeroOficio: expedienteSeleccionado.radicado,
                organismo: 'Contraloría', // Placeholder
                asunto: expedienteSeleccionado.nombreProceso,
                fechaVencimiento: new Date(),
                diasRestantes: 5
              }}
            />
          )}

        </>
      )}

      {/* ✅ Visor de Documentos FUERA del guard (se abre con Eye button sin necesitar expedienteSeleccionado) */}
      <VisorDocumentoModal
        isOpen={visorOpen}
        onClose={() => setVisorOpen(false)}
        archivo={documentoVisor?.url}
        numero={documentoVisor?.nombre}
        asunto={documentoVisor?.tipo}
      />

      {/* ✅ Nuevo Modal Subir Documento (estilo TabDocumentosExpediente) */}
      {modalSubirDocOpen && expedienteSeleccionado && (
        <Dialog open={modalSubirDocOpen} onOpenChange={setModalSubirDocOpen}>
          <DialogContent hideCloseButton className="w-[95vw] max-w-[700px] !max-h-[82vh] flex flex-col p-0">
            <DialogTitle className="sr-only">Subir Documento</DialogTitle>
            <DialogDescription className="sr-only">
              Formulario para subir un nuevo documento al expediente {expedienteSeleccionado.radicado}
            </DialogDescription>

            <ModalHeaderClean
              titulo="Subir Documento"
              subtitulo={`Expediente ${expedienteSeleccionado.radicado} • Seleccione categoría y tipo`}
              icono={Upload}
              colorIcono="blue"
              onClose={() => setModalSubirDocOpen(false)}
            />

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Categoría del documento */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <Filter className="w-4 h-4 inline mr-1.5" />
                  Categoría del Documento *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIAS_DOCUMENTOS.filter(c => c.id !== 'todos').map((cat) => {
                    const isSelected = nuevaCategoria === cat.id;
                    const CatIcon = cat.icono;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNuevaCategoria(cat.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                          isSelected
                            ? 'shadow-md text-white'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        style={isSelected ? { background: cat.color, borderColor: cat.color } : {}}
                      >
                        <CatIcon className="w-5 h-5" />
                        <span className="text-xs font-bold">{cat.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de documento */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1.5" />
                  Tipo de Documento *
                </label>
                <input
                  type="text"
                  value={nuevoTipoDocumento}
                  onChange={(e) => setNuevoTipoDocumento(e.target.value)}
                  placeholder="Ej: Demanda, Acta de Audiencia, Oficio de Citación..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {/* Sugerencias según categoría */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(SUGERENCIAS_TIPO_DOCUMENTO[nuevaCategoria] || []).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNuevoTipoDocumento(sug)}
                      className="px-2 py-1 text-[11px] font-semibold bg-gray-100 text-gray-600 rounded-md border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info de la categoría seleccionada */}
              {(() => {
                const catInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === nuevaCategoria);
                if (!catInfo) return null;
                const CatIcon = catInfo.icono;
                return (
                  <div className="p-3 rounded-lg border-2" style={{ borderColor: `${catInfo.color}40`, background: `${catInfo.color}08` }}>
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-5 h-5" style={{ color: catInfo.color }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: catInfo.color }}>
                          Se archivará en: {catInfo.nombre}
                        </p>
                        <p className="text-xs text-gray-600">
                          Formatos aceptados: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, ZIP, RAR, PPTX, CSV, TXT
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalSubirDocOpen(false);
                  setNuevoTipoDocumento('');
                  setNuevaCategoria('documentos');
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarSubidaDocumento}
                disabled={!nuevoTipoDocumento.trim()}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg transition-all ${
                  nuevoTipoDocumento.trim() ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{ background: nuevoTipoDocumento.trim() ? '#003DA5' : '#9CA3AF' }}
              >
                <Upload className="w-4 h-4" />
                Seleccionar Archivo
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-4 sm:px-6 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active
          ? 'border-[#003DA5] text-[#003DA5] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-[#003DA5] text-white' : 'bg-gray-200 text-gray-700'
          }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: EXPEDIENTES POR PROCESO
// ════════════════════════════════════════════════════════════════════════════

interface VistaExpedientesProps {
  expedientes: Expediente[];
  onUpload: (exp: Expediente) => void;
  onViewDoc: (doc: Documento) => void;
}

function VistaExpedientes({ expedientes, onUpload, onViewDoc }: VistaExpedientesProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVO' | 'EN_PROCESO' | 'FINALIZADO'>('TODOS');
  const [expedienteExpandido, setExpedienteExpandido] = useState<string | null>(null);

  const expedientesFiltrados = useMemo(() => {
    let resultado = expedientes;

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(exp =>
        exp.radicado.toLowerCase().includes(search) ||
        exp.nombreProceso.toLowerCase().includes(search)
      );
    }

    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(exp => exp.estado === filtroEstado);
    }

    return resultado;
  }, [busqueda, filtroEstado, expedientes]);

  const estadisticas = useMemo(() => {
    const total = expedientes.length;
    const activos = expedientes.filter(e => e.estado === 'ACTIVO').length;
    const enProceso = expedientes.filter(e => e.estado === 'EN_PROCESO').length;
    const finalizados = expedientes.filter(e => e.estado === 'FINALIZADO').length;
    const totalDocs = expedientes.reduce((acc, exp) => acc + exp.totalDocumentos, 0);

    return { total, activos, enProceso, finalizados, totalDocs };
  }, [expedientes]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por radicado o nombre del proceso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton
              active={filtroEstado === 'TODOS'}
              onClick={() => setFiltroEstado('TODOS')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroEstado === 'ACTIVO'}
              onClick={() => setFiltroEstado('ACTIVO')}
              label="Activos"
              count={estadisticas.activos}
              color="green"
            />
            <FilterButton
              active={filtroEstado === 'EN_PROCESO'}
              onClick={() => setFiltroEstado('EN_PROCESO')}
              label="En Proceso"
              count={estadisticas.enProceso}
              color="yellow"
            />
            <FilterButton
              active={filtroEstado === 'FINALIZADO'}
              onClick={() => setFiltroEstado('FINALIZADO')}
              label="Finalizados"
              count={estadisticas.finalizados}
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Lista de Expedientes */}
      <div className="space-y-4">
        {expedientesFiltrados.map((expediente) => (
          <CardExpediente
            key={expediente.id}
            expediente={expediente}
            expandido={expedienteExpandido === expediente.id}
            onToggleExpand={() => setExpedienteExpandido(
              expedienteExpandido === expediente.id ? null : expediente.id
            )}

            onUpload={() => onUpload(expediente)}
            onViewDoc={onViewDoc}
          />
        ))}

        {expedientesFiltrados.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No se encontraron expedientes con los filtros seleccionados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FILTER BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'green' | 'yellow' | 'gray';
}

function FilterButton({ active, onClick, label, count, color }: FilterButtonProps) {
  const colorClasses = {
    green: 'border-green-300 bg-green-50 text-green-700',
    yellow: 'border-yellow-300 bg-yellow-50 text-yellow-700',
    gray: 'border-gray-300 bg-gray-50 text-gray-700',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap
        ${active
          ? color
            ? colorClasses[color]
            : 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      {label} ({count})
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARD EXPEDIENTE
// ════════════════════════════════════════════════════════════════════════════


interface CardExpedienteProps {
  expediente: Expediente;
  expandido: boolean;
  onToggleExpand: () => void;
  onUpload: () => void;
  onViewDoc: (doc: Documento) => void;
}

function CardExpediente({ expediente, expandido, onToggleExpand, onUpload, onViewDoc }: CardExpedienteProps) {
  // const [modalCargar, setModalCargar] = useState(false); // Estado elevado al padre

  const estadoConfig = {
    ACTIVO: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activo' },
    EN_PROCESO: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Proceso' },
    FINALIZADO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Finalizado' }
  };

  const tipoProcesoConfig = {
    DEFENSA_JUDICIAL: { label: 'Defensa Judicial', icon: Scale, color: '#10B981' },
    JUZGAMIENTO: { label: 'Juzgamiento', icon: Gavel, color: '#DC2626' },
    ASESORIA: { label: 'Asesoría Jurídica', icon: FileQuestion, color: '#8B5CF6' },
    PROCESOS_COACTIVOS: { label: 'Procesos Coactivos', icon: FileText, color: '#F59E0B' },
    ORGANOS_CONTROL: { label: 'Órganos Control', icon: Archive, color: '#2563EB' },
    OTRO: { label: 'Otro', icon: File, color: '#6B7280' }
  };

  const config = estadoConfig[expediente.estado];
  const tipoConfig = tipoProcesoConfig[expediente.tipoProceso];
  const TipoIcon = tipoConfig.icon;

  // Agrupar documentos por tipo
  const documentosPorTipo = useMemo(() => {
    const grupos: Record<TipoDocumento, Documento[]> = {
      ACTAS: [],
      EVIDENCIAS: [],
      OFICIOS: [],
      AUTOS: [],
      PRUEBAS: [],
      COMUNICACIONES: [],
      NOTIFICACIONES: [],
      OTROS: []
    };

    // Mapear tipos antiguos a las 8 categorías actuales
    const tipoNormalizado = (tipo: string): TipoDocumento => {
      const map: Record<string, TipoDocumento> = {
        DEMANDA: 'OTROS', CONTESTACION: 'OTROS', SENTENCIAS: 'OTROS',
        TUTELAS: 'OTROS', RECURSOS: 'OTROS', CONCEPTOS: 'OTROS',
        ACTAS: 'ACTAS', EVIDENCIAS: 'EVIDENCIAS', OFICIOS: 'OFICIOS',
        AUTOS: 'AUTOS', PRUEBAS: 'PRUEBAS', COMUNICACIONES: 'COMUNICACIONES',
        NOTIFICACIONES: 'NOTIFICACIONES', OTROS: 'OTROS'
      };
      return map[tipo] || 'OTROS';
    };

    expediente.documentos.forEach(doc => {
      const cat = tipoNormalizado(doc.tipo);
      grupos[cat].push(doc);
    });

    return grupos;
  }, [expediente.documentos]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header del Expediente */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${tipoConfig.color}, ${tipoConfig.color}dd)` }}
              >
                <TipoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h3 className="text-base sm:text-lg text-gray-900 font-medium">{expediente.radicado}</h3>
                  <span className={`px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-3">{expediente.nombreProceso}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 text-gray-900">{tipoConfig.label}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <span className="ml-2 text-gray-900">{expediente.responsable}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio:</span>
                    <span className="ml-2 text-gray-900">{expediente.fechaInicio}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documentos:</span>
                    <span className="ml-2 text-gray-900 font-medium">{expediente.totalDocumentos}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {/* Ocultar botón por solicitud del usuario
              {authService.hasPermission(Permissions.GESTION_LEGAL_EXPEDIENTES_ELECTRONICOS_UPLOAD) && (
                <button
                  onClick={onUpload}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Cargar
                </button>
              )}
              */}
              <button
                onClick={onToggleExpand}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {expandido ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Ocultar</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="hidden sm:inline">Ver Carpetas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Estructura de Carpetas por Tipo de Documento */}
        <AnimatePresence>
          {expandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-gray-50"
            >
              <div className="p-4 sm:p-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Documentos por Tipo</h4>

                <div className="space-y-3">
                  {TIPOS_DOCUMENTO.map((tipoDoc) => {
                    const docs = documentosPorTipo[tipoDoc.id];
                    const Icon = tipoDoc.icon;

                    return (
                      <CarpetaTipoDocumento
                        key={tipoDoc.id}
                        tipoDocumento={tipoDoc}
                        documentos={docs}
                        icon={<Icon className="w-5 h-5" />}
                        onViewDoc={onViewDoc}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARPETA TIPO DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface CarpetaTipoDocumentoProps {
  tipoDocumento: typeof TIPOS_DOCUMENTO[0];
  documentos: Documento[];
  icon: React.ReactNode;
  onViewDoc: (doc: Documento) => void;
}

function CarpetaTipoDocumento({ tipoDocumento, documentos, icon, onViewDoc }: CarpetaTipoDocumentoProps) {
  const [expandido, setExpandido] = useState(false);

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  const colorClass = colorClasses[tipoDocumento.color as keyof typeof colorClasses];

  const handleVerDocumento = (doc: Documento) => {
    toast.info('Visualizar documento', {
      description: doc.nombre,
      duration: 2000,
    });

    // Uso del visor centralizado
    onViewDoc(doc);
  };

  const handleDescargarDocumento = async (doc: Documento, e: React.MouseEvent) => {
    e.stopPropagation();

    let url = doc.url;

    if (url && !url.startsWith('http') && !url.startsWith('blob:')) {
      // Caso especial: /legal/files/ en cualquier parte
      if (url.includes('/legal/files/')) {
        const filename = url.split('/').pop();
        url = getFileUrl(filename);
      } else {
        // Limpiar prefijos incorrectos (sin ^ para coincidir en cualquier posición)
        url = url.replace(/\/legal\//gi, '/').replace(/\/api\/legal\//gi, '/');

        if (url.startsWith('/files/') || !url.includes('/')) {
          const filename = url.split('/').pop();
          url = getFileUrl(filename);
        } else if (url.startsWith('/uploads') || url.startsWith('uploads')) {
          const cleanPath = url.startsWith('/') ? url : `/${url}`;
          url = `${LEGAL_BASE_URL}${cleanPath}`;
        } else {
          url = `${LEGAL_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        }
      }
    }

    if (!url) {
      toast.error('No hay URL disponible para descargar');
      return;
    }

    try {
      toast.loading('Iniciando descarga...', { id: 'descarga-rapida' });

      const response = await fetch(url);
      if (!response.ok) throw new Error('Error de red al descargar');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.nombre || 'documento.pdf';
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      toast.success('Descarga completada', { id: 'descarga-rapida' });
    } catch (error) {
      console.error('Error descargando:', error);
      // Fallback a window.open si falla el fetch (ej: CORS estricto)
      window.open(url, '_blank');
      toast.error('Error en descarga directa, intentando abrir en nueva pestaña...', { id: 'descarga-rapida' });
    }
  };

  return (
    <div className={`rounded-lg border ${colorClass}`}>
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-opacity-70 transition-all"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {expandido ? <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" /> : <Folder className="w-4 h-4 sm:w-5 sm:h-5" />}
          <div className="text-left">
            <div className="font-medium text-xs sm:text-sm">{tipoDocumento.nombre}</div>
            <div className="text-xs opacity-80 hidden sm:block">{tipoDocumento.descripcion}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-medium px-2 py-0.5 sm:py-1 bg-white bg-opacity-60 rounded">
            {documentos?.length || 0}
          </span>
          {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-current border-opacity-20"
          >
            <div className="p-3 sm:p-4 bg-white bg-opacity-50">
              {(!documentos || documentos.length === 0) ? (
                <div className="text-center py-6 sm:py-8 text-xs sm:text-sm opacity-60">
                  <File className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-40" />
                  No hay documentos de este tipo
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{doc.tamanio}</span>
                            <span>•</span>
                            <span>{doc.fechaCreacion}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{doc.autor}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        {(isViewableInBrowser(doc.nombre) || isViewableInBrowser(doc.url)) && (
                          <button
                            onClick={() => handleVerDocumento(doc)}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDescargarDocumento(doc, e)}
                          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL CARGAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalCargarDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  onCargar: (file: File, tipo: string) => void;
  radicado: string;
  tipoProceso: TipoProceso;
  preSelectedType?: string | null;
}

function ModalCargarDocumento({ isOpen, onClose, onCargar, radicado, tipoProceso, preSelectedType }: ModalCargarDocumentoProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>('OTROS');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (preSelectedType) {
      setTipo(preSelectedType);
    } else {
      setTipo('OTROS');
    }
  }, [preSelectedType, isOpen]);

  const handleCargar = async () => {
    if (!file) return;
    setCargando(true);
    // Simular delay visual si es necesario, o llamar directamente onCargar
    await onCargar(file, tipo);
    setFile(null);
    setTipo('OTROS');
    setCargando(false);
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title="Cargar Documento"
      description={`Expediente: ${radicado}`}
      size="small"
    >
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Documento
            </label>
            {preSelectedType ? (
              <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                {TIPOS_DOCUMENTO.find(t => t.id === preSelectedType)?.nombre || (preSelectedType === 'EVIDENCIAS' ? 'Evidencias' : preSelectedType)}
              </div>
            ) : (
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5]"
              >
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            )}

          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#003DA5] transition-colors cursor-pointer relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {file ? file.name : <>Arrastra un archivo o <span className="text-[#003DA5] font-medium">explora</span></>}
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX (Máx. 10 MB)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            onClick={handleCargar}
            className="px-4 py-2 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            disabled={cargando || !file}
          >
            {cargando ? 'Cargando...' : 'Cargar Documento'}
          </button>
        </div>
      </div>
    </ModalSIGL>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════════════════

interface VistaEstadisticasProps {
  expedientes: Expediente[];
}

function VistaEstadisticas({ expedientes }: VistaEstadisticasProps) {
  const estadisticasPorTipo = useMemo(() => {
    const stats: Record<TipoProceso, { total: number; docs: number }> = {
      DEFENSA_JUDICIAL: { total: 0, docs: 0 },
      JUZGAMIENTO: { total: 0, docs: 0 },
      ASESORIA: { total: 0, docs: 0 },
      PROCESOS_COACTIVOS: { total: 0, docs: 0 },
      ORGANOS_CONTROL: { total: 0, docs: 0 },
      OTRO: { total: 0, docs: 0 }
    };

    expedientes.forEach(exp => {
      if (stats[exp.tipoProceso]) {
        stats[exp.tipoProceso].total++;
        stats[exp.tipoProceso].docs += exp.totalDocumentos;
      }
    });

    return stats;
  }, [expedientes]);

  const estadisticasPorTipoDoc = useMemo(() => {
    const stats: Record<TipoDocumento, number> = {
      DEMANDA: 0,
      CONTESTACION: 0,
      PRUEBAS: 0,
      AUTOS: 0,
      SENTENCIAS: 0,
      TUTELAS: 0,
      RECURSOS: 0,
      CONCEPTOS: 0,
      ACTAS: 0,
      NOTIFICACIONES: 0,
      OFICIOS: 0,
      OTROS: 0
    };

    expedientes.forEach(exp => {
      exp.documentos.forEach(doc => {
        if (stats[doc.tipo] !== undefined) {
          stats[doc.tipo]++;
        }
      });
    });

    return stats;
  }, [expedientes]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Estadísticas Generales
        </h2>

        {/* Estadísticas por Tipo de Proceso */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Expedientes por Tipo de Proceso</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(estadisticasPorTipo) as [TipoProceso, typeof estadisticasPorTipo[TipoProceso]][]).map(([tipo, stats]) => {
              const tipoConfig = {
                DEFENSA_JUDICIAL: { label: 'Defensa Judicial', color: '#10B981' },
                JUZGAMIENTO: { label: 'Juzgamiento', color: '#DC2626' },
                ASESORIA: { label: 'Asesoría Jurídica', color: '#8B5CF6' },
                PROCESOS_COACTIVOS: { label: 'Procesos Coactivos', color: '#F59E0B' },
                ORGANOS_CONTROL: { label: 'Órganos Control', color: '#2563EB' },
                OTRO: { label: 'Otro', color: '#6B7280' }
              }[tipo];

              if (!tipoConfig) return null;

              return (
                <div key={tipo} className="p-4 rounded-lg border-2" style={{ borderColor: `${tipoConfig.color}40`, background: `${tipoConfig.color}10` }}>
                  <p className="text-sm font-medium text-gray-700">{tipoConfig.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: tipoConfig.color }}>{stats.total}</p>
                  <p className="text-xs text-gray-600 mt-1">{stats.docs} documentos</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estadísticas por Tipo de Documento */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Documentos por Tipo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(Object.entries(estadisticasPorTipoDoc) as [TipoDocumento, number][]).map(([tipo, cantidad]) => {
              const tipoConfig = TIPOS_DOCUMENTO.find(t => t.id === tipo);
              if (!tipoConfig) return null;

              return (
                <div key={tipo} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 truncate">{tipoConfig.nombre}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{cantidad}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}