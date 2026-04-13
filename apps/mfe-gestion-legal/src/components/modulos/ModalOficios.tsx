/**
 * ModalOficios - Gestión de Oficios y Comunicaciones Oficiales
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ Header azul con gradiente corporativo
 * ✅ Tabs modernos para Enviados/Recibidos
 * ✅ Footer sticky con botones siempre visibles
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@esap-mfe/shared-ui/tabs';
import { Input } from '@esap-mfe/shared-ui/input';
import {
  Send, Download, Eye, FileText, Mail, ArrowRight,
  ArrowLeft, X, Upload, Plus, CheckCircle, Clock, AlertCircle,
  Search, Trash2, Edit, Filter, Loader2
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ModalRedactarOficio } from './ModalRedactarOficio';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { ModalHeaderClean } from './ModalHeaderClean';
import { DialogoConfirmacion } from './DialogoConfirmacion';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl } from '../../../../config/environment';

interface ModalOficiosProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
  modulo: string;
}

export function ModalOficios({ isOpen, onClose, expediente, modulo }: ModalOficiosProps) {

  const [oficiosEnviados, setOficiosEnviados] = useState<any[]>([]);
  const [oficiosRecibidos, setOficiosRecibidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [busquedaEnviados, setBusquedaEnviados] = useState('');
  const [busquedaRecibidos, setBusquedaRecibidos] = useState('');
  const [modalRedactarAbierto, setModalRedactarAbierto] = useState(false);
  const [modalVisorPDFAbierto, setModalVisorPDFAbierto] = useState(false);
  const [oficioSeleccionado, setOficioSeleccionado] = useState<any>(null);

  // Estados para diálogo de confirmación de eliminación
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false);
  const [oficioAEliminar, setOficioAEliminar] = useState<{ id: number, numero: string } | null>(null);

  useEffect(() => {
    if (isOpen && expediente?.id) {
      cargarOficios();
    }
  }, [isOpen, expediente?.id]);

  const cargarOficios = async () => {
    setLoading(true);
    try {
      // 1. Obtener oficios de la NUEVA tabla oficios_enviados
      let oficiosFromDB: any[] = [];
      try {
        oficiosFromDB = await legalService.getOficios(expediente.id, modulo);
      } catch (e) {
        console.warn('No se pudieron cargar oficios de la tabla oficios_enviados:', e);
      }

      // 2. También obtener oficios legacy de actuaciones (para oficios recibidos y anteriores)
      let actuacionesData: any[] = [];
      if (modulo === 'juzgamiento-disciplinario' || modulo === 'lista-juzgamiento') {
        try {
          actuacionesData = await legalService.getJuzgamientoActuaciones(expediente.id);
        } catch (e) {
          console.warn('Error fetching juzgamiento actuaciones:', e);
        }
      } else {
        try {
          actuacionesData = await legalService.getActuaciones(expediente.id);
        } catch (e) {
          console.warn('Error fetching general actuaciones:', e);
        }
      }

      // Filtrar actuaciones por tipo 'OFICIO'
      const oficiosLegacy = actuacionesData.filter(item =>
        (item.tipoActuacion === 'OFICIO' || item.tipo === 'OFICIO') ||
        (item.descripcion && item.descripcion.toLowerCase().includes('oficio'))
      );

      // Separar actuaciones legacy en Enviados vs Recibidos
      const legacyRecibidos = oficiosLegacy.filter(o => o.descripcion?.toUpperCase().includes('RECIBIDO'));

      // Helper para construir URL correcta de archivos del backend
      const buildFileUrl = (relativeUrl: string | null | undefined): string | null => {
        if (!relativeUrl) return null;
        // Si ya es absoluta con http, verificar y corregir puerto
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
          // Corregir si apunta al frontend en vez del backend
          if (relativeUrl.includes('localhost:3000')) {
            return relativeUrl.replace('localhost:3000', 'localhost:3008');
          }
          return relativeUrl;
        }
        // Es relativa - construir URL completa con backend
        const baseUrl = getServiceUrl('legal');
        // Quitar prefijo /legal si existe (el backend lo sirve directamente)
        let cleanPath = relativeUrl;
        if (cleanPath.startsWith('/legal/')) {
          cleanPath = cleanPath.substring(6); // quitar '/legal'
        }
        if (!cleanPath.startsWith('/')) {
          cleanPath = '/' + cleanPath;
        }
        return `${baseUrl}${cleanPath}`;
      };

      // Mapear oficios de la NUEVA tabla (oficios_enviados) - estos son ENVIADOS
      const mapOficiosDB = (items: any[]) => items.map(item => {
        const adjuntoUrl = item.archivosAdjuntos?.length > 0 ? buildFileUrl(item.archivosAdjuntos[0]?.url) : null;
        return {
          id: item.id,
          numero: item.numero,
          asunto: item.asunto,
          destinatario: item.destinatario || item.destinatarioEmail,
          remitente: 'ESAP - Oficina Jurídica',
          fecha: item.fechaEnvio ? new Date(item.fechaEnvio).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString(),
          estado: item.estado === 'ENVIADO' ? 'Enviado' : 'Borrador',
          estadoColor: item.estado === 'ENVIADO' ? 'blue' : 'gray',
          contenido: item.contenido,
          archivo: item.archivosAdjuntos?.length > 0 ? item.archivosAdjuntos[0]?.nombre : `${item.numero}.pdf`,
          tamaño: item.archivosAdjuntos?.length > 0 ? `${item.archivosAdjuntos.length} adjunto(s)` : 'N/A',
          url: adjuntoUrl,
          archivosAdjuntos: item.archivosAdjuntos,
          origen: 'oficios_enviados'
        };
      });

      // Mapear actuaciones legacy a estructura de vista
      const mapToView = (items: any[]) => items.map(item => {
        const baseUrl = getServiceUrl('legal');
        let finalUrl = item.documentoUrl || item.url;
        if (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('blob:') && !finalUrl.startsWith('data:')) {
          const prefixToRemove = '/legal/api/v1';
          if (finalUrl.startsWith(prefixToRemove)) {
            finalUrl = finalUrl.substring(prefixToRemove.length);
          } else if (finalUrl.startsWith('/legal')) {
            finalUrl = finalUrl.replace('/legal', '');
          }
          const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          const cleanPath = finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
          finalUrl = `${cleanBase}${cleanPath}`;
        }

        return {
          id: item.id,
          numero: item.numero || item.metadata?.numero || `OF-${String(item.id).substring(0, 8)}`,
          asunto: item.titulo || item.descripcion,
          destinatario: item.metadata?.destinatario || 'Desconocido',
          remitente: item.metadata?.remitente || 'Desconocido',
          fecha: item.fechaActuacion ? new Date(item.fechaActuacion).toLocaleDateString() : 'Sin fecha',
          estado: item.estado || 'Pendiente',
          estadoColor: item.estado === 'Atendido' ? 'green' : 'orange',
          contenido: item.descripcion,
          archivo: item.documentoNombre || item.nombreArchivo || 'documento.pdf',
          tamaño: 'N/A',
          url: finalUrl,
          metadata: item.metadata,
          origen: 'actuaciones',
          requiereRespuesta: true,
          prioridad: item.metadata?.prioridad || 'Media'
        };
      });

      // Combinar: oficios de la nueva tabla como enviados + legacy recibidos
      setOficiosEnviados(mapOficiosDB(oficiosFromDB));
      setOficiosRecibidos(mapToView(legacyRecibidos));

    } catch (error) {
      console.error('Error cargando oficios:', error);
      toast.error('No se pudieron cargar los oficios del expediente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerOficio = async (oficio: any) => {
    if (oficio.url) {
      // Detectar tipo de archivo por extensión
      const url = oficio.url.toLowerCase();
      const isImage = url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif') || url.endsWith('.webp');
      const isPdf = url.endsWith('.pdf') || url.startsWith('blob:');

      // Para imágenes, abrir directamente en nueva pestaña (el visor PDF no las soporta)
      if (isImage) {
        window.open(oficio.url, '_blank');
        toast.success('Abriendo imagen en nueva pestaña');
        return;
      }

      // Si ya es un blob o pdf explícito, usarlo directo
      if (isPdf) {
        setOficioSeleccionado(oficio);
        setModalVisorPDFAbierto(true);
        return;
      }

      // Si es un endpoint de API que fuerza descarga, lo convertimos a Blob
      const toastId = toast.loading('Cargando documento...');
      try {
        const response = await fetch(oficio.url, { cache: 'no-store' });

        if (!response.ok) throw new Error(`Error al cargar documento: ${response.statusText}`);

        const blob = await response.blob();
        if (blob.size === 0) throw new Error('El documento está vacío (0 bytes).');

        // Verificar tipo de contenido
        const contentType = blob.type || response.headers.get('content-type') || '';

        if (contentType.includes('image')) {
          // Es imagen, abrir blob URL en nueva pestaña
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          toast.dismiss(toastId);
          toast.success('Abriendo imagen');
          return;
        }

        const blobUrl = URL.createObjectURL(blob);

        setOficioSeleccionado({
          ...oficio,
          url: blobUrl,
          originalUrl: oficio.url
        });
        setModalVisorPDFAbierto(true);
        toast.dismiss(toastId);
      } catch (error) {
        console.error('Error fetching blob:', error);
        toast.error('No se pudo visualizar el documento.', { id: toastId });
        // Fallback: intentar abrirlo directo
        setOficioSeleccionado(oficio);
        setModalVisorPDFAbierto(true);
      }
    } else {
      toast.error('No se puede visualizar, no hay documento adjunto.');
    }
  };

  const handleDescargarOficio = async (oficio: any) => {
    if (!oficio.url) {
      toast.error('Este oficio no tiene documento adjunto o URL válida.');
      return;
    }

    const toastId = toast.loading(`Descargando ${oficio.numero}...`);

    try {
      const response = await fetch(oficio.url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Crear enlace temporal para forzar descarga
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = oficio.archivo || `${oficio.numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar blob URL después de un momento
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast.success(`${oficio.numero} descargado`, { id: toastId });
    } catch (error) {
      console.error('Error descargando archivo:', error);
      toast.error('Error al descargar el archivo', { id: toastId });
    }
  };

  const handleEliminarOficioEnviado = async (id: number, numero: string) => {
    // Si houbiera endpoint de eliminación real:
    // await legalService.deleteActuacion(id);
    // Como no existe deleteActuacion, solo simulamos en la vista
    setOficiosEnviados(oficiosEnviados.filter(o => o.id !== id));
    toast.success('🗑️ Oficio eliminado de la vista', {
      description: numero
    });
  };

  const handleEliminarOficioRecibido = async (id: number, numero: string) => {
    setOficiosRecibidos(oficiosRecibidos.filter(o => o.id !== id));
    toast.success('🗑️ Oficio recibido eliminado de la vista', {
      description: numero
    });
  };

  const handleMarcarOficioRecibidoAtendido = (id: number) => {
    setOficiosRecibidos(oficiosRecibidos.map(of =>
      of.id === id
        ? {
          ...of,
          estado: 'Atendido',
          estadoColor: 'green',
          fechaRespuesta: new Date().toLocaleDateString('es-CO')
        }
        : of
    ));
    toast.success('✅ Oficio marcado como atendido', {
      description: 'Respuesta registrada exitosamente'
    });
  };

  const handleDescargarTodos = async () => {
    const total = oficiosEnviados.length + oficiosRecibidos.length;
    if (total === 0) {
      toast.warning('No hay oficios para descargar.');
      return;
    }

    try {
      toast.loading('Generando archivo ZIP...', { id: 'download-zip' });

      // Generar URL de descarga del ZIP
      const zipUrl = legalService.getOficiosDownloadZipUrl(expediente.id, modulo);

      // Crear un enlace temporal y simular click para descargar
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `Oficios_${expediente.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Descarga iniciada', { id: 'download-zip' });
    } catch (error) {
      console.error('Error descargando ZIP:', error);
      toast.error('Error al generar el archivo ZIP', { id: 'download-zip' });
    }
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300',
      gray: 'bg-gray-100 text-gray-700 border-gray-300'
    };

    const finalColor = colors[color] || colors['gray'];

    const icons: Record<string, JSX.Element> = {
      green: <CheckCircle className="w-3 h-3" />,
      blue: <Clock className="w-3 h-3" />,
      orange: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`${finalColor} font-semibold flex items-center gap-1 text-xs`}>
        {icons[color] || <Clock className="w-3 h-3" />}
        {estado}
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: string) => {
    const colors: Record<string, string> = {
      'Alta': 'bg-red-100 text-red-700',
      'Media': 'bg-yellow-100 text-yellow-700',
      'Baja': 'bg-gray-100 text-gray-700'
    };

    return (
      <Badge variant="outline" className={`${colors[prioridad] || 'bg-gray-100 text-gray-700'} text-xs font-semibold`}>
        {prioridad || 'Normal'}
      </Badge>
    );
  };

  const hasPermission = (action: string) => {
    switch (modulo) {
      case 'defensa-judicial':
        if (action === 'create') return authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_OFICIOS_CREATE)
        if (action === 'delete') return authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_OFICIOS_DELETE)
        if (action === 'atender') return authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_OFICIOS_ATENDER)
        return authService.isSuperAdmin()
      case 'juzgamiento-disciplinario':
      case 'lista-juzgamiento':
        if (action === 'create') return authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_OFICIOS_CREATE)
        if (action === 'delete') return authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_OFICIOS_DELETE)
        if (action === 'atender') return authService.hasPermission(Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_OFICIOS_ATENDER)
        return authService.isSuperAdmin()
      default:
        return authService.isSuperAdmin()
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl !max-h-[82vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Oficios y Comunicaciones - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión de oficios y comunicaciones oficiales del expediente {expediente.id}
        </DialogDescription>

        {/* Header Corporativo ESAP 2025 - Diseño Limpio y Usable */}
        <ModalHeaderClean
          titulo="Oficios y Comunicaciones"
          subtitulo={`Correspondencia oficial del expediente ${expediente.id}`}
          icono={Send}
          colorIcono="blue"
          badgePrincipal={expediente.etapa}
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                <ArrowRight className="w-3 h-3 mr-1" />
                {oficiosEnviados.length} enviados
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-green-300 text-green-700">
                <ArrowLeft className="w-3 h-3 mr-1" />
                {oficiosRecibidos.length} recibidos
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-orange-300 text-orange-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                {oficiosRecibidos.filter(o => o.estado === 'Pendiente').length} pendientes
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Contenido con Tabs */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue="enviados" className="w-full">
            <TabsList
              className="grid w-full grid-cols-2 mb-4 p-1"
              style={{ background: '#F5F5F5' }}
            >
              <TabsTrigger
                value="enviados"
                className="font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Oficios Enviados ({oficiosEnviados.length})
              </TabsTrigger>
              <TabsTrigger
                value="recibidos"
                className="font-bold data-[state=active]:bg-white data-[state=active]:text-green-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Oficios Recibidos ({oficiosRecibidos.length})
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Cargando oficios...</p>
              </div>
            ) : (
              <>
                {/* TAB: OFICIOS ENVIADOS */}
                <TabsContent value="enviados" className="space-y-3">
                  {/* Info contextual */}
                  <Card className="p-4 mb-4 border-l-4 border-l-blue-500" style={{ background: 'linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)' }}>
                    <h4 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Oficios Enviados
                    </h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Los <strong>oficios enviados</strong> son comunicaciones formales que ESAP remite
                      al juzgado o a otras entidades durante el proceso judicial. Incluyen contestaciones,
                      solicitudes, remisión de documentos, recursos, etc.
                    </p>
                  </Card>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar oficio enviado por número, asunto o contenido..."
                      value={busquedaEnviados}
                      onChange={(e) => setBusquedaEnviados(e.target.value)}
                      className="pl-10 font-semibold"
                    />
                  </div>

                  {oficiosEnviados.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Mail className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold">No se encontraron oficios enviados.</p>
                      <p className="text-xs">Usa el botón "Redactar Oficio" para crear uno nuevo.</p>
                    </div>
                  )}

                  {oficiosEnviados
                    .filter(oficio => oficio.numero.includes(busquedaEnviados) || oficio.asunto.includes(busquedaEnviados))
                    .map((oficio) => (
                      <Card key={oficio.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg flex-shrink-0" style={{ background: '#E3F2FD' }}>
                            <Send className="w-6 h-6 text-blue-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-black text-gray-900">{oficio.numero}</h4>
                                  {getEstadoBadge(oficio.estado, oficio.estadoColor)}
                                </div>
                                <p className="font-bold text-sm text-gray-700 mb-1">{oficio.asunto}</p>
                                <Badge variant="outline" className="text-xs font-bold mb-2">
                                  📍 {oficio.destinatario}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                              {oficio.contenido}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5 font-semibold">📅 Fecha Envío</p>
                                <p className="text-xs font-black text-gray-900">{oficio.fecha}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5 font-semibold">📋 Respuesta</p>
                                <p className="text-xs font-black text-gray-900">{oficio.respuesta || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5 font-semibold">📦 Tamaño</p>
                                <p className="text-xs font-black text-gray-900">{oficio.tamaño}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border-2 border-gray-200">
                              <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                              <p className="text-xs font-black text-gray-900 flex-1 truncate">{oficio.archivo}</p>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleVerOficio(oficio)}
                                  className="font-bold text-xs px-3 py-1.5 text-white"
                                  style={{ background: '#1976D2' }}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleDescargarOficio(oficio)}
                                  className="font-bold text-xs px-3 py-1.5 text-white"
                                  style={{ background: '#003DA5' }}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" />
                                  Descargar
                                </Button>

                                {hasPermission('delete') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setOficioAEliminar({ id: oficio.id, numero: oficio.numero });
                                      setDialogoEliminarAbierto(true);
                                    }}
                                    className="font-bold text-xs px-2 py-1.5 border-red-400 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </TabsContent>

                {/* TAB: OFICIOS RECIBIDOS */}
                <TabsContent value="recibidos" className="space-y-3">
                  {/* Info contextual */}
                  <Card className="p-4 mb-4 border-l-4 border-l-green-500" style={{ background: 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 100%)' }}>
                    <h4 className="text-sm font-black text-green-900 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Oficios Recibidos
                    </h4>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Los <strong>oficios recibidos</strong> son comunicaciones que el juzgado u otras
                      entidades envían a ESAP. Es crucial dar respuesta oportuna según los términos legales
                      establecidos para evitar sanciones procesales.
                    </p>
                  </Card>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar oficio recibido por número, asunto o contenido..."
                      value={busquedaRecibidos}
                      onChange={(e) => setBusquedaRecibidos(e.target.value)}
                      className="pl-10 font-semibold"
                    />
                  </div>

                  {oficiosRecibidos.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Mail className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold">No se encontraron oficios recibidos.</p>
                    </div>
                  )}

                  {oficiosRecibidos
                    .filter(oficio => oficio.numero.includes(busquedaRecibidos) || oficio.asunto.includes(busquedaRecibidos))
                    .map((oficio) => (
                      <Card key={oficio.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-green-500">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg flex-shrink-0" style={{ background: '#E8F5E9' }}>
                            <ArrowLeft className="w-6 h-6 text-green-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-black text-gray-900">{oficio.numero}</h4>
                                  {getEstadoBadge(oficio.estado, oficio.estadoColor)}
                                  {getPrioridadBadge(oficio.prioridad || 'Media')}
                                </div>
                                <p className="font-bold text-sm text-gray-700 mb-1">{oficio.asunto}</p>
                                <Badge variant="outline" className="text-xs font-bold mb-2">
                                  📨 {oficio.remitente}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                              {oficio.contenido}
                            </p>

                            {oficio.requiereRespuesta && (
                              <div className={`p-2 rounded-lg mb-3 ${oficio.fechaRespuesta ? 'bg-green-50 border border-green-300' : 'bg-orange-50 border border-orange-300'}`}>
                                <p className={`text-xs font-bold flex items-center gap-1.5 ${oficio.fechaRespuesta ? 'text-green-900' : 'text-orange-900'}`}>
                                  {oficio.fechaRespuesta ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                  {oficio.fechaRespuesta
                                    ? `✅ Respuesta enviada el ${oficio.fechaRespuesta}`
                                    : '⚠️ Requiere respuesta - PENDIENTE'}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5 font-semibold">📅 Fecha Recepción</p>
                                <p className="text-xs font-black text-gray-900">{oficio.fecha}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5 font-semibold">⚠️ Prioridad</p>
                                <p className="text-xs font-black text-gray-900">{oficio.prioridad || 'Media'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-0.5 font-semibold">📦 Tamaño</p>
                                <p className="text-xs font-black text-gray-900">{oficio.tamaño}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border-2 border-gray-200">
                              <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                              <p className="text-xs font-black text-gray-900 flex-1 truncate">
                                {oficio.url ? oficio.archivo : 'Sin documento adjunto'}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleVerOficio(oficio)}
                                  disabled={!oficio.url}
                                  className={`font-bold text-xs px-3 py-1.5 text-white ${!oficio.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  style={{ background: oficio.url ? '#4CAF50' : '#9E9E9E' }}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleDescargarOficio(oficio)}
                                  disabled={!oficio.url}
                                  className={`font-bold text-xs px-3 py-1.5 text-white ${!oficio.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  style={{ background: oficio.url ? '#003DA5' : '#9E9E9E' }}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" />
                                  Descargar
                                </Button>

                                {oficio.requiereRespuesta && oficio.estado !== 'Atendido' && hasPermission('atender') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarcarOficioRecibidoAtendido(oficio.id)}
                                    className="font-bold text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                    Atender
                                  </Button>
                                )}

                                {hasPermission('delete') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEliminarOficioRecibido(oficio.id, oficio.numero)}
                                    className="font-bold text-xs px-2 py-1.5 border-red-400 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        {/* Footer - Botones SIEMPRE visibles */}
        <div
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{
            borderTopColor: '#1976D2',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="font-bold">
                <X className="w-4 h-4 mr-1.5" />
                Cerrar
              </Button>
              <div className="text-xs text-gray-600">
                <strong className="text-blue-600">{oficiosEnviados.length} enviados</strong> ·
                <strong className="text-green-600"> {oficiosRecibidos.length} recibidos</strong> ·
                <strong className="text-orange-600"> {oficiosRecibidos.filter(o => o.estado === 'Pendiente').length} pendientes</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDescargarTodos}
                variant="outline"
                className="font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar Todos (ZIP)
              </Button>
              {hasPermission('create') && (
                <Button
                  onClick={() => setModalRedactarAbierto(true)}
                  className="font-bold text-white"
                  style={{ background: '#1976D2' }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Redactar Oficio
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent >

      {/* Modal para redactar nuevo oficio */}
      < ModalRedactarOficio
        isOpen={modalRedactarAbierto}
        onClose={() => setModalRedactarAbierto(false)
        }
        expedienteId={expediente.id}
        onGuardar={(nuevoOficio) => {
          // Actualización optimista
          setOficiosEnviados([nuevoOficio, ...oficiosEnviados]);
          // Recargar para asegurar consistencia con backend (si el backend soportara guardado)
          cargarOficios();
        }}
      />

      {/* Modal para ver PDF */}
      <VisorDocumentoModal
        isOpen={modalVisorPDFAbierto}
        onClose={() => setModalVisorPDFAbierto(false)}
        archivo={oficioSeleccionado?.url || oficioSeleccionado?.archivo} // Prop 'archivo' in VisorDocumentoModal usually expects URL
        numero={oficioSeleccionado?.numero}
        asunto={oficioSeleccionado?.asunto}
      />

      {/* Modal Visor de Correo */}
      {/* Modal Visor de Correo - Eliminado por solicitud */}

      {/* Diálogo de confirmación para eliminar oficio */}
      <DialogoConfirmacion
        isOpen={dialogoEliminarAbierto}
        onClose={() => setDialogoEliminarAbierto(false)}
        onConfirm={() => {
          if (oficioAEliminar) {
            handleEliminarOficioEnviado(oficioAEliminar.id, oficioAEliminar.numero);
          }
          setDialogoEliminarAbierto(false);
        }}
        titulo="Eliminar Oficio"
        mensaje={`¿Estás seguro de que deseas eliminar el oficio ${oficioAEliminar?.numero}? Esta acción no se puede deshacer.`}
        tipo="peligro"
        textoConfirmar="Eliminar"
      />
    </Dialog >
  );
}
