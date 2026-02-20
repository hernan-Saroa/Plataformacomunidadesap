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
  FileDown, Scale
} from 'lucide-react';
import jsPDF from 'jspdf';
import type { ProcesoDisciplinario, DecisionDisciplinaria } from '../core/types';
import { useState, useMemo, useEffect, useRef } from 'react';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { FormularioRegistrarDecision } from './FormularioRegistrarDecision';
import { FormularioExcepcionProcesal } from './FormularioExcepcionProcesal';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';
import { ModalNuevaActuacion, type NuevaActuacionData } from './ModalNuevaActuacion';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';

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
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso }: ModalProcesoDisciplinarioProps) {
  // ✅ Obtener configuraciones desde Context API
  const { tiposExcepcionesActivos, causalesEspecificasActivas } = useConfiguracionModulo('juzgamiento');

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

  // Estado para el visor de documentos
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [pruebaSeleccionada, setPruebaSeleccionada] = useState<any>(null);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any>(null);

  // Derived states for tabs options
  const pruebas = actuaciones.filter(a => a.tipoActuacion === 'EVIDENCIA');
  const documentos = actuaciones.filter(a => a.tipoActuacion === 'DOCUMENTO');

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
    }
  }, [proceso.id]);

  // Helper para construir URL completa de archivo (legal-management-service)
  // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
  const getFileUrl = (archivoUrl: string): string => {
    if (!archivoUrl) return '';
    if (archivoUrl.startsWith('http')) return archivoUrl;

    const baseUrl = getServiceUrl('legal');
    let filename = archivoUrl;
    if (archivoUrl.includes('/files/')) {
      filename = archivoUrl.split('/files/').pop() || archivoUrl;
    } else if (archivoUrl.includes('/')) {
      filename = archivoUrl.split('/').pop() || archivoUrl;
    }
    const prefix = API_MODE === 'direct' ? '' : '/legal';
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
    const url = act.documentoUrl || act.url;
    if (!url) {
      toast.error('No hay documento disponible');
      return;
    }
    const fileUrl = getFileUrl(url);
    window.open(fileUrl, '_blank');
    toast.success('Documento abierto en nueva pestaña');
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
      doc.text(`Investigado: ${proceso.investigado || proceso.disciplinado || 'N/A'}`, 20, y); y += 8;
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

  // Document Handler Logic
  // Updated for robustness: use blob for download, new tab for view
  const handleVerDocumento = (doc: any) => {
    const url = doc.documentoUrl || doc.url || doc.archivoUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('No hay documento para visualizar');
    }
  };

  const handleDescargarDocumento = async (doc: any) => {
    const url = doc.documentoUrl || doc.url || doc.archivoUrl;
    const nombreArchivo = doc.documentoNombre || doc.nombre || doc.nombreArchivo || `documento_${Date.now()}.pdf`;

    if (url) {
      try {
        toast.loading('Iniciando descarga...', { id: 'downloading-doc-2' });

        const response = await fetch(url);
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


  return (
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
                value="pruebas"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Eye className="w-4 h-4 mr-2" />
                Pruebas
              </TabsTrigger>
              <TabsTrigger
                value="actuaciones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Clock className="w-4 h-4 mr-2" />
                Actuaciones
              </TabsTrigger>
              <TabsTrigger
                value="decisiones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Decisiones
              </TabsTrigger>
              <TabsTrigger
                value="documentos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Documentos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TAB: GENERAL ==================== */}
          <TabsContent value="general" className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    <Badge className="bg-orange-100 text-orange-700 font-semibold">{proceso.tipoFalta}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Etapa Actual</p>
                    <p className="font-bold">{proceso.etapa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investigador Asignado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>{(proceso.abogadoAsignado || 'User').substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <p className="font-bold">{proceso.abogadoAsignado || 'Sin Asignar'}</p>
                    </div>
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
                    <p className="font-bold text-lg">{proceso.investigado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cargo</p>
                    <p className="font-semibold">{proceso.cargo || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dependencia</p>
                    <p className="font-semibold">{proceso.dependencia || 'No registrado'}</p>
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
                  <span>📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</span>
                  <span>⏰ {proceso.fechaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
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
              <p className="text-gray-700 leading-relaxed mb-4">{proceso.hechos || 'No se han registrado hechos.'}</p>
            </Card>
          </TabsContent>

          {/* ==================== TAB: PRUEBAS ==================== */}
          <TabsContent value="pruebas" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Material Probatorio</h3>
              {authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_PRUEBA) && (
                <Button onClick={handleAgregarPrueba} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar Prueba
                </Button>
              )}
            </div>

            {pruebas.length === 0 && <p className="text-gray-500 italic">No hay pruebas registradas.</p>}

            {pruebas.map((prueba: any, index: number) => (
              <Card key={prueba.id || index} className="p-4 hover:shadow-md transition-all border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{prueba.documentoNombre || prueba.nombre || `Prueba #${index + 1}`}</h4>
                    <p className="text-sm text-gray-600 mb-3">{prueba.descripcion} - {new Date(prueba.fechaActuacion).toLocaleDateString()}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleVerPrueba(prueba)}>
                        <Eye className="w-4 h-4 mr-1.5" /> Ver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDescargarDocumento(prueba)}>
                        <Download className="w-4 h-4 mr-1.5" /> Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ==================== TAB: ACTUACIONES ==================== */}
          <TabsContent value="actuaciones" className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>
                Historial de Actuaciones
              </h3>

              {/* ✅ BOTÓN AGREGAR ACTUACIÓN */}
              <Button
                onClick={() => setModalNuevaActuacionOpen(true)}
                className="font-bold flex items-center gap-2"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4" />
                Agregar Actuación
              </Button>
            </div>

            {/* Lista de actuaciones con estado dinámico */}
            {actuaciones.length === 0 ? (
              <Card className="p-8 text-center border-2 border-dashed border-gray-300">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h4 className="font-bold text-lg text-gray-600 mb-2">
                  Sin actuaciones registradas
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Aún no se han registrado actuaciones en este proceso disciplinario
                </p>
                <Button
                  onClick={() => setModalNuevaActuacionOpen(true)}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primera Actuación
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {actuaciones.map((act) => (
                  <Card
                    key={act.id}
                    className="p-4 border-l-4 hover:shadow-md transition-all"
                    style={{ borderLeftColor: act.colorBorde || (act.estado === 'COMPLETADA' ? '#10B981' : '#F59E0B') }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg" style={{ background: `${act.colorBorde || '#F59E0B'}15` }}>
                        <Clock className="w-5 h-5" style={{ color: act.colorBorde || '#F59E0B' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-2 py-0.5 text-xs font-bold rounded-full"
                                style={{
                                  background: `${act.colorBorde || '#F59E0B'}20`,
                                  color: act.colorBorde || '#F59E0B'
                                }}
                              >
                                {act.tipo || act.tipoActuacion}
                              </span>
                              <span className="text-xs text-gray-500">📅 {act.fecha || (act.fechaActuacion ? new Date(act.fechaActuacion).toLocaleDateString('es-CO') : '')}</span>
                            </div>
                            <p className="font-bold text-sm text-gray-900 mb-1">{act.descripcion}</p>
                            <p className="text-xs text-gray-600">
                              👤 <span className="font-semibold">{act.responsable}</span>
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${act.estado === 'COMPLETADA'
                              ? 'bg-green-100 text-green-800'
                              : act.estado === 'EN_REVISION'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                              }`}
                          >
                            {act.estado === 'COMPLETADA' ? '✅ Completada' :
                              act.estado === 'EN_REVISION' ? '🔍 En Revisión' : '⏳ Pendiente'}
                          </span>
                        </div>
                        {/* ✅ Botones de acción por actuación */}
                        <div className="flex gap-2 mt-2">
                          {(act.documentoUrl || act.url) && (
                            <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={() => handleDescargarActuacion(act)}>
                              <Download className="w-3 h-3 mr-1" /> Descargar Archivo
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={() => handleGenerarPDFActuacion(act)}>
                            <FileDown className="w-3 h-3 mr-1" /> Generar PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== TAB: DECISIONES ==================== */}
          <TabsContent value="decisiones" className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Nota: Sección de Excepciones Procesales movida más abajo con UI preferida por el usuario */}

            {/* ========== SECCIÓN: DECISIONES ========== */}
            {decisiones.length === 0 ? (
              <Card className="p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-black text-xl mb-2 text-gray-600">Sin Decisiones Registradas</h3>
                <p className="text-gray-500 mb-4">El proceso aún se encuentra en etapa de investigación</p>
                {authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_DECISION) && (
                  <Button onClick={() => { setMostrarFormularioDecision(true); setHasChanges(true); }} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                    <Plus className="w-4 h-4 mr-2" /> Registrar Decisión
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Decisiones Registradas ({decisiones.length})</h3>
                  {authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_DECISION) && (
                    <Button onClick={() => { setMostrarFormularioDecision(true); setHasChanges(true); }} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                      <Plus className="w-4 h-4 mr-2" /> Nueva Decisión
                    </Button>
                  )}
                </div>
                {decisiones.map((decision, index) => (
                  <Card key={index} className="p-6 border-2 border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-black text-xl" style={{ color: '#003DA5' }}>
                            {decision.tipoDecision}
                          </h4>
                          <Badge
                            className="font-bold"
                            style={{
                              background: decision.tipoFallo === 'Absolutoria' ? '#10B981' : '#EF4444',
                              color: '#FFFFFF'
                            }}
                          >
                            {decision.tipoFallo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Decisión #{index + 1} • {decision.fecha}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {decision.sancion && (
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                          <p className="text-sm font-bold text-orange-900 mb-1">⚖️ Sanción Impuesta</p>
                          <p className="font-bold text-orange-800">{decision.sancion}</p>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-sm font-bold text-blue-900 mb-2">📋 Consideraciones</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {decision.consideraciones}
                        </p>
                      </div>

                      {decision.fundamentosJuridicos && (
                        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                          <p className="text-sm font-bold text-gray-900 mb-2">⚖️ Fundamentos Jurídicos</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {decision.fundamentosJuridicos}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Responsable</p>
                          <p className="font-bold text-sm">{decision.responsable}</p>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Cargo</p>
                          <p className="font-bold text-sm">{decision.cargoResponsable}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="font-semibold" onClick={() => setDecisionSeleccionada(decision)}>
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver Detalle
                        </Button>
                        <Button size="sm" variant="outline" className="font-semibold" onClick={() => handleDescargarDecision(decision)}>
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ==================== SECCIÓN: EXCEPCIONES PROCESALES ==================== */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200">
              <Card className="p-5 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h3 className="font-black text-lg text-orange-900">
                      Excepciones Procesales ({excepciones.length})
                    </h3>
                  </div>
                  <Button
                    onClick={() => {
                      setModalNuevaExcepcion(true);
                      setHasChanges(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nueva Excepción
                  </Button>
                </div>

                {excepciones.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-orange-700 font-medium">
                      No hay excepciones procesales registradas en este expediente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    {excepciones.map((excepcion, index) => (
                      <Card key={index} className="p-4 border-2 border-orange-300 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-base text-orange-900">
                                {excepcion.tipo}
                              </h4>
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold border-orange-400 text-orange-700"
                              >
                                {excepcion.estado}
                              </Badge>
                            </div>

                            {/* Descripción */}
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs font-bold text-gray-700 mb-1">📋 Descripción:</p>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {excepcion.descripcion}
                              </p>
                            </div>

                            {/* Fundamento Legal */}
                            {excepcion.fundamento && (
                              <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-xs font-bold text-orange-900 mb-1">⚖️ Fundamento Legal:</p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {excepcion.fundamento}
                                </p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">Fecha:</span>
                                <span className="font-semibold ml-1">{excepcion.fecha}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Presentada por:</span>
                                <span className="font-semibold ml-1">{excepcion.responsable}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-3">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ==================== TAB: DOCUMENTOS ==================== */}
          <TabsContent value="documentos" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Documentos del Proceso</h3>
              {authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_DOC_UPLOAD) && (
                <Button onClick={handleAgregarDocumento} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  <Upload className="w-4 h-4 mr-2" /> Subir Documento
                </Button>
              )}
            </div>

            {documentos.length === 0 && <p className="text-gray-500 italic">No hay documentos registrados.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentos.map((doc) => (
                <Card key={doc.id} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">{doc.documentoNombre || doc.nombre || 'Documento'}</h4>
                      <p className="text-xs text-gray-500">{doc.tamaño || 'Tamaño desconocido'} • {doc.fechaActuacion ? new Date(doc.fechaActuacion).toLocaleDateString() : (doc.fecha || 'Fecha desconocida')}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs font-semibold border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => handleVerDocumento(doc)}>
                          <Eye className="w-3 h-3 mr-1" /> Ver
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs font-semibold border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => handleDescargarDocumento(doc)}>
                          <Download className="w-3 h-3 mr-1" /> Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================== FOOTER STICKY ==================== */}
        <div className="flex-shrink-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600"><span className="font-semibold">Última actualización:</span> {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</p>
            {hasChanges && <Badge className="bg-orange-100 text-orange-700 font-semibold text-xs">Cambios sin guardar</Badge>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCerrar} className="font-semibold">Cerrar</Button>
            {authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_EXPEDIENTE_EDIT) && (
              <Button onClick={handleGuardarCambios} disabled={!hasChanges} className="font-semibold" style={{ background: hasChanges ? '#003DA5' : '#9CA3AF', color: '#FFFFFF', cursor: hasChanges ? 'pointer' : 'not-allowed' }}>
                <CheckCircle className="w-4 h-4 mr-2" /> Guardar Cambios
              </Button>
            )}
          </div>
        </div>
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
    </Dialog>
  );
}
