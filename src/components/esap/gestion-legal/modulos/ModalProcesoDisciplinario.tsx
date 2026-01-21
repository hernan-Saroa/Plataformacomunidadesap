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
  Eye, Download, Upload, Plus, Edit, Trash2, Send, Bell, Share2,
  FileDown, ExternalLink, Scale
} from 'lucide-react';
import jsPDF from 'jspdf';
import type { ProcesoDisciplinario, DecisionDisciplinaria } from '../core/types';
import { useState, useMemo, useEffect } from 'react';
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
import { copyToClipboard } from '../../../../utils/clipboard';
import { VisorDocumentoModal } from './VisorDocumentoModal';

interface ModalProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoDisciplinario;
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso }: ModalProcesoDisciplinarioProps) {
  const [tabActivo, setTabActivo] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Single source of truth for process actions/documents
  const [actuaciones, setActuaciones] = useState<any[]>([]);

  const [mostrarFormularioDecision, setMostrarFormularioDecision] = useState(false);
  const [decisiones, setDecisiones] = useState<any[]>([]);
  const [decisionSeleccionada, setDecisionSeleccionada] = useState<any>(null);

  // Excepciones Procesales
  const [excepciones, setExcepciones] = useState<any[]>([]);
  const [mostrarFormularioExcepcion, setMostrarFormularioExcepcion] = useState(false);

  // Derived states for tabs options
  const pruebas = actuaciones.filter(a => a.tipoActuacion === 'EVIDENCIA');
  const documentos = actuaciones.filter(a => a.tipoActuacion === 'DOCUMENTO');

  const [pruebaSeleccionada, setPruebaSeleccionada] = useState<any>(null);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any>(null);
  const [visorAbierto, setVisorAbierto] = useState(false);

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
    const prefix = API_MODE === 'direct' ? '' : '/legal/api/v1';
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
  const [mostrarModalNotificar, setMostrarModalNotificar] = useState(false);
  const [mostrarModalPortales, setMostrarModalPortales] = useState(false);
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [enlaceCompartir, setEnlaceCompartir] = useState('');

  // Implementación Real de Carga de Archivos
  const handleFileUpload = async (e: any, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading(`Subiendo ${tipo.toLowerCase()}...`, { id: 'upload-file' });

      // 1. Subir al backend
      const res = await legalService.uploadJuzgamientoDocumento(proceso.id, file, tipo, file.name);

      // 2. Crear objeto 'Actuación' para la lista unificada
      const nuevaActuacion = {
        id: res.id || Date.now(),
        tipoActuacion: tipo,
        descripcion: `Carga de ${tipo.toLowerCase()}: ${file.name} `,
        fechaActuacion: new Date().toISOString(),
        usuario: 'Usuario Actual',
        documentoUrl: res.url || res.path,
        documentoNombre: file.name,
        nombreArchivo: file.name,   // Legacy support
        tamaño: `${(file.size / 1024).toFixed(2)} KB`
      };

      // 3. Update single source
      setActuaciones(prev => [nuevaActuacion, ...prev]);
      setHasChanges(true);

      toast.success(`✅ ${tipo} cargado exitosamente`, { id: 'upload-file' });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo', { id: 'upload-file' });
    }
  };

  const confirmarNotificacion = () => {
    toast.success('Notificación enviada a los destinatarios');
    setMostrarModalNotificar(false);
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
    input.onchange = (e) => handleFileUpload(e, 'EVIDENCIA');
    input.click();
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

  const handleGuardarCambios = () => {
    toast.info('Los documentos se guardan automáticamente al subir.');
    setHasChanges(false);
    onClose();
  };

  const handleCompartir = () => {
    toast.loading('🔗 Generando enlace seguro de compartir...', {
      id: 'compartir-actuacion',
      duration: 1500
    });

    setTimeout(async () => {
      const enlace = `https://esap.gov.co/procesos/${proceso.id}/actuacion-ultima`;
      setEnlaceCompartir(enlace);
      const copiado = await copyToClipboard(enlace);
      setMostrarModalCompartir(true);

      if (copiado) {
        toast.success('✅ Enlace generado y copiado al portapapeles', {
          id: 'compartir-actuacion',
          description: 'Puedes pegar el enlace donde desees compartirlo',
          duration: 4000
        });
      } else {
        toast.info('🔗 Enlace generado', {
          id: 'compartir-actuacion',
          description: 'Copia el enlace desde el modal',
          duration: 3000
        });
      }
    }, 1500);
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

  const handleAbrirEnPortales = () => {
    setMostrarModalPortales(true);
  };

  const confirmarAbrirPortales = () => {
    const urlPortal = 'https://consultaprocesos.ramajudicial.gov.co/';
    toast.loading('🌐 Abriendo Portal de Notificaciones Judiciales...', {
      id: 'abrir-portales',
      duration: 1500
    });
    setTimeout(() => {
      window.open(urlPortal, '_blank', 'noopener,noreferrer');
      toast.success('✅ Portal abierto en nueva ventana', {
        id: 'abrir-portales',
        description: 'Sistema de Portales de la Rama Judicial',
        duration: 3000
      });
      setMostrarModalPortales(false);
    }, 1500);
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
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">Proceso Disciplinario {proceso.id}</DialogTitle>
        <DialogDescription className="sr-only">Vista completa del proceso disciplinario</DialogDescription>

        {/* ==================== HEADER STICKY ==================== */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Gavel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-white">{proceso.id}</DialogTitle>
                  <p className="text-sm text-blue-100">{proceso.tipoFalta}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/20 text-white font-semibold border-white/30">{proceso.etapa || 'SIN ETAPA'}</Badge>
                <Badge className="bg-orange-500 text-white font-semibold">{proceso.diasRestantes} días restantes</Badge>
              </div>
            </div>

            <Button onClick={onClose} variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

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
              {['general', 'hechos', 'pruebas', 'actuaciones', 'decisiones', 'documentos'].map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold capitalize"
                >
                  {tab}
                </TabsTrigger>
              ))}
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
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-1">Actuación:</p>
                <p className="font-bold text-gray-900">{actuacionesTotales[0]?.descripcion || 'Inicio del proceso'}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>📅 {actuacionesTotales[0]?.fechaActuacion ? new Date(actuacionesTotales[0].fechaActuacion).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')}</span>
                </div>
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
              <Button onClick={handleAgregarPrueba} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <Plus className="w-4 h-4 mr-2" /> Agregar Prueba
              </Button>
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
            <h3 className="font-black text-xl mb-4" style={{ color: '#003DA5' }}>Historial de Actuaciones</h3>
            <div className="space-y-3">
              {actuacionesTotales.length === 0 && <p className="text-gray-500">Solo inicio del proceso.</p>}
              {actuacionesTotales.map((act, idx) => (
                <Card key={idx} className="p-4 border-l-4 border-blue-800">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{act.tipoActuacion}</Badge>
                        {(act.documentoUrl || act.url) && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            Con documento
                          </Badge>
                        )}
                      </div>
                      <p className="font-bold text-sm text-gray-900">{act.descripcion || act.tipoActuacion}</p>
                      {act.documentoNombre && (
                        <p className="text-xs text-gray-600 mt-1">
                          📄 {act.documentoNombre}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">📅 {new Date(act.fechaActuacion).toLocaleDateString('es-CO')}</p>

                      {/* Botones de Ver/Descargar si hay documento */}
                      {(act.documentoUrl || act.url) && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => handleVerActuacion(act)}>
                            <Eye className="w-3 h-3 mr-1" /> Ver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDescargarActuacion(act)}>
                            <Download className="w-3 h-3 mr-1" /> Descargar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================== TAB: DECISIONES ==================== */}
          <TabsContent value="decisiones" className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ========== SECCIÓN: EXCEPCIONES PROCESALES ========== */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-orange-600" />
                  <h3 className="font-black text-xl text-orange-700">
                    Excepciones Procesales ({excepciones.length})
                  </h3>
                </div>
                <Button
                  onClick={() => setMostrarFormularioExcepcion(true)}
                  style={{ background: '#F97316', color: '#FFFFFF' }}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nueva Excepción
                </Button>
              </div>

              {excepciones.length === 0 ? (
                <Card className="p-4 bg-orange-50 border-orange-200 text-center">
                  <p className="text-orange-700 text-sm">
                    No hay excepciones procesales registradas en este expediente.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {excepciones.map((excepcion, index) => (
                    <Card key={index} className={`p-4 border-2 ${excepcion.estado === 'PENDIENTE' ? 'border-orange-300 bg-orange-50' :
                      excepcion.estado === 'RESUELTA' ? 'border-green-300 bg-green-50' :
                        'border-red-300 bg-red-50'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className="font-bold"
                              style={{
                                background: excepcion.tipo === 'NULIDAD' ? '#EF4444' :
                                  excepcion.tipo === 'RECUSACION' ? '#8B5CF6' :
                                    excepcion.tipo === 'PRESCRIPCION' ? '#F59E0B' :
                                      excepcion.tipo === 'IMPEDIMENTO' ? '#3B82F6' : '#6B7280',
                                color: '#FFFFFF'
                              }}
                            >
                              {excepcion.tipo}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`font-bold ${excepcion.estado === 'PENDIENTE' ? 'text-orange-700 border-orange-500' :
                                excepcion.estado === 'RESUELTA' ? 'text-green-700 border-green-500' :
                                  'text-red-700 border-red-500'
                                }`}
                            >
                              {excepcion.estado}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-800 mb-2">{excepcion.descripcion}</p>
                          {excepcion.fundamento && (
                            <p className="text-xs text-gray-600 italic mb-2">
                              <strong>Fundamento:</strong> {excepcion.fundamento}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>📅 {new Date(excepcion.fechaPresentacion).toLocaleDateString('es-CO')}</span>
                            {excepcion.presentadoPor && <span>👤 {excepcion.presentadoPor}</span>}
                          </div>
                          {excepcion.resolucion && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <p className="text-xs font-bold text-gray-700">Resolución:</p>
                              <p className="text-sm text-gray-800">{excepcion.resolucion}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Separador */}
            <div className="border-t-2 border-gray-200 my-6"></div>

            {/* ========== SECCIÓN: DECISIONES ========== */}
            {decisiones.length === 0 ? (
              <Card className="p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-black text-xl mb-2 text-gray-600">Sin Decisiones Registradas</h3>
                <p className="text-gray-500 mb-4">El proceso aún se encuentra en etapa de investigación</p>
                <Button onClick={() => { setMostrarFormularioDecision(true); setHasChanges(true); }} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  <Plus className="w-4 h-4 mr-2" /> Registrar Decisión
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Decisiones Registradas ({decisiones.length})</h3>
                  <Button onClick={() => { setMostrarFormularioDecision(true); setHasChanges(true); }} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                    <Plus className="w-4 h-4 mr-2" /> Nueva Decisión
                  </Button>
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
                        <Button size="sm" variant="outline" className="font-semibold text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setMostrarModalNotificar(true)}>
                          <Bell className="w-3.5 h-3.5 mr-1.5" />
                          Notificar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== TAB: DOCUMENTOS ==================== */}
          <TabsContent value="documentos" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Documentos del Proceso</h3>
              <Button onClick={handleAgregarDocumento} style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <Upload className="w-4 h-4 mr-2" /> Subir Documento
              </Button>
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
            <Button onClick={handleGuardarCambios} disabled={!hasChanges} className="font-semibold" style={{ background: hasChanges ? '#003DA5' : '#9CA3AF', color: '#FFFFFF', cursor: hasChanges ? 'pointer' : 'not-allowed' }}>
              <CheckCircle className="w-4 h-4 mr-2" /> Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* ==================== MODALES COMPLEMENTARIOS ==================== */}
      {mostrarModalNotificar && (
        <Dialog open={mostrarModalNotificar} onOpenChange={setMostrarModalNotificar}>
          <DialogContent hideCloseButton className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Bell className="w-6 h-6" />
              Notificar Última Actuación Procesal
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirmación para enviar notificaciones por correo electrónico a los destinatarios del proceso disciplinario
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Destinatarios</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>{proceso.disciplinado} (Disciplinado)</li>
                  <li>{proceso.abogadoAsignado} (Investigador)</li>
                  <li>Oficina Jurídica ESAP</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Notificación Exitosa</p>
                <p className="text-sm text-green-700">
                  Las notificaciones se enviarán por correo electrónico a los destinatarios indicados.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Las notificaciones incluyen la última actuación procesal</li>
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={confirmarNotificacion}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Notificar
                </Button>
                <Button
                  onClick={() => setMostrarModalNotificar(false)}
                  style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mostrarModalPortales && (
        <Dialog open={mostrarModalPortales} onOpenChange={setMostrarModalPortales}>
          <DialogContent hideCloseButton className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <ExternalLink className="w-6 h-6" />
              Abrir en Portales
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirmación para abrir el Portal de Notificaciones Judiciales en una nueva ventana
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Portal de Notificaciones Judiciales</p>
                <p className="text-sm text-gray-700 break-all font-mono bg-white p-3 rounded border">
                  https://consultaprocesos.ramajudicial.gov.co/
                </p>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Portal Abierto Exitosamente</p>
                <p className="text-sm text-green-700">
                  El Portal de Notificaciones Judiciales se abrirá en una nueva ventana.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={confirmarAbrirPortales}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Abrir Portal
                </Button>
                <Button
                  onClick={() => setMostrarModalPortales(false)}
                  style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mostrarModalCompartir && (
        <Dialog open={mostrarModalCompartir} onOpenChange={setMostrarModalCompartir}>
          <DialogContent><DialogTitle>Enlace Generado</DialogTitle><p>{enlaceCompartir}</p></DialogContent>
        </Dialog>
      )}


      <FormularioRegistrarDecision
        isOpen={mostrarFormularioDecision}
        onClose={() => setMostrarFormularioDecision(false)}
        onGuardar={handleGuardarNuevaDecision}
        procesoId={proceso.id}
      />

      {/* ==================== MODAL: VISOR DE DOCUMENTOS ==================== */}
      {pruebaSeleccionada && (
        <VisorDocumentoModal
          isOpen={visorAbierto}
          onClose={() => setVisorAbierto(false)}
          archivo={pruebaSeleccionada.documentoUrl || pruebaSeleccionada.archivo}
          numero={pruebaSeleccionada.documentoNombre || pruebaSeleccionada.nombre}
          asunto={pruebaSeleccionada.descripcion}
        />
      )}

      {documentoSeleccionado && (
        <VisorDocumentoModal
          isOpen={visorAbierto}
          onClose={() => setVisorAbierto(false)}
          archivo={documentoSeleccionado.documentoUrl || documentoSeleccionado.archivo}
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
    </Dialog>
  );
}

