/**
 * ModalDetalleSolicitudInforme - Vista completa de solicitud de informe
 * ✅ DISEÑO LIMPIO ESAP 2025 - MIGRADO
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import {
  FileText, Calendar, User, Building, Clock, X, AlertCircle,
  CheckCircle, Target, Edit, Send, Download, Upload, MessageSquare,
  Paperclip, AlertTriangle, Archive, Trash2, Eye, BellRing, Printer, Scale
} from 'lucide-react';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { SolicitudInforme, EtapaSolicitudInforme } from '../core/types';
import { toast } from 'sonner';
import { ModalHeaderClean } from './ModalHeaderClean';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';

/** Parsea observaciones almacenadas en la BD separando descripción base de notas */
function parseObservaciones(texto: string): { descripcionBase: string; notas: Array<{ fecha: string; usuario: string; texto: string }> } {
  // Quitar líneas de ARCHIVO_ADJUNTO
  const sinAdjuntos = texto.replace(/\[ARCHIVO_ADJUNTO\][^\n]*/g, '').replace(/\[NOTA\][^\n]*/g, '').trim();

  // Separar por el delimitador de comentarios "---"
  const partes = sinAdjuntos.split(/\n{0,2}---\n/);

  // Primera parte es la descripción original
  const descripcionBase = (partes[0] || '').trim();

  // Las demás partes son notas: "[date time] Usuario:\ntexto"
  const notas = partes.slice(1).map(p => {
    const match = p.match(/^\[([^\]]+)\]\s+([^:]+):\n?([\s\S]*)/);
    if (match) {
      return { fecha: match[1].trim(), usuario: match[2].trim(), texto: match[3].trim() };
    }
    return { fecha: '', usuario: 'Sistema', texto: p.trim() };
  }).filter(n => n.texto);

  return { descripcionBase, notas };
}

function getFilename(fileUrl: string): string {
  return fileUrl?.includes('/') ? fileUrl.split('/').pop()! : fileUrl;
}

function getFileViewUrl(fileUrl: string): string {
  const filename = getFilename(fileUrl);
  const baseUrl = getServiceUrl('legal');
  const prefix = API_MODE === 'direct' ? '' : '/legal';
  return `${baseUrl}${prefix}/files/${filename}?view=true`;
}

function getFileDownloadUrl(fileUrl: string, nombre: string): string {
  const filename = getFilename(fileUrl);
  const baseUrl = getServiceUrl('legal');
  const prefix = API_MODE === 'direct' ? '' : '/legal';
  return `${baseUrl}${prefix}/files/download/${filename}?name=${encodeURIComponent(nombre)}`;
}

interface ModalDetalleSolicitudInformeProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: SolicitudInforme | null;
  onCambiarEtapa?: (id: string, nuevaEtapa: EtapaSolicitudInforme) => void;
  onAgregarComentario?: (id: string, comentario: string) => void;
  onArchivar?: (id: string) => void;
  onEliminar?: (id: string) => void;
  canModify?: boolean;
  canEnviarRecordatorio?: boolean;
}

