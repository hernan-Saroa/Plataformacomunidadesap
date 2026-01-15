/**
 * RF005 - GESTIÓN DOCUMENTAL Y EXPEDIENTE ELECTRÓNICO
 * Sistema completo de gestión de expedientes con índice electrónico, versiones y auditoría
 * DISEÑO: Replicado del módulo Carpeta Digital para coherencia visual
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, FileText, Upload, Download, Eye, History,
  Link as LinkIcon, Calendar, User, Clock, CheckCircle,
  AlertCircle, File, FileCheck, Search, Filter, X,
  ChevronDown, ChevronRight, Trash2, Edit2, ExternalLink,
  Archive, Folder, Shield, Key, Copy, Share2, FileSignature,
  BarChart3, ZoomIn, RefreshCw, Package, Printer, Mail, Info, HelpCircle, Scale
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { FlujoProcesoDisciplinario } from './FlujoProcesoDisciplinario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { buildApiUrl, API_MODE } from '../../../config/environment';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { ModalGestionAutos, ModalGestionEvidencias, ModalGestionOficios } from './ModalesGestionDocumental';
import { EditorDocumentos } from './EditorDocumentos';

// Modal de Selección de Tipo de Documento
interface ModalSeleccionProps {
  onClose: () => void;
  onSelect: (tipo: 'auto' | 'evidencia' | 'oficio' | 'otro') => void;
}

function ModalSeleccionDocumento({ onClose, onSelect }: ModalSeleccionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Seleccione el Tipo de Documento</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-8 grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('auto')}
            className="p-6 rounded-xl border-2 border-transparent bg-purple-50 hover:bg-purple-100 hover:border-purple-200 transition-all flex flex-col items-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center">
              <Scale className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-purple-900">Auto / Fallo</h4>
              <p className="text-xs text-purple-700 mt-1">Generación automática de títulos y consecutivos</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('evidencia')}
            className="p-6 rounded-xl border-2 border-transparent bg-orange-50 hover:bg-orange-100 hover:border-orange-200 transition-all flex flex-col items-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center">
              <Archive className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-orange-900">Evidencia / Prueba</h4>
              <p className="text-xs text-orange-700 mt-1">Gestión de material probatorio y anexos</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('oficio')}
            className="p-6 rounded-xl border-2 border-transparent bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-200 transition-all flex flex-col items-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-cyan-100 group-hover:bg-cyan-200 flex items-center justify-center">
              <Mail className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-cyan-900">Oficio / Comunicación</h4>
              <p className="text-xs text-cyan-700 mt-1">Comunicaciones oficiales y respuestas</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('otro')}
            className="p-6 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200 transition-all flex flex-col items-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-gray-900">Otro Documento</h4>
              <p className="text-xs text-gray-600 mt-1">Carga genérica (Actas, Constancias, etc.)</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
interface Documento {
  id: string;
  nombre: string;
  tipo: 'auto' | 'evidencia' | 'oficio' | 'notificacion' | 'acta' | 'otro';
  etapa: string;
  version: number;
  tamaño: string;
  fechaCarga: string;
  usuarioCarga: string;
  descripcion: string;
  url?: string;
  urlExterna?: string;
  downloadUrl?: string; // URL para descargar el documento
  processId?: string; // ID del proceso al que pertenece
  versiones: VersionDocumento[];
  metadatos: {
    firmado?: boolean;
    notificado?: boolean;
    folios?: number;
    firmado?: boolean;
    notificado?: boolean;
    folios?: number;
    esAutoDigital?: boolean; // Nuevo flag
    estado?: string;
  };
  contenido?: string; // Nuevo campo para contenido HTML
}

interface VersionDocumento {
  numero: number;
  fecha: string;
  usuario: string;
  cambios: string;
  cambios: string;
  tamaño: string;
  downloadUrl?: string; // URL opcional para descargar versión
}

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  id: string;
  numero: string;
  denunciado: Persona | string; // Permite ambos tipos para compatibilidad
  etapaActual: string;
  fechaInicio: string;
  estado: string;
}

interface ActividadAuditoria {
  id: string;
  tipo: 'carga' | 'descarga' | 'visualizacion' | 'modificacion' | 'eliminacion' | 'exportacion' | 'enlace_externo';
  usuario: string;
  fecha: string;
  documento: string;
  detalles: string;
}

// Mock Data
const PROCESOS_MOCK: Proceso[] = [
  {
    id: 'p1',
    numero: 'P-120-2025',
    denunciado: 'Juan Pérez Gómez',
    etapaActual: 'Indagación Preliminar',
    fechaInicio: '2025-01-03',
    estado: 'Activo'
  },
  {
    id: 'p2',
    numero: 'P-089-2024',
    denunciado: 'María González Castro',
    etapaActual: 'Valoración',
    fechaInicio: '2024-12-15',
    estado: 'Activo'
  },
  {
    id: 'p3',
    numero: 'P-156-2025',
    denunciado: 'Carlos Andrés Rodríguez',
    etapaActual: 'Investigación Formal',
    fechaInicio: '2025-01-10',
    estado: 'Activo'
  },
  {
    id: 'p4',
    numero: 'P-045-2024',
    denunciado: 'Ana María López Hernández',
    etapaActual: 'Descargos',
    fechaInicio: '2024-11-20',
    estado: 'Activo'
  },
  {
    id: 'p5',
    numero: 'P-198-2025',
    denunciado: 'Jorge Luis Martínez Sánchez',
    etapaActual: 'Noticia',
    fechaInicio: '2025-01-15',
    estado: 'Activo'
  },
  {
    id: 'p6',
    numero: 'P-023-2024',
    denunciado: 'Diana Patricia Torres',
    etapaActual: 'Cierre',
    fechaInicio: '2024-10-05',
    estado: 'Archivado'
  }
];

const DOCUMENTOS_MOCK: Documento[] = [
  {
    id: 'd1',
    nombre: 'Auto de Apertura Indagación Preliminar',
    tipo: 'auto',
    etapa: 'Indagación Preliminar',
    version: 3,
    tamaño: '245 KB',
    fechaCarga: '2025-01-08T14:30:00',
    usuarioCarga: 'Juan Carlos Pérez',
    descripcion: 'Auto de apertura firmado por el Jefe OCID',
    metadatos: {
      firmado: true,
      notificado: true,
      folios: 5
    },
    versiones: [
      {
        numero: 3,
        fecha: '2025-01-08T14:30:00',
        usuario: 'Juan Carlos Pérez',
        cambios: 'Corrección de fundamentación jurídica según observaciones del Jefe',
        tamaño: '245 KB'
      },
      {
        numero: 2,
        fecha: '2025-01-08T10:15:00',
        usuario: 'Juan Carlos Pérez',
        cambios: 'Ajuste de numerales y fechas',
        tamaño: '243 KB'
      },
      {
        numero: 1,
        fecha: '2025-01-07T16:00:00',
        usuario: 'Juan Carlos Pérez',
        cambios: 'Versión inicial',
        tamaño: '240 KB'
      }
    ]
  },
  {
    id: 'd2',
    nombre: 'Noticia Disciplinaria ND-260',
    tipo: 'evidencia',
    etapa: 'Noticia',
    version: 1,
    tamaño: '1.2 MB',
    fechaCarga: '2025-01-03T09:00:00',
    usuarioCarga: 'Sistema',
    descripcion: 'Queja inicial presentada por denunciante',
    metadatos: {
      folios: 3
    },
    versiones: [
      {
        numero: 1,
        fecha: '2025-01-03T09:00:00',
        usuario: 'Sistema',
        cambios: 'Carga inicial desde formulario web',
        tamaño: '1.2 MB'
      }
    ]
  },
  {
    id: 'd3',
    nombre: 'Evidencias Testimoniales',
    tipo: 'evidencia',
    etapa: 'Indagación Preliminar',
    version: 1,
    tamaño: 'Externo',
    fechaCarga: '2025-01-05T11:30:00',
    usuarioCarga: 'María Torres',
    descripcion: 'Archivos de audio y video almacenados en Google Drive',
    urlExterna: 'https://drive.google.com/drive/folders/1a2b3c4d5e6f',
    metadatos: {},
    versiones: [
      {
        numero: 1,
        fecha: '2025-01-05T11:30:00',
        usuario: 'María Torres',
        cambios: 'Enlace a carpeta de Google Drive con testimonios grabados',
        tamaño: 'Externo'
      }
    ]
  },
  {
    id: 'd4',
    nombre: 'Constancia de Notificación Personal',
    tipo: 'notificacion',
    etapa: 'Indagación Preliminar',
    version: 1,
    tamaño: '180 KB',
    fechaCarga: '2025-01-09T15:45:00',
    usuarioCarga: 'Secretaría OCID',
    descripcion: 'Acta de notificación personal firmada por el investigado',
    metadatos: {
      notificado: true,
      folios: 2
    },
    versiones: [
      {
        numero: 1,
        fecha: '2025-01-09T15:45:00',
        usuario: 'Secretaría OCID',
        cambios: 'Carga de acta firmada escaneada',
        tamaño: '180 KB'
      }
    ]
  }
];

const AUDITORIA_MOCK: ActividadAuditoria[] = [
  {
    id: 'a1',
    tipo: 'carga',
    usuario: 'Juan Carlos Pérez',
    fecha: '2025-01-08T14:30:00',
    documento: 'Auto de Apertura Indagación Preliminar',
    detalles: 'Versión 3 - 245 KB'
  },
  {
    id: 'a2',
    tipo: 'visualizacion',
    usuario: 'Jefe OCID',
    fecha: '2025-01-08T14:35:00',
    documento: 'Auto de Apertura Indagación Preliminar',
    detalles: 'Revisión en línea'
  },
  {
    id: 'a3',
    tipo: 'descarga',
    usuario: 'Secretaría OCID',
    fecha: '2025-01-08T15:00:00',
    documento: 'Auto de Apertura Indagación Preliminar',
    detalles: 'Descarga para notificación'
  },
  {
    id: 'a4',
    tipo: 'enlace_externo',
    usuario: 'María Torres',
    fecha: '2025-01-05T11:30:00',
    documento: 'Evidencias Testimoniales',
    detalles: 'Enlace a Google Drive agregado'
  },
  {
    id: 'a5',
    tipo: 'exportacion',
    usuario: 'Jefe OCID',
    fecha: '2025-01-09T10:00:00',
    documento: 'Expediente Completo P-120-2025',
    detalles: 'Exportación PDF con índice electrónico - 15 documentos'
  }
];

// Modal de Visor de Documentos
function ModalVisorDocumento({
  documento,
  onClose,
  processId,
  onEdit,
}: {
  documento: Documento;
  onClose: () => void;
  processId?: string;
  onEdit?: (documento: Documento) => void;
}) {
  const [versionSeleccionada, setVersionSeleccionada] = useState(documento.version);
  // NO mostrar documento automáticamente - el usuario debe hacer clic en "Mostrar Documento"
  const [viendoPDF, setViendoPDF] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [cargandoPDF, setCargandoPDF] = useState(false);
  const [errorPDF, setErrorPDF] = useState<string | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState<'pdf' | 'word' | 'ppt' | 'xls' | 'otro'>('pdf');

  // Plugin de react-pdf-viewer con layout completo (zoom, navegación, etc.)
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // Limpiar estado cuando se cierra el modal
  useEffect(() => {
    return () => {
      // Limpiar todos los estados cuando el componente se desmonta
      setViendoPDF(false);
      setCargandoPDF(false);
      setErrorPDF(null);
      setTipoArchivo('pdf');
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, []);

  // Cargar el PDF como blob cuando se abre el modal
  useEffect(() => {
    let currentBlobUrl: string | null = null;
    let cancelled = false;

    const cargarPDF = async () => {
      if (!processId || !documento.id || !viendoPDF) {
        return;
      }

      try {
        setCargandoPDF(true);
        setErrorPDF(null);

        // Usar buildApiUrl para construir la URL correctamente según el modo (gateway/direct)
        let downloadUrl: string;

        if (documento.downloadUrl) {
          // Si el documento ya trae una URL de descarga (ej: Autos), usarla
          // NO remover el slash inicial, buildApiUrl lo necesita o lo maneja
          downloadUrl = buildApiUrl('control-disciplinario', documento.downloadUrl);
        } else {
          // Construcción legacy para evidencias
          const endpoint = API_MODE === 'direct'
            ? `/disciplinary-processes/${processId}/documents/${documento.id}/download`
            : `/api/v1/disciplinary-processes/${processId}/documents/${documento.id}/download`;
          downloadUrl = buildApiUrl('control-disciplinario', endpoint);
        }
        const token = localStorage.getItem('esap_access_token');

        const headers: HeadersInit = {
          'Accept': 'application/octet-stream',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();

        if (cancelled) {
          return;
        }

        // Detectar tipo de archivo basado en el nombre del documento
        const nombreArchivo = documento.nombre.toLowerCase();
        let tipoDetectado: 'pdf' | 'word' | 'ppt' | 'xls' | 'html' | 'otro' = 'otro';

        if (nombreArchivo.endsWith('.pdf')) {
          tipoDetectado = 'pdf';
          // Verificar que el blob sea realmente un PDF
          const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const pdfHeader = String.fromCharCode(...bytes);

          if (pdfHeader !== '%PDF') {
            const text = await blob.text();
            if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<!doctype')) {
              // Si es un auto, es normal que sea HTML
              if (documento.metadatos?.esAutoDigital || nombreArchivo.endsWith('.html')) {
                tipoDetectado = 'html';
                // No lanzamos error, permitimos que se setee como html
              } else {
                throw new Error('El servidor devolvió HTML en lugar de PDF. Verifique la autenticación y la URL.');
              }
            } else {
              throw new Error('El archivo no es un PDF válido. Header esperado: %PDF, recibido: ' + pdfHeader);
            }
          }
        } else if (documento.metadatos?.esAutoDigital || nombreArchivo.endsWith('.html')) {
          tipoDetectado = 'html';
        } else if (nombreArchivo.endsWith('.doc') || nombreArchivo.endsWith('.docx')) {
          tipoDetectado = 'word';
        } else if (nombreArchivo.endsWith('.ppt') || nombreArchivo.endsWith('.pptx')) {
          tipoDetectado = 'ppt';
        } else if (nombreArchivo.endsWith('.xls') || nombreArchivo.endsWith('.xlsx')) {
          tipoDetectado = 'xls';
        }

        setTipoArchivo(tipoDetectado);

        // Crear blob URL para todos los tipos de archivo
        const url = window.URL.createObjectURL(blob);
        currentBlobUrl = url;

        if (!cancelled) {
          setPdfBlobUrl(url);
        } else {
          window.URL.revokeObjectURL(url);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error('Error al cargar PDF:', error);
          setErrorPDF(error.message || 'No se pudo cargar el PDF');
          toast.error('Error al cargar PDF', {
            description: error.message || 'No se pudo cargar el documento'
          });
        }
      } finally {
        if (!cancelled) {
          setCargandoPDF(false);
        }
      }
    };

    cargarPDF();

    // Limpiar blob URL cuando se desmonte el componente o cambien las dependencias
    return () => {
      cancelled = true;
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
      // También limpiar el estado si existe
      setPdfBlobUrl((prev: string | null) => {
        if (prev) {
          window.URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [processId, documento.id, viendoPDF]);

  const handleDescargarVersion = async () => {
    try {
      if (!processId || !documento.id) {
        toast.error('No se puede descargar', {
          id: 'download',
          description: 'Falta información del proceso o documento'
        });
        return;
      }

      const version = documento.versiones.find(v => v.numero === versionSeleccionada);

      if (version && version.downloadUrl) {
        toast.loading(`Descargando versión ${versionSeleccionada}...`, { id: 'download' });
        await disciplinaryService.downloadFileFromUrl(version.downloadUrl, `Version-${versionSeleccionada}-${documento.nombre}`);
        toast.success('Versión descargada', { id: 'download' });
        return;
      }

      toast.loading('Generando PDF...', { id: 'download' });

      // Fallback para documentos sin URL específica de versión
      const endpoint = API_MODE === 'direct'
        ? `/disciplinary-processes/${processId}/documents/${documento.id}/download`
        : `/api/v1/disciplinary-processes/${processId}/documents/${documento.id}/download`;
      const downloadUrl = buildApiUrl('control-disciplinario', endpoint);
      const token = localStorage.getItem('esap_access_token');

      const headers: HeadersInit = {
        'Accept': 'application/octet-stream',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Verificar si ya es PDF
      const fileType = blob.type || '';
      const isPDF = fileType === 'application/pdf' || documento.nombre.toLowerCase().endsWith('.pdf');

      if (isPDF) {
        // Si ya es PDF, descargarlo directamente
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documento.nombre}_v${versionSeleccionada}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Convertir a PDF usando jsPDF
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            let yPos = margin;

            // Encabezado
            pdf.setFillColor(0, 61, 165);
            pdf.rect(0, 0, pageWidth, 50, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.text('VERSIÓN DE DOCUMENTO', pageWidth / 2, 25, { align: 'center' });
            pdf.setFontSize(12);
            pdf.text(`Versión ${versionSeleccionada}`, pageWidth / 2, 38, { align: 'center' });

            // Información del documento
            pdf.setTextColor(0, 0, 0);
            yPos = 70;
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Información del Documento', margin, yPos);

            yPos += 15;
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Nombre: ${documento.nombre}`, margin, yPos);

            yPos += 10;
            pdf.text(`Tipo: ${documento.tipo.toUpperCase()}`, margin, yPos);

            yPos += 10;
            pdf.text(`Etapa: ${documento.etapa}`, margin, yPos);

            yPos += 10;
            pdf.text(`Tamaño: ${documento.tamaño}`, margin, yPos);

            yPos += 10;
            pdf.text(`Fecha de Carga: ${new Date(documento.fechaCarga).toLocaleDateString('es-ES')}`, margin, yPos);

            yPos += 10;
            pdf.text(`Cargado por: ${documento.usuarioCarga}`, margin, yPos);

            if (documento.descripcion) {
              yPos += 15;
              pdf.setFont('helvetica', 'bold');
              pdf.text('Descripción:', margin, yPos);
              yPos += 10;
              pdf.setFont('helvetica', 'normal');
              const descLines = pdf.splitTextToSize(documento.descripcion, pageWidth - 2 * margin);
              pdf.text(descLines, margin, yPos);
              yPos += descLines.length * 7;
            }

            // Información de la versión
            const versionData = documento.versiones.find(v => v.numero === versionSeleccionada);
            if (versionData) {
              yPos += 15;
              pdf.setFont('helvetica', 'bold');
              pdf.text(`Información de la Versión ${versionSeleccionada}:`, margin, yPos);
              yPos += 10;
              pdf.setFont('helvetica', 'normal');
              pdf.text(`Fecha: ${new Date(versionData.fecha).toLocaleDateString('es-ES')}`, margin, yPos);
              yPos += 10;
              pdf.text(`Usuario: ${versionData.usuario}`, margin, yPos);
              if (versionData.cambios) {
                yPos += 10;
                pdf.text('Cambios:', margin, yPos);
                yPos += 7;
                const cambiosLines = pdf.splitTextToSize(versionData.cambios, pageWidth - 2 * margin);
                pdf.text(cambiosLines, margin, yPos);
                yPos += cambiosLines.length * 7;
              }
            }

            // Nota sobre el contenido original
            if (!isPDF) {
              yPos += 15;
              pdf.setFont('helvetica', 'bold');
              pdf.text('Nota:', margin, yPos);
              yPos += 10;
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              const notaText = `El contenido original del archivo no se puede mostrar en este PDF. Por favor, descargue el archivo original para ver su contenido completo.`;
              const notaLines = pdf.splitTextToSize(notaText, pageWidth - 2 * margin);
              pdf.text(notaLines, margin, yPos);
            }

            // Pie de página
            pdf.setFontSize(8);
            pdf.setTextColor(128, 128, 128);
            pdf.text(
              `Generado el ${new Date().toLocaleString('es-ES')}`,
              pageWidth / 2,
              pageHeight - 15,
              { align: 'center' }
            );

            // Descargar el PDF generado
            pdf.save(`${documento.nombre}_v${versionSeleccionada}.pdf`);

            toast.success('PDF generado exitosamente', {
              id: 'download',
              description: `${documento.nombre} (Versión ${versionSeleccionada})`
            });
          } catch (error: any) {
            console.error('Error al generar PDF:', error);
            // Si falla la generación del PDF, intentar descargar el archivo original
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${documento.nombre}_v${versionSeleccionada}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Descarga completada', {
              id: 'download',
              description: `${documento.nombre} (Versión ${versionSeleccionada})`
            });
          }
        };
        reader.readAsDataURL(blob);
        return; // Salir aquí, la descarga se manejará en el callback
      }

      toast.success('Descarga completada', {
        id: 'download',
        description: `${documento.nombre} (Versión ${versionSeleccionada})`
      });
    } catch (error: any) {
      toast.error('Error al descargar', {
        id: 'download',
        description: error.message || 'No se pudo descargar el documento'
      });
    }
  };

  const handleCerrarVisor = () => {
    setViendoPDF(false);
    // El blob URL se limpiará automáticamente por el useEffect
  };

  // Función para limpiar el estado cuando se cierra el modal
  const handleCerrarModal = () => {
    // Limpiar todos los estados
    setViendoPDF(false);
    setCargandoPDF(false);
    setErrorPDF(null);
    setTipoArchivo('pdf');
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    // Llamar al onClose original
    onClose();
  };

  // Construir URL del documento para el visor
  // Nota: onClose se pasa como prop y se usa para cerrar el modal completo
  const getDocumentUrl = (forViewer: boolean = false) => {
    if (!processId || !documento.id) return '';
    // En modo directo: /disciplinary-processes/...
    // En modo gateway: /api/v1/disciplinary-processes/...
    const endpoint = API_MODE === 'direct'
      ? `/disciplinary-processes/${processId}/documents/${documento.id}/download${forViewer ? '?view=true' : ''}`
      : `/api/v1/disciplinary-processes/${processId}/documents/${documento.id}/download${forViewer ? '?view=true' : ''}`;
    return buildApiUrl('control-disciplinario', endpoint);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleCerrarModal}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                    {documento.nombre}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Versión {versionSeleccionada} de {documento.version}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <Badge>{documento.tipo}</Badge>
                <Badge className="bg-purple-100 text-purple-700">{documento.etapa}</Badge>
                {documento.metadatos.firmado && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    ✓ Firmado
                  </Badge>
                )}
                {documento.metadatos.notificado && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    ✓ Notificado
                  </Badge>
                )}
              </div>
            </div>

            {/* Botón Editar - Solo para Autos DIGITALES del sistema y si hay función de edición */}
            {documento.tipo === 'auto' && documento.metadatos?.esAutoDigital && onEdit && (
              <button
                onClick={() => onEdit(documento)}
                className="p-2 mr-2 hover:bg-white/50 rounded-lg transition-colors text-blue-700 bg-blue-50 border border-blue-200 flex items-center gap-1"
                title="Editar Documento"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">Editar</span>
              </button>
            )}

            <button onClick={handleCerrarModal} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Vista previa del documento - Apartado separado cuando está activo */}
          {viendoPDF && (documento.urlExterna || (processId && documento.id)) && (
            <div className="border-b flex-shrink-0" style={{ height: '500px' }}>
              <Card className="rounded-none border-0 overflow-hidden h-full flex flex-col">
                {/* Header del visor */}
                <div className="bg-gradient-to-r from-[#003DA5] to-[#0056D6] px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 text-white">
                    <Eye className="w-4 h-4" />
                    <span className="font-medium text-sm">
                      {documento.nombre} - Versión {versionSeleccionada}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (documento.urlExterna) {
                          window.open(documento.urlExterna, '_blank');
                        } else if (pdfBlobUrl) {
                          window.open(pdfBlobUrl, '_blank');
                        } else {
                          window.open(getDocumentUrl(), '_blank');
                        }
                      }}
                      className="h-7 px-3 gap-1 text-white hover:bg-white/10"
                      title="Abrir en nueva pestaña"
                      disabled={!documento.urlExterna && !pdfBlobUrl && cargandoPDF}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Nueva pestaña
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCerrarVisor}
                      className="h-7 px-3 gap-1 text-white hover:bg-white/10"
                    >
                      <X className="w-3 h-3" />
                      Ocultar
                    </Button>
                  </div>
                </div>

                {/* Área del visor */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {/* Si hay URL externa, mostrar en iframe */}
                  {documento.urlExterna && (
                    <iframe
                      src={documento.urlExterna}
                      className="w-full h-full border-0"
                      title={`Vista previa de ${documento.nombre}`}
                      style={{ height: '100%', width: '100%' }}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  )}
                  {/* Si no hay URL externa, mostrar el archivo local */}
                  {!documento.urlExterna && cargandoPDF && (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
                        <p className="text-lg font-semibold text-gray-700 mb-2">Cargando documento...</p>
                        <p className="text-sm text-gray-500">{documento.nombre}</p>
                      </div>
                    </div>
                  )}
                  {!documento.urlExterna && errorPDF && !cargandoPDF && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600 font-semibold mb-2">Error al cargar el documento</p>
                        <p className="text-sm text-gray-600 mb-4">{errorPDF}</p>
                        <Button
                          onClick={async () => {
                            try {
                              setErrorPDF(null);
                              setCargandoPDF(true);

                              const endpoint = API_MODE === 'direct'
                                ? `/disciplinary-processes/${processId}/documents/${documento.id}/download`
                                : `/api/v1/disciplinary-processes/${processId}/documents/${documento.id}/download`;
                              const downloadUrl = buildApiUrl('control-disciplinario', endpoint);
                              const token = localStorage.getItem('esap_access_token');

                              const headers: HeadersInit = {
                                'Accept': 'application/octet-stream',
                              };

                              if (token) {
                                headers['Authorization'] = `Bearer ${token}`;
                              }

                              const res = await fetch(downloadUrl, {
                                method: 'GET',
                                headers,
                              });

                              if (!res.ok) {
                                const errorText = await res.text();
                                let errorMessage = `Error ${res.status}: ${res.statusText}`;
                                try {
                                  const errorJson = JSON.parse(errorText);
                                  errorMessage = errorJson.message || errorMessage;
                                } catch {
                                  // Si no es JSON, usar el texto del error
                                }
                                throw new Error(errorMessage);
                              }

                              const blob = await res.blob();

                              // Detectar tipo de archivo
                              const nombreArchivo = documento.nombre.toLowerCase();
                              let tipoDetectado: 'pdf' | 'word' | 'ppt' | 'xls' | 'otro' = 'otro';

                              if (nombreArchivo.endsWith('.pdf')) {
                                tipoDetectado = 'pdf';
                                const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
                                const bytes = new Uint8Array(arrayBuffer);
                                const pdfHeader = String.fromCharCode(...bytes);

                                if (pdfHeader !== '%PDF') {
                                  const text = await blob.text();
                                  if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<!doctype')) {
                                    throw new Error('El servidor devolvió HTML en lugar de PDF. Verifique la autenticación y la URL.');
                                  }
                                  throw new Error('El archivo no es un PDF válido.');
                                }
                              } else if (nombreArchivo.endsWith('.doc') || nombreArchivo.endsWith('.docx')) {
                                tipoDetectado = 'word';
                              } else if (nombreArchivo.endsWith('.ppt') || nombreArchivo.endsWith('.pptx')) {
                                tipoDetectado = 'ppt';
                              } else if (nombreArchivo.endsWith('.xls') || nombreArchivo.endsWith('.xlsx')) {
                                tipoDetectado = 'xls';
                              }

                              setTipoArchivo(tipoDetectado);

                              const url = window.URL.createObjectURL(blob);
                              if (pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl);
                              setPdfBlobUrl(url);
                              setErrorPDF(null);
                              setCargandoPDF(false);
                            } catch (err: any) {
                              setErrorPDF(err.message || 'Error al cargar el documento');
                              setCargandoPDF(false);
                            }
                          }}
                          className="bg-blue-600 text-white"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reintentar
                        </Button>
                      </div>
                    </div>
                  )}
                  {pdfBlobUrl && !cargandoPDF && !errorPDF && tipoArchivo === 'pdf' && (
                    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                      <Viewer
                        fileUrl={pdfBlobUrl}
                        plugins={[defaultLayoutPluginInstance]}
                      />
                    </Worker>
                  )}
                  {pdfBlobUrl && !cargandoPDF && !errorPDF && tipoArchivo !== 'pdf' && (
                    <div className="h-full w-full bg-white relative flex items-center justify-center">
                      {tipoArchivo === 'html' ? (
                        <iframe
                          src={pdfBlobUrl}
                          className="w-full h-full border-none bg-white p-8"
                          title="Vista Previa HTML"
                        />
                      ) : (
                        <object
                          data={pdfBlobUrl}
                          type={
                            tipoArchivo === 'word'
                              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                              : tipoArchivo === 'ppt'
                                ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                                : tipoArchivo === 'xls'
                                  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                                  : 'application/octet-stream'
                          }
                          className="w-full h-full"
                          style={{ minHeight: '100%', width: '100%' }}
                        >
                          {/* Fallback: si el object no funciona, mostrar mensaje y opción de descarga */}
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <FileText className="w-16 h-16 text-gray-400 mb-4" />
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                              Vista previa no disponible
                            </p>
                            <p className="text-sm text-gray-600 mb-6">
                              El navegador no puede mostrar este tipo de archivo directamente.
                            </p>
                            <Button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = pdfBlobUrl;
                                link.download = documento.nombre;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              <Download className="w-4 h-4 mr-2" />
                              Descargar Original (PDF)
                            </Button>
                          </div>

                        </object>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )
          }

          {/* Información del Documento - Siempre visible */}
          <div className="p-6 overflow-y-auto flex-1" style={{ maxHeight: viendoPDF ? 'calc(95vh - 700px)' : 'calc(95vh - 280px)' }}>
            {/* Información del Documento */}
            <Card className="p-4 mb-6 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Usuario Carga</p>
                  <p className="font-semibold text-gray-900">{documento.usuarioCarga}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Fecha Carga</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(documento.fechaCarga).toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Tamaño</p>
                  <p className="font-semibold text-gray-900">{documento.tamaño}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Folios</p>
                  <p className="font-semibold text-gray-900">
                    {documento.metadatos.folios || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-1">Descripción</p>
                <p className="text-sm text-gray-700">{documento.descripcion}</p>
              </div>
            </Card>

            {/* Enlace Externo */}
            {documento.urlExterna && (
              <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Enlace Externo</p>
                    <a
                      href={documento.urlExterna}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {documento.urlExterna}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {/* Historial de Versiones */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Versiones
              </h3>
              <div className="space-y-3">
                {documento.versiones.map((version) => (
                  <Card
                    key={version.numero}
                    className={`p-4 cursor-pointer border-l-4 transition-all ${versionSeleccionada === version.numero
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                      }`}
                    onClick={() => setVersionSeleccionada(version.numero)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: '#003DA5' }}
                      >
                        v{version.numero}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{version.cambios}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {version.usuario} • {new Date(version.fecha).toLocaleString('es-CO')} • {version.tamaño}
                        </p>
                      </div>
                      {versionSeleccionada === version.numero && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div >

        {/* Footer */}
        < div className="p-6 border-t bg-gray-50 flex gap-3" >
          <Button
            onClick={handleDescargarVersion}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Versión {versionSeleccionada}
          </Button>
          {
            (documento.urlExterna || (processId && documento.id)) && (
              <Button
                onClick={() => setViendoPDF(!viendoPDF)}
                className={viendoPDF ? "bg-gray-600" : "bg-purple-600"}
              >
                <Eye className="w-4 h-4 mr-2" />
                {viendoPDF ? 'Ocultar Documento' : 'Mostrar Documento'}
              </Button>
            )
          }
          <Button onClick={handleCerrarModal} className="bg-gray-500 ml-auto">
            Cerrar
          </Button>
        </div >
      </motion.div >
    </motion.div >
  );
}

// Modal de Subir Documento
function ModalSubirDocumento({
  procesoId,
  defaultEtapa,
  onClose,
  onConfirm,
  onSwitchType
}: {
  procesoId: string;
  defaultEtapa?: string;
  onClose: () => void;
  onConfirm: (doc: any) => void;
  onSwitchType?: (tipo: 'auto' | 'evidencia' | 'oficio') => void;
}) {
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<Documento['tipo']>('otro');
  const [etapa, setEtapa] = useState(defaultEtapa || '');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [usarEnlaceExterno, setUsarEnlaceExterno] = useState(false);
  const [urlExterna, setUrlExterna] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Sync state with prop
  useEffect(() => {
    if (defaultEtapa) {
      setEtapa(defaultEtapa);
    }
  }, [defaultEtapa]);

  // Tipos de archivo permitidos
  const tiposPermitidos = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  ];

  const extensionesPermitidas = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];

  const validarTipoArchivo = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const tipoMime = file.type;

    // Verificar por extensión
    const extensionValida = extensionesPermitidas.some(ext =>
      file.name.toLowerCase().endsWith(ext.toLowerCase())
    );

    // Verificar por tipo MIME (puede estar vacío en algunos navegadores)
    const tipoMimeValido = !tipoMime || tiposPermitidos.includes(tipoMime);

    return extensionValida && tipoMimeValido;
  };

  const handleConfirmar = () => {
    if (!nombreDocumento.trim()) {
      toast.error('Campo Requerido', { description: 'Ingrese el nombre del documento' });
      return;
    }
    if (!usarEnlaceExterno && !archivo) {
      toast.error('Archivo Requerido', { description: 'Seleccione un archivo para cargar' });
      return;
    }
    if (usarEnlaceExterno && !urlExterna.trim()) {
      toast.error('URL Requerida', { description: 'Ingrese la URL del enlace externo' });
      return;
    }
    if (!usarEnlaceExterno && archivo && !validarTipoArchivo(archivo)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx) y Excel (.xls, .xlsx)'
      });
      return;
    }

    onConfirm({
      nombre: nombreDocumento,
      tipo: tipoDocumento,
      etapa,
      descripcion,
      archivo,
      urlExterna: usarEnlaceExterno ? urlExterna : undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Cargar Documento</h3>
              <p className="text-sm text-gray-600">Agregar documento al expediente electrónico</p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos permitidos: PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx), Excel (.xls, .xlsx)
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Nombre del Documento <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nombreDocumento}
              onChange={(e) => setNombreDocumento(e.target.value)}
              placeholder="Ej: Auto de Apertura de Investigación"
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Tipo de Documento <span className="text-red-600">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => {
                const nuevoTipo = e.target.value as Documento['tipo'];
                setTipoDocumento(nuevoTipo);
                if (onSwitchType && (nuevoTipo === 'auto' || nuevoTipo === 'evidencia' || nuevoTipo === 'oficio')) {
                  onSwitchType(nuevoTipo);
                }
              }}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="evidencia">Evidencia</option>
              <option value="oficio">Oficio</option>
              <option value="notificacion">Constancia de Notificación</option>
              <option value="acta">Acta</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Etapa */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Etapa Procesal <span className="text-red-600">*</span>
            </label>
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione...</option>
              <option value="Noticia Disciplinaria">Noticia Disciplinaria</option>
              <option value="Valoración">Valoración</option>
              <option value="Indagación Preliminar">Indagación Preliminar</option>
              <option value="Investigación Formal">Investigación Formal</option>
              <option value="Descargos">Descargos</option>
              <option value="Cierre de Investigación">Cierre de Investigación</option>
              {defaultEtapa && ![
                "Noticia Disciplinaria", "Valoración", "Indagación Preliminar",
                "Investigación Formal", "Descargos", "Cierre de Investigación"
              ].includes(defaultEtapa) && (
                  <option value={defaultEtapa}>{defaultEtapa}</option>
                )}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa brevemente el contenido del documento..."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Opción: Enlace Externo */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={usarEnlaceExterno}
                onChange={(e) => setUsarEnlaceExterno(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="font-semibold text-gray-900">
                Usar enlace externo (Google Drive, OneDrive, etc.)
              </label>
            </div>
            {usarEnlaceExterno && (
              <input
                type="url"
                value={urlExterna}
                onChange={(e) => setUrlExterna(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            )}
          </Card>

          {/* Archivo Local */}
          {!usarEnlaceExterno && (
            <div
              className={`relative w-full h-32 border-2 border-gray-300 rounded-lg flex items-center justify-center cursor-pointer ${dragActive ? 'bg-gray-100' : ''
                }`}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const file = files[0];
                  if (validarTipoArchivo(file)) {
                    setArchivo(file);
                  } else {
                    toast.error('Tipo de archivo no permitido', {
                      description: 'Solo se permiten archivos PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx) y Excel (.xls, .xlsx)'
                    });
                  }
                }
              }}
            >
              {archivo ? (
                <p className="text-sm text-gray-600">
                  Seleccionado: {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
                </p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-gray-600" />
                  <p className="text-sm text-gray-600">Arrastre y suelte un archivo aquí</p>
                  <p className="text-xs text-gray-500">o haga clic para seleccionar</p>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    if (validarTipoArchivo(file)) {
                      setArchivo(file);
                    } else {
                      toast.error('Tipo de archivo no permitido', {
                        description: 'Solo se permiten archivos PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx) y Excel (.xls, .xlsx)'
                      });
                      e.target.value = ''; // Limpiar el input
                    }
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button onClick={handleConfirmar} style={{ background: '#10B981', color: '#FFFFFF' }}>
            <Upload className="w-4 h-4 mr-2" />
            Cargar Documento
          </Button>
          <Button onClick={onClose} className="bg-gray-500">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Función para validar si un string es un UUID válido
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Componente Principal
export function ExpedienteElectronico() {
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [showModalVisor, setShowModalVisor] = useState(false);
  const [showModalSubir, setShowModalSubir] = useState(false);
  const [editingAutoForModal, setEditingAutoForModal] = useState<Documento | null>(null);

  // Modales especializados
  const [showModalAutos, setShowModalAutos] = useState(false);
  const [showModalEvidencias, setShowModalEvidencias] = useState(false);
  const [showModalOficios, setShowModalOficios] = useState(false);
  const [showModalSeleccion, setShowModalSeleccion] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);
  const [vistaActual, setVistaActual] = useState<'documentos' | 'indice' | 'auditoria'>('documentos');
  const [showModalFlujo, setShowModalFlujo] = useState(false);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [cargandoProcesos, setCargandoProcesos] = useState(false);

  // Estados para el buscador de procesos
  const [procesoSearchQuery, setProcesoSearchQuery] = useState('');
  const [showProcesoDropdown, setShowProcesoDropdown] = useState(false);
  const [procesosRecientes, setProcesosRecientes] = useState<Proceso[]>([]);
  const [radicadosDisponibles, setRadicadosDisponibles] = useState<string[]>([]);

  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);

  // MANEJO DE EDICIÓN DE DOCUMENTOS
  const handleGuardarEdicion = async (nuevoContenido: string, nuevaVersion: number) => {
    try {
      if (!editingDoc) return;

      toast.loading('Guardando nueva versión...', { id: 'save-version' });

      console.log('Guardando edición para documento ID:', editingDoc.id);

      // 1. Actualizar contenido en backend (esto debe crear nueva versión)
      await disciplinaryService.updateAutoContent(editingDoc.id, nuevoContenido);

      // 2. Recargar documentos
      if (procesoSeleccionado?.id) {
        const respuesta = await disciplinaryService.getDocumentosExpediente(procesoSeleccionado.id);
        if (respuesta && respuesta.documentos) {
          setDocumentos(respuesta.documentos as Documento[]);

          // Actualizar documento en edición si sigue abierto (opcional, por ahora cerramos)
          setShowEditor(false);
          setEditingDoc(null);

          toast.success('Nueva versión guardada exitosamente', { id: 'save-version' });
        }
      }
    } catch (error: any) {
      console.error('Error al guardar edición:', error);
      toast.error('Error al guardar versión', {
        id: 'save-version',
        description: error.message || 'No se pudo actualizar el documento'
      });
    }
  };

  // Cargar procesos desde la API
  useEffect(() => {
    const cargarProcesos = async () => {
      try {
        setCargandoProcesos(true);
        const procesosApi = await disciplinaryService.getAllProcesos();

        // Convertir procesos de la API al formato del componente
        const procesosConvertidos: Proceso[] = procesosApi.map(p => {
          // Manejar disciplinable que puede ser un objeto o un array
          let denunciadoNombre = 'Sin nombre';
          if (p.news?.disciplinable) {
            if (Array.isArray(p.news.disciplinable) && p.news.disciplinable.length > 0) {
              denunciadoNombre = p.news.disciplinable[0]?.nombre || 'Sin nombre';
            } else if (typeof p.news.disciplinable === 'object' && p.news.disciplinable.nombre) {
              denunciadoNombre = p.news.disciplinable.nombre;
            } else if (typeof p.news.disciplinable === 'string') {
              denunciadoNombre = p.news.disciplinable;
            }
          }

          return {
            id: p.id,
            numero: p.radicadoProceso,
            denunciado: denunciadoNombre,
            etapaActual: p.etapaActual || 'Sin etapa',
            fechaInicio: p.createdAt || new Date().toISOString(),
            estado: p.estado || 'ACTIVO',
          };
        });

        setProcesos(procesosConvertidos);

        // Extraer solo los radicados para el autocomplete
        const radicados = procesosConvertidos.map(p => p.numero);
        setRadicadosDisponibles(radicados);

        // Seleccionar el primer proceso si hay alguno
        if (procesosConvertidos.length > 0 && !procesoSeleccionado) {
          setProcesoSeleccionado(procesosConvertidos[0]);
          setProcesoSearchQuery(procesosConvertidos[0].numero);
          setProcesosRecientes(procesosConvertidos.slice(0, 5));
        }
      } catch (error: any) {
        console.error('Error al cargar procesos:', error);
        toast.error('Error al cargar procesos', {
          description: error.message || 'No se pudieron cargar los procesos'
        });
        // Si falla, usar datos mock como fallback
        setProcesos(PROCESOS_MOCK);
      } finally {
        setCargandoProcesos(false);
      }
    };

    cargarProcesos();
  }, []);

  // Cargar documentos desde la BD cuando se selecciona un proceso
  useEffect(() => {
    const cargarDocumentos = async () => {
      if (!procesoSeleccionado?.id) {
        setDocumentos([]);
        return;
      }

      // Validar que el ID sea un UUID válido
      if (!isValidUUID(procesoSeleccionado.id)) {
        console.warn('ID de proceso inválido (no es UUID):', procesoSeleccionado.id);
        toast.error('ID de proceso inválido', {
          description: 'El proceso seleccionado no tiene un ID válido. Por favor, selecciona un proceso de la lista.'
        });
        setDocumentos([]);
        return;
      }

      try {
        setCargandoDocumentos(true);
        const respuesta = await disciplinaryService.getDocumentosExpediente(procesoSeleccionado.id);

        if (respuesta && respuesta.documentos) {
          console.log('Documentos cargados desde BD:', respuesta.documentos.length);
          // El backend ya devuelve el formato correcto, hacer cast explícito
          setDocumentos(respuesta.documentos as Documento[]);
        } else {
          console.warn('No se recibieron documentos en la respuesta:', respuesta);
          setDocumentos([]);
        }
      } catch (error: any) {
        console.error('Error al cargar documentos:', error);
        toast.error('Error al cargar documentos', {
          description: error.message || 'No se pudieron cargar los documentos del expediente'
        });
        setDocumentos([]);
      } finally {
        setCargandoDocumentos(false);
      }
    };

    cargarDocumentos();
  }, [procesoSeleccionado?.id, refreshTrigger]);

  // Sincronizar el input con el proceso seleccionado
  useEffect(() => {
    if (procesoSeleccionado) {
      setProcesoSearchQuery(procesoSeleccionado.numero);
    }
  }, [procesoSeleccionado]);

  // Manejo de Modales Especializados
  const handleCerrarModalesEspecializados = () => {
    setShowModalAutos(false);
    setShowModalEvidencias(false);
    setShowModalOficios(false);
    setShowModalAutos(false);
    setShowModalEvidencias(false);
    setShowModalOficios(false);
    setRefreshTrigger(prev => prev + 1);
    setEditingAutoForModal(null); // Limpiar edición
  };

  const handleSeleccionTipoDocumento = (tipo: 'auto' | 'evidencia' | 'oficio' | 'otro') => {
    setShowModalSeleccion(false);
    if (tipo === 'auto') setShowModalAutos(true);
    else if (tipo === 'evidencia') setShowModalEvidencias(true);
    else if (tipo === 'oficio') setShowModalOficios(true);
    else setShowModalSubir(true);
  };

  // Helper para mapear proceso
  const mapProcesoToEspecializado = (proc: Proceso | null): any => {
    if (!proc) return null;
    return {
      id: proc.id,
      numeroProceso: proc.numero,
      etapaActual: proc.etapaActual,
      denunciante: { nombre: 'N/A', tipoIdentificacion: 'CC', numeroIdentificacion: '000' },
      profesionalAsignado: { nombre: 'N/A', tipoIdentificacion: 'CC', numeroIdentificacion: '000' },
      denunciado: typeof proc.denunciado === 'string'
        ? { nombre: proc.denunciado, tipoIdentificacion: 'CC', numeroIdentificacion: '000' }
        : proc.denunciado
    };
  };

  const handleVerDocumento = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    setShowModalVisor(true);

    // Registrar visualización en auditoría
    toast.success('Documento Visualizado', {
      description: 'Actividad registrada en auditoría'
    });
  };

  const handleDescargarDocumento = async (doc: Documento) => {
    try {
      if (!procesoSeleccionado?.id) {
        toast.error('Proceso no seleccionado', {
          description: 'Debe seleccionar un proceso para descargar documentos'
        });
        return;
      }

      if (!doc.id) {
        toast.error('Documento inválido', {
          description: 'El documento no tiene un ID válido'
        });
        return;
      }

      toast.loading('Descargando documento...', { id: 'download-doc' });

      toast.loading('Descargando documento...', { id: 'download-doc' });

      if (doc.downloadUrl) {
        await disciplinaryService.downloadFileFromUrl(doc.downloadUrl, doc.nombre);
      } else {
        await disciplinaryService.downloadDocument(
          procesoSeleccionado.id,
          doc.id,
          doc.nombre
        );
      }

      toast.success('Descarga completada', {
        id: 'download-doc',
        description: doc.nombre
      });
    } catch (error: any) {
      toast.error('Error al descargar', {
        id: 'download-doc',
        description: error.message || 'No se pudo descargar el documento'
      });
    }
  };

  const handleSubirDocumento = async (docData: any) => {
    try {
      if (!procesoSeleccionado?.id) {
        toast.error('Proceso no seleccionado', {
          description: 'Debe seleccionar un proceso para cargar documentos'
        });
        return;
      }

      if (!docData.archivo && !docData.urlExterna) {
        toast.error('Archivo requerido', {
          description: 'Debe seleccionar un archivo o proporcionar una URL externa'
        });
        return;
      }

      const toastId = toast.loading('Cargando documento...', {
        description: 'Por favor espere'
      });

      // Convertir tipoDocumento al formato esperado por el backend
      const tipoBackend = docData.tipo === 'auto' ? 'AUTO' :
        docData.tipo === 'evidencia' ? 'EVIDENCIA' :
          docData.tipo === 'oficio' ? 'OFICIO' :
            docData.tipo === 'notificacion' ? 'NOTIFICACION' :
              docData.tipo === 'acta' ? 'ACTA' :
                'DOCUMENTO';

      // Guardar solo la descripción simple (el backend recibe los campos por separado)
      const descripcionFinal = docData.descripcion || '';

      // Obtener información del usuario actual
      const usuarioActual = localStorage.getItem('esap_user_name') || 'Usuario del Sistema';

      let resultado;

      // Si es un enlace externo, crear un documento con URL externa
      if (docData.urlExterna) {
        // Crear un FormData con la URL externa en lugar de un archivo
        const formData = new FormData();
        formData.append('urlExterna', docData.urlExterna);
        formData.append('tipo', tipoBackend);
        if (descripcionFinal) formData.append('descripcion', descripcionFinal);
        if (docData.nombre) formData.append('nombre', docData.nombre);
        if (docData.etapa) formData.append('etapa', docData.etapa);
        if (usuarioActual) formData.append('usuarioCarga', usuarioActual);

        // Usar el mismo endpoint pero con URL externa
        const endpoint = API_MODE === 'direct'
          ? `/disciplinary-processes/${procesoSeleccionado.id}/documents`
          : `/api/v1/disciplinary-processes/${procesoSeleccionado.id}/documents`;
        const url = buildApiUrl('control-disciplinario', endpoint);
        const token = localStorage.getItem('esap_access_token');

        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Error ${response.status}: ${response.statusText}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            // Si no es JSON, usar el texto del error
          }
          throw new Error(errorMessage);
        }

        resultado = await response.json();
      } else {
        // Usar el servicio para subir el documento local
        resultado = await disciplinaryService.uploadDocumento(
          procesoSeleccionado.id,
          docData.archivo!,
          tipoBackend,
          descripcionFinal,
          docData.nombre,
          docData.etapa || undefined,
          usuarioActual
        );
      }

      toast.success('Documento cargado exitosamente', {
        id: toastId,
        description: `${docData.nombre} ha sido agregado al expediente`
      });

      setShowModalSubir(false);

      // Recargar los documentos del expediente inmediatamente
      if (procesoSeleccionado?.id) {
        try {
          // Esperar un momento para que el backend procese el documento
          await new Promise(resolve => setTimeout(resolve, 500));

          const respuesta = await disciplinaryService.getDocumentosExpediente(procesoSeleccionado.id);

          if (respuesta && respuesta.documentos) {
            setDocumentos(respuesta.documentos as Documento[]);
            console.log('Documentos recargados:', respuesta.documentos.length);
          } else {
            console.warn('Respuesta de documentos vacía o inválida:', respuesta);
            // Intentar recargar una vez más después de un segundo
            setTimeout(async () => {
              try {
                const respuestaRetry = await disciplinaryService.getDocumentosExpediente(procesoSeleccionado.id);
                if (respuestaRetry && respuestaRetry.documentos) {
                  setDocumentos(respuestaRetry.documentos as Documento[]);
                }
              } catch (e) {
                console.error('Error en retry de recarga:', e);
              }
            }, 1000);
          }
        } catch (error: any) {
          console.error('Error al recargar documentos:', error);
          toast.warning('Documento cargado, pero no se pudo actualizar la lista', {
            description: 'Por favor, recargue la página para ver el nuevo documento'
          });
        }
      }

    } catch (error: any) {
      toast.error('Error al cargar documento', {
        id: toastId,
        description: error.message || 'No se pudo cargar el documento'
      });
    }
  };

  const handleExportarExpediente = async () => {
    // YA NO ES NECESARIO SELECCIONAR UN PROCESO - EXPORTACIÓN MASIVA
    // if (!procesoSeleccionado) { ... }

    const toastId = toast.loading('Generando Archivo ZIP...', {
      description: '📋 Recopilando TODOS los expedientes disciplinarios\n📄 Generando PDFs individuales\n⏳ Esto puede tomar unos momentos...'
    });

    try {
      await disciplinaryService.downloadAllExpedientesZip();

      setTimeout(() => {
        toast.dismiss(toastId);
        toast.success('¡Exportación Masiva Completada!', {
          description: `Se ha descargado el archivo ZIP con todos los expedientes del sistema.`,
          duration: 5000
        });
      }, 500);
    } catch (error: any) {
      console.error('Error al exportar expedientes:', error);
      toast.error('Error al exportar expedientes', {
        id: toastId,
        description: error.message || 'No se pudo generar el ZIP de expedientes'
      });
    }
  };

  const handleImprimirIndice = () => {
    if (!procesoSeleccionado) {
      toast.error('Proceso no seleccionado', {
        description: 'Debe seleccionar un proceso para imprimir el índice'
      });
      return;
    }

    if (documentos.length === 0) {
      toast.warning('Índice vacío', {
        description: 'No hay documentos en el índice para imprimir'
      });
      return;
    }

    toast.info('Preparando Impresión...', {
      description: 'Abriendo vista previa de impresión'
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(0, 61, 165);
    doc.rect(0, 0, pageWidth, 90, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('ÍNDICE ELECTRÓNICO', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(16);
    doc.text('DEL EXPEDIENTE', pageWidth / 2, 48, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('OCID - ESAP', pageWidth / 2, 63, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCESO DISCIPLINARIO', 14, 105);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Número: ${procesoSeleccionado?.numero || 'N/A'}`, 14, 115);
    doc.text(`Denunciado: ${procesoSeleccionado?.denunciado || 'N/A'}`, 14, 123);
    doc.text(`Etapa: ${procesoSeleccionado?.etapaActual || 'N/A'}`, 14, 131);

    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', 14, 145);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${metrics.totalDocumentos} documentos`, 14, 155);
    doc.text(`Autos: ${metrics.autos} | Evidencias: ${metrics.evidencias}`, 14, 163);

    autoTable(doc, {
      startY: 175,
      head: [['Folio', 'Documento', 'Tipo', 'Etapa', 'Fecha', 'Usuario', 'Estado']],
      body: documentos.map((d, i) => {
        let estado = [];
        if (d.metadatos.firmado) estado.push('✓F');
        if (d.metadatos.notificado) estado.push('✓N');
        return [
          String(i + 1).padStart(3, '0'),
          d.nombre,
          d.tipo.toUpperCase(),
          d.etapa,
          new Date(d.fechaCarga).toLocaleDateString('es-CO'),
          d.usuarioCarga,
          estado.join(' ')
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [0, 61, 165], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 28 },
        6: { cellWidth: 15, halign: 'center' }
      },
      margin: { left: 10, right: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('✓F = Firmado | ✓N = Notificado', 14, finalY);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`${new Date().toLocaleString('es-CO')}`, 14, pageHeight - 10);
      doc.text(`Pág. ${i}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Convertir el PDF a blob y abrirlo en nueva ventana para imprimir
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Abrir en nueva ventana
    const printWindow = window.open(pdfUrl, '_blank');

    if (printWindow) {
      // Esperar a que se cargue el PDF y luego abrir el diálogo de impresión
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          toast.success('Diálogo de Impresión Abierto', {
            description: 'Índice Electrónico listo para imprimir'
          });
        }, 250);
      };
    } else {
      // Si no se puede abrir la ventana (bloqueador de pop-ups), descargar el archivo
      const nombreArchivo = `Indice_${procesoSeleccionado?.numero || 'Exp'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);
      toast.warning('Ventana Bloqueada', {
        description: 'El archivo se ha descargado. Permite ventanas emergentes para imprimir directamente.'
      });
    }
  };

  const handleSeleccionarProceso = async (radicado: string) => {
    try {
      // Buscar el proceso completo por radicado
      const procesoCompleto = await disciplinaryService.getProcesoByRadicado(radicado);

      // Convertir al formato del componente
      let denunciadoNombre = 'Sin nombre';
      if (procesoCompleto.news?.disciplinable) {
        if (Array.isArray(procesoCompleto.news.disciplinable) && procesoCompleto.news.disciplinable.length > 0) {
          denunciadoNombre = procesoCompleto.news.disciplinable[0]?.nombre || 'Sin nombre';
        } else if (typeof procesoCompleto.news.disciplinable === 'object' && procesoCompleto.news.disciplinable.nombre) {
          denunciadoNombre = procesoCompleto.news.disciplinable.nombre;
        } else if (typeof procesoCompleto.news.disciplinable === 'string') {
          denunciadoNombre = procesoCompleto.news.disciplinable;
        }
      }

      const procesoConvertido: Proceso = {
        id: procesoCompleto.id,
        numero: procesoCompleto.radicadoProceso,
        denunciado: denunciadoNombre,
        etapaActual: procesoCompleto.etapaActual || 'Sin etapa',
        fechaInicio: procesoCompleto.createdAt || new Date().toISOString(),
        estado: procesoCompleto.estado || 'ACTIVO',
      };

      setProcesoSeleccionado(procesoConvertido);
      setProcesoSearchQuery(radicado);
      setShowProcesoDropdown(false);

      // Agregar a recientes si no está
      if (!procesosRecientes.find(p => p.numero === radicado)) {
        setProcesosRecientes([procesoConvertido, ...procesosRecientes.slice(0, 4)]);
      }

      toast.success('Proceso Seleccionado', {
        description: `Proceso: ${radicado}`
      });
    } catch (error: any) {
      console.error('Error al buscar proceso por radicado:', error);
      toast.error('Error al seleccionar proceso', {
        description: error.message || 'No se pudo encontrar el proceso'
      });
    }
  };

  // Filtrar radicados según búsqueda (solo por radicado)
  const radicadosFiltrados = radicadosDisponibles.filter(radicado => {
    const query = procesoSearchQuery.toLowerCase();
    return radicado.toLowerCase().includes(query);
  });

  const filteredDocumentos = documentos.filter(d => {
    const matchesSearch =
      d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.descripcion.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTipo = filterTipo === 'all' || d.tipo === filterTipo;

    return matchesSearch && matchesTipo;
  });

  // Calcular métricas
  const metrics = {
    totalDocumentos: documentos.length,
    autos: documentos.filter(d => d.tipo === 'auto').length,
    evidencias: documentos.filter(d => d.tipo === 'evidencia').length,
    oficios: documentos.filter(d => d.tipo === 'oficio').length,
    actas: documentos.filter(d => d.tipo === 'acta').length,
    notificaciones: documentos.filter(d => d.tipo === 'notificacion').length,
    firmados: documentos.filter(d => d.metadatos.firmado).length,
    notificados: documentos.filter(d => d.metadatos.notificado).length
  };

  return (
    <div className="w-full max-w-full">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <button className="hover:text-blue-600">Backoffice</button>
        <ChevronRight className="w-4 h-4" />
        <button className="hover:text-blue-600">Control Interno Disciplinario</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Expediente Electrónico</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6" style={{ color: '#003DA5' }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expediente Electrónico</h1>
              <p className="text-sm text-gray-600">RF005 - Gestión Documental Completa</p>
            </div>
          </div>

          <button
            onClick={handleExportarExpediente}
            className="px-5 py-2.5 rounded-lg text-white font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-105"
            style={{ background: '#DC2626' }}
            title="Descargar archivo ZIP con todos los expedientes del sistema"
          >
            <Package className="w-5 h-5" />
            Exportar Todos (ZIP)
          </button>
        </div>

        {/* Selector de Proceso - DESTACADO CON CARD NARANJA */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900">
                Proceso Disciplinario
              </label>
              <p className="text-xs text-gray-600">Seleccione el proceso para ver su expediente electrónico</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={procesoSearchQuery}
              onChange={(e) => setProcesoSearchQuery(e.target.value)}
              placeholder="Buscar proceso (ej: P-120-2025)..."
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white font-medium text-gray-900"
              onFocus={() => setShowProcesoDropdown(true)}
              onBlur={() => setTimeout(() => setShowProcesoDropdown(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && radicadosFiltrados.length === 1) {
                  handleSeleccionarProceso(radicadosFiltrados[0]);
                }
              }}
            />
            {showProcesoDropdown && radicadosFiltrados.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
                {radicadosFiltrados.map(radicado => (
                  <div
                    key={radicado}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 font-medium"
                    onClick={() => handleSeleccionarProceso(radicado)}
                  >
                    {radicado}
                  </div>
                ))}
              </div>
            )}
            {showProcesoDropdown && radicadosFiltrados.length === 0 && procesoSearchQuery && (
              <div className="absolute left-0 right-0 top-full z-10 bg-white border border-gray-300 rounded-b-lg shadow-lg">
                <div className="px-4 py-2 text-gray-500">No se encontraron procesos</div>
              </div>
            )}
          </div>
        </div>

        {/* Métricas del Proceso Seleccionado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Documentos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalDocumentos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-blue-600">Autos</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.autos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-purple-600">Evidencias</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.evidencias}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-green-600">Firmados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{metrics.firmados}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-orange-600">Notificados</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{metrics.notificados}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-indigo-600">Notificaciones</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{metrics.notificaciones}</p>
          </div>
        </div>

        {/* Pestañas con Íconos destacados */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setVistaActual('documentos')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${vistaActual === 'documentos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <FileText className="w-4 h-4" />
              Documentos ({filteredDocumentos.length})
            </button>
            <button
              onClick={() => setVistaActual('indice')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${vistaActual === 'indice'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Archive className="w-4 h-4" />
              Índice Electrónico
            </button>
            <button
              onClick={() => setVistaActual('auditoria')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${vistaActual === 'auditoria'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Shield className="w-4 h-4" />
              Auditoría ({AUDITORIA_MOCK.length})
            </button>
          </div>
        </div>

        {/* Filtros - Solo para vista Documentos */}
        {vistaActual === 'documentos' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos en este proceso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Todos los tipos</option>
              <option value="auto">Autos</option>
              <option value="evidencia">Evidencias</option>
              <option value="oficio">Oficios</option>
              <option value="notificacion">Notificaciones</option>
              <option value="acta">Actas</option>
              <option value="otro">Otros</option>
            </select>
            <button
              onClick={() => setShowModalSeleccion(true)}
              className="px-4 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ background: '#10B981' }}
            >
              <Upload className="w-4 h-4" />
              Cargar Documento
            </button>
          </div>
        )}
      </div>

      {/* Vista: Documentos - TABLA */}
      {vistaActual === 'documentos' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {cargandoDocumentos && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando documentos...</p>
            </div>
          )}
          {!cargandoDocumentos && documentos.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No hay documentos en este expediente</p>
              <p className="text-sm text-gray-500 mt-2">Sube un documento para comenzar</p>
            </div>
          )}
          {!cargandoDocumentos && documentos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Etapa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocumentos.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: doc.urlExterna ? '#FEF3C7' : '#DBEAFE' }}
                          >
                            {doc.urlExterna ? (
                              <LinkIcon className="w-5 h-5" style={{ color: '#F59E0B' }} />
                            ) : (
                              <FileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                            <p className="text-xs text-gray-500">{doc.tamaño}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="text-xs">{doc.tipo}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{doc.etapa}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{doc.usuarioCarga}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {doc.metadatos.firmado && (
                            <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                              ✓ Firmado
                            </Badge>
                          )}
                          {doc.metadatos.notificado && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                              ✓ Notificado
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerDocumento(doc)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity text-white"
                            style={{ background: '#003DA5' }}
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            Ver
                          </button>
                          <button
                            onClick={() => handleDescargarDocumento(doc)}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:opacity-80 transition-opacity"
                          >
                            <Download className="w-3.5 h-3.5 inline mr-1" />
                            Descargar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vista: Índice Electrónico */}
      {vistaActual === 'indice' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#003DA5' }}>
              Índice Electrónico del Expediente
            </h2>
            <button
              onClick={handleImprimirIndice}
              className="px-5 py-2.5 rounded-lg text-white font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-105"
              style={{ background: '#DC2626' }}
              title="Imprimir índice electrónico del expediente"
            >
              <Printer className="w-5 h-5" />
              Imprimir Índice
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Folio</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Documento</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Tipo</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Etapa</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Fecha</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Usuario</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc, index) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-900 font-mono">{String(index + 1).padStart(3, '0')}</td>
                    <td className="p-3 text-sm text-gray-900">{doc.nombre}</td>
                    <td className="p-3"><Badge className="text-xs">{doc.tipo}</Badge></td>
                    <td className="p-3 text-sm text-gray-600">{doc.etapa}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{doc.usuarioCarga}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleVerDocumento(doc)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista: Auditoría */}
      {vistaActual === 'auditoria' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#003DA5' }}>
              Registro de Auditoría
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Últimas {AUDITORIA_MOCK.length} actividades</span>
            </div>
          </div>

          {AUDITORIA_MOCK.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No hay actividades registradas</p>
              <p className="text-sm text-gray-500 mt-2">
                Las actividades del expediente se registrarán automáticamente aquí
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {AUDITORIA_MOCK.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((actividad) => (
                <div key={actividad.id} className="p-4 border-l-4 border-blue-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#E0EDFF' }}
                    >
                      {actividad.tipo === 'carga' && <Upload className="w-5 h-5" style={{ color: '#003DA5' }} />}
                      {actividad.tipo === 'descarga' && <Download className="w-5 h-5" style={{ color: '#003DA5' }} />}
                      {actividad.tipo === 'visualizacion' && <Eye className="w-5 h-5" style={{ color: '#003DA5' }} />}
                      {actividad.tipo === 'modificacion' && <Edit2 className="w-5 h-5" style={{ color: '#003DA5' }} />}
                      {actividad.tipo === 'enlace_externo' && <LinkIcon className="w-5 h-5" style={{ color: '#003DA5' }} />}
                      {actividad.tipo === 'exportacion' && <Package className="w-5 h-5" style={{ color: '#003DA5' }} />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{actividad.documento}</p>
                      <p className="text-sm text-gray-700 mt-1">{actividad.detalles}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        {actividad.usuario} • {new Date(actividad.fecha).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <Badge
                      className={
                        actividad.tipo === 'carga' ? 'bg-green-100 text-green-700 border-green-200' :
                          actividad.tipo === 'descarga' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            actividad.tipo === 'visualizacion' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              actividad.tipo === 'exportacion' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                actividad.tipo === 'enlace_externo' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                      }
                    >
                      {actividad.tipo === 'carga' ? 'Carga' :
                        actividad.tipo === 'descarga' ? 'Descarga' :
                          actividad.tipo === 'visualizacion' ? 'Visualización' :
                            actividad.tipo === 'exportacion' ? 'Exportación' :
                              actividad.tipo === 'enlace_externo' ? 'Enlace Externo' :
                                actividad.tipo === 'modificacion' ? 'Modificación' :
                                  actividad.tipo}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showModalSeleccion && (
          <ModalSeleccionDocumento
            onClose={() => setShowModalSeleccion(false)}
            onSelect={handleSeleccionTipoDocumento}
          />
        )}

        {showModalAutos && procesoSeleccionado && (
          <ModalGestionAutos
            proceso={mapProcesoToEspecializado(procesoSeleccionado)}
            onClose={handleCerrarModalesEspecializados}
            onCrearAuto={handleCerrarModalesEspecializados}
            initialView={editingAutoForModal ? 'crear' : 'lista'} // Si hay edición, ir directo al form
            initialAuto={editingAutoForModal}
          />
        )}

        {showModalEvidencias && procesoSeleccionado && (
          <ModalGestionEvidencias
            proceso={mapProcesoToEspecializado(procesoSeleccionado)}
            onClose={handleCerrarModalesEspecializados}
            onSubirEvidencia={handleCerrarModalesEspecializados}
          />
        )}

        {showModalOficios && procesoSeleccionado && (
          <ModalGestionOficios
            proceso={mapProcesoToEspecializado(procesoSeleccionado)}
            onClose={handleCerrarModalesEspecializados}
            onCrearOficio={handleCerrarModalesEspecializados}
          />
        )}

        {showModalVisor && documentoSeleccionado && (
          <ModalVisorDocumento
            documento={documentoSeleccionado}
            processId={procesoSeleccionado?.id}
            onClose={() => {
              setShowModalVisor(false);
              setDocumentoSeleccionado(null);
            }}
            onEdit={(doc) => {
              // En lugar de EditorDocumentos, abrir ModalGestionAutos en modo edición
              setEditingAutoForModal(doc);
              setShowModalVisor(false);
              setShowModalAutos(true);
            }}
          />
        )}

        {showEditor && editingDoc && procesoSeleccionado && (
          <EditorDocumentos
            proceso={mapProcesoToEspecializado(procesoSeleccionado)}
            plantilla={{ nombre: editingDoc.nombre, contenido: editingDoc.contenido || '' }}
            borradorExistente={editingDoc}
            onClose={() => {
              setShowEditor(false);
              setEditingDoc(null);
            }}
            onGuardar={handleGuardarEdicion}
            onEnviarRevision={() => { }} // No aplica para edición directa en expediente por ahora
          />
        )}

        {showModalSubir && (
          <ModalSubirDocumento
            procesoId={procesoSeleccionado?.id || ''}
            defaultEtapa={procesoSeleccionado?.etapaActual}
            onClose={() => setShowModalSubir(false)}
            onConfirm={handleSubirDocumento}
            onSwitchType={(tipo) => {
              setShowModalSubir(false);
              handleSeleccionTipoDocumento(tipo);
            }}
          />
        )}

        {showModalFlujo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModalFlujo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  ¿Cómo funciona el Expediente Electrónico?
                </h2>
                <button
                  onClick={() => setShowModalFlujo(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <FlujoProcesoDisciplinario />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante de Ayuda */}
      <button
        onClick={() => setShowModalFlujo(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl hover:shadow-xl transition-all flex items-center justify-center z-40 group"
        style={{ background: '#003DA5' }}
        title="¿Cómo funciona el Expediente Electrónico?"
      >
        <HelpCircle className="w-7 h-7 text-white" />
        <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Cómo funciona?
        </span>
      </button>
    </div>
  );
}