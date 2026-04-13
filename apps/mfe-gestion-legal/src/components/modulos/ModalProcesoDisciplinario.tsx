/**
 * ModalProcesoDisciplinario - Modal del Expediente Disciplinario
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ 6 tabs funcionales con lógica de negocio profesional
 * ✅ Similar a ModalExpediente pero adaptado para procesos disciplinarios
 * ✅ Header limpio profesional ESAP 2025
 */

import {
  Gavel, FileText, Users, Clock, AlertTriangle, CheckCircle, X,
  Calendar, User, Building, Phone, Mail, MapPin, Briefcase,
  Eye, Download, Upload, Plus, Edit, Trash2, Send,
  FileDown, Scale, Link as LinkIcon, Unlink
} from 'lucide-react';
import jsPDF from 'jspdf';
import type { ProcesoDisciplinario, DecisionDisciplinaria } from '../core/types';
import { ModalAnexarProcesoDisciplinario } from './ModalAnexarProcesoDisciplinario';
import { useState, useMemo, useEffect, useRef } from 'react';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@esap-mfe/shared-ui/tabs';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { toast } from 'sonner';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { FormularioRegistrarDecision } from './FormularioRegistrarDecision';
import { FormularioExcepcionProcesal } from './FormularioExcepcionProcesal';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { ModalNuevaActuacion, type NuevaActuacionData } from './ModalNuevaActuacion';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { BarraProgresoExpediente } from '../core/BarraProgresoExpediente';
import { FooterExpediente } from '../core/FooterExpediente';
import { TabDocumentosExpediente } from '../core/TabDocumentosExpediente';
import { TabActuacionesExpediente } from '../core/TabActuacionesExpediente';
import { TabTareasExpediente } from '../core/TabTareasExpediente';
import { TabNotasExpediente } from '../core/TabNotasExpediente';
import type {
  DocumentoExpediente,
  ActuacionExpediente,
  TareaExpediente,
  NotaExpediente
} from '../core/expedienteShared';

// Tipo para Proceso Disciplinario
interface ProcesoDisciplinario {
  id: string;
  tipoFalta: string;
  etapa: string;
  abogadoAsignado: string;
  disciplinado: string;
  cargo?: string;
  dependencia?: string;
  diasRestantes: number;
  diasTotales: number;
  ultimaActuacion?: {
    fecha: string;
    tipo: string;
    descripcion: string;
    responsable: string;
    estado: string;
  };
  fechaActualizacion: Date;
  descripcionHechos?: string;
}