export function ModalDetalleSolicitudInforme({
  isOpen,
  onClose,
  solicitud,
  onCambiarEtapa,
  onAgregarComentario,
  onArchivar,
  onEliminar,
  canModify = true,
  canEnviarRecordatorio = true
}: ModalDetalleSolicitudInformeProps) {
  const [comentarioNuevo, setComentarioNuevo] = useState('');
  const [mostrarCambioEtapa, setMostrarCambioEtapa] = useState(false);
  const [archivosSubidos, setArchivosSubidos] = useState<Array<{ nombre: string; tipo: string; fechaCarga: Date; tamaño: string, url?: string }>>([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [visorOpen, setVisorOpen] = useState(false);
  const [visorDoc, setVisorDoc] = useState<{ archivo: string; numero: string } | null>(null);
  const [mostrarModalRecordatorio, setMostrarModalRecordatorio] = useState(false);
  const [notasTermino, setNotasTermino] = useState<Array<{ texto: string; usuario: string; fecha: string | Date }>>([]);
  const [cantidadRecordatorio, setCantidadRecordatorio] = useState(15);
  const [unidadRecordatorio, setUnidadRecordatorio] = useState<'dias' | 'horas'>('dias');
  const [guardandoRecordatorio, setGuardandoRecordatorio] = useState(false);
  const [cantidadAnticipacionPersonalizada, setCantidadAnticipacionPersonalizada] = useState(1);
  const [unidadAnticipacionPersonalizada, setUnidadAnticipacionPersonalizada] = useState<'dias' | 'horas'>('dias');
  const [guardandoAnticipacionPersonalizada, setGuardandoAnticipacionPersonalizada] = useState(false);
  const [horasRecordatorioActual, setHorasRecordatorioActual] = useState<number | null>(null);
  const [horasAnticipacionActual, setHorasAnticipacionActual] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && solicitud) {
      const backendId = solicitud.metadata?.uuid || solicitud.id;
      fetchDocs(backendId);
      fetchNotas(backendId);
      setHorasRecordatorioActual(solicitud.recordatorioManualHorasAnticipacion ?? null);
      setHorasAnticipacionActual(solicitud.horasAnticipacionAlertaPersonalizada ?? null);
    }
  }, [isOpen, solicitud]);

  const fetchDocs = async (id: string) => {
    try {
      const docs = await legalService.getDocumentosTermino(id);
      setArchivosSubidos(docs.map((d: any) => ({
        nombre: d.nombre,
        tipo: d.tipo,
        fechaCarga: new Date(d.fecha),
        tamaño: d.tamaño || '',
        url: d.url
      })));
    } catch (error) {
      console.error('Error fetching docs', error);
    }
  };

  if (!solicitud) return null;

  const diasRestantes = solicitud.diasRestantes;
  let semaforoColor = '#10B981';
  let semaforoBg = '#D1FAE5';
  let semaforoTexto = 'En término';
  
  if (diasRestantes <= 0) {
    semaforoColor = '#DC2626';
    semaforoBg = '#FEE2E2';
    semaforoTexto = 'VENCIDO';
  } else if (diasRestantes <= 2) {
    semaforoColor = '#DC2626';
    semaforoBg = '#FEE2E2';
    semaforoTexto = 'CRÍTICO';
  } else if (diasRestantes <= 5) {
    semaforoColor = '#F59E0B';
    semaforoBg = '#FEF3C7';
    semaforoTexto = 'URGENTE';
  }

  const etapasConfig = {
    RECIBIDA: { label: 'Recibida', color: 'bg-blue-100 text-blue-700', icon: '📥' },
    EN_ELABORACIÓN: { label: 'En Elaboración', color: 'bg-yellow-100 text-yellow-700', icon: '✍️' },
    EN_PROCESO: { label: 'En Proceso', color: 'bg-orange-100 text-orange-700', icon: '⚙️' },
    REVISIÓN: { label: 'En Revisión', color: 'bg-purple-100 text-purple-700', icon: '🔍' },
    ENVIADO: { label: 'Enviado', color: 'bg-green-100 text-green-700', icon: '✅' },
    FINALIZADA: { label: 'Finalizada', color: 'bg-gray-100 text-gray-700', icon: '🏁' },
    VENCIDA: { label: 'Vencida', color: 'bg-red-100 text-red-700', icon: '⚠️' }
  };

  const handleCambiarEtapa = (nuevaEtapa: EtapaSolicitudInforme) => {
    if (!onCambiarEtapa) return;
    onCambiarEtapa(solicitud.id, nuevaEtapa);
    setMostrarCambioEtapa(false);
  };

  const fetchNotas = async (id: string) => {
    try {
      const notas = await legalService.getNotasTermino(id);
      setNotasTermino(Array.isArray(notas) ? notas : []);
    } catch (error) {
      console.error('Error fetching term notes', error);
      setNotasTermino([]);
    }
  };

  const handleAgregarComentario = () => {
    if (!comentarioNuevo.trim()) return;
    const backendId = solicitud.metadata?.uuid || solicitud.id;
    legalService.addNotaTermino(backendId, comentarioNuevo.trim())
      .then((nota) => {
        setNotasTermino(prev => [nota, ...prev]);
        setComentarioNuevo('');
        onAgregarComentario?.(solicitud.id, comentarioNuevo.trim());
        toast.success('Comentario agregado', {
          icon: <MessageSquare className="w-4 h-4" />
        });
      })
      .catch(() => toast.error('Error al guardar el comentario. Intente nuevamente.'));
  };

  /**
   * ✅ FUNCIONALIDAD REAL: CARGAR ARCHIVO
   * Permite seleccionar y cargar documentos adjuntos
   */
  const handleCargarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validar tipo de archivo
    const tiposPermitidos = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error('❌ Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos PDF, Word, JPG y PNG'
      });
      return;
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('❌ Archivo muy grande', {
        description: 'El tamaño máximo permitido es 10MB'
      });
      return;
    }

    setSubiendoArchivo(true);

    try {
      const backendId = solicitud.metadata?.uuid || solicitud.id;
      await legalService.cargarDocumentoTermino(backendId, file);

      await fetchDocs(backendId);

      const tamaño = (file.size / 1024).toFixed(2) + ' KB';
      toast.success('✅ Archivo cargado exitosamente', {
        description: `${file.name} (${tamaño})`,
        duration: 4000
      });

    } catch (error) {
      console.error(error);
      toast.error('❌ Error al cargar el archivo', {
        description: 'Por favor intente nuevamente'
      });
    } finally {
      setSubiendoArchivo(false);
      e.target.value = ''; // Reset input
    }
  };

  /**
   * ✅ FUNCIONALIDAD REAL: EXPORTAR A PDF
   * Genera un documento PDF con la información de la solicitud
   */
  const handleExportar = async () => {
    toast.loading('Generando PDF...', { duration: 1500 });

    try {
      const backendId = solicitud.metadata?.uuid || solicitud.id;
      const pdfBlob = await legalService.exportarTerminoPdf(backendId);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Termino_${solicitud.id}_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('✅ Documento exportado exitosamente', {
        description: `Termino_${solicitud.id}.pdf`,
        duration: 4000
      });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast.error('❌ Error al generar el PDF', {
        description: 'Por favor, inténtelo de nuevo más tarde'
      });
    }
  };

  /**
   * Abre el mismo PDF del informe en una pestaña nueva: el visor de PDF del
   * navegador ya trae su propio botón de impresión, sin necesidad de generar
   * una plantilla de impresión aparte.
   */
  const handleImprimir = async () => {
    // La pestaña se abre AQUÍ, de forma síncrona dentro del gesto de clic del
    // usuario — si se abriera después del await de red, el navegador la
    // bloquearía como popup no solicitado.
    const ventana = window.open('', '_blank');

    toast.loading('Preparando documento...', { duration: 1500 });

    try {
      const backendId = solicitud.metadata?.uuid || solicitud.id;
      const pdfBlob = await legalService.exportarTerminoPdf(backendId);
      const url = window.URL.createObjectURL(pdfBlob);
      if (ventana) {
        ventana.location.href = url;
      } else {
        // Bloqueada por el navegador a pesar de todo: al menos descargamos.
        toast.error('El navegador bloqueó la ventana de impresión. Se descargará el PDF en su lugar.');
        const link = document.createElement('a');
        link.href = url;
        link.download = `Termino_${solicitud.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error al preparar impresión:', error);
      ventana?.close();
      toast.error('❌ Error al generar el documento para imprimir', {
        description: 'Por favor, inténtelo de nuevo más tarde'
      });
    }
  };

  /**
   * Abre el modal de alertas/recordatorio de vencimiento del término.
   */
  const handleAbrirRecordatorio = () => {
    setMostrarModalRecordatorio(true);
  };

  const horasDesdeCantidad = (cantidad: number, unidad: 'dias' | 'horas') => (unidad === 'dias' ? cantidad * 24 : cantidad);

  /**
   * Programa un recordatorio manual único: el scheduler lo enviará cuando
   * falten esas horas para el vencimiento, y luego lo limpia automáticamente.
   */
  const handleProgramarRecordatorio = async () => {
    if (!cantidadRecordatorio || cantidadRecordatorio <= 0) {
      toast.error('Ingrese una anticipación mayor a cero');
      return;
    }
    const backendId = solicitud.metadata?.uuid || solicitud.id;
    const horas = horasDesdeCantidad(cantidadRecordatorio, unidadRecordatorio);
    setGuardandoRecordatorio(true);
    try {
      await legalService.updateTermino(backendId, { recordatorioManualHorasAnticipacion: horas });
      setHorasRecordatorioActual(horas);
      toast.success('Recordatorio programado', {
        description: `Se enviará cuando falten ${cantidadRecordatorio} ${unidadRecordatorio === 'dias' ? 'día(s)' : 'hora(s)'} para el vencimiento`,
      });
    } catch (error) {
      toast.error('No se pudo programar el recordatorio', { description: 'Por favor intente nuevamente' });
    } finally {
      setGuardandoRecordatorio(false);
    }
  };

  const handleCancelarRecordatorio = async () => {
    const backendId = solicitud.metadata?.uuid || solicitud.id;
    setGuardandoRecordatorio(true);
    try {
      await legalService.updateTermino(backendId, { recordatorioManualHorasAnticipacion: null });
      setHorasRecordatorioActual(null);
      toast.success('Recordatorio programado cancelado');
    } catch (error) {
      toast.error('No se pudo cancelar el recordatorio');
    } finally {
      setGuardandoRecordatorio(false);
    }
  };

  /**
   * Define una anticipación de alerta automática específica para este término,
   * que ignora las reglas globales de alerta configuradas en el módulo.
   */
  const handleGuardarAnticipacionPersonalizada = async () => {
    if (!cantidadAnticipacionPersonalizada || cantidadAnticipacionPersonalizada <= 0) {
      toast.error('Ingrese una anticipación mayor a cero');
      return;
    }
    const backendId = solicitud.metadata?.uuid || solicitud.id;
    const horas = horasDesdeCantidad(cantidadAnticipacionPersonalizada, unidadAnticipacionPersonalizada);
    setGuardandoAnticipacionPersonalizada(true);
    try {
      await legalService.updateTermino(backendId, { horasAnticipacionAlertaPersonalizada: horas });
      setHorasAnticipacionActual(horas);
      toast.success('Anticipación personalizada guardada', {
        description: `Este término alertará ${cantidadAnticipacionPersonalizada} ${unidadAnticipacionPersonalizada === 'dias' ? 'día(s)' : 'hora(s)'} antes de vencer, ignorando las reglas globales`,
      });
    } catch (error) {
      toast.error('No se pudo guardar la anticipación personalizada');
    } finally {
      setGuardandoAnticipacionPersonalizada(false);
    }
  };

  const handleQuitarAnticipacionPersonalizada = async () => {
    const backendId = solicitud.metadata?.uuid || solicitud.id;
    setGuardandoAnticipacionPersonalizada(true);
    try {
      await legalService.updateTermino(backendId, { horasAnticipacionAlertaPersonalizada: null });
      setHorasAnticipacionActual(null);
      toast.success('Anticipación personalizada eliminada — este término volverá a usar las reglas globales');
    } catch (error) {
      toast.error('No se pudo eliminar la anticipación personalizada');
    } finally {
      setGuardandoAnticipacionPersonalizada(false);
    }
  };

  const porcentajeAvance = ((solicitud.diasTotales - diasRestantes) / solicitud.diasTotales) * 100;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[750px] lg:max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Detalle de Término {solicitud.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del término {solicitud.id} con información detallada sobre plazos, etapas, responsables y documentación asociada.
        </DialogDescription>

        {/* Header ESAP 2025 */}
        <ModalHeaderClean
          titulo={`Término ${solicitud.id}`}
          subtitulo={solicitud.asunto}
          icono={FileText}
          colorIcono="blue"
          badgePrincipal={etapasConfig[solicitud.etapa]?.label || solicitud.etapa}
          badges={
            <>
              {solicitud.moduloOrigen && solicitud.moduloOrigen !== 'TERMINOS_INFORMES' && (
                <Badge className="text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
                  🔗 Auto-Generado
                </Badge>
              )}
              {(solicitud.esImprorrogable || solicitud.improrrogable) && (
                <Badge className="text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                  ⚠️ Improrrogable
                </Badge>
              )}
              <Badge 
                className="font-bold flex items-center gap-1.5 border-2"
                style={{ borderColor: semaforoColor, color: semaforoColor }}
              >
                {diasRestantes} días
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Contenido - SOLO ESTO HACE SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            
            {/* ALERTA DE SEMÁFORO */}
            <div 
              className="p-4 rounded-lg border-2 flex items-center gap-3"
              style={{ 
                backgroundColor: semaforoBg, 
                borderColor: semaforoColor 
              }}
            >
              <AlertTriangle 
                className="w-6 h-6 flex-shrink-0" 
                style={{ color: semaforoColor }}
              />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: semaforoColor }}>
                  Estado: {semaforoTexto}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  {diasRestantes <= 0 
                    ? `Vencido hace ${Math.abs(diasRestantes)} días` 
                    : `Quedan ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} para vencimiento`
                  }
                </p>
              </div>
              <Badge
                className="font-bold text-lg px-4 py-2"
                style={{ backgroundColor: semaforoColor, color: '#FFFFFF' }}
              >
                {diasRestantes} días
              </Badge>
            </div>

            {/* INFORMACIÓN GENERAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Tipo de Informe</p>
                  <p className="text-sm font-bold text-gray-900">{solicitud.tipoInforme}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Ente Solicitante</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{solicitud.enteSolicitante || 'No especificado'}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Responsable ESAP</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{solicitud.responsable}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Radicado Externo</p>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900">{solicitud.radicadoExterno}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-xs text-gray-500">Fecha del Término</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {solicitud.fechaSolicitud.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-red-600" />
                    <p className="text-xs text-red-600 font-bold">Fecha Límite de Entrega</p>
                  </div>
                  <p className="text-sm font-bold text-red-900">
                    {solicitud.fechaVencimiento.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* DESTINATARIO DEL INFORME */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Send className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs text-gray-500">Destinatario del Informe</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{solicitud.destinatario || 'No especificado'}</p>
            </div>

            {/* FUENTE INFORMATIVA */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs text-gray-500">Fuente Informativa</p>
              </div>
              <p className="text-sm font-bold text-gray-900">
                {solicitud.fundamentoNormativo && solicitud.fundamentoNormativo.length > 0
                  ? solicitud.fundamentoNormativo.map(f => [f.tipo, f.cita].filter(Boolean).join(': ')).join('; ')
                  : 'No especificado'}
              </p>
            </div>

            {/* ETAPA ACTUAL Y CAMBIO DE ETAPA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-600" />
                  Etapa del Proceso
                </h3>
                {canModify && onCambiarEtapa && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMostrarCambioEtapa(!mostrarCambioEtapa)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Cambiar Etapa
                  </Button>
                )}
              </div>

              {/* Etapa actual */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="text-2xl">{etapasConfig[solicitud.etapa]?.icon || '📋'}</span>
                <div className="flex-1">
                  <Badge className={etapasConfig[solicitud.etapa]?.color || 'bg-gray-100 text-gray-700'}>
                    {etapasConfig[solicitud.etapa]?.label || solicitud.etapa}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">Etapa actual de la solicitud</p>
                </div>
              </div>

              {/* Selector de nueva etapa */}
              {canModify && mostrarCambioEtapa && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <p className="text-xs font-bold text-blue-900 mb-2">Seleccionar nueva etapa:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(Object.keys(etapasConfig) as EtapaSolicitudInforme[]).map((etapa) => (
                      <Button
                        key={etapa}
                        size="sm"
                        variant={solicitud.etapa === etapa ? "default" : "outline"}
                        onClick={() => handleCambiarEtapa(etapa)}
                        disabled={solicitud.etapa === etapa}
                        className="text-xs"
                      >
                        <span className="mr-1">{etapasConfig[etapa].icon}</span>
                        {etapasConfig[etapa].label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progreso del plazo</span>
                <span className="font-bold text-gray-900">{Math.round(porcentajeAvance)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(porcentajeAvance, 100)}%`,
                    backgroundColor: semaforoColor
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {solicitud.diasTotales - diasRestantes} de {solicitud.diasTotales} días transcurridos
              </p>
            </div>

            {/* ASUNTO Y DESCRIPCIÓN */}
            {(() => {
              const { descripcionBase } = solicitud.descripcion
                ? parseObservaciones(solicitud.descripcion)
                : { descripcionBase: '', notas: [] };
              return (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-900">Asunto</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {solicitud.asunto}
                  </p>

                  {descripcionBase && (
                    <>
                      <h3 className="font-bold text-gray-900 mt-4">Descripción Detallada</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {descripcionBase}
                      </p>
                    </>
                  )}

                  {/* Notas guardadas — visual timeline */}
                  {notasTermino.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        Notas y Comentarios ({notasTermino.length})
                      </h3>
                      <div className="space-y-2">
                        {notasTermino.map((nota, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex-shrink-0 w-7 h-7 bg-[#003DA5] rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                              {(nota.usuario || 'S')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-700">{nota.usuario}</span>
                                <span className="text-xs text-gray-400">
                                  {nota.fecha ? new Date(nota.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{nota.texto}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 🔗 INFORMACIÓN DE INTEGRACIÓN TRANSVERSAL */}
            {solicitud.moduloOrigen && solicitud.moduloOrigen !== 'TERMINOS_INFORMES' && (
              <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-purple-900">🔗 Término Auto-Generado (Integración Transversal)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 font-bold mb-1">Módulo de Origen</p>
                    <p className="text-purple-900 font-semibold">
                      {solicitud.moduloOrigen?.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {solicitud.tipoTermino && (
                    <div className="bg-white p-3 rounded border border-purple-200">
                      <p className="text-xs text-purple-600 font-bold mb-1">Tipo de Término</p>
                      <p className="text-purple-900 font-semibold">
                        {solicitud.tipoTermino}
                      </p>
                    </div>
                  )}

                  {(solicitud.expedienteOrigen || solicitud.expedienteRelacionado) && (
                    <div className="bg-white p-3 rounded border border-purple-200">
                      <p className="text-xs text-purple-600 font-bold mb-1">Expediente Relacionado</p>
                      <p className="text-purple-900 font-mono font-bold">
                        {solicitud.expedienteOrigen || solicitud.expedienteRelacionado}
                      </p>
                    </div>
                  )}

                  {solicitud.baseNormativa && (
                    <div className="bg-white p-3 rounded border border-purple-200">
                      <p className="text-xs text-purple-600 font-bold mb-1">Base Normativa</p>
                      <p className="text-purple-900 font-semibold text-xs">
                        {solicitud.baseNormativa}
                      </p>
                    </div>
                  )}

                  {solicitud.consecuenciaIncumplimiento && (
                    <div className="bg-white p-3 rounded border border-red-200 md:col-span-2">
                      <p className="text-xs text-red-600 font-bold mb-1">⚠️ Consecuencia de Incumplimiento</p>
                      <p className="text-red-900 font-semibold text-xs">
                        {solicitud.consecuenciaIncumplimiento}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-3 rounded border border-purple-200">
                  <p className="text-xs text-purple-900">
                    <strong>ℹ️ Información:</strong> Este término fue generado automáticamente desde el expediente{' '}
                    <span className="font-mono font-bold">{solicitud.expedienteRelacionado}</span> del módulo de{' '}
                    <strong>{solicitud.moduloOrigen?.replace(/_/g, ' ')}</strong>. 
                    {solicitud.esImprorrogable && ' Este término es IMPRORROGABLE según normativa vigente.'}
                  </p>
                </div>
              </div>
            )}

            {/* DATOS REQUERIDOS */}
            {solicitud.datosRequeridos && solicitud.datosRequeridos.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900">Datos/Información Requerida</h3>
                <div className="flex flex-wrap gap-2">
                  {solicitud.datosRequeridos.map((dato, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {dato}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* DOCUMENTOS ADJUNTOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Documentos Adjuntos</h3>
                {canModify && (
                <div>
                  <input
                    type="file"
                    id="file-upload-solicitud"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleCargarArchivo}
                    disabled={subiendoArchivo}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload-solicitud')?.click()}
                    disabled={subiendoArchivo}
                  >
                    {subiendoArchivo ? (
                      <>
                        <Clock className="w-3 h-3 mr-1 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        Cargar Archivo
                      </>
                    )}
                  </Button>
                </div>
                )}
              </div>
              
              {/* Mostrar documentos cargados */}
              {archivosSubidos.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Archivos ({archivosSubidos.length})</p>
                  {archivosSubidos.map((archivo, idx) => (
                    <div key={`doc-${idx}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{archivo.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {archivo.tipo} {archivo.tamaño && `• ${archivo.tamaño}`} • {archivo.fechaCarga.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {archivo.url && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Ver documento"
                            onClick={() => {
                              setVisorDoc({ archivo: getFileViewUrl(archivo.url!), numero: archivo.nombre });
                              setVisorOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50"
                            title="Descargar"
                            onClick={() => window.open(getFileDownloadUrl(archivo.url!, archivo.nombre), '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mensaje cuando no hay documentos */}
              {archivosSubidos.length === 0 && (
                <div className="p-5 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center mt-4">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">No hay documentos adjuntos aún</p>
                  <p className="text-xs text-gray-500 mt-1">Sube archivos PDF, Word o imágenes usando el botón superior.</p>
                </div>
              )}
            </div>

            {/* AGREGAR COMENTARIO */}
            {canModify && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                Agregar Nota o Comentario
              </h3>
              <Textarea
                value={comentarioNuevo}
                onChange={(e) => setComentarioNuevo(e.target.value)}
                placeholder="Escriba aquí observaciones, avances, inconvenientes o cualquier información relevante sobre esta solicitud..."
                rows={3}
                className="text-sm"
              />
              <Button
                onClick={handleAgregarComentario}
                disabled={!comentarioNuevo.trim()}
                size="sm"
                style={{ background: '#003DA5' }}
                className="text-white"
              >
                <Send className="w-3 h-3 mr-2" />
                Agregar Comentario
              </Button>
            </div>
            )}

            {/* INFO AYUDA */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900">
                  <p className="font-bold mb-1">💡 Gestión del Término:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-700">
                    <li>Actualice la etapa según el avance del informe</li>
                    <li>Documente cualquier inconveniente o retraso en los comentarios</li>
                    <li>Cargue borradores y documentos de soporte</li>
                    <li>Coordine con el responsable para cumplir el plazo</li>
                    <li>Al finalizar, marque como "ENVIADO" y adjunte el informe final</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
            {onArchivar && (
              <Button
                variant="outline"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                onClick={() => onArchivar(solicitud.id)}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archivar
              </Button>
            )}
            {onEliminar && (
              <Button
                variant="outline"
                className="text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => onEliminar(solicitud.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportar}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="outline"
              onClick={handleImprimir}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            {canEnviarRecordatorio && (
              <Button
                style={{ background: '#F57C00' }}
                className="text-white"
                onClick={handleAbrirRecordatorio}
              >
                <BellRing className="w-4 h-4 mr-2" />
                Alertas y Recordatorio
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Modal de Alertas y Recordatorio de Vencimiento */}
      {mostrarModalRecordatorio && (
        <Dialog open={mostrarModalRecordatorio} onOpenChange={() => setMostrarModalRecordatorio(false)}>
          <DialogContent hideCloseButton className="max-w-md">
            <DialogTitle className="sr-only">Alertas y Recordatorio de Vencimiento</DialogTitle>
            <DialogDescription className="sr-only">
              Programar un recordatorio manual o definir una anticipación de alerta personalizada para este término
            </DialogDescription>

            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <BellRing className="w-8 h-8 text-orange-600" />
                <div>
                  <h3 className="font-bold text-gray-900">Alertas y Recordatorio</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Vence en <span className="font-bold" style={{ color: semaforoColor }}>{diasRestantes} día(s)</span>
                  </p>
                </div>
              </div>

              {/* Recordatorio manual programado (envío único) */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm font-bold text-gray-900">Programar recordatorio</p>
                <p className="text-xs text-gray-500">
                  Se enviará una única vez cuando falte la anticipación indicada, sin importar las reglas globales.
                </p>
                {horasRecordatorioActual != null ? (
                  <div className="flex items-center justify-between gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-orange-700">
                      Programado: avisar {horasRecordatorioActual % 24 === 0 ? `${horasRecordatorioActual / 24} día(s)` : `${horasRecordatorioActual} hora(s)`} antes
                    </span>
                    <Button size="sm" variant="outline" disabled={guardandoRecordatorio} onClick={handleCancelarRecordatorio}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={cantidadRecordatorio}
                      onChange={(e) => setCantidadRecordatorio(Number(e.target.value))}
                      className="w-20 border-2 border-gray-300 focus:border-blue-500"
                    />
                    <Select value={unidadRecordatorio} onValueChange={(val: string) => setUnidadRecordatorio(val as 'dias' | 'horas')}>
                      <SelectTrigger className="w-28 border-2 border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[9999]">
                        <SelectItem value="dias">día(s)</SelectItem>
                        <SelectItem value="horas">hora(s)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-gray-500">antes</span>
                    <Button
                      size="sm"
                      disabled={guardandoRecordatorio}
                      onClick={handleProgramarRecordatorio}
                      style={{ background: '#F57C00', color: '#FFFFFF' }}
                      className="ml-auto"
                    >
                      Programar
                    </Button>
                  </div>
                )}
              </div>

              {/* Anticipación de alerta automática personalizada para este término */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm font-bold text-gray-900">Anticipación de alerta personalizada</p>
                <p className="text-xs text-gray-500">
                  Si se define, este término ignora las reglas globales de alerta y avisa solo con esta anticipación (útil para casos extremos, ej. 1 día u horas).
                </p>
                {horasAnticipacionActual != null ? (
                  <div className="flex items-center justify-between gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-blue-700">
                      Personalizada: {horasAnticipacionActual % 24 === 0 ? `${horasAnticipacionActual / 24} día(s)` : `${horasAnticipacionActual} hora(s)`} de anticipación
                    </span>
                    <Button size="sm" variant="outline" disabled={guardandoAnticipacionPersonalizada} onClick={handleQuitarAnticipacionPersonalizada}>
                      Quitar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={cantidadAnticipacionPersonalizada}
                      onChange={(e) => setCantidadAnticipacionPersonalizada(Number(e.target.value))}
                      className="w-20 border-2 border-gray-300 focus:border-blue-500"
                    />
                    <Select value={unidadAnticipacionPersonalizada} onValueChange={(val: string) => setUnidadAnticipacionPersonalizada(val as 'dias' | 'horas')}>
                      <SelectTrigger className="w-28 border-2 border-gray-300 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-[9999]">
                        <SelectItem value="dias">día(s)</SelectItem>
                        <SelectItem value="horas">hora(s)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-gray-500">antes</span>
                    <Button
                      size="sm"
                      disabled={guardandoAnticipacionPersonalizada}
                      onClick={handleGuardarAnticipacionPersonalizada}
                      variant="outline"
                      className="ml-auto"
                    >
                      Guardar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" onClick={() => setMostrarModalRecordatorio(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>

      {visorDoc && (
        <VisorDocumentoModal
          isOpen={visorOpen}
          onClose={() => { setVisorOpen(false); setVisorDoc(null); }}
          archivo={visorDoc.archivo}
          numero={visorDoc.numero}
          asunto="Documento — Términos e Informes"
        />
      )}
    </>
  );
}
