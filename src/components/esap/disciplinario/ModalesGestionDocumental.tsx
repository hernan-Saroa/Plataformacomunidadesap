/**
 * MODALES DE GESTIÓN DOCUMENTAL - CONTROL INTERNO DISCIPLINARIO
 * Componentes para gestión de Autos, Evidencias, Oficios, Notificaciones, Actas e Historial
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { API_MODE, MICROSERVICE_URLS, buildApiUrl } from '../../../config/environment';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import {
  X, Scale, Archive, Mail, Bell, FileCheck, History, Upload, Download,
  Eye, Edit2, Trash2, Plus, Calendar, User, FileText, CheckCircle,
  AlertCircle, Clock, ExternalLink, Link as LinkIcon, Filter, Search,
  FileSignature, Send, Save, Package, Tag,
  Paperclip, MessageSquare, UserCheck, AlertTriangle, Info, Users, ArrowLeft
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { toast } from 'sonner@2.0.3';

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  id?: string;
  numeroProceso: string;
  denunciado: Persona;
  denunciante: Persona;
  profesionalAsignado: Persona;
  cedula: string;
  noticiaOrigen: string;
  etapaActual: string;
}

// ==================== MODAL GESTIÓN DE AUTOS ====================
interface ModalAutosProps {
  proceso: Proceso | null;
  onClose: () => void;
  onCrearAuto: () => void;
}

export function ModalGestionAutos({ proceso, onClose, onCrearAuto }: ModalAutosProps) {
  const [vistaActual, setVistaActual] = useState<'lista' | 'crear'>('lista');
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any | null }>({ show: false, documento: null });
  const [autos, setAutos] = useState<any[]>([]);
  const [processId, setProcessId] = useState('');
  const [cargandoAutos, setCargandoAutos] = useState(false);
  const [autoParaEliminar, setAutoParaEliminar] = useState<any | null>(null);
  const [eliminandoAuto, setEliminandoAuto] = useState(false);

  // Estados para crear nuevo auto
  const [tipoAutoSeleccionado, setTipoAutoSeleccionado] = useState<any | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [creandoAuto, setCreandoAuto] = useState(false);

  const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const formatFileSize = (size?: number) => {
    if (!size && size !== 0) return '';
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  };

  const buildDownloadUrl = (procId: string, documentId: string, view: boolean) => {
    const suffix = view ? '?view=true' : '';
    const basePath = `/disciplinary-processes/${procId}/documents/${documentId}/download${suffix}`;
    if (API_MODE === 'direct') {
      return `${MICROSERVICE_URLS['control-disciplinario']}${basePath}`;
    }
    return buildApiUrl('control-disciplinario', `/api/v1${basePath}`);
  };

  const descargarArchivo = async (url: string, nombre: string) => {
    try {
      const token = localStorage.getItem('esap_access_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error descargando archivo', error);
      toast.error('No se pudo descargar el archivo');
    }
  };

  const buildAutoDocumentUrl = (relativeUrl: string) => {
    if (!relativeUrl) return '';
    // Si ya es una URL completa, retornarla
    if (relativeUrl.startsWith('http')) return relativeUrl;
    // Construir URL completa para el microservicio
    if (API_MODE === 'direct') {
      return `${MICROSERVICE_URLS['control-disciplinario']}${relativeUrl}`;
    }
    return buildApiUrl('control-disciplinario', `/api/v1${relativeUrl}`);
  };

  const mapAutoLegal = (auto: any) => {
    const fileSizeLabel = formatFileSize(auto.documentSize);
    const nombreTipo = tiposAuto.find(t => t.id === auto.tipo)?.nombre || auto.tipo;
    const documentUrl = buildAutoDocumentUrl(auto.documentUrl);

    // Get actual filename and extension
    const documentName = auto.documentName || auto.numero || 'Auto Sin Nombre';
    const fileExtension = documentName.includes('.') ? documentName.split('.').pop()?.toUpperCase() || 'PDF' : auto.documentType?.toUpperCase() || 'PDF';

    return {
      id: auto.id,
      numero: auto.numero || 'Auto Sin Número',
      documentName: documentName,
      fileExtension: fileExtension,
      tipo: nombreTipo,
      fecha: (auto.createdAt || '').split('T')[0],
      firmado: auto.estado === 'FIRMADO' || auto.estado === 'NOTIFICADO',
      notificado: auto.estado === 'NOTIFICADO',
      estado: auto.estado || 'BORRADOR',
      fileType: auto.documentType || '',
      fileSize: auto.documentSize,
      tamanio: fileSizeLabel,
      downloadUrl: documentUrl,
      viewUrl: documentUrl,
    };
  };

  const cargarAutos = async (procId: string) => {
    if (!procId) return;
    setCargandoAutos(true);
    try {
      const autosLegales = await disciplinaryService.getAutosPorProceso(procId);
      const lista = autosLegales.map((auto: any) => mapAutoLegal(auto));
      setAutos(lista);
    } catch (error) {
      console.error('Error cargando autos', error);
      toast.error('No se pudieron cargar los autos');
    } finally {
      setCargandoAutos(false);
    }
  };

  useEffect(() => {
    let activo = true;
    const resolverProceso = async () => {
      const directId = proceso?.id || '';
      if (directId && isUuidLike(directId)) {
        if (activo) setProcessId(directId);
        return;
      }
      const radicado = proceso?.numeroProceso;
      if (!radicado) {
        if (activo) setProcessId('');
        return;
      }
      try {
        const found = await disciplinaryService.getProcesoByRadicado(radicado);
        if (activo) setProcessId(found?.id || '');
      } catch (error) {
        console.error('Error resolviendo proceso', error);
        if (activo) {
          setProcessId('');
          toast.error('No se pudo identificar el proceso para autos');
        }
      }
    };

    resolverProceso();
    return () => {
      activo = false;
    };
  }, [proceso?.id, proceso?.numeroProceso]);

  useEffect(() => {
    if (!processId) return;
    cargarAutos(processId);
  }, [processId]);

  const handleEliminarAuto = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!autoParaEliminar) return;
    setEliminandoAuto(true);
    try {
      await disciplinaryService.deleteAuto(autoParaEliminar.id);
      await cargarAutos(processId);
      toast.success('Auto eliminado', {
        description: autoParaEliminar.numero,
      });
    } catch (error) {
      console.error('Error eliminando auto', error);
      toast.error('No se pudo eliminar el auto');
    } finally {
      setEliminandoAuto(false);
      setAutoParaEliminar(null);
    }
  };

  const generarTituloAutomatico = (tipo: any) => {
    const numeroConsecutivo = String(autos.length + 1).padStart(3, '0');
    return `${tipo.nombre} No. ${numeroConsecutivo} - ${proceso.numeroProceso}`;
  };

  const handleSeleccionarTipoAuto = (tipo: any) => {
    setTipoAutoSeleccionado(tipo);
    setTitulo(generarTituloAutomatico(tipo));
    setDescripcion('');
    setArchivo(null);
    setArchivoError(null);
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setArchivoError('El archivo no puede superar 10MB');
      setArchivo(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setArchivoError('Solo se permiten archivos PDF');
      setArchivo(null);
      return;
    }

    setArchivo(file);
    setArchivoError(null);
  };

  const handleCrearAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoAutoSeleccionado || !processId) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setCreandoAuto(true);
    try {
      // Subir archivo si existe
      let documentUrl = '';
      let documentName = '';
      let documentType = '';
      let documentSize = 0;

      if (archivo) {
        const uploadResult = await disciplinaryService.uploadFile(archivo);
        documentUrl = uploadResult.url;
        documentName = uploadResult.filename;
        documentType = archivo.type;
        documentSize = archivo.size;
      }

      // Crear auto legal
      const autoData = {
        processId: processId,
        tipoAuto: tipoAutoSeleccionado.id,
        contenidoHtml: descripcion || '',
        numero: titulo,
        comentarios: descripcion || '',
        documentUrl,
        documentName,
        documentType,
        documentSize
      };

      await disciplinaryService.crearAuto(autoData);

      toast.success('Auto creado exitosamente', {
        description: titulo
      });

      // Recargar lista y volver a vista de lista
      await cargarAutos(processId);
      setVistaActual('lista');
      setTipoAutoSeleccionado(null);
      setTitulo('');
      setDescripcion('');
      setArchivo(null);
    } catch (error) {
      console.error('Error creando auto', error);
      toast.error('No se pudo crear el auto');
    } finally {
      setCreandoAuto(false);
    }
  };

  const documentoActual = visorDocumento.documento;

  const tiposAuto = [
    { id: 'AUTO_APERTURA', nombre: 'Auto de Apertura', icon: Scale, color: '#8B5CF6' },
    { id: 'AUTO_INDAGACION_PRELIMINAR', nombre: 'Auto de Indagación Preliminar', icon: Search, color: '#06B6D4' },
    { id: 'AUTO_APERTURA_INVESTIGACION', nombre: 'Auto de Apertura de Investigación', icon: FileText, color: '#10B981' },
    { id: 'AUTO_FORMULACION_PLIEGO', nombre: 'Auto de Formulación de Pliego', icon: FileCheck, color: '#F59E0B' },
    { id: 'AUTO_CIERRE', nombre: 'Auto de Cierre', icon: CheckCircle, color: '#22C55E' },
    { id: 'AUTO_ARCHIVO', nombre: 'Auto de Archivo', icon: Archive, color: '#6B7280' },
    { id: 'FALLO_SANCION', nombre: 'Fallo con Sanción', icon: AlertTriangle, color: '#DC2626' },
    { id: 'FALLO_ABSOLUTORIO', nombre: 'Fallo Absolutorio', icon: CheckCircle, color: '#10B981' }
  ];

  if (!proceso) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#EDE9FE' }}>
                <Scale className="w-6 h-6" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Autos y Providencias
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - {proceso.denunciado.nombre}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b">
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-t-lg font-bold text-sm bg-purple-100 text-purple-700 border-b-2 border-purple-600"
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Lista de Autos
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {vistaActual === 'lista' ? (
            // Lista de Autos Existentes
            <div className="space-y-3">
              {cargandoAutos ? (
                <Card className="p-8 text-center">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 animate-pulse" />
                  <p className="text-sm text-gray-600">Cargando autos...</p>
                </Card>
              ) : autos.length === 0 ? (
                <Card className="p-8 text-center">
                  <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-600">No hay autos registrados.</p>
                </Card>
              ) : (
                autos.map((auto) => (
                  <Card key={auto.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Scale className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                          <h3 className="font-bold text-gray-900">{auto.numero}</h3>
                          {auto.firmado && (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <FileSignature className="w-3 h-3 mr-1" />
                              Firmado
                            </Badge>
                          )}
                          {auto.notificado && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                              <Bell className="w-3 h-3 mr-1" />
                              Notificado
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Tipo:</p>
                            <p className="font-bold text-gray-900">{auto.tipo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Fecha:</p>
                            <p className="font-bold text-gray-900">{auto.fecha}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Estado:</p>
                            <p className="font-bold text-gray-900">{auto.estado}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-700 mt-2 flex items-center gap-2">
                          <Paperclip className="w-3 h-3 text-gray-500" />
                          <span className="font-semibold">{auto.documentName}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-gray-100">{auto.fileExtension}</Badge>
                          <span className="text-gray-500">• {auto.tamanio}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVisorDocumento({ show: true, documento: auto });
                          }}
                          title="Ver documento"
                          style={{ borderColor: '#003DA5', color: '#003DA5' }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            descargarArchivo(auto.downloadUrl, `${auto.numero}.pdf`);
                            toast.success('Descarga iniciada', {
                              description: `${auto.numero}.pdf`
                            });
                          }}
                          title="Descargar documento"
                          style={{ borderColor: '#003DA5', color: '#003DA5' }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutoParaEliminar(auto);
                          }}
                          title="Eliminar auto"
                          style={{ borderColor: '#DC2626', color: '#DC2626' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : !tipoAutoSeleccionado ? (
            // Selección de tipo de auto
            <div className="space-y-4">
              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-purple-900 mb-1">
                      Selecciona el tipo de auto a crear
                    </p>
                    <p className="text-xs text-purple-700">
                      El sistema pre-llenará automáticamente los campos del documento con la información del proceso
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {tiposAuto.map((tipo) => (
                  <button
                    key={tipo.id}
                    onClick={() => handleSeleccionarTipoAuto(tipo)}
                    className="p-4 border-2 rounded-xl hover:shadow-md transition-all text-left group hover:scale-105"
                    style={{ borderColor: tipo.color + '40' }}
                  >
                    <tipo.icon
                      className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"
                      style={{ color: tipo.color }}
                    />
                    <p className="font-bold text-sm text-gray-900">{tipo.nombre}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Formulario de creación de auto
            <form onSubmit={handleCrearAuto} className="space-y-4">
              <Card className="p-4 border-2" style={{ borderColor: tipoAutoSeleccionado.color + '40', backgroundColor: tipoAutoSeleccionado.color + '10' }}>
                <div className="flex items-center gap-3">
                  <tipoAutoSeleccionado.icon className="w-8 h-8" style={{ color: tipoAutoSeleccionado.color }} />
                  <div>
                    <p className="font-bold text-gray-900">{tipoAutoSeleccionado.nombre}</p>
                    <p className="text-xs text-gray-600">Completa la información del documento</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Título del Auto
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Generado automáticamente, puedes editarlo si lo deseas</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Agrega notas o detalles adicionales sobre este auto..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Archivo del Documento (opcional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-500 transition-colors">
                    <input
                      type="file"
                      onChange={handleArchivoChange}
                      accept=".pdf"
                      className="hidden"
                      id="archivo-auto-input"
                    />
                    <label htmlFor="archivo-auto-input" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      {archivo ? (
                        <div className="text-sm">
                          <p className="font-bold text-gray-900">{archivo.name}</p>
                          <p className="text-xs text-gray-500">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="font-bold text-gray-900">Seleccionar archivo PDF</p>
                          <p className="text-xs text-gray-500">Solo PDF (máx. 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                  {archivoError && (
                    <p className="text-xs text-red-600 mt-1">{archivoError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTipoAutoSeleccionado(null);
                    setArchivo(null);
                    setArchivoError(null);
                  }}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
                <Button
                  type="submit"
                  disabled={creandoAuto}
                  className="flex-1"
                  style={{ background: tipoAutoSeleccionado.color, color: '#FFFFFF' }}
                >
                  {creandoAuto ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Crear Auto
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          {vistaActual === 'lista' && (
            <Button
              onClick={() => setVistaActual('crear')}
              style={{ background: '#8B5CF6', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Nuevo Auto
            </Button>
          )}
        </div>
      </motion.div>

      {/* Modal Visor de Documento */}
      <AnimatePresence>
        {visorDocumento.show && visorDocumento.documento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={() => setVisorDocumento({ show: false, documento: null })}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Visor de Auto
                  </h3>
                  <p className="text-sm text-gray-600">{visorDocumento.documento.numero}</p>
                </div>
                <button
                  onClick={() => setVisorDocumento({ show: false, documento: null })}
                  className="p-2 hover:bg-white/60 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 flex flex-col gap-4 overflow-hidden" style={{ height: 'calc(95vh - 200px)' }}>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Tipo:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.tipo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.fecha}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Estado:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.estado}</p>
                    </div>
                  </div>
                </Card>

                {visorDocumento.documento.viewUrl ? (
                  <Card className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 flex-1 flex flex-col">
                    <iframe
                      src={visorDocumento.documento.viewUrl}
                      title={visorDocumento.documento.numero}
                      className="w-full flex-1 min-h-[560px] rounded-lg bg-white"
                    />
                  </Card>
                ) : (
                  <Card className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Scale className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="font-bold text-gray-900 mb-2">Sin documento adjunto</p>
                      <p className="text-sm text-gray-600">
                        Este auto no tiene un documento PDF asociado
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <Button onClick={() => setVisorDocumento({ show: false, documento: null })} variant="outline">
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    if (!visorDocumento.documento?.downloadUrl) return;
                    descargarArchivo(visorDocumento.documento.downloadUrl, `${visorDocumento.documento.numero}.pdf`);
                    toast.success('Descarga iniciada', { description: `${visorDocumento.documento.numero}.pdf` });
                  }}
                  style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog
        open={Boolean(autoParaEliminar)}
        onOpenChange={(open) => {
          if (!open) setAutoParaEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar auto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El auto y su archivo se eliminaran del expediente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold">{autoParaEliminar?.numero}</p>
            <p className="text-xs text-gray-500">{autoParaEliminar?.tipo}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoAuto}>Cancelar</AlertDialogCancel>
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await handleEliminarAuto(e);
              }}
              disabled={eliminandoAuto}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {eliminandoAuto ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ==================== MODAL GESTIÓN DE EVIDENCIAS ====================
interface ModalEvidenciasProps {
  proceso: Proceso;
  onClose: () => void;
  onSubirEvidencia: () => void;
}

export function ModalGestionEvidencias({ proceso, onClose, onSubirEvidencia }: ModalEvidenciasProps) {
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any | null }>({ show: false, documento: null });
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [processId, setProcessId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoEvidencias, setCargandoEvidencias] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [evidenciaParaEliminar, setEvidenciaParaEliminar] = useState<any | null>(null);
  const [eliminandoEvidencia, setEliminandoEvidencia] = useState(false);
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB para evidencias

  const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const formatFileSize = (size?: number) => {
    if (!size && size !== 0) return '';
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  };

  const buildDownloadUrl = (procId: string, documentId: string, view: boolean) => {
    const suffix = view ? '?view=true' : '';
    const basePath = `/disciplinary-processes/${procId}/documents/${documentId}/download${suffix}`;
    if (API_MODE === 'direct') {
      return `${MICROSERVICE_URLS['control-disciplinario']}${basePath}`;
    }
    return buildApiUrl('control-disciplinario', `/api/v1${basePath}`);
  };

  const descargarArchivo = async (url: string, nombre: string) => {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nombre;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error descargando archivo', error);
      toast.error('No se pudo descargar el archivo');
    }
  };

  const mapEvidencia = (doc: any, procId: string) => {
    const fileSizeLabel = formatFileSize(doc.fileSize);
    return {
      id: doc.id,
      nombre: doc.archivoNombre || doc.nombre || 'Evidencia',
      tipo: doc.fileType || '',
      fecha: (doc.fechaCarga || '').split('T')[0],
      tamaño: fileSizeLabel,
      categoria: doc.categoria || 'Sin categoría',
      fileType: doc.fileType || '',
      fileSize: doc.fileSize,
      downloadUrl: buildDownloadUrl(procId, doc.id, false),
      viewUrl: buildDownloadUrl(procId, doc.id, true),
    };
  };

  const cargarEvidencias = async (procId: string) => {
    if (!procId) return;
    setCargandoEvidencias(true);
    try {
      const response = await disciplinaryService.getDocumentosExpediente(procId);
      const documentos = response.documentos || [];
      const lista = documentos
        .filter((doc: any) => doc.tipo === 'evidencia')
        .map((doc: any) => mapEvidencia(doc, procId));
      setEvidencias(lista);
    } catch (error) {
      console.error('Error cargando evidencias', error);
      toast.error('No se pudieron cargar las evidencias');
    } finally {
      setCargandoEvidencias(false);
    }
  };

  useEffect(() => {
    let activo = true;
    const resolverProceso = async () => {
      const directId = proceso?.id || '';
      if (directId && isUuidLike(directId)) {
        if (activo) setProcessId(directId);
        return;
      }
      const radicado = proceso?.numeroProceso;
      if (!radicado) {
        if (activo) setProcessId('');
        return;
      }
      try {
        const found = await disciplinaryService.getProcesoByRadicado(radicado);
        if (activo) setProcessId(found?.id || '');
      } catch (error) {
        console.error('Error resolviendo proceso', error);
        if (activo) {
          setProcessId('');
          toast.error('No se pudo identificar el proceso para evidencias');
        }
      }
    };

    resolverProceso();
    return () => {
      activo = false;
    };
  }, [proceso?.id, proceso?.numeroProceso]);

  useEffect(() => {
    if (!processId) return;
    cargarEvidencias(processId);
  }, [processId]);

  const handleSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoError(null);

    if (file.size > MAX_FILE_SIZE) {
      setArchivoError('El archivo supera el maximo de 50 MB');
      setArchivo(null);
      e.target.value = '';
      return;
    }

    setArchivo(file);
  };

  const handleSubirEvidencia = async () => {
    if (!processId || !isUuidLike(processId)) {
      toast.error('No se pudo identificar el proceso');
      return;
    }
    if (!categoria.trim()) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (!archivo) {
      toast.error('Debes adjuntar un archivo');
      return;
    }

    setCargando(true);
    try {
      const numero = `EVID-${String(evidencias.length + 1).padStart(3, '0')}-${new Date().getFullYear()}`;
      await disciplinaryService.uploadDocumento(
        processId,
        archivo,
        'EVIDENCIA',
        descripcion.trim() || archivo.name,
        numero,
        proceso?.etapaActual || undefined,
        'Sistema',
        categoria,
      );

      await cargarEvidencias(processId);
      setArchivo(null);
      setCategoria('');
      setDescripcion('');
      toast.success('Evidencia cargada', {
        description: `${numero} guardado correctamente`,
      });
    } catch (error) {
      console.error('Error subiendo evidencia', error);
      toast.error('No se pudo subir la evidencia');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarEvidencia = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!processId || !evidenciaParaEliminar) return;
    setEliminandoEvidencia(true);
    try {
      await disciplinaryService.deleteDocumento(processId, evidenciaParaEliminar.id);
      await cargarEvidencias(processId);
      toast.success('Evidencia eliminada', {
        description: evidenciaParaEliminar.nombre,
      });
    } catch (error) {
      console.error('Error eliminando evidencia', error);
      toast.error('No se pudo eliminar la evidencia');
    } finally {
      setEliminandoEvidencia(false);
      setEvidenciaParaEliminar(null);
    }
  };

  const documentoActual = visorDocumento.documento;

  const categorias = [
    { id: 'documental', nombre: 'Documental', icon: FileText, color: '#3B82F6' },
    { id: 'testimonial', nombre: 'Testimonial', icon: MessageSquare, color: '#10B981' },
    { id: 'fotografica', nombre: 'Fotográfica', icon: Archive, color: '#F59E0B' },
    { id: 'audiovisual', nombre: 'Audiovisual', icon: Archive, color: '#8B5CF6' },
    { id: 'digital', nombre: 'Digital', icon: Package, color: '#06B6D4' },
    { id: 'pericial', nombre: 'Pericial', icon: FileCheck, color: '#DC2626' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                <Archive className="w-6 h-6" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Evidencias
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Material Probatorio
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Todas ({evidencias.length})
            </Badge>
            {categorias.map((cat) => (
              <Badge
                key={cat.id}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
              >
                {cat.nombre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 260px)' }}>
          <div className="space-y-3">
            {cargandoEvidencias ? (
              <Card className="p-8 text-center">
                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 animate-pulse" />
                <p className="text-sm text-gray-600">Cargando evidencias...</p>
              </Card>
            ) : evidencias.length === 0 ? (
              <Card className="p-8 text-center">
                <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-600">No hay evidencias registradas.</p>
              </Card>
            ) : (
              evidencias.map((evidencia) => (
                <Card key={evidencia.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <Archive className="w-5 h-5" style={{ color: '#F59E0B' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{evidencia.nombre}</h3>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Categoría:</p>
                            <p className="font-bold text-gray-900">{evidencia.categoria}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Fecha:</p>
                            <p className="font-bold text-gray-900">{evidencia.fecha}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Tamaño:</p>
                            <p className="font-bold text-gray-900">{evidencia.tamaño}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisorDocumento({ show: true, documento: evidencia });
                        }}
                        title="Ver documento"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          descargarArchivo(evidencia.downloadUrl, evidencia.nombre);
                          toast.success('Descarga iniciada', {
                            description: evidencia.nombre
                          });
                        }}
                        title="Descargar archivo"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEvidenciaParaEliminar(evidencia);
                        }}
                        title="Eliminar evidencia"
                        style={{ borderColor: '#DC2626', color: '#DC2626' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="mt-6 rounded-xl border bg-orange-50/40 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Nueva evidencia</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Descripción (opcional)</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Descripción de la evidencia"
                />
              </div>
            </div>
            <div>
              <input
                type="file"
                id="file-upload-evidencias"
                accept="*/*"
                onChange={handleSeleccionArchivo}
                className="hidden"
              />
              <label htmlFor="file-upload-evidencias">
                <Card
                  className={`p-4 border-2 border-dashed cursor-pointer transition-all ${cargando ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50 border-gray-300'
                    }`}
                >
                  <div className="text-center">
                    <Upload className="w-10 h-10 mx-auto mb-2" style={{ color: '#F59E0B' }} />
                    <p className="font-bold text-gray-900 mb-1">
                      {cargando ? 'Subiendo archivo...' : 'Adjuntar evidencia'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {archivo ? archivo.name : 'Click para seleccionar archivo (máx 50 MB)'}
                    </p>
                    {archivoError && (
                      <p className="text-xs text-red-600 mt-2">{archivoError}</p>
                    )}
                  </div>
                </Card>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button
            onClick={handleSubirEvidencia}
            style={{ background: '#F59E0B', color: '#FFFFFF' }}
            disabled={cargando}
          >
            <Upload className="w-4 h-4 mr-2" />
            {cargando ? 'Cargando...' : 'Subir Evidencia'}
          </Button>
        </div>
      </motion.div>

      <AlertDialog
        open={Boolean(evidenciaParaEliminar)}
        onOpenChange={(open) => {
          if (!open) setEvidenciaParaEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evidencia</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La evidencia y su archivo se eliminaran del expediente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold">{evidenciaParaEliminar?.nombre}</p>
            <p className="text-xs text-gray-500">{evidenciaParaEliminar?.categoria}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoEvidencia}>Cancelar</AlertDialogCancel>
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await handleEliminarEvidencia(e);
              }}
              disabled={eliminandoEvidencia}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {eliminandoEvidencia ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Visor de Evidencia */}
      <AnimatePresence>
        {visorDocumento.show && visorDocumento.documento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={() => setVisorDocumento({ show: false, documento: null })}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b bg-gradient-to-r from-orange-50 to-yellow-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Visor de Evidencia
                  </h3>
                  <p className="text-sm text-gray-600">{visorDocumento.documento.nombre}</p>
                </div>
                <button
                  onClick={() => setVisorDocumento({ show: false, documento: null })}
                  className="p-2 hover:bg-white/60 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 flex flex-col gap-4 overflow-hidden" style={{ height: 'calc(95vh - 200px)' }}>
                <Card className="p-4 bg-orange-50 border-orange-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Categoría:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.categoria}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.fecha}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tamaño:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.tamaño}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 flex-1 flex flex-col overflow-hidden">
                  {visorDocumento.documento.fileType?.includes('pdf') ? (
                    <iframe
                      src={visorDocumento.documento.viewUrl}
                      title={visorDocumento.documento.nombre}
                      className="w-full flex-1 min-h-[560px] rounded-lg bg-white"
                    />
                  ) : visorDocumento.documento.fileType?.includes('image') ? (
                    <div className="w-full flex-1 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden p-2">
                      <img
                        src={visorDocumento.documento.viewUrl}
                        alt={visorDocumento.documento.nombre}
                        className="max-w-full max-h-full object-contain rounded"
                        style={{ maxHeight: 'calc(95vh - 400px)' }}
                      />
                    </div>
                  ) : visorDocumento.documento.fileType?.includes('video') ? (
                    <div className="w-full flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
                      <video
                        src={visorDocumento.documento.viewUrl}
                        controls
                        controlsList="nodownload nofullscreen noremoteplayback"
                        className="w-full h-full object-contain"
                        style={{ maxHeight: 'calc(95vh - 400px)' }}
                      >
                        Tu navegador no soporta el elemento de video.
                      </video>
                    </div>
                  ) : visorDocumento.documento.fileType?.includes('word') ||
                    visorDocumento.documento.fileType?.includes('document') ||
                    visorDocumento.documento.fileType?.includes('msword') ||
                    visorDocumento.documento.fileType?.includes('officedocument') ? (
                    <div className="w-full flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="font-bold text-gray-900 mb-2">Documento de Word</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Los documentos de Word no se pueden visualizar directamente en el navegador.
                        </p>
                        <p className="text-sm text-gray-700 mb-4">
                          Por favor, descarga el archivo para abrirlo en Microsoft Word o tu procesador de textos.
                        </p>
                        <Button
                          onClick={() => {
                            if (!visorDocumento.documento?.downloadUrl) return;
                            descargarArchivo(visorDocumento.documento.downloadUrl, visorDocumento.documento.nombre);
                            toast.success('Descarga iniciada', { description: visorDocumento.documento.nombre });
                          }}
                          style={{ background: '#F59E0B', color: '#FFFFFF' }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Documento
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Archive className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="font-bold text-gray-900 mb-2">Vista previa no disponible</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Este tipo de archivo no se puede visualizar en el navegador.
                        </p>
                        <p className="text-sm text-gray-700 mb-4">
                          Descarga el archivo para abrirlo con la aplicación correspondiente.
                        </p>
                        <Button
                          onClick={() => {
                            if (!visorDocumento.documento?.downloadUrl) return;
                            descargarArchivo(visorDocumento.documento.downloadUrl, visorDocumento.documento.nombre);
                            toast.success('Descarga iniciada', { description: visorDocumento.documento.nombre });
                          }}
                          style={{ background: '#F59E0B', color: '#FFFFFF' }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Archivo
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <Button onClick={() => setVisorDocumento({ show: false, documento: null })} variant="outline">
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    if (!visorDocumento.documento?.downloadUrl) return;
                    descargarArchivo(visorDocumento.documento.downloadUrl, visorDocumento.documento.nombre);
                    toast.success('Descarga iniciada', { description: visorDocumento.documento.nombre });
                  }}
                  style={{ background: '#F59E0B', color: '#FFFFFF' }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MODAL GESTIÓN DE OFICIOS ====================
interface ModalOficiosProps {
  proceso: Proceso;
  onClose: () => void;
  onCrearOficio: () => void;
}

export function ModalGestionOficios({ proceso, onClose, onCrearOficio }: ModalOficiosProps) {
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any | null }>({ show: false, documento: null });
  const [oficios, setOficios] = useState<any[]>([]);
  const [processId, setProcessId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [archivoCargando, setArchivoCargando] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [destinatario, setDestinatario] = useState('');
  const [asunto, setAsunto] = useState('');
  const [oficioParaEliminar, setOficioParaEliminar] = useState<any | null>(null);
  const [eliminandoOficio, setEliminandoOficio] = useState(false);
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const formatFileSize = (size?: number) => {
    if (!size && size !== 0) return '';
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  };

  const buildDownloadUrl = (procId: string, documentId: string, view: boolean) => {
    const suffix = view ? '?view=true' : '';
    const basePath = `/disciplinary-processes/${procId}/documents/${documentId}/download${suffix}`;
    if (API_MODE === 'direct') {
      return `${MICROSERVICE_URLS['control-disciplinario']}${basePath}`;
    }
    return buildApiUrl('control-disciplinario', `/api/v1${basePath}`);
  };

  const descargarArchivo = async (url: string, nombre: string) => {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nombre;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error descargando archivo', error);
      toast.error('No se pudo descargar el archivo');
    }
  };

  const mapOficio = (doc: any, procId: string) => {
    const fileSizeLabel = doc['tamano'] || doc['tamano'] || formatFileSize(doc.fileSize);
    return {
      id: doc.id,
      numero: doc.nombre || 'Oficio',
      destinatario: doc.destinatario || 'Sin destinatario',
      asunto: doc.asunto || doc.descripcion || '',
      fecha: (doc.fechaCarga || '').split('T')[0],
      estado: 'Registrado',
      fileType: doc.fileType || '',
      fileSize: doc.fileSize,
      tamanio: fileSizeLabel,
      downloadUrl: buildDownloadUrl(procId, doc.id, false),
      viewUrl: buildDownloadUrl(procId, doc.id, true),
    };
  };

  const cargarOficios = async (procId: string) => {
    if (!procId) return;
    setCargando(true);
    try {
      const response = await disciplinaryService.getDocumentosExpediente(procId);
      const documentos = response.documentos || [];
      const lista = documentos
        .filter((doc: any) => doc.tipo === 'oficio')
        .map((doc: any) => mapOficio(doc, procId));
      setOficios(lista);
    } catch (error) {
      console.error('Error cargando oficios', error);
      toast.error('No se pudieron cargar los oficios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let activo = true;
    const resolverProceso = async () => {
      const directId = proceso?.id || '';
      if (directId && isUuidLike(directId)) {
        if (activo) setProcessId(directId);
        return;
      }
      const radicado = proceso?.numeroProceso;
      if (!radicado) {
        if (activo) setProcessId('');
        return;
      }
      try {
        const found = await disciplinaryService.getProcesoByRadicado(radicado);
        if (activo) setProcessId(found?.id || '');
      } catch (error) {
        console.error('Error resolviendo proceso', error);
        if (activo) {
          setProcessId('');
          toast.error('No se pudo identificar el proceso para oficios');
        }
      }
    };

    resolverProceso();
    return () => {
      activo = false;
    };
  }, [proceso?.id, proceso?.numeroProceso]);

  useEffect(() => {
    if (!processId) return;
    cargarOficios(processId);
  }, [processId]);

  const handleSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoError(null);

    if (file.type !== 'application/pdf') {
      setArchivoError('Solo se permiten archivos PDF');
      setArchivo(null);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setArchivoError('El archivo supera el maximo de 10 MB');
      setArchivo(null);
      e.target.value = '';
      return;
    }

    setArchivo(file);
  };

  const handleCrearOficio = async () => {
    if (!processId || !isUuidLike(processId)) {
      toast.error('No se pudo identificar el proceso');
      return;
    }
    if (!destinatario.trim() || !asunto.trim()) {
      toast.error('Completa destinatario y asunto');
      return;
    }
    if (!archivo) {
      toast.error('Debes adjuntar un archivo PDF');
      return;
    }

    setCargando(true);
    setArchivoCargando(archivo.name);
    try {
      const year = new Date().getFullYear();
      const numero = `OCID-${String(oficios.length + 1).padStart(3, '0')}-${year}`;
      await disciplinaryService.uploadDocumento(
        processId,
        archivo,
        'OFICIO',
        asunto,
        numero,
        proceso?.etapaActual || undefined,
        'Sistema',
        undefined,
        destinatario,
        asunto,
      );

      await cargarOficios(processId);
      setArchivo(null);
      setArchivoCargando('');
      setDestinatario('');
      setAsunto('');
      toast.success('Oficio creado', {
        description: `${numero} guardado correctamente`,
      });
    } catch (error) {
      console.error('Error creando oficio', error);
      toast.error('No se pudo crear el oficio');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarOficio = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!processId || !oficioParaEliminar) return;
    setEliminandoOficio(true);
    try {
      await disciplinaryService.deleteDocumento(processId, oficioParaEliminar.id);
      await cargarOficios(processId);
      toast.success('Oficio eliminado', {
        description: oficioParaEliminar.numero,
      });
    } catch (error) {
      console.error('Error eliminando oficio', error);
      toast.error('No se pudo eliminar el oficio');
    } finally {
      setEliminandoOficio(false);
      setOficioParaEliminar(null);
    }
  };

  const documentoActual = visorDocumento.documento;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#CFFAFE' }}>
                <Mail className="w-6 h-6" style={{ color: '#06B6D4' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Oficios
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Comunicaciones Oficiales
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          <div className="space-y-3">
            {oficios.length === 0 ? (
              <Card className="p-8 text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-600">No hay oficios registrados.</p>
              </Card>
            ) : (
              oficios.map((oficio) => (
                <Card key={oficio.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-cyan-100">
                        <Mail className="w-5 h-5" style={{ color: '#06B6D4' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{oficio.numero}</h3>
                          <Badge className="bg-blue-100 text-blue-700">{oficio.estado}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Destinatario:</p>
                            <p className="font-bold text-gray-900">{oficio.destinatario}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Asunto:</p>
                            <p className="font-bold text-gray-900">{oficio.asunto}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Fecha:</p>
                            <p className="font-bold text-gray-900">{oficio.fecha}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Tamano: {oficio.tamanio}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisorDocumento({ show: true, documento: oficio });
                        }}
                        title="Ver oficio"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          descargarArchivo(oficio.downloadUrl, `${oficio.numero}.pdf`);
                          toast.success('Descarga iniciada', { description: `${oficio.numero}.pdf` });
                        }}
                        title="Descargar oficio"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOficioParaEliminar(oficio);
                        }}
                        title="Eliminar oficio"
                        style={{ borderColor: '#DC2626', color: '#DC2626' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="mt-6 rounded-xl border bg-cyan-50/40 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Nuevo oficio</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Destinatario</label>
                <input
                  type="text"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Nombre del destinatario"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Asunto</label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Asunto del oficio"
                />
              </div>
            </div>
            <div>
              <input
                type="file"
                id="file-upload-oficios"
                accept="application/pdf"
                onChange={handleSeleccionArchivo}
                className="hidden"
              />
              <label htmlFor="file-upload-oficios">
                <Card
                  className={`p-4 border-2 border-dashed cursor-pointer transition-all ${cargando ? 'border-cyan-500 bg-cyan-50' : 'hover:bg-gray-50 border-gray-300'
                    }`}
                >
                  <div className="text-center">
                    <Upload className="w-10 h-10 mx-auto mb-2" style={{ color: '#06B6D4' }} />
                    <p className="font-bold text-gray-900 mb-1">
                      {cargando ? 'Subiendo archivo...' : 'Adjuntar oficio (PDF)'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {archivo ? archivo.name : 'Click para seleccionar archivo'}
                    </p>
                    {archivoError && (
                      <p className="text-xs text-red-600 mt-2">{archivoError}</p>
                    )}
                    {archivoCargando && cargando && (
                      <p className="text-xs text-gray-500 mt-2">{archivoCargando}</p>
                    )}
                  </div>
                </Card>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button
            onClick={handleCrearOficio}
            style={{ background: '#06B6D4', color: '#FFFFFF' }}
            disabled={cargando}
          >
            <Upload className="w-4 h-4 mr-2" />
            {cargando ? 'Cargando...' : 'Crear Oficio'}
          </Button>
        </div>
      </motion.div>

      <AlertDialog
        open={Boolean(oficioParaEliminar)}
        onOpenChange={(open) => {
          if (!open) setOficioParaEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar oficio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El oficio y su archivo se eliminaran del expediente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold">{oficioParaEliminar?.numero}</p>
            <p className="text-xs text-gray-500">{oficioParaEliminar?.destinatario}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoOficio}>Cancelar</AlertDialogCancel>
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await handleEliminarOficio(e);
              }}
              disabled={eliminandoOficio}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {eliminandoOficio ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {visorDocumento.show && documentoActual && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={() => setVisorDocumento({ show: false, documento: null })}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Visor de Oficio
                  </h3>
                  <p className="text-sm text-gray-600">{documentoActual.numero}</p>
                </div>
                <button
                  onClick={() => setVisorDocumento({ show: false, documento: null })}
                  className="p-2 hover:bg-white/60 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 overflow-hidden" style={{ height: 'calc(95vh - 200px)' }}>
                <Card className="p-4 bg-cyan-50 border-cyan-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Destinatario:</p>
                      <p className="font-bold text-gray-900">{documentoActual.destinatario}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Asunto:</p>
                      <p className="font-bold text-gray-900">{documentoActual.asunto}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha:</p>
                      <p className="font-bold text-gray-900">{documentoActual.fecha}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 flex-1 flex flex-col">
                  <iframe
                    src={documentoActual.viewUrl}
                    title={documentoActual.numero}
                    className="w-full flex-1 min-h-[560px] rounded-lg bg-white"
                  />
                </Card>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <Button onClick={() => setVisorDocumento({ show: false, documento: null })} variant="outline">
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    if (!documentoActual?.downloadUrl) return;
                    descargarArchivo(documentoActual.downloadUrl, `${documentoActual.numero}.pdf`);
                    toast.success('Descarga iniciada', { description: `${documentoActual.numero}.pdf` });
                  }}
                  style={{ background: '#06B6D4', color: '#FFFFFF' }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MODAL GESTIÓN DE ACTAS ====================
interface ModalActasProps {
  proceso: Proceso;
  onClose: () => void;
}

interface ActaTipo {
  id: string;
  nombre: string;
  icon: any;
  color: string;
}

export function ModalGestionActas({ proceso, onClose }: ModalActasProps) {
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any | null }>({ show: false, documento: null });
  const [modalCrearActa, setModalCrearActa] = useState<{ show: boolean; tipo: ActaTipo | null }>({ show: false, tipo: null });
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [cargando, setCargando] = useState(false);
  const [actas, setActas] = useState<any[]>([]);
  const [cargandoActas, setCargandoActas] = useState(false);
  const [processId, setProcessId] = useState('');
  const [actaParaEliminar, setActaParaEliminar] = useState<any | null>(null);
  const [eliminandoActa, setEliminandoActa] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const tiposActa: ActaTipo[] = [
    { id: 'version', nombre: 'Version Libre', icon: MessageSquare, color: '#3B82F6' },
    { id: 'audiencia', nombre: 'Audiencia', icon: Users, color: '#10B981' },
    { id: 'descargos', nombre: 'Descargos', icon: FileText, color: '#F59E0B' },
    { id: 'diligencia', nombre: 'Diligencia', icon: FileCheck, color: '#DC2626' }
  ];

  const getActaColor = (tipo?: string) => {
    const value = (tipo || '').toLowerCase();
    if (value.includes('version')) return '#3B82F6';
    if (value.includes('audiencia')) return '#10B981';
    if (value.includes('descargo')) return '#F59E0B';
    if (value.includes('diligencia')) return '#DC2626';
    return '#6B7280';
  };

  const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const formatFileSize = (size?: number) => {
    if (!size && size != 0) return '';
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  };

  const buildDownloadUrl = (procId: string, documentId: string, view: boolean) => {
    const suffix = view ? '?view=true' : '';
    const basePath = `/disciplinary-processes/${procId}/documents/${documentId}/download${suffix}`;
    if (API_MODE === 'direct') {
      return `${MICROSERVICE_URLS['control-disciplinario']}${basePath}`;
    }
    return buildApiUrl('control-disciplinario', `/api/v1${basePath}`);
  };

  const descargarArchivo = async (url: string, nombre: string) => {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nombre;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error descargando archivo', error);
      toast.error('No se pudo descargar el archivo');
    }
  };

  const mapActa = (doc: any, procId: string) => ({
    id: doc.id,
    numero: doc.nombre || 'ACTA',
    tipo: doc.categoria || 'Sin tipo',
    fecha: (doc.fechaCarga || '').split('T')[0],
    participantes: doc.participantes ?? 0,
    descripcion: doc.descripcion || '',
    fileType: doc.fileType || '',
    fileSize: doc.fileSize,
    archivoNombre: doc.archivoNombre || doc.nombre || 'Documento',
    viewUrl: buildDownloadUrl(procId, doc.id, true),
    downloadUrl: buildDownloadUrl(procId, doc.id, false),
  });

  const cargarActas = async (procId: string) => {
    if (!procId) return;
    setCargandoActas(true);
    try {
      const response = await disciplinaryService.getDocumentosExpediente(procId);
      const documentos = response.documentos || [];
      const lista = documentos
        .filter((doc: any) => doc.tipo === 'acta')
        .map((doc: any) => mapActa(doc, procId));
      setActas(lista);
    } catch (error) {
      console.error('Error cargando actas', error);
      toast.error('No se pudieron cargar las actas');
    } finally {
      setCargandoActas(false);
    }
  };

  useEffect(() => {
    let activo = true;
    const resolverProceso = async () => {
      const directId = proceso?.id || '';
      if (directId && isUuidLike(directId)) {
        if (activo) setProcessId(directId);
        return;
      }
      const radicado = proceso?.numeroProceso;
      if (!radicado) {
        if (activo) setProcessId('');
        return;
      }
      try {
        const found = await disciplinaryService.getProcesoByRadicado(radicado);
        if (activo) setProcessId(found?.id || '');
      } catch (error) {
        console.error('Error resolviendo proceso', error);
        if (activo) {
          setProcessId('');
          toast.error('No se pudo identificar el proceso para actas');
        }
      }
    };

    resolverProceso();
    return () => {
      activo = false;
    };
  }, [proceso?.id, proceso?.numeroProceso]);

  useEffect(() => {
    if (!processId) return;
    cargarActas(processId);
  }, [processId]);

  const handleSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setArchivoError(null);
    if (!file) {
      setArchivoSeleccionado(null);
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      setArchivoError('Formato no permitido. Use PDF o Word.');
      setArchivoSeleccionado(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setArchivoError('El archivo supera el maximo de 10 MB.');
      setArchivoSeleccionado(null);
      e.target.value = '';
      return;
    }
    setArchivoSeleccionado(file);
  };

  const handleCrearActa = async () => {
    if (!modalCrearActa.tipo) {
      toast.error('Selecciona el tipo de acta');
      return;
    }
    if (!processId || !isUuidLike(processId)) {
      toast.error('No se pudo identificar el proceso');
      return;
    }
    if (!archivoSeleccionado) {
      toast.error('Adjunta el documento del acta');
      return;
    }
    if (archivoError) {
      toast.error('Corrige el archivo adjunto');
      return;
    }

    const participantesNumero = participantes.trim() ? Number(participantes) : undefined;
    if (participantes.trim() && (Number.isNaN(participantesNumero) || participantesNumero < 0)) {
      toast.error('Numero de participantes invalido');
      return;
    }

    try {
      setCargando(true);
      const ahora = new Date();
      const consecutivo = String(actas.length + 1).padStart(3, '0');
      const numeroActa = `ACTA-${ahora.getFullYear()}-${consecutivo}`;
      await disciplinaryService.uploadDocumento(
        processId,
        archivoSeleccionado,
        'ACTA',
        descripcion.trim(),
        numeroActa,
        proceso?.etapaActual || undefined,
        'Sistema',
        modalCrearActa.tipo.nombre,
        undefined,
        undefined,
        participantesNumero,
      );

      await cargarActas(processId);
      setModalCrearActa({ show: false, tipo: null });
      setArchivoSeleccionado(null);
      setDescripcion('');
      setParticipantes('');
      setArchivoError(null);
      toast.success('Acta creada', {
        description: `${numeroActa} se guardo correctamente`
      });
    } catch (error) {
      console.error('Error creando acta', error);
      toast.error('No se pudo crear el acta');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarActa = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!processId || !actaParaEliminar) return;
    setEliminandoActa(true);
    try {
      await disciplinaryService.deleteDocumento(processId, actaParaEliminar.id);
      await cargarActas(processId);
      toast.success('Acta eliminada', { description: actaParaEliminar.numero });
    } catch (error) {
      console.error('Error eliminando acta', error);
      toast.error('No se pudo eliminar el acta');
    } finally {
      setEliminandoActa(false);
      setActaParaEliminar(null);
    }
  };

  const documentoActual = visorDocumento.documento;
  const documentoType = documentoActual?.fileType || '';
  const esPdf = documentoType === 'application/pdf';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                <FileCheck className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestion de Actas
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Registro de Diligencias
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          <div className="space-y-3">
            {cargandoActas ? (
              <Card className="p-8 text-center">
                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 animate-pulse" />
                <p className="text-sm text-gray-600">Cargando actas...</p>
              </Card>
            ) : actas.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-600">No hay actas registradas para este proceso.</p>
              </Card>
            ) : (
              actas.map((acta) => (
                (() => {
                  const actaColor = getActaColor(acta.tipo);
                  return (
                    <Card key={acta.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg" style={{ background: actaColor + '20' }}>
                            <FileCheck className="w-5 h-5" style={{ color: actaColor }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-900">{acta.numero}</h3>
                              <Badge style={{ background: actaColor + '20', color: actaColor }}>
                                {acta.tipo}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600">Tipo:</p>
                                <p className="font-bold text-gray-900">{acta.tipo}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Fecha:</p>
                                <p className="font-bold text-gray-900">{acta.fecha}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Participantes:</p>
                                <p className="font-bold text-gray-900">{acta.participantes}</p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Tamano: {formatFileSize(acta.fileSize)}
                            </div>
                            {(acta.descripcion || acta.archivoNombre) && (
                              <div className="mt-3 border-t pt-2 text-xs text-gray-600">
                                {acta.descripcion && (
                                  <p className="line-clamp-2">
                                    <span className="font-semibold text-gray-700">Descripcion:</span> {acta.descripcion}
                                  </p>
                                )}
                                {acta.archivoNombre && (
                                  <p className="mt-1">
                                    <span className="font-semibold text-gray-700">Archivo:</span> {acta.archivoNombre}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVisorDocumento({ show: true, documento: acta });
                              toast.info('Ver Acta', {
                                description: `Abriendo ${acta.numero} - ${acta.tipo}`
                              });
                            }}
                            title="Ver acta"
                            style={{ borderColor: '#003DA5', color: '#003DA5' }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              descargarArchivo(acta.downloadUrl, acta.archivoNombre || `${acta.numero}.pdf`);
                              toast.success('Descarga iniciada', {
                                description: acta.archivoNombre || `${acta.numero}.pdf`
                              });
                            }}
                            title="Descargar acta"
                            style={{ borderColor: '#003DA5', color: '#003DA5' }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActaParaEliminar(acta);
                            }}
                            title="Eliminar acta"
                            style={{ borderColor: '#DC2626', color: '#DC2626' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })()
              ))
            )}
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold text-gray-700 mb-3">Crear Nueva Acta:</p>
            <div className="grid grid-cols-2 gap-3">
              {tiposActa.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => {
                    setModalCrearActa({ show: true, tipo });
                    setArchivoSeleccionado(null);
                    setArchivoError(null);
                  }}
                  className="p-4 border-2 rounded-xl hover:shadow-lg transition-all text-left group hover:scale-105 active:scale-95"
                  style={{ borderColor: tipo.color + '40', background: tipo.color + '08' }}
                >
                  <tipo.icon
                    className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform"
                    style={{ color: tipo.color }}
                  />
                  <p className="font-bold text-sm text-gray-900">{tipo.nombre}</p>
                  <p className="text-xs text-gray-600 mt-1">Click para subir documento</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline" className="w-full">
            Cerrar
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {modalCrearActa.show && modalCrearActa.tipo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
            onClick={() => setModalCrearActa({ show: false, tipo: null })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div
                className="p-6 border-b"
                style={{ background: modalCrearActa.tipo.color + '15' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: modalCrearActa.tipo.color + '30' }}
                    >
                      <modalCrearActa.tipo.icon
                        className="w-6 h-6"
                        style={{ color: modalCrearActa.tipo.color }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-black" style={{ color: '#003DA5' }}>
                        Crear Acta: {modalCrearActa.tipo.nombre}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {proceso.numeroProceso}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalCrearActa({ show: false, tipo: null })}
                    className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900 mb-1">
                        Sube el documento del acta
                      </p>
                      <p className="text-xs text-blue-700">
                        El archivo se asociara automaticamente al proceso {proceso.numeroProceso}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Descripcion</label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[80px]"
                      placeholder="Descripcion del acta"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Participantes</label>
                    <input
                      type="number"
                      min="0"
                      value={participantes}
                      onChange={(e) => setParticipantes(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      placeholder="Numero de participantes"
                    />
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    id="file-upload-acta"
                    accept="application/pdf,.doc,.docx"
                    onChange={handleSeleccionArchivo}
                    className="hidden"
                  />
                  <label htmlFor="file-upload-acta">
                    <Card
                      className={`p-8 border-2 border-dashed cursor-pointer transition-all ${archivoSeleccionado
                        ? 'border-green-500 bg-green-50'
                        : 'hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      <div className="text-center">
                        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {archivoSeleccionado ? archivoSeleccionado.name : 'Click para seleccionar archivo'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos: PDF, Word (.doc, .docx)
                        </p>
                        {archivoError && (
                          <p className="text-xs text-red-600 mt-2">{archivoError}</p>
                        )}
                      </div>
                    </Card>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setModalCrearActa({ show: false, tipo: null })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    style={{ background: modalCrearActa.tipo.color, color: '#FFFFFF' }}
                    disabled={!archivoSeleccionado || cargando}
                    onClick={handleCrearActa}
                  >
                    {cargando ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" />
                        Creando acta...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Crear Acta
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog
        open={Boolean(actaParaEliminar)}
        onOpenChange={(open) => {
          if (!open) setActaParaEliminar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar acta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El acta y su archivo se eliminaran del expediente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold">{actaParaEliminar?.numero}</p>
            <p className="text-xs text-gray-500">{actaParaEliminar?.tipo}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoActa}>Cancelar</AlertDialogCancel>
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await handleEliminarActa(e);
              }}
              disabled={eliminandoActa}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {eliminandoActa ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {visorDocumento.show && documentoActual && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={() => setVisorDocumento({ show: false, documento: null })}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b bg-gradient-to-r from-red-50 to-pink-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Visor de Acta
                  </h3>
                  <p className="text-sm text-gray-600">{documentoActual.numero}</p>
                </div>
                <button
                  onClick={() => setVisorDocumento({ show: false, documento: null })}
                  className="p-2 hover:bg-white/60 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 overflow-hidden" style={{ height: 'calc(95vh - 200px)' }}>
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Tipo:</p>
                      <p className="font-bold text-gray-900">{documentoActual.tipo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha:</p>
                      <p className="font-bold text-gray-900">{documentoActual.fecha}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Participantes:</p>
                      <p className="font-bold text-gray-900">{documentoActual.participantes}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tamano:</p>
                      <p className="font-bold text-gray-900">{formatFileSize(documentoActual.fileSize)}</p>
                    </div>
                  </div>
                  {documentoActual.descripcion && (
                    <p className="text-xs text-gray-600 mt-2">
                      <span className="font-semibold text-gray-700">Descripcion:</span> {documentoActual.descripcion}
                    </p>
                  )}
                </Card>

                {esPdf ? (
                  <Card className="w-full flex-1 min-h-[520px] rounded-xl border bg-slate-50 overflow-hidden">
                    <iframe
                      title={documentoActual.numero}
                      src={documentoActual.viewUrl}
                      className="w-full h-full"
                    />
                  </Card>
                ) : (
                  <div className="w-full flex-1 min-h-[520px] rounded-xl border flex flex-col items-center justify-center text-center text-gray-600">
                    <FileText className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="text-sm">Vista previa no disponible para este archivo.</p>
                    <p className="text-xs text-gray-500 mt-1">Descargalo para abrirlo en tu equipo.</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <Button onClick={() => setVisorDocumento({ show: false, documento: null })} variant="outline">
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    if (!documentoActual?.downloadUrl) return;
                    descargarArchivo(documentoActual.downloadUrl, documentoActual.archivoNombre || `${documentoActual.numero}.pdf`);
                    toast.success('Descarga iniciada', { description: documentoActual.archivoNombre || `${documentoActual.numero}.pdf` });
                  }}
                  style={{ background: '#DC2626', color: '#FFFFFF' }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
// ==================== MODAL HISTORIAL DE AUDITORÍA ====================
interface ModalHistorialProps {
  proceso: Proceso;
  onClose: () => void;
}

export function ModalHistorialAuditoria({ proceso, onClose }: ModalHistorialProps & { historial?: any[] }) {
  const [historialCompleto, setHistorialCompleto] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        setCargando(true);
        // 1. Obtener historial base (Noticia)
        const historialBase = (proceso as any).news?.historialAuditoria || (proceso as any).historialAuditoria || [];

        // 2. Obtener Autos (si es un proceso real con ID)
        let autosHistorial: any[] = [];
        if (proceso.id && isUuidLike(proceso.id)) {
          try {
            const autos = await disciplinaryService.getAutosByProceso(proceso.id);
            autosHistorial = autos.map((auto: any) => ({
              id: `auto-${auto.id}`,
              tipo: 'documento',
              usuario: 'Sistema/Abogado', // O auto.usuario si existe
              fecha: auto.createdAt,
              accion: `Auto: ${auto.tipo}`,
              detalle: `Estado: ${auto.estado} - ${auto.numero || 'Sin número'}`
            }));
          } catch (err) {
            console.error('Error cargando autos para historial', err);
          }
        }

        // 3. Unir y ordenar
        const combinado = [...historialBase, ...autosHistorial].sort((a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        setHistorialCompleto(combinado);
      } catch (error) {
        console.error('Error armando historial', error);
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, [proceso]);

  const actividades = historialCompleto.map((h: any, index: number) => ({
    id: h.id || `hist-${index}`,
    tipo: h.tipo || 'notificacion',
    usuario: h.usuario || 'Sistema',
    fecha: h.fecha ? new Date(h.fecha).toLocaleString() : 'Fecha desconocida',
    accion: h.accion || 'Acción registrada',
    detalle: h.observaciones || h.detalle || ''
  }));

  const tipoIcono: any = {
    carga: Upload,
    documento: FileText,
    modificacion: Edit2,
    visualizacion: Eye,
    notificacion: Bell,
    eliminacion: Trash2
  };

  const tipoColor: any = {
    carga: '#10B981',
    documento: '#003DA5', // Azul ESAP
    modificacion: '#F59E0B',
    visualizacion: '#3B82F6',
    notificacion: '#8B5CF6',
    eliminacion: '#DC2626'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#F3F4F6' }}>
                <History className="w-6 h-6" style={{ color: '#6B7280' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Historial de Auditoría
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Trazabilidad Completa
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Todas
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Cargas
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Modificaciones
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Visualizaciones
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Notificaciones
            </Badge>
          </div>
        </div>

        {/* Contenido - Timeline */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 260px)' }}>
          <div className="space-y-4 relative">
            {/* Línea vertical */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {actividades.map((actividad, index) => {
              const Icono = tipoIcono[actividad.tipo];
              const color = tipoColor[actividad.tipo];

              return (
                <div key={actividad.id} className="relative pl-16">
                  {/* Icono en timeline */}
                  <div
                    className="absolute left-3 p-2 rounded-full bg-white border-4"
                    style={{ borderColor: color + '40' }}
                  >
                    <Icono className="w-4 h-4" style={{ color }} />
                  </div>

                  {/* Contenido */}
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-gray-900">{actividad.accion}</p>
                          <Badge style={{ background: color + '20', color }}>
                            {actividad.tipo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{actividad.detalle}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {actividad.usuario}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {actividad.fecha}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Historial
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