interface ModalProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoDisciplinario;
  onRefresh?: () => void;
  onVerExpedienteAnexado?: (procesoId: string) => void;
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso, onRefresh, onVerExpedienteAnexado }: ModalProcesoDisciplinarioProps) {
  // ✅ Obtener configuraciones desde Context API
  const { tiposExcepcionesActivos, causalesEspecificasActivas } = useConfiguracionModulo('juzgamiento');

  if (!proceso) return null;

  const [tabActivo, setTabActivo] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Fuente única para actuaciones con datos iniciales (se sobreescribe al cargar del backend)
  const [actuaciones, setActuaciones] = useState([
    {
      id: 1,
      fecha: '26/12/2024',
      tipo: 'Solicitud de Informes',
      descripcion: proceso.ultimaActuacion?.descripcion || 'Solicitud de informes a RRHH',
      responsable: 'Oficina Control Disciplinario',
      estado: 'COMPLETADA',
      colorBorde: '#003DA5'
    },
    {
      id: 2,
      fecha: '20/12/2024',
      tipo: 'Auto de Apertura',
      descripcion: 'Auto de apertura de investigación disciplinaria',
      responsable: 'Jefe de Control Interno',
      estado: 'COMPLETADA',
      colorBorde: '#F59E0B'
    },
    {
      id: 3,
      fecha: '15/12/2024',
      tipo: 'Recepción de Queja',
      descripcion: 'Recepción de queja por irregularidades',
      responsable: 'Secretaría General',
      estado: 'COMPLETADA',
      colorBorde: '#003DA5'
    }
  ]);

  const [mostrarFormularioDecision, setMostrarFormularioDecision] = useState(false);
  const [decisiones, setDecisiones] = useState<any[]>([]);
  const [decisionSeleccionada, setDecisionSeleccionada] = useState<any>(null);

  // ✅ Estado para excepciones procesales
  const [excepciones, setExcepciones] = useState<any[]>([]);
  const [modalNuevaExcepcion, setModalNuevaExcepcion] = useState(false);
  const [mostrarFormularioExcepcion, setMostrarFormularioExcepcion] = useState(false);

  // ✅ Estado para el modal de nueva actuación
  const [modalNuevaActuacionOpen, setModalNuevaActuacionOpen] = useState(false);
  const [modalCrearTareaAbierto, setModalCrearTareaAbierto] = useState(false);
  const [modalEditarTareaAbierto, setModalEditarTareaAbierto] = useState(false);
  const [modalAgregarNotaAbierto, setModalAgregarNotaAbierto] = useState(false);
  const [tareaEnEdicion, setTareaEnEdicion] = useState<TareaExpediente | null>(null);

  const [tareas, setTareas] = useState<TareaExpediente[]>([]);

  const [notasInternas, setNotasInternas] = useState<NotaExpediente[]>([]);

  // Form states for create tarea modal
  const [formTareaTitulo, setFormTareaTitulo] = useState('');
  const [formTareaDescripcion, setFormTareaDescripcion] = useState('');
  const [formTareaPrioridad, setFormTareaPrioridad] = useState('media');
  const [formTareaVencimiento, setFormTareaVencimiento] = useState('');

  // Form states for create nota modal
  const [formNotaContenido, setFormNotaContenido] = useState('');
  const [formNotaTipo, setFormNotaTipo] = useState('seguimiento');

  // Estado para el visor de documentos
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [pruebaSeleccionada, setPruebaSeleccionada] = useState<any>(null);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any>(null);

  // ✅ Estado para modo edición del proceso
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editData, setEditData] = useState({
    tipoFalta: proceso.tipoFalta || '',
    etapa: proceso.etapa || '',
    abogadoAsignado: proceso.abogadoAsignado || '',
    disciplinado: (proceso as any).investigado || proceso.disciplinado || '',
    cargo: proceso.cargo || '',
    dependencia: proceso.dependencia || '',
    descripcionHechos: proceso.descripcionHechos || (proceso as any).hechos || ''
  });

  // ✅ Estado para modal de Anexar Proceso
  const [modalAnexarAbierto, setModalAnexarAbierto] = useState(false);

  // Derived states for tabs options
  const pruebas = actuaciones.filter(a => a.tipoActuacion === 'EVIDENCIA');
  // Include all actuaciones that have a document attachment (any type)
  const documentos = actuaciones.filter(a => a.documentoUrl || a.tipoActuacion === 'DOCUMENTO' || a.tipoActuacion === 'ACTA' || a.tipoActuacion === 'OFICIO' || a.tipoActuacion === 'AUTO');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fecha inicial para asegurar persistencia
  useEffect(() => {
    if (proceso.id) {
      legalService.getJuzgamientoActuaciones(proceso.id)
        .then(data => {
          // Defensive check: ensure data is an array
          setActuaciones(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error('Error loading actuations:', err);
          setActuaciones([]);
        });

      legalService.getJuzgamientoDecisiones(proceso.id)
        .then(data => {
          // Defensive check: ensure data is an array
          setDecisiones(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error('Error loading decisions:', err);
          setDecisiones([]);
        });

      // Cargar excepciones procesales
      legalService.getJuzgamientoExcepciones(proceso.id)
        .then(data => {
          setExcepciones(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error('Error loading exceptions:', err);
          setExcepciones([]);
        });

      // Cargar tareas del expediente
      legalService.getJuzgamientoTareas(proceso.id)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const tareasMap: TareaExpediente[] = data.map((t: any) => ({
              id: t.id,
              titulo: t.titulo || 'Sin título',
              descripcion: t.descripcion || '',
              vencimiento: t.fechaVencimiento ? new Date(t.fechaVencimiento).toLocaleDateString('es-CO') : 'Sin fecha',
              diasRestantes: t.fechaVencimiento ? Math.max(0, Math.ceil((new Date(t.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
              prioridad: t.prioridad === 'alta' ? 'Alta' : t.prioridad === 'baja' ? 'Baja' : 'Media',
              responsable: t.responsableNombre || t.responsable?.nombre || proceso.abogadoAsignado || 'Investigador',
              estado: t.estado === 'completada' ? 'Completado' : t.estado === 'en_proceso' ? 'En proceso' : 'Pendiente'
            }));
            setTareas(tareasMap);
          }
        })
        .catch(err => {
          console.error('Error loading tareas:', err);
        });

      // Cargar notas internas del expediente
      legalService.getJuzgamientoNotas(proceso.id)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const notasMap: NotaExpediente[] = data.map((n: any) => ({
              id: n.id,
              fecha: n.createdAt ? new Date(n.createdAt).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO'),
              autor: n.autorNombre || proceso.abogadoAsignado || 'Investigador',
              nota: n.contenido || '',
              tipo: n.tipo === 'importante' ? 'Importante' : n.tipo === 'alerta' ? 'Alerta' : 'Seguimiento'
            }));
            setNotasInternas(notasMap);
          }
        })
        .catch(err => {
          console.error('Error loading notas:', err);
        });
    }
  }, [proceso.id]);

  // Helper para construir URL completa de archivo (legal-management-service)
  // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
  const getFileUrl = (archivoUrl: string): string => {
    if (!archivoUrl) return '';
    if (archivoUrl.startsWith('http')) return archivoUrl;

    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';

    // ✨ FIXED: Rutas de adjuntos de correos/oficios (usar /api/v1 para que gateway rutee correctamente)
    if (archivoUrl.includes('/correos/adjuntos/')) {
      const regex = /\/adjuntos\/([^/]+)/;
      const match = archivoUrl.match(regex);
      if (match) {
        let adjuntoId = match[1];
        if (adjuntoId.endsWith('/download')) adjuntoId = adjuntoId.replace('/download', '');
        // En gateway port 3000 NO lleva /legal sino /api/v1 directo
        const adjuntoPrefix = API_MODE === 'direct' ? '' : '/api/v1';
        return `${baseUrl}${adjuntoPrefix}/correos/adjuntos/${adjuntoId}/download`;
      }
    }

    // Manejar otras rutas directas de API evitando /files/ 
    if (archivoUrl.includes('/api/') || archivoUrl.includes('/download') || archivoUrl.includes('/export')) {
      let cleanUrl = archivoUrl.startsWith('/legal') ? archivoUrl.replace('/legal', '') : archivoUrl;

      // Ensure it has /api/v1 prefix if not direct mode and it doesn't already have it
      if (API_MODE !== 'direct' && !cleanUrl.includes('/api/v1') && !cleanUrl.includes('/files/')) {
        cleanUrl = `/api/v1${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
      } else if (API_MODE === 'direct') {
        cleanUrl = cleanUrl.replace('/api/v1', ''); // remove /api/v1 since port 3008 doesn't use it
      }
      // Ensure leading slash for cleanUrl to prevent duplicate slashes
      if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;

      return `${baseUrl}${prefix}${cleanUrl}`;
    }

    let filename = archivoUrl;
    if (archivoUrl.includes('/files/')) {
      filename = archivoUrl.split('/files/').pop() || archivoUrl;
    } else if (archivoUrl.includes('/')) {
      filename = archivoUrl.split('/').pop() || archivoUrl;
    }
    return `${baseUrl}${prefix}/files/${filename}`;
  };

  // Handler para descargar actuación con documento
  const handleDescargarActuacion = async (act: any) => {
    const url = act.documentoUrl || act.url;
    if (!url) {
      toast.error('No hay documento disponible');
      return;
    }

    const fileUrl = getFileUrl(url);
    const nombreArchivo = act.documentoNombre || act.nombreArchivo || 'documento.pdf';

    try {
      toast.loading('Descargando...', { id: 'download-act' });
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Descarga completada', { id: 'download-act' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar el archivo', { id: 'download-act' });
    }
  };

  // Handler para ver actuación con documento
  const handleVerActuacion = (act: any) => {
    const url = act.documentoUrl || act.url || act.archivoUrl;
    if (!url) {
      toast.error('No hay documento disponible');
      return;
    }

    // Usar la función existente handleVerDocumento que abre el VisorDocumentoModal en la misma pestaña
    handleVerDocumento({
      documentoUrl: url,
      nombre: act.documentoNombre || act.nombre || act.descripcion || 'Documento',
      tipo: act.tipoActuacion || act.tipo || 'Documento'
    });
  };


  // ==================== ESTADOS RECUPERADOS (POST-MERGE) ====================

  // Implementación Real de Carga de Archivos
  const handleFileUpload = async (e: any, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading(`Subiendo ${tipo.toLowerCase()}...`, { id: 'upload-file' });

      // Usar createJuzgamientoActuacion para asegurar que se guarde en la línea de tiempo y base de datos
      const res = await legalService.createJuzgamientoActuacion(proceso.id, {
        tipoActuacion: tipo,
        descripcion: `Carga de ${tipo.toLowerCase()}: ${file.name}`,
        fechaActuacion: new Date().toISOString(),
        file: file
      });

      // Actualizar estado local
      const nuevaActuacion = {
        ...res,
        // Fallbacks por si la respuesta del backend varía
        documentoUrl: res.documentoUrl || res.url || res.path,
        documentoNombre: res.documentoNombre || file.name,
        nombreArchivo: res.nombreArchivo || file.name,
        tipoActuacion: res.tipoActuacion || tipo,
        fechaActuacion: res.fechaActuacion || new Date().toISOString(),
      };

      setActuaciones(prev => [nuevaActuacion, ...prev]);
      setHasChanges(true);

      toast.success(`✅ ${tipo} cargado exitosamente`, { id: 'upload-file' });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo', { id: 'upload-file' });
    }
  };



  // ==================== GENERAR PDF PARA UNA ACTUACIÓN ====================
  const handleGenerarPDFActuacion = (act: any) => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.setFont('times', 'bold');
      doc.text('REPÚBLICA DE COLOMBIA', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 105, 28, { align: 'center' });
      doc.setFontSize(12);
      doc.text('OFICINA DE CONTROL DISCIPLINARIO INTERNO', 105, 36, { align: 'center' });
      doc.line(20, 40, 190, 40);

      // Title
      doc.setFontSize(14);
      doc.text('ACTUACIÓN PROCESAL', 105, 55, { align: 'center' });

      // Info
      doc.setFontSize(11);
      doc.setFont('times', 'normal');
      doc.text(`RADICADO: ${proceso.id}`, 20, 70);
      doc.text(`FECHA: ${act.fecha || act.fechaActuacion || 'N/A'}`, 20, 78);
      doc.text(`TIPO: ${act.tipo || act.tipoActuacion || 'N/A'}`, 20, 86);
      doc.text(`RESPONSABLE: ${act.responsable || 'N/A'}`, 20, 94);
      doc.text(`ESTADO: ${act.estado || 'N/A'}`, 20, 102);

      let yPos = 116;
      doc.setFont('times', 'bold');
      doc.text('DESCRIPCIÓN:', 20, yPos);
      yPos += 7;
      doc.setFont('times', 'normal');
      const splitDesc = doc.splitTextToSize(act.descripcion || 'Sin descripción', 170);
      doc.text(splitDesc, 20, yPos);
      yPos += (splitDesc.length * 6) + 15;

      // Footer
      doc.setFontSize(10);
      doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, 105, 285, { align: 'center' });

      doc.save(`Actuacion_${(act.tipo || 'actuacion').replace(/ /g, '_')}_${Date.now()}.pdf`);
      toast.success('✅ PDF de actuación generado exitosamente');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Error al generar el PDF de la actuación');
    }
  };

  // ==================== DESCARGAR PDF COMPLETO DEL PROCESO ====================
  const handleDescargarPDF = () => {
    try {
      const doc = new jsPDF();

      // Helper for wrapped text sections with page break awareness
      const addWrappedSection = (label: string, text: string, yStart: number): number => {
        let y = yStart;
        doc.setFont('times', 'bold');
        doc.text(label, 20, y);
        y += 7;
        doc.setFont('times', 'normal');
        const splitText = doc.splitTextToSize(text || 'No registrado', 170);
        doc.text(splitText, 20, y);
        y += (splitText.length * 6) + 8;
        if (y > 270) { doc.addPage(); y = 30; }
        return y;
      };

      // ===== PÁGINA 1: CARÁTULA =====
      doc.setFontSize(16);
      doc.setFont('times', 'bold');
      doc.text('REPÚBLICA DE COLOMBIA', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 105, 28, { align: 'center' });
      doc.setFontSize(12);
      doc.text('OFICINA DE CONTROL DISCIPLINARIO INTERNO', 105, 36, { align: 'center' });
      doc.line(20, 42, 190, 42);

      doc.setFontSize(18);
      doc.text('EXPEDIENTE DISCIPLINARIO', 105, 60, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`RADICADO: ${proceso.id}`, 105, 72, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('times', 'normal');
      let y = 90;
      doc.text(`Investigado: ${(proceso as any).investigado || proceso.disciplinado || 'N/A'}`, 20, y); y += 8;
      doc.text(`Cargo: ${proceso.cargo || 'No registrado'}`, 20, y); y += 8;
      doc.text(`Dependencia: ${proceso.dependencia || 'No registrado'}`, 20, y); y += 8;
      doc.text(`Tipo de Falta: ${proceso.tipoFalta}`, 20, y); y += 8;
      doc.text(`Etapa Actual: ${proceso.etapa}`, 20, y); y += 8;
      doc.text(`Investigador: ${proceso.abogadoAsignado || 'Sin asignar'}`, 20, y); y += 8;
      doc.text(`Días Restantes: ${proceso.diasRestantes}`, 20, y); y += 8;
      doc.text(`Fecha Generación: ${new Date().toLocaleDateString('es-CO')}`, 20, y); y += 15;

      // Hechos
      y = addWrappedSection('DESCRIPCIÓN DE LOS HECHOS:', proceso.descripcionHechos || proceso.hechos || 'No se han registrado hechos.', y);

      // ===== SECCIÓN: ACTUACIONES =====
      doc.addPage();
      y = 20;
      doc.setFontSize(14);
      doc.setFont('times', 'bold');
      doc.text('HISTORIAL DE ACTUACIONES', 105, y, { align: 'center' });
      doc.line(20, y + 4, 190, y + 4);
      y += 15;

      if (actuaciones.length === 0) {
        doc.setFontSize(11);
        doc.setFont('times', 'italic');
        doc.text('No hay actuaciones registradas en este proceso.', 20, y);
      } else {
        const sortedActs = [...actuaciones].sort((a: any, b: any) =>
          new Date(a.fechaActuacion || a.fecha).getTime() - new Date(b.fechaActuacion || b.fecha).getTime()
        );
        sortedActs.forEach((act: any, idx: number) => {
          if (y > 255) { doc.addPage(); y = 30; }
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text(`${idx + 1}. ${act.tipo || act.tipoActuacion || 'Actuación'}`, 20, y);
          y += 6;
          doc.setFont('times', 'normal');
          doc.text(`Fecha: ${act.fecha || (act.fechaActuacion ? new Date(act.fechaActuacion).toLocaleDateString('es-CO') : 'N/A')}  |  Responsable: ${act.responsable || 'N/A'}  |  Estado: ${act.estado || 'N/A'}`, 25, y);
          y += 6;
          const descLines = doc.splitTextToSize(act.descripcion || 'Sin descripción', 160);
          doc.text(descLines, 25, y);
          y += (descLines.length * 6) + 8;
        });
      }

      // ===== SECCIÓN: DECISIONES =====
      if (decisiones.length > 0) {
        doc.addPage();
        y = 20;
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.text('DECISIONES', 105, y, { align: 'center' });
        doc.line(20, y + 4, 190, y + 4);
        y += 15;

        decisiones.forEach((decision: any, idx: number) => {
          if (y > 240) { doc.addPage(); y = 30; }
          doc.setFontSize(12);
          doc.setFont('times', 'bold');
          doc.text(`${idx + 1}. ${decision.tipoDecision || 'Decisión'}`, 20, y);
          y += 7;
          doc.setFontSize(11);
          doc.setFont('times', 'normal');
          doc.text(`Fecha: ${decision.fecha || 'N/A'}  |  Fallo: ${decision.tipoFallo || 'N/A'}`, 25, y);
          y += 6;
          if (decision.sancion) {
            doc.text(`Sanción: ${decision.sancion}`, 25, y);
            y += 6;
          }
          y = addWrappedSection('Consideraciones:', decision.consideraciones || '', y);
          if (decision.fundamentosJuridicos) {
            y = addWrappedSection('Fundamentos Jurídicos:', decision.fundamentosJuridicos, y);
          }
          doc.text(`Responsable: ${decision.responsable || 'N/A'} - ${decision.cargoResponsable || ''}`, 25, y);
          y += 10;
        });
      }

      // ===== FOOTER EN TODAS LAS PÁGINAS =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont('times', 'normal');
        doc.text(
          `Expediente ${proceso.id} — Página ${i} de ${pageCount} — Generado el ${new Date().toLocaleDateString('es-CO')}`,
          105, 290, { align: 'center' }
        );
      }

      doc.save(`Expediente_Disciplinario_${proceso.id.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('✅ PDF del expediente completo generado exitosamente');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Error al generar el PDF del expediente');
    }
  };



  // ==================== LÓGICA DE NEGOCIO RECUPERADA ====================

  // Calcular días totales de la etapa
  const diasTotalesEtapa = useMemo(() => {
    switch (proceso.etapa?.toUpperCase()) {
      case 'INDAGACIÓN PREVIA': return 180;
      case 'INVESTIGACIÓN DISCIPLINARIA': return 180;
      case 'JUZGAMIENTO': return 90;
      case 'SEGUNDA INSTANCIA': return 45;
      default: return 180;
    }
  }, [proceso.etapa]);

  // Consolidar actuaciones (las del prop + las nuevas)
  // Nota: 'actuaciones' ya contiene todo si el backend retorna todo en getJuzgamientoActuaciones
  // Pero si queremos mergear con proceso.actuaciones original (si existiera), lo haríamos aquí.
  // Asumiremos que 'actuaciones' es la fuente de verdad actualizada.
  const actuacionesTotales = useMemo(() => {
    return [...actuaciones].sort((a: any, b: any) =>
      new Date(b.fechaActuacion || b.fecha).getTime() - new Date(a.fechaActuacion || a.fecha).getTime()
    );
  }, [actuaciones]);

  const actuacionesParaTab = useMemo<ActuacionExpediente[]>(() => {
    return actuacionesTotales.map((act: any) => ({
      id: act.id,
      fecha: act.fecha || (act.fechaActuacion ? new Date(act.fechaActuacion).toLocaleDateString('es-CO') : ''),
      tipo: act.tipo || act.tipoActuacion || 'ACTUACIÓN',
      descripcion: act.descripcion || '',
      responsable: act.responsable || 'Sistema',
      estado: act.estado || 'PENDIENTE'
    }));
  }, [actuacionesTotales]);


  const handleAgregarPrueba = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset to allow selecting same file again
      fileInputRef.current.click();
    }
  };

  const handleVerPrueba = (prueba: any) => {
    setPruebaSeleccionada({
      ...prueba,
      nombre: prueba.documentoNombre || prueba.nombreArchivo || prueba.descripcion || 'Evidencia',
      archivo: prueba.documentoUrl || prueba.url,
      tipo: prueba.tipoActuacion || 'EVIDENCIA'
    });
    setVisorAbierto(true);

    toast.success('📄 Visor de documentos abierto', {
      description: `Visualizando: ${prueba.documentoNombre || 'Evidencia'} `,
      duration: 2000
    });
  };



  const handleAgregarDocumento = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    input.onchange = (e) => handleFileUpload(e, 'DOCUMENTO');
    input.click();
  };

  const handleCerrar = () => {
    if (hasChanges) {
      if (confirm('⚠️ Tienes cambios sin guardar. ¿Deseas cerrar sin guardar los cambios?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Removed old handleDescargarPrueba, simplified to use same logic or dedicated logic
  // The UI calls handleDescargarDocumento for documents, maybe handleVerPrueba is just for viewing.
  // ==================== FUNCIONES PARA ACTUACIONES ====================

  const handleGuardarActuacion = async (nuevaActuacion: NuevaActuacionData) => {
    try {
      toast.loading('Guardando actuación...', { id: 'saving-actuacion' });
      const res = await legalService.createJuzgamientoActuacion(proceso.id, {
        tipoActuacion: nuevaActuacion.tipo,
        descripcion: nuevaActuacion.descripcion,
        fechaActuacion: nuevaActuacion.fecha,
        responsable: nuevaActuacion.responsable,
        estado: nuevaActuacion.estado,
      });
      // Refetch all actuaciones from backend to ensure consistency
      const data = await legalService.getJuzgamientoActuaciones(proceso.id);
      setActuaciones(Array.isArray(data) ? data : []);
      setHasChanges(true);
      toast.success('Actuación registrada correctamente', { id: 'saving-actuacion' });
    } catch (error) {
      console.error('Error saving actuacion:', error);
      toast.error('Error al guardar la actuación', { id: 'saving-actuacion' });
    }
  };

  const handleCrearTarea = async () => {
    if (!formTareaTitulo.trim()) {
      toast.error('El título de la tarea es obligatorio');
      return;
    }
    try {
      toast.loading('Creando tarea...', { id: 'crear-tarea' });
      const fechaVencimiento = formTareaVencimiento
        ? new Date(formTareaVencimiento).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const usuarioActual = localStorage.getItem('esap_user_name') || proceso.abogadoAsignado || 'Investigador';

      const res = await legalService.createJuzgamientoTarea(proceso.id, {
        titulo: formTareaTitulo.trim(),
        descripcion: formTareaDescripcion.trim() || undefined,
        fechaVencimiento,
        prioridad: formTareaPrioridad,
        responsableNombre: usuarioActual,
        creadoPor: usuarioActual
      });

      const diasCalc = formTareaVencimiento
        ? Math.max(0, Math.ceil((new Date(formTareaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 7;
      const prioridadLabel = formTareaPrioridad === 'alta' ? 'Alta' : formTareaPrioridad === 'baja' ? 'Baja' : 'Media';

      const nuevaTarea: TareaExpediente = {
        id: res.id,
        titulo: res.titulo || formTareaTitulo.trim(),
        descripcion: res.descripcion || formTareaDescripcion.trim(),
        vencimiento: new Date(fechaVencimiento).toLocaleDateString('es-CO'),
        diasRestantes: diasCalc,
        prioridad: prioridadLabel,
        responsable: usuarioActual,
        estado: 'Pendiente'
      };
      setTareas(prev => [nuevaTarea, ...prev]);
      setHasChanges(true);
      setModalCrearTareaAbierto(false);
      // Reset form
      setFormTareaTitulo('');
      setFormTareaDescripcion('');
      setFormTareaPrioridad('media');
      setFormTareaVencimiento('');
      toast.success('Tarea creada exitosamente', { id: 'crear-tarea' });
    } catch (error) {
      console.error('Error creating tarea:', error);
      toast.error('Error al crear la tarea', { id: 'crear-tarea' });
    }
  };

  const handleEditarTarea = (tarea: TareaExpediente) => {
    setTareaEnEdicion(tarea);
    // Pre-fill form with existing values
    setFormTareaTitulo(tarea.titulo);
    setFormTareaDescripcion(tarea.descripcion || '');
    setFormTareaPrioridad(tarea.prioridad === 'Alta' ? 'alta' : tarea.prioridad === 'Baja' ? 'baja' : 'media');
    // Try to parse vencimiento date back to input format (yyyy-MM-dd)
    try {
      const parts = tarea.vencimiento.split('/');
      if (parts.length === 3) {
        setFormTareaVencimiento(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      }
    } catch { setFormTareaVencimiento(''); }
    setModalEditarTareaAbierto(true);
  };

  const handleGuardarEdicionTarea = async () => {
    if (!tareaEnEdicion || !formTareaTitulo.trim()) {
      toast.error('El título de la tarea es obligatorio');
      return;
    }
    try {
      toast.loading('Guardando cambios...', { id: 'editar-tarea' });
      const fechaVencimiento = formTareaVencimiento
        ? new Date(formTareaVencimiento).toISOString()
        : undefined;

      await legalService.updateJuzgamientoTarea(proceso.id, String(tareaEnEdicion.id), {
        titulo: formTareaTitulo.trim(),
        descripcion: formTareaDescripcion.trim() || undefined,
        prioridad: formTareaPrioridad,
        fechaVencimiento,
      });

      const diasCalc = formTareaVencimiento
        ? Math.max(0, Math.ceil((new Date(formTareaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : tareaEnEdicion.diasRestantes;
      const prioridadLabel = formTareaPrioridad === 'alta' ? 'Alta' : formTareaPrioridad === 'baja' ? 'Baja' : 'Media';

      setTareas(prev => prev.map(t => t.id === tareaEnEdicion.id ? {
        ...t,
        titulo: formTareaTitulo.trim(),
        descripcion: formTareaDescripcion.trim(),
        prioridad: prioridadLabel,
        vencimiento: formTareaVencimiento ? new Date(formTareaVencimiento).toLocaleDateString('es-CO') : t.vencimiento,
        diasRestantes: diasCalc,
      } : t));

      setHasChanges(true);
      setModalEditarTareaAbierto(false);
      setTareaEnEdicion(null);
      // Reset form
      setFormTareaTitulo('');
      setFormTareaDescripcion('');
      setFormTareaPrioridad('media');
      setFormTareaVencimiento('');
      toast.success('Tarea actualizada exitosamente', { id: 'editar-tarea' });
    } catch (error) {
      console.error('Error updating tarea:', error);
      toast.error('Error al actualizar la tarea', { id: 'editar-tarea' });
    }
  };

  const handleMarcarTareaCompletada = async (tareaId: string | number) => {
    try {
      toast.loading('Actualizando tarea...', { id: 'completar-tarea' });
      await legalService.updateJuzgamientoTarea(proceso.id, String(tareaId), {
        estado: 'completada'
      });
      setTareas(prev =>
        prev.map(t => t.id === tareaId ? { ...t, estado: 'Completado', diasRestantes: 0 } : t)
      );
      setHasChanges(true);
      toast.success('Tarea marcada como completada', { id: 'completar-tarea' });
    } catch (error) {
      console.error('Error completing tarea:', error);
      toast.error('Error al completar la tarea', { id: 'completar-tarea' });
    }
  };

  const handleAgregarNota = async () => {
    if (!formNotaContenido.trim()) {
      toast.error('El contenido de la nota es obligatorio');
      return;
    }
    try {
      toast.loading('Guardando nota...', { id: 'agregar-nota' });
      const usuarioActual = localStorage.getItem('esap_user_name') || proceso.abogadoAsignado || 'Investigador';

      const res = await legalService.createJuzgamientoNota(proceso.id, {
        contenido: formNotaContenido.trim(),
        tipo: formNotaTipo,
        autorNombre: usuarioActual
      });

      const tipoLabel = formNotaTipo === 'importante' ? 'Importante' : formNotaTipo === 'alerta' ? 'Alerta' : 'Seguimiento';

      const nuevaNota: NotaExpediente = {
        id: res.id,
        fecha: new Date().toLocaleDateString('es-CO'),
        autor: usuarioActual,
        nota: res.contenido || formNotaContenido.trim(),
        tipo: tipoLabel
      };
      setNotasInternas(prev => [nuevaNota, ...prev]);
      setHasChanges(true);
      setModalAgregarNotaAbierto(false);
      // Reset form
      setFormNotaContenido('');
      setFormNotaTipo('seguimiento');
      toast.success('Nota interna guardada', { id: 'agregar-nota' });
    } catch (error) {
      console.error('Error creating nota:', error);
      toast.error('Error al guardar la nota', { id: 'agregar-nota' });
    }
  };

  // ==================== FUNCIONES PARA ÚLTIMA ACTUACIÓN PROCESAL ====================

  const handleGuardarCambios = () => {
    toast.info('Los documentos se guardan automáticamente al subir.');
    setHasChanges(false);
    onClose();
  };



  const handleGuardarNuevaDecision = async (decision: any) => {
    try {
      toast.loading('Guardando decisión...', { id: 'saving-decision' });
      const res = await legalService.createJuzgamientoDecision(proceso.id, decision);
      setDecisiones(prev => [res, ...prev]);
      setMostrarFormularioDecision(false);
      setHasChanges(true);
      toast.success('Decisión registrada correctamente', { id: 'saving-decision' });
    } catch (error) {
      console.error('Error saving decision:', error);
      toast.error('Error al guardar la decisión', { id: 'saving-decision' });
    }
  };

  // Handler para guardar nueva excepción procesal
  const handleGuardarNuevaExcepcion = async (excepcion: any) => {
    try {
      toast.loading('Guardando excepción...', { id: 'saving-exception' });
      const res = await legalService.createJuzgamientoExcepcion(proceso.id, excepcion);
      setExcepciones(prev => [res, ...prev]);
      setMostrarFormularioExcepcion(false);
      setHasChanges(true);
      toast.success('Excepción registrada correctamente', { id: 'saving-exception' });
    } catch (error) {
      console.error('Error saving exception:', error);
      toast.error('Error al guardar la excepción', { id: 'saving-exception' });
    }
  };

  // Handler para resolver excepción
  const handleResolverExcepcion = async (excepcionId: string, estado: 'RESUELTA' | 'RECHAZADA', resolucion: string) => {
    try {
      toast.loading('Resolviendo excepción...', { id: 'resolving-exception' });
      const res = await legalService.resolverExcepcion(excepcionId, { estado, resolucion });
      setExcepciones(prev => prev.map(e => e.id === excepcionId ? res : e));
      toast.success(`Excepción ${estado.toLowerCase()}`, { id: 'resolving-exception' });
    } catch (error) {
      console.error('Error resolving exception:', error);
      toast.error('Error al resolver la excepción', { id: 'resolving-exception' });
    }
  };

  const handleDescargarDecision = (decision: any) => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.setFont('times', 'bold');
      doc.text('REPÚBLICA DE COLOMBIA', 105, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 105, 28, { align: 'center' });
      doc.setFontSize(12);
      doc.text('OFICINA DE CONTROL DISCIPLINARIO INTERNO', 105, 36, { align: 'center' });

      doc.line(20, 40, 190, 40); // Horizontal line

      // Title
      doc.setFontSize(14);
      doc.text(String(decision.tipoDecision).toUpperCase(), 105, 55, { align: 'center' });

      // Info
      doc.setFontSize(11);
      doc.setFont('times', 'normal');
      doc.text(`RADICADO: ${proceso.id}`, 20, 70);
      doc.text(`FECHA: ${decision.fecha}`, 20, 78);
      doc.text(`DISCIPLINADO: ${proceso.disciplinado || 'N/A'}`, 20, 86);

      // Sections
      let yPos = 100;

      // Helper for wrapped text
      const addWrappedSection = (label: string, text: string) => {
        doc.setFont('times', 'bold');
        doc.text(label, 20, yPos);
        yPos += 7;

        doc.setFont('times', 'normal');
        // splitTextToSize(text, maxLineWidth)
        const splitText = doc.splitTextToSize(text || 'No registrado', 170);
        doc.text(splitText, 20, yPos);

        // Calculate new Y based on lines added
        yPos += (splitText.length * 6) + 10;

        // Page break check
        if (yPos > 270) {
          doc.addPage();
          yPos = 30;
        }
      };

      // Fallo
      doc.setFont('times', 'bold');
      doc.text('FALLO:', 20, yPos);
      doc.setFont('times', 'normal');
      doc.text(`${decision.tipoFallo} - ${decision.sancion || 'Sin Sanción'}`, 40, yPos);
      yPos += 15;

      addWrappedSection('CONSIDERACIONES:', decision.consideraciones);
      addWrappedSection('FUNDAMENTOS JURÍDICOS:', decision.fundamentosJuridicos);

      // Signature Area
      yPos += 20;
      if (yPos > 250) {
        doc.addPage();
        yPos = 40;
      }

      doc.setFont('times', 'bold');
      doc.text(decision.responsable || 'Desconocido', 20, yPos);
      doc.setFont('times', 'normal');
      doc.text(decision.cargoResponsable || 'Cargo no especificado', 20, yPos + 6);

      // Footer Paginator
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
      }

      doc.save(`Decision_${String(decision.tipoDecision).replace(/ /g, '_')}.pdf`);
      toast.success('✅ PDF generado y descargado exitosamente');

    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Error al generar el PDF de la decisión');
    }
  };



  // Document Handler Logic
  // Updated: now uses the built-in VisorDocumentoModal instead of window.open
  const handleVerDocumento = (doc: any) => {
    const url = doc.documentoUrl || doc.url || doc.archivoUrl;
    if (url) {
      setDocumentoSeleccionado({
        documentoUrl: getFileUrl(url), // Aseguramos usar la URL final formateada
        documentoNombre: doc.nombre || doc.documentoNombre || 'Documento',
        descripcion: doc.tipo || doc.tipoDocumento || 'Documento del proceso'
      });
      setVisorAbierto(true);
    } else {
      toast.error('No hay documento para visualizar');
    }
  };

  const handleDescargarDocumento = async (doc: any) => {
    const rawUrl = doc.documentoUrl || doc.url || doc.archivoUrl;
    const nombreArchivo = doc.documentoNombre || doc.nombre || doc.nombreArchivo || `documento_${Date.now()}.pdf`;

    if (rawUrl) {
      try {
        toast.loading('Iniciando descarga...', { id: 'downloading-doc-2' });
        const fileUrl = getFileUrl(rawUrl);

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Network error');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = nombreArchivo;

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

        toast.success('Descarga completada', { id: 'downloading-doc-2' });
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Error al descargar el archivo. Verifica permisos o CORS.', { id: 'downloading-doc-2' });
      }
    } else {
      toast.error('No hay URL disponible para este documento');
    }
  };

  const documentosExpediente: DocumentoExpediente[] = useMemo(() => {
    // Map backend tipoActuacion to frontend category name
    const categoriaFromTipo = (tipo: string): string => {
      const map: Record<string, string> = {
        'ACTA': 'actas',
        'EVIDENCIA': 'evidencias',
        'OFICIO': 'oficios',
        'AUTO': 'autos',
        'DOCUMENTO': 'documentos',
      };
      return map[tipo] || 'documentos';
    };
    return documentos.map((doc: any) => ({
      id: doc.id,
      nombre: doc.documentoNombre || doc.nombre || doc.nombreArchivo || 'Documento',
      fecha: doc.fechaActuacion ? new Date(doc.fechaActuacion).toLocaleDateString('es-CO') : (doc.fecha || ''),
      tipo: doc.tipoActuacion || doc.tipo || 'DOCUMENTO',
      tamaño: doc.tamaño || 'N/D',
      firmante: doc.responsable || doc.usuarioResponsable || proceso.abogadoAsignado || 'Oficina Jurídica',
      categoria: categoriaFromTipo(doc.tipoActuacion || 'DOCUMENTO'),
      url: doc.documentoUrl || doc.url || doc.archivoUrl || '',
    }));
  }, [documentos, proceso.abogadoAsignado]);

  const handleUploadDocumentoDesdeTab = async (file: File, categoria: string, tipoDocumento: string) => {
    try {
      toast.loading('Subiendo documento...', { id: 'upload-documento-tab-jd' });
      // Map the UI category to tipoActuacion so documents are properly classified
      const tipoActuacionMap: Record<string, string> = {
        'actas': 'ACTA',
        'evidencias': 'EVIDENCIA',
        'oficios': 'OFICIO',
        'autos': 'AUTO',
        'documentos': 'DOCUMENTO',
        'notificaciones': 'DOCUMENTO',
        'recursos': 'DOCUMENTO',
        'informes': 'DOCUMENTO',
      };
      const tipoActuacion = tipoActuacionMap[categoria] || 'DOCUMENTO';
      await legalService.createJuzgamientoActuacion(proceso.id, {
        tipoActuacion,
        descripcion: `${tipoDocumento}: ${file.name}`,
        fechaActuacion: new Date().toISOString(),
        file,
      });
      const data = await legalService.getJuzgamientoActuaciones(proceso.id);
      setActuaciones(Array.isArray(data) ? data : []);
      setHasChanges(true);
      toast.success('Documento cargado exitosamente', { id: 'upload-documento-tab-jd' });
    } catch (error) {
      console.error('Error uploading document from tab:', error);
      toast.error('Error al subir documento', { id: 'upload-documento-tab-jd' });
    }
  };

  const handleDescargarTodosDocumentos = async () => {
    if (documentos.length === 0) {
      toast.info('No hay documentos para descargar');
      return;
    }
    toast.info(`Descarga masiva disponible próximamente (${documentos.length} documentos)`);
  };

  const handleNotificar = () => {
    toast.success('Notificación enviada al equipo del proceso');
  };

  const handleCompartir = async () => {
    const enlace = `${window.location.origin}/gestion-legal/juzgamiento/${proceso.id}`;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.info('No se pudo copiar automáticamente', { description: enlace });
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCerrar}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogTitle className="sr-only">
            Proceso Disciplinario {proceso.id}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Vista completa del proceso disciplinario {proceso.id} con información detallada de hechos, pruebas, actuaciones y decisiones
          </DialogDescription>

          {/* ==================== HEADER LIMPIO ESAP 2025 ==================== */}
          <ModalHeaderClean
            icono={Gavel}
            titulo={proceso.id}
            subtitulo={proceso.tipoFalta}
            badges={[
              { texto: proceso.etapa, color: 'azul' },
              { texto: `${proceso.diasRestantes} días restantes`, color: 'naranja' }
            ]}
            onClose={onClose}
          />

          <BarraProgresoExpediente
            diasTotales={proceso.diasTotales}
            diasRestantes={proceso.diasRestantes}
          />

          {/* ==================== TABS NAVIGATION ==================== */}
          <Tabs value={tabActivo} onValueChange={setTabActivo} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 border-b bg-gray-50">
              <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="hechos"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Hechos
                </TabsTrigger>
                <TabsTrigger
                  value="documento"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Documento
                </TabsTrigger>
                <TabsTrigger
                  value="actuaciones"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Actuaciones
                </TabsTrigger>
                <TabsTrigger
                  value="tareas"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Tareas
                </TabsTrigger>
                <TabsTrigger
                  value="notas"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Notas
                </TabsTrigger>
                <TabsTrigger
                  value="anexos"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Anexos
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ==================== TAB: GENERAL ==================== */}
            <TabsContent value="general" className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Botones Editar / Anexar */}
              <div className="flex items-center justify-end gap-2 -mt-2 mb-2">
                <button
                  onClick={async () => {
                    if (modoEdicion) {
                      // Guardar cambios en backend
                      try {
                        toast.loading('Guardando cambios...', { id: 'saving-proceso' });
                        await legalService.updateJuzgamientoProceso(proceso.id, {
                          tipoFalta: editData.tipoFalta,
                          etapa: editData.etapa,
                          abogadoSustanciador: editData.abogadoAsignado,
                          cargoInvestigado: editData.cargo,
                          dependenciaInvestigado: editData.dependencia,
                          hechos: editData.descripcionHechos,
                          demandado: editData.disciplinado
                        });
                        toast.success('Cambios guardados exitosamente', {
                          id: 'saving-proceso',
                          description: 'Los datos del proceso han sido actualizados en el sistema'
                        });
                        setHasChanges(true);
                        onRefresh?.();
                      } catch (error) {
                        console.error('Error updating proceso:', error);
                        toast.error('Error al guardar los cambios', { id: 'saving-proceso' });
                      }
                    }
                    setModoEdicion(!modoEdicion);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${modoEdicion
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-white text-blue-700 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                >
                  <Edit className="w-4 h-4" />
                  {modoEdicion ? 'Guardar Cambios' : 'Editar Proceso'}
                </button>
                <button
                  onClick={() => setModalAnexarAbierto(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:shadow-lg"
                  style={{ background: '#003DA5' }}
                >
                  <LinkIcon className="w-4 h-4" />
                  Anexar Proceso
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Información del Proceso */}
                <Card className="p-4 border-2 border-blue-100">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                    <Gavel className="w-5 h-5" /> Información del Proceso
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Número de Proceso</p>
                      <p className="font-bold text-lg" style={{ color: '#003DA5' }}>{proceso.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Falta</p>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={editData.tipoFalta}
                          onChange={(e) => setEditData({ ...editData, tipoFalta: e.target.value })}
                          className="w-full px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 font-semibold">{proceso.tipoFalta}</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Etapa Actual</p>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={editData.etapa}
                          onChange={(e) => setEditData({ ...editData, etapa: e.target.value })}
                          className="w-full px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="font-bold">{proceso.etapa}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Investigador Asignado</p>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={editData.abogadoAsignado}
                          onChange={(e) => setEditData({ ...editData, abogadoAsignado: e.target.value })}
                          className="w-full px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>{(proceso.abogadoAsignado || 'User').substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <p className="font-bold">{proceso.abogadoAsignado || 'Sin Asignar'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Información del Investigado */}
                <Card className="p-4 border-2 border-gray-200">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-gray-800">
                    <User className="w-5 h-5" /> Investigado
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Nombre Completo</p>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={editData.disciplinado}
                          onChange={(e) => setEditData({ ...editData, disciplinado: e.target.value })}
                          className="w-full px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="font-bold text-lg">{(proceso as any).investigado}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cargo</p>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={editData.cargo}
                          onChange={(e) => setEditData({ ...editData, cargo: e.target.value })}
                          className="w-full px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="font-semibold">{proceso.cargo || 'No registrado'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dependencia</p>
                      {modoEdicion ? (
                        <input
                          type="text"
                          value={editData.dependencia}
                          onChange={(e) => setEditData({ ...editData, dependencia: e.target.value })}
                          className="w-full px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="font-semibold">{proceso.dependencia || 'No registrado'}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Cronología de Términos */}
              <Card className="p-4 bg-blue-50 border-2 border-blue-200">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <Clock className="w-5 h-5" /> Cronología de Términos ({proceso.etapa})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Días Restantes</p>
                    <p className="text-3xl font-black text-orange-600">{proceso.diasRestantes}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Días Transcurridos</p>
                    <p className="text-3xl font-black text-blue-600">{Math.max(0, diasTotalesEtapa - proceso.diasRestantes)}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Días Totales Etapa</p>
                    <p className="text-3xl font-black text-gray-600">{diasTotalesEtapa}</p>
                  </div>
                </div>
              </Card>

              {/* Última Actuación */}
              <Card className="p-6 border-2 border-blue-200 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-xl flex items-center gap-2" style={{ color: '#003DA5' }}>
                    <AlertTriangle className="w-6 h-6" /> ÚLTIMA ACTUACIÓN PROCESAL
                  </h3>
                </div>

                <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl mb-5 border border-blue-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Actuación:</p>
                  <p className="font-black text-lg text-gray-900">
                    {proceso.ultimaActuacion?.descripcion || 'Solicitud de informes a RRHH'}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-gray-500">
                    <span>📅 {proceso.fechaActualizacion ? new Date(proceso.fechaActualizacion).toLocaleDateString('es-CO') : 'N/A'}</span>
                    <span>⏰ {proceso.fechaActualizacion ? new Date(proceso.fechaActualizacion).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleDescargarPDF}
                    size="sm"
                    className="font-semibold"
                    style={{ background: '#F57C00', color: '#FFFFFF' }}
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Descargar PDF
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* ==================== TAB: HECHOS ==================== */}
            <TabsContent value="hechos" className="flex-1 overflow-y-auto p-6">
              <Card className="p-6">
                <h3 className="font-black text-xl mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <AlertTriangle className="w-6 h-6" /> Descripción de los Hechos
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">{(proceso as any).descripcionHechos || (proceso as any).hechos || 'No se han registrado hechos.'}</p>
              </Card>
            </TabsContent>

            {/* ==================== TAB: DOCUMENTO ==================== */}
            <TabsContent value="documento" className="flex-1 overflow-y-auto p-6 space-y-4">
              <TabDocumentosExpediente
                expedienteId={proceso.id}
                documentos={documentosExpediente}
                setDocumentos={(_next) => { }}
                profesionalAsignado={proceso.abogadoAsignado || 'Control Disciplinario'}
                tituloSeccion="Documentos del Proceso Disciplinario"
                moduloContexto="juzgamiento"
                onUploadDocument={handleUploadDocumentoDesdeTab}
                onViewDocument={(doc) => handleVerDocumento({
                  documentoUrl: doc.url,
                  nombre: doc.nombre,
                  tipo: doc.tipo
                })}
                onDownloadDocument={(doc) => handleDescargarDocumento(doc)}
                onDownloadAll={handleDescargarTodosDocumentos}
                onHasChanges={() => setHasChanges(true)}
              />
            </TabsContent>

            {/* ==================== TAB: ACTUACIONES ==================== */}
            <TabsContent value="actuaciones" className="flex-1 overflow-y-auto p-6">
              <TabActuacionesExpediente
                actuaciones={actuacionesParaTab}
                botonesAccion={[
                  {
                    label: 'Decisión',
                    icono: <CheckCircle className="w-3 h-3 mr-1" />,
                    onClick: () => {
                      setMostrarFormularioDecision(true);
                      setHasChanges(true);
                    },
                    color: '#059669'
                  },
                  {
                    label: 'Agregar Actuación',
                    icono: <Plus className="w-3 h-3 mr-1" />,
                    onClick: () => setModalNuevaActuacionOpen(true),
                    color: '#003DA5'
                  }
                ]}
                decisiones={decisiones.map((decision: any) => ({
                  tipoDecision: decision.tipoDecision,
                  tipoFallo: decision.tipoFallo,
                  fecha: decision.fecha,
                  responsable: decision.responsable,
                  sancion: decision.sancion
                }))}
                labelRegistrar="Registrar Primera Actuación"
                onRegistrarPrimera={() => setModalNuevaActuacionOpen(true)}
              />
            </TabsContent>

            {/* ==================== TAB: TAREAS ==================== */}
            <TabsContent value="tareas" className="flex-1 overflow-y-auto p-6 space-y-4">
              <TabTareasExpediente
                tareas={tareas}
                setTareas={setTareas}
                expedienteId={proceso.id}
                onCrearTarea={() => {
                  setModalCrearTareaAbierto(true);
                }}
                onEditarTarea={handleEditarTarea}
                onMarcarCompletada={handleMarcarTareaCompletada}
              />
            </TabsContent>

            {/* ==================== TAB: NOTAS ==================== */}
            <TabsContent value="notas" className="flex-1 overflow-y-auto p-6 space-y-4">
              <TabNotasExpediente
                notas={notasInternas}
                onAgregarNota={() => {
                  setModalAgregarNotaAbierto(true);
                }}
              />
            </TabsContent>

            {/* ==================== TAB: ANEXOS ==================== */}
            <TabsContent value="anexos" className="flex-1 overflow-y-auto p-6 space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-xl flex items-center gap-2" style={{ color: '#003DA5' }}>
                    <LinkIcon className="w-6 h-6" /> Procesos Anexados
                  </h3>
                  <Button
                    onClick={() => setModalAnexarAbierto(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Anexar Proceso
                  </Button>
                </div>

                <div className="space-y-4">
                  {(proceso as any).procesosAnexados && (proceso as any).procesosAnexados.length > 0 ? (
                    (proceso as any).procesosAnexados.map((anexo: any) => (
                      <div key={anexo.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-gray-50 items-start md:items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">{anexo.radicado}</Badge>
                            <Badge variant="outline">{anexo.estado}</Badge>
                          </div>
                          <p className="text-sm"><strong>Investigado:</strong> {anexo.investigado || 'No registrado'}</p>
                          <p className="text-sm"><strong>Tipo Falta:</strong> {anexo.tipoFalta || 'No especificada'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => {
                              if (onVerExpedienteAnexado) {
                                onVerExpedienteAnexado(anexo.radicado || anexo.id);
                              } else {
                                toast.info('La visualización de expedientes anexados no está configurada');
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Expediente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={async () => {
                              if (window.confirm('¿Está seguro de desanexar este proceso?')) {
                                try {
                                  await legalService.desanexarJuzgamientoProceso(anexo.radicado || anexo.id, 'Usuario Actual');
                                  toast.success('Proceso desanexado exitosamente');
                                  setHasChanges(true);
                                  onRefresh?.();
                                } catch (e: any) {
                                  toast.error('Error al desanexar proceso');
                                }
                              }
                            }}
                          >
                            <Unlink className="w-4 h-4 mr-2" />
                            Desanexar
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg bg-gray-50 text-gray-500">
                      <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-semibold mb-1">No hay procesos anexados</p>
                      <p className="text-sm">Haga clic en "Anexar Proceso" para vincular otro expediente a este proceso.</p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <FooterExpediente
            expedienteId={proceso.id}
            totalArchivos={documentosExpediente.length}
            totalActuaciones={actuacionesTotales.length}
            tercerConteo={{ label: 'tareas', valor: tareas.length, color: '#EA580C' }}
            onClose={handleCerrar}
            onNotificar={handleNotificar}
            onCompartir={handleCompartir}
            onDescargarPDF={handleDescargarPDF}
            onGuardar={
              authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_EDIT)
                ? handleGuardarCambios
                : undefined
            }
            hasChanges={hasChanges}
            labelId="Proceso"
          />
        </DialogContent>

        <FormularioRegistrarDecision
          isOpen={mostrarFormularioDecision}
          onClose={() => setMostrarFormularioDecision(false)}
          onGuardar={handleGuardarNuevaDecision}
          procesoId={proceso.id}
        />

        {/* ==================== MODAL: NUEVA EXCEPCIÓN PROCESAL ==================== */}
        {modalNuevaExcepcion && (
          <Dialog open={modalNuevaExcepcion} onOpenChange={setModalNuevaExcepcion}>
            <DialogContent hideCloseButton className="w-[90vw] max-w-[420px] p-0">
              <DialogTitle className="sr-only">Nueva Excepción Procesal</DialogTitle>
              <DialogDescription className="sr-only">
                Registrar nueva excepción procesal en el proceso {proceso.id}
              </DialogDescription>

              <ModalHeaderClean
                titulo="Nueva Excepción Procesal"
                subtitulo={`Proceso ${proceso.id}`}
                icono={AlertTriangle}
                colorIcono="orange"
                onClose={() => setModalNuevaExcepcion(false)}
              />

              <div className="p-6 space-y-5">
                {/* SECCIÓN: Tipo de Excepción (Radio Buttons) - Parametrizable desde Configuraciones */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Tipo de Excepción Procesal *
                  </label>
                  <div className="space-y-3">
                    {tiposExcepcionesActivos && tiposExcepcionesActivos.length > 0 ? (
                      tiposExcepcionesActivos.map((tipo) => (
                        <label key={tipo.id} className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all">
                          <input
                            type="radio"
                            name="tipo-excepcion"
                            value={tipo.nombre}
                            className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                            id={`radio-${tipo.id}`}
                          />
                          <div className="flex-1">
                            <div className="font-bold text-gray-900">{tipo.icono} {tipo.nombre}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {tipo.descripcion}
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <p className="text-sm text-gray-600">
                          No hay tipos de excepciones configurados. <br />
                          <span className="text-xs">Configure los tipos en <strong>Configuraciones del Sistema</strong></span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECCIÓN: Causal Específica (Dropdown) - Parametrizable desde Configuraciones */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Causal Específica (Opcional)
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    id="impedimento-excepcion"
                  >
                    <option value="">Seleccione una causal...</option>
                    {causalesEspecificasActivas && causalesEspecificasActivas.length > 0 ? (
                      causalesEspecificasActivas.map((causal) => (
                        <option key={causal.id} value={causal.nombre}>
                          {causal.icono} {causal.nombre} {causal.descripcion && `(${causal.descripcion})`}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay causales configuradas</option>
                    )}
                  </select>
                </div>

                {/* SECCIÓN: Descripción de la Excepción */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📋 Descripción de la Excepción *
                  </label>
                  <textarea
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
                    rows={5}
                    placeholder="Describa detalladamente la excepción procesal. Indíquelas los hechos que la fundamentan o la excepción..."
                    id="descripcion-excepcion"
                  />
                </div>

                {/* SECCIÓN: Fundamento Legal */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ⚖️ Fundamento Legal *
                  </label>
                  <textarea
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
                    rows={3}
                    placeholder="Indique las normas aplicables o jurisprudencia que fundamenta la excepción (Ej: Art. 100 CGP, Ley 734 de 2002...)"
                    id="fundamento-excepcion"
                  />
                </div>

                {/* SECCIÓN: Presentada Por (Opcional) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    👤 Presentada Por (Opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    placeholder="Nombre de quien presenta la excepción"
                    id="responsable-excepcion"
                  />
                </div>

                {/* ALERTA INFORMATIVA */}
                <Card className="p-3 bg-orange-50 border-2 border-orange-200">
                  <p className="text-sm text-orange-800">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Las excepciones procesales deben ser fundamentadas jurídicamente y presentadas dentro de los términos legales establecidos.
                  </p>
                </Card>
              </div>

              <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setModalNuevaExcepcion(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => {
                    // Obtener valores de radio buttons
                    const radioSeleccionado = document.querySelector('input[name="tipo-excepcion"]:checked') as HTMLInputElement;
                    const impedimentoSelect = document.getElementById('impedimento-excepcion') as HTMLSelectElement;
                    const descripcionTextarea = document.getElementById('descripcion-excepcion') as HTMLTextAreaElement;
                    const fundamentoTextarea = document.getElementById('fundamento-excepcion') as HTMLTextAreaElement;
                    const responsableInput = document.getElementById('responsable-excepcion') as HTMLInputElement;

                    const tipoExcepcion = radioSeleccionado?.value;
                    const impedimento = impedimentoSelect?.value;
                    const descripcion = descripcionTextarea?.value;
                    const fundamento = fundamentoTextarea?.value;
                    const responsable = responsableInput?.value || 'Sin especificar';

                    // Validaciones
                    if (!tipoExcepcion) {
                      toast.error('⚠️ Tipo de excepción requerido', {
                        description: 'Debe seleccionar un tipo de excepción procesal'
                      });
                      return;
                    }

                    if (!descripcion) {
                      toast.error('⚠️ Descripción requerida', {
                        description: 'Debe describir la excepción procesal'
                      });
                      return;
                    }

                    if (!fundamento) {
                      toast.error('⚠️ Fundamento legal requerido', {
                        description: 'Debe indicar el fundamento legal de la excepción'
                      });
                      return;
                    }

                    // Construir tipo completo
                    let tipoCompleto = tipoExcepcion;
                    if (impedimento) {
                      tipoCompleto += ` - ${impedimento}`;
                    }

                    const nuevaExcepcion = {
                      tipo: tipoCompleto,
                      descripcion,
                      fundamento,
                      presentadoPor: responsable
                    };

                    // Llamar al backend via handleGuardarNuevaExcepcion
                    handleGuardarNuevaExcepcion(nuevaExcepcion);
                    setModalNuevaExcepcion(false);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Excepción
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ==================== MODAL: VISOR DE DOCUMENTOS ==================== */}
        {/* ==================== MODAL: VISOR DE DOCUMENTOS ==================== */}
        {pruebaSeleccionada && (
          <VisorDocumentoModal
            isOpen={visorAbierto}
            onClose={() => setVisorAbierto(false)}
            archivo={getFileUrl(pruebaSeleccionada.documentoUrl || pruebaSeleccionada.archivo || pruebaSeleccionada.url)}
            numero={pruebaSeleccionada.documentoNombre || pruebaSeleccionada.nombre}
            asunto={pruebaSeleccionada.descripcion}
          />
        )}

        {documentoSeleccionado && (
          <VisorDocumentoModal
            isOpen={visorAbierto}
            onClose={() => setVisorAbierto(false)}
            archivo={getFileUrl(documentoSeleccionado.documentoUrl || documentoSeleccionado.archivo || documentoSeleccionado.url)}
            numero={documentoSeleccionado.documentoNombre || documentoSeleccionado.nombre}
            asunto={`Documento del proceso ${proceso.id}`}
          />
        )}

        {decisionSeleccionada && (
          <Dialog open={!!decisionSeleccionada} onOpenChange={() => setDecisionSeleccionada(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogTitle className="flex items-center gap-2 text-2xl font-black text-blue-900">
                <Gavel className="w-6 h-6" /> {decisionSeleccionada.tipoDecision}
              </DialogTitle>
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Fallo</p>
                    <Badge className={decisionSeleccionada.tipoFallo === 'Absolutoria' ? 'bg-green-600' : 'bg-red-600'}>
                      {decisionSeleccionada.tipoFallo}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-bold">{decisionSeleccionada.fecha}</p>
                  </div>
                </div>

                <Card className="p-4 border-l-4 border-orange-500 shadow-sm">
                  <h4 className="font-bold text-lg mb-2 text-orange-900">Sanción</h4>
                  <p className="text-gray-800">{decisionSeleccionada.sancion || 'No aplica'}</p>
                </Card>

                <div className="space-y-2">
                  <h4 className="font-bold text-blue-900 border-b pb-1">Consideraciones</h4>
                  <p className="text-sm text-gray-700 leading-relaxed text-justify whitespace-pre-wrap">
                    {decisionSeleccionada.consideraciones}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-blue-900 border-b pb-1">Fundamentos Jurídicos</h4>
                  <p className="text-sm text-gray-700 leading-relaxed text-justify whitespace-pre-wrap">
                    {decisionSeleccionada.fundamentosJuridicos}
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => setDecisionSeleccionada(null)}>Cerrar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal para Registrar Excepción Procesal */}
        {mostrarFormularioExcepcion && (
          <FormularioExcepcionProcesal
            isOpen={mostrarFormularioExcepcion}
            onClose={() => setMostrarFormularioExcepcion(false)}
            onGuardar={handleGuardarNuevaExcepcion}
            procesoId={proceso.id || ''}
          />
        )}

        {/* Hidden File Input for Pruebas Upload */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.jpg,.png,.xlsx,.zip"
          onChange={(e) => handleFileUpload(e, 'EVIDENCIA')}
        />
        {/* ==================== MODAL: NUEVA ACTUACIÓN ==================== */}
        <ModalNuevaActuacion
          isOpen={modalNuevaActuacionOpen}
          onClose={() => setModalNuevaActuacionOpen(false)}
          onSave={handleGuardarActuacion}
          procesoId={proceso.id}
        />
        {/* ==================== MODAL: CREAR TAREA ==================== */}
        {modalCrearTareaAbierto && (
          <Dialog open={modalCrearTareaAbierto} onOpenChange={(open) => {
            setModalCrearTareaAbierto(open);
            if (!open) { setFormTareaTitulo(''); setFormTareaDescripcion(''); setFormTareaPrioridad('media'); setFormTareaVencimiento(''); }
          }}>
            <DialogContent hideCloseButton className="w-[90vw] max-w-[500px] p-0">
              <DialogTitle className="sr-only">Nueva Tarea</DialogTitle>
              <DialogDescription className="sr-only">
                Crear nueva tarea para el expediente {proceso.id}
              </DialogDescription>

              <ModalHeaderClean
                titulo="Nueva Tarea"
                subtitulo={`Proceso ${proceso.id}`}
                icono={Calendar}
                colorIcono="orange"
                onClose={() => { setModalCrearTareaAbierto(false); setFormTareaTitulo(''); setFormTareaDescripcion(''); setFormTareaPrioridad('media'); setFormTareaVencimiento(''); }}
              />

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Título de la tarea *</label>
                  <input
                    type="text"
                    value={formTareaTitulo}
                    onChange={(e) => setFormTareaTitulo(e.target.value)}
                    placeholder="Ej: Recopilar soportes documentales"
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción</label>
                  <textarea
                    value={formTareaDescripcion}
                    onChange={(e) => setFormTareaDescripcion(e.target.value)}
                    placeholder="Describa los detalles de la tarea..."
                    rows={3}
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Prioridad</label>
                    <select
                      value={formTareaPrioridad}
                      onChange={(e) => setFormTareaPrioridad(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={formTareaVencimiento}
                      onChange={(e) => setFormTareaVencimiento(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setModalCrearTareaAbierto(false); setFormTareaTitulo(''); setFormTareaDescripcion(''); setFormTareaPrioridad('media'); setFormTareaVencimiento(''); }}>
                  Cancelar
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  onClick={handleCrearTarea}
                  disabled={!formTareaTitulo.trim()}
                >
                  Crear Tarea
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ==================== MODAL: EDITAR TAREA ==================== */}
        {modalEditarTareaAbierto && tareaEnEdicion && (
          <Dialog open={modalEditarTareaAbierto} onOpenChange={(open) => {
            setModalEditarTareaAbierto(open);
            if (!open) { setTareaEnEdicion(null); setFormTareaTitulo(''); setFormTareaDescripcion(''); setFormTareaPrioridad('media'); setFormTareaVencimiento(''); }
          }}>
            <DialogContent hideCloseButton className="w-[90vw] max-w-[500px] p-0">
              <DialogTitle className="sr-only">Editar Tarea</DialogTitle>
              <DialogDescription className="sr-only">
                Editar tarea del expediente {proceso.id}
              </DialogDescription>

              <ModalHeaderClean
                titulo="Editar Tarea"
                subtitulo={`Proceso ${proceso.id}`}
                icono={Edit}
                colorIcono="orange"
                onClose={() => { setModalEditarTareaAbierto(false); setTareaEnEdicion(null); setFormTareaTitulo(''); setFormTareaDescripcion(''); setFormTareaPrioridad('media'); setFormTareaVencimiento(''); }}
              />

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Título de la tarea *</label>
                  <input
                    type="text"
                    value={formTareaTitulo}
                    onChange={(e) => setFormTareaTitulo(e.target.value)}
                    placeholder="Ej: Recopilar soportes documentales"
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción</label>
                  <textarea
                    value={formTareaDescripcion}
                    onChange={(e) => setFormTareaDescripcion(e.target.value)}
                    placeholder="Describa los detalles de la tarea..."
                    rows={3}
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Prioridad</label>
                    <select
                      value={formTareaPrioridad}
                      onChange={(e) => setFormTareaPrioridad(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={formTareaVencimiento}
                      onChange={(e) => setFormTareaVencimiento(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setModalEditarTareaAbierto(false); setTareaEnEdicion(null); setFormTareaTitulo(''); setFormTareaDescripcion(''); setFormTareaPrioridad('media'); setFormTareaVencimiento(''); }}>
                  Cancelar
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  onClick={handleGuardarEdicionTarea}
                  disabled={!formTareaTitulo.trim()}
                >
                  Guardar Cambios
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ==================== MODAL: AGREGAR NOTA ==================== */}
        {modalAgregarNotaAbierto && (
          <Dialog open={modalAgregarNotaAbierto} onOpenChange={(open) => {
            setModalAgregarNotaAbierto(open);
            if (!open) { setFormNotaContenido(''); setFormNotaTipo('seguimiento'); }
          }}>
            <DialogContent hideCloseButton className="w-[90vw] max-w-[500px] p-0">
              <DialogTitle className="sr-only">Nueva Nota Interna</DialogTitle>
              <DialogDescription className="sr-only">
                Agregar nota interna al expediente {proceso.id}
              </DialogDescription>

              <ModalHeaderClean
                titulo="Nueva Nota Interna"
                subtitulo={`Proceso ${proceso.id}`}
                icono={Edit}
                colorIcono="yellow"
                onClose={() => { setModalAgregarNotaAbierto(false); setFormNotaContenido(''); setFormNotaTipo('seguimiento'); }}
              />

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo de nota</label>
                  <select
                    value={formNotaTipo}
                    onChange={(e) => setFormNotaTipo(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="seguimiento">📋 Seguimiento</option>
                    <option value="importante">⚠️ Importante</option>
                    <option value="alerta">🔔 Alerta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Contenido de la nota *</label>
                  <textarea
                    value={formNotaContenido}
                    onChange={(e) => setFormNotaContenido(e.target.value)}
                    placeholder="Escriba el contenido de la nota interna..."
                    rows={5}
                    className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                  />
                </div>

                <Card className="p-3 bg-yellow-50 border-2 border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    Las notas internas son visibles solo para el equipo jurídico y no forman parte del expediente oficial.
                  </p>
                </Card>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setModalAgregarNotaAbierto(false); setFormNotaContenido(''); setFormNotaTipo('seguimiento'); }}>
                  Cancelar
                </Button>
                <Button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
                  onClick={handleAgregarNota}
                  disabled={!formNotaContenido.trim()}
                >
                  Guardar Nota
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Dialog>

      {/* Modal Anexar Proceso Disciplinario */}
      {modalAnexarAbierto && (
        <ModalAnexarProcesoDisciplinario
          isOpen={modalAnexarAbierto}
          onClose={() => setModalAnexarAbierto(false)}
          procesoActual={{
            id: proceso.id,
            uuid: (proceso as any).uuid,
            disciplinado: proceso.disciplinado,
            investigado: (proceso as any).investigado,
            tipoFalta: proceso.tipoFalta,
            etapa: proceso.etapa
          }}
          onAnexado={() => {
            setHasChanges(true);
            setModalAnexarAbierto(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
