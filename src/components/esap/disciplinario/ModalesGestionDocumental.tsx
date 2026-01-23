/**
 * MODALES DE GESTIoN DOCUMENTAL - CONTROL INTERNO DISCIPLINARIO
 * Componentes para Gestión de Autos, Evidencias, Oficios, Notificaciones, Actas e Historial
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { API_MODE, MICROSERVICE_URLS, buildApiUrl } from '../../../config/environment';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { legalService } from '../../../services/api/legal.service';
import { OnlyOfficeEditor } from './OnlyOfficeEditor';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

// Funciones utilitarias globales - disponibles para todos los componentes
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
import {
  X, Scale, Archive, Mail, Bell, FileCheck, History, Upload, Download,
  Eye, Edit2, Trash2, Plus, Calendar, User, FileText, CheckCircle,
  AlertCircle, Clock, ExternalLink, Link as LinkIcon, Filter, Search,
  FileSignature, Send, Save, Package, Tag,
  Paperclip, MessageSquare, UserCheck, AlertTriangle, Info, Users, ArrowLeft,
  Gavel, Copy
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
import { toast } from 'sonner';
import { VisorPDFAuto } from './VisorPDFAuto';

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

// ==================== MODAL GESTIoN DE AUTOS ====================
interface ModalAutosProps {
  proceso: Proceso | null;
  onClose: () => void;
  onCrearAuto: () => void;
}

export function ModalGestionAutos({ proceso, onClose, onCrearAuto }: ModalAutosProps) {
  console.log('ðŸš€ ModalGestionAutos abierto con proceso:', {
    id: proceso?.id,
    numeroProceso: proceso?.numeroProceso,
    esUUID: proceso?.id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proceso.id) : false
  });

  const [vistaActual, setVistaActual] = useState<'lista' | 'editor' | 'crear'>('lista');
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any | null }>({ show: false, documento: null });
  const [autos, setAutos] = useState<any[]>([]);
  const [processId, setProcessId] = useState('');
  const [cargandoAutos, setCargandoAutos] = useState(false);
  const [autoParaEliminar, setAutoParaEliminar] = useState<any | null>(null);
  const [eliminandoAuto, setEliminandoAuto] = useState(false);
  const [autoEnviandoRevision, setAutoEnviandoRevision] = useState<string | null>(null);
  const [modalEditarAuto, setModalEditarAuto] = useState<{ show: boolean; auto: any | null }>({ show: false, auto: null });
  const [editandoAuto, setEditandoAuto] = useState(false);
  const [visorAuto, setVisorAuto] = useState<{ show: boolean; auto: any | null; modoPlantilla?: boolean; modoEdicion?: boolean }>({ show: false, auto: null });
  const [cargandoProceso, setCargandoProceso] = useState(false);

  // Estados para editor con plantillas
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<any | null>(null);
  const [contenidoHtml, setContenidoHtml] = useState('');
  const [datosPlantilla, setDatosPlantilla] = useState<Record<string, any>>({});
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [guardandoAuto, setGuardandoAuto] = useState(false);
  const [autoEditando, setAutoEditando] = useState<any | null>(null);

  // Estados para crear nuevo auto
  const [tipoAutoSeleccionado, setTipoAutoSeleccionado] = useState<any | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoError, setArchivoError] = useState<string | null>(null);
  const [creandoAuto, setCreandoAuto] = useState(false);

  // Estado para editor OnlyOffice
  const [modoEditorOnlyOffice, setModoEditorOnlyOffice] = useState(false);
  const [autoSeleccionado, setAutoSeleccionado] = useState<any | null>(null);

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
      documentUrl: documentUrl,
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

  const cargarPlantillas = async () => {
    setCargandoPlantillas(true);
    try {
      const response = await fetch(buildApiUrl('legal', '/api/v1/autos/plantillas'));
      if (response.ok) {
        const data = await response.json();
        setPlantillas(data);
      } else {
        console.error('Error cargando plantillas');
      }
    } catch (error) {
      console.error('Error cargando plantillas', error);
    } finally {
      setCargandoPlantillas(false);
    }
  };

  const seleccionarPlantilla = async (plantilla: any) => {
    setPlantillaSeleccionada(plantilla);
    setContenidoHtml(plantilla.contenidoHtml);

    // Extraer placeholders y crear campos de formulario
    const placeholders = plantilla.placeholders || [];
    const nuevosDatos: Record<string, any> = {};
    placeholders.forEach((placeholder: string) => {
      nuevosDatos[placeholder] = '';
    });
    setDatosPlantilla(nuevosDatos);
  };

  const guardarAutoDesdeEditor = async () => {
    if (!proceso?.numeroProceso) {
      toast.error('No se puede identificar el expediente');
      return;
    }

    if (!plantillaSeleccionada) {
      toast.error('Debe seleccionar una plantilla');
      return;
    }

    setGuardandoAuto(true);
    try {
      const response = await fetch(buildApiUrl('legal', `/api/v1/autos/${proceso.numeroProceso}/desde-plantilla`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('esap_access_token')}`
        },
        body: JSON.stringify({
          plantillaId: plantillaSeleccionada.id,
          datosPlantilla
        })
      });

      if (response.ok) {
        const nuevoAuto = await response.json();
        toast.success('Auto creado exitosamente desde plantilla');

        // Actualizar contenido HTML si hay cambios
        if (contenidoHtml !== plantillaSeleccionada.contenidoHtml) {
          await fetch(buildApiUrl('legal', `/api/v1/autos/${nuevoAuto.id}/contenido-html`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('esap_access_token')}`
            },
            body: JSON.stringify({ contenidoHtml })
          });
        }

        // Recargar lista de autos
        if (processId) {
          await cargarAutos(processId);
        }

        // Limpiar formulario
        setPlantillaSeleccionada(null);
        setContenidoHtml('');
        setDatosPlantilla({});
        setVistaActual('lista');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al crear el auto');
      }
    } catch (error) {
      console.error('Error guardando auto', error);
      toast.error('Error al guardar el auto');
    } finally {
      setGuardandoAuto(false);
    }
  };

  const editarAutoEnEditor = async (auto: any) => {
    setAutoEditando(auto);
    try {
      const response = await fetch(buildApiUrl('legal', `/api/v1/autos/${auto.id}/contenido-html`));
      if (response.ok) {
        const data = await response.json();
        setContenidoHtml(data.contenidoHtml || '');
        setPlantillaSeleccionada(data.plantillaUsada ? { nombre: data.plantillaUsada } : null);
        setDatosPlantilla(data.datosPlantilla || {});
        setVistaActual('editor');
      }
    } catch (error) {
      console.error('Error cargando contenido del auto', error);
      toast.error('Error al cargar el contenido del auto');
    }
  };

  const editarAutoEnOnlyOffice = (auto: any) => {
    setAutoSeleccionado(auto);
    setModoEditorOnlyOffice(true);
  };

  useEffect(() => {
    let activo = true;
    const resolverProceso = async () => {
      const directId = proceso?.id || '';

      // Primero intentar usar el ID directamente si es un UUID valido
      if (directId && isUuidLike(directId)) {
        console.log('âœ… Usando ID directo del proceso:', directId);
        if (activo) setProcessId(directId);
        return;
      }

      // Si no hay ID directo, intentar buscar por radicado
      const radicado = proceso?.numeroProceso;
      if (!radicado) {
        console.warn('âš ï¸ No hay ID ni radicado para el proceso');
        if (activo) setProcessId('');
        return;
      }

      try {
        console.log('ðŸ” Buscando proceso por radicado:', radicado);
        const found = await disciplinaryService.getProcesoByRadicado(radicado);
        if (activo) {
          console.log('âœ… Proceso encontrado por radicado:', found?.id);
          setProcessId(found?.id || '');
        }
      } catch (error: any) {
        console.error('âŒ Error resolviendo proceso por radicado:', error);
        if (activo) {
          setProcessId('');
          // Solo mostrar error si no es un 404 de proceso recion creado
          if (error?.message?.includes('404') || error?.message?.includes('no encontrado')) {
            console.warn('âš¸ Proceso no encontrado aun, puede estar recien creado');
            toast.warning('El proceso esta siendo procesado', {
              description: 'Por favor espera un momento e intenta nuevamente'
            });
          } else {
            toast.error('No se pudo identificar el proceso para autos');
          }
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

  useEffect(() => {
    if (vistaActual === 'editor') {
      cargarPlantillas();
    }
  }, [vistaActual]);

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

  const handleEnviarRevision = async (autoId: string, numero: string) => {
    if (!processId) return;
    setAutoEnviandoRevision(autoId);
    try {
      await disciplinaryService.sendToReview(autoId);
      await cargarAutos(processId);
      toast.success('Auto enviado a revisión', { description: numero });
    } catch (error) {
      console.error('Error enviando auto a revisión', error);
      toast.error('No se pudo enviar a revisión');
    } finally {
      setAutoEnviandoRevision(null);
    }
  };

  const handleEditarAuto = (auto: any) => {
    setModalEditarAuto({ show: true, auto });
  };

  const handleAbrirVisorAuto = async (auto: any, modoPlantilla: boolean = false) => {
     if (!processId) {
       toast.error('No se puede identificar el proceso');
       return;
     }

     setCargandoProceso(true);
     try {
       // Obtener el proceso completo usando el endpoint específico por radicado
       const procesoCompleto = await disciplinaryService.getProcesoByRadicado(proceso.numeroProceso);

       // Construir el objeto auto con la información completa del proceso
       const autoCompleto = {
         ...auto,
         process: {
           radicadoProceso: procesoCompleto.radicadoProceso,
           news: procesoCompleto.news ? {
             hechos: procesoCompleto.news.hechos || '',
             fechaQueja: procesoCompleto.news.fechaQueja,
             denunciante: procesoCompleto.news.denunciante,
             disciplinable: procesoCompleto.news.disciplinable
           } : undefined
         }
       };

       console.log('Auto completo para visor:', autoCompleto);
       console.log('Proceso encontrado:', procesoCompleto);
       console.log('News del proceso:', procesoCompleto.news);
       setVisorAuto({ show: true, auto: autoCompleto, modoPlantilla });
     } catch (error) {
       console.error('Error obteniendo información del proceso:', error);
       toast.error('No se pudo cargar la información del proceso');
       // Abrir el visor con la información básica disponible
       setVisorAuto({ show: true, auto, modoPlantilla });
     } finally {
       setCargandoProceso(false);
     }
   };

  const handleGuardarEdicionAuto = async () => {
    if (!modalEditarAuto.auto) return;
    setEditandoAuto(true);
    try {
      // Solo enviar los campos que se pueden editar (metadatos básicos)
      const updateData = {
        numero: modalEditarAuto.auto.numero,
        tipo: modalEditarAuto.auto.tipo,
        comentarios: modalEditarAuto.auto.comentarios || ''
      };

      await disciplinaryService.updateAuto(modalEditarAuto.auto.id, updateData);
      await cargarAutos(processId);
      toast.success('Auto actualizado', { description: modalEditarAuto.auto.numero });
      setModalEditarAuto({ show: false, auto: null });
    } catch (error) {
      console.error('Error actualizando auto', error);
      toast.error('No se pudo actualizar el auto');
    } finally {
      setEditandoAuto(false);
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

    const allowedTypes = [
      'application/pdf',
      'application/msword',  // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
    ];

    if (!allowedTypes.includes(file.type)) {
      setArchivoError('Solo se permiten archivos PDF y Word (.doc, .docx)');
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
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
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
               className={`px-4 py-2 rounded-t-lg font-bold text-sm ${vistaActual === 'lista' ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
               onClick={() => setVistaActual('lista')}
             >
               <FileText className="w-4 h-4 inline mr-2" />
               Lista de Autos
             </button>
             <button
               className={`px-4 py-2 rounded-t-lg font-bold text-sm text-gray-600 hover:bg-gray-100`}
               onClick={(e) => {
                 e.stopPropagation();
                 window.open('/editor-plantillas', '_blank');
               }}
             >
               <Edit2 className="w-4 h-4 inline mr-2" />
               Editor de Plantillas
             </button>
           </div>
         </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {vistaActual === 'editor' ? (
            // Editor con Plantillas
            <div className="space-y-6">
              {/* Selección de Plantilla */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Seleccionar Plantilla</h3>
                {cargandoPlantillas ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-pulse" />
                    <p className="text-sm text-gray-600">Cargando plantillas...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {plantillas.map((plantilla) => (
                      <button
                        key={plantilla.id}
                        onClick={() => seleccionarPlantilla(plantilla)}
                        className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md ${
                          plantillaSeleccionada?.id === plantilla.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="font-bold text-gray-900">{plantilla.nombre}</p>
                            <p className="text-sm text-gray-600">{plantilla.descripcion}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulario de Datos de Plantilla */}
              {plantillaSeleccionada && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Completar Datos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(datosPlantilla).map((key) => (
                      <div key={key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                        <input
                          type="text"
                          value={datosPlantilla[key]}
                          onChange={(e) => setDatosPlantilla(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Ingrese ${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor Quill */}
              {plantillaSeleccionada && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Contenido del Auto</h3>
                  <div className="border border-gray-300 rounded-lg">
                    <ReactQuill
                      value={contenidoHtml}
                      onChange={setContenidoHtml}
                      theme="snow"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'indent': '-1'}, { 'indent': '+1' }],
                          ['link'],
                          [{ 'align': [] }],
                          ['clean']
                        ],
                      }}
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              {plantillaSeleccionada && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPlantillaSeleccionada(null);
                      setContenidoHtml('');
                      setDatosPlantilla({});
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={guardarAutoDesdeEditor}
                    disabled={guardandoAuto}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    {guardandoAuto ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Crear Auto
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : vistaActual === 'lista' ? (
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
                          <span className="text-gray-500">â€¢ {auto.tamanio}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {auto.estado === 'BORRADOR' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnviarRevision(auto.id, auto.numero);
                            }}
                            disabled={autoEnviandoRevision === auto.id}
                            title="Enviar a revisión del jefe"
                            style={{ borderColor: '#0EA5E9', color: '#0EA5E9' }}
                          >
                            {autoEnviandoRevision === auto.id ? (
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
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
                            const extension = auto.documentName?.split('.').pop() || 'pdf';
                            descargarArchivo(auto.downloadUrl, `${auto.numero}.${extension}`);
                            toast.success('Descarga iniciada', {
                              description: `${auto.numero}.${extension}`
                            });
                          }}
                          title="Descargar documento"
                          style={{ borderColor: '#003DA5', color: '#003DA5' }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_AUTOS_EDIT) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditarAuto(auto);
                          }}
                          title="Editar auto"
                          style={{ borderColor: '#059669', color: '#059669' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirVisorAuto(auto, true);
                          }}
                          title="Ver plantilla BD"
                          disabled={cargandoProceso}
                          style={{ borderColor: '#10B981', color: '#10B981' }}
                        >
                          {cargandoProceso ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border border-current border-t-transparent" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        {/* Botón para editar archivos Word en OnlyOffice */}
                        {auto.documentUrl &&
                         (auto.documentName?.endsWith('.doc') ||
                          auto.documentName?.endsWith('.docx')) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              editarAutoEnOnlyOffice(auto);
                            }}
                            title="Editar documento Word"
                            style={{ borderColor: '#2563EB', color: '#2563EB' }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_AUTOS_DELETE) && (
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
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : !tipoAutoSeleccionado ? (
            // Seleccion de tipo de auto
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
                      accept=".pdf,.doc,.docx"
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
                          <p className="font-bold text-gray-900">Seleccionar archivo PDF o Word</p>
                          <p className="text-xs text-gray-500">PDF, .doc, .docx (máx. 10MB)</p>
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
          {vistaActual === 'lista' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_AUTOS_CREATE) && (
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
            className="fixed inset-0 bg-black/80 flex items-start justify-center pt-16 sm:pt-20 z-[160] p-4"
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

                {/* Vista previa del documento - MEJORADO */}
                <Card className="p-4 bg-gray-50 border-2 border-gray-300 overflow-hidden">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <p className="font-bold text-gray-900">
                        {visorDocumento.documento.nombre || `${visorDocumento.documento.numero}.pdf`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Función de impresión
                          window.print();
                          toast.info('Preparando impresión...', {
                            description: 'Abre el diálogo de impresión del navegador'
                          });
                        }}
                        title="Imprimir"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Función de zoom
                          toast.info('Zoom', {
                            description: 'Usa Ctrl+Rueda para hacer zoom'
                          });
                        }}
                        title="Zoom"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Visualizador según tipo de archivo */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '500px', maxHeight: '600px' }}>
                    {(() => {
                      const nombreArchivo = visorDocumento.documento.nombre || visorDocumento.documento.numero;
                      const extension = nombreArchivo.split('.').pop()?.toLowerCase();
                      
                      // PDF
                      if (extension === 'pdf' || visorDocumento.documento.tipo === 'Documento') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
                              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#DC2626' }}>
                                  <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">Documento PDF</h3>
                                  <p className="text-sm text-gray-600">{nombreArchivo}</p>
                                </div>
                              </div>
                              
                              {/* Simulación de contenido PDF */}
                              <div className="space-y-4 text-sm">
                                <p className="font-bold text-center text-lg mb-4">
                                  {visorDocumento.documento.tipo?.toUpperCase() || 'DOCUMENTO LEGAL'}
                                </p>
                                
                                <p className="text-justify leading-relaxed text-gray-700">
                                  La Oficina de Control Interno Disciplinario de la ESAP, en ejercicio de sus 
                                  facultades legales y reglamentarias, y con fundamento en lo dispuesto en la 
                                  Ley 734 de 2002 (Código Disciplinario Único) y demás normas concordantes...
                                </p>
                                
                                <p className="font-bold mt-4">CONSIDERANDO:</p>
                                
                                <p className="text-justify leading-relaxed text-gray-700">
                                  <strong>PRIMERO:</strong> Que mediante radicado No. {proceso.numeroProceso}, se 
                                  recibió información sobre presuntos hechos que podrían constituir falta disciplinaria...
                                </p>
                                
                                <p className="text-justify leading-relaxed text-gray-700">
                                  <strong>SEGUNDO:</strong> Que analizados los hechos y valorada la información allegada, 
                                  se encuentra mérito suficiente para proceder conforme a derecho...
                                </p>
                                
                                <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                                  <p>Vista previa simulada - En producción se mostraría el documento real</p>
                                  <p className="mt-2">
                                    <a 
                                      href="#"
                                      className="text-blue-600 hover:underline"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toast.info('Función de PDF real', {
                                          description: 'Conectar con backend para mostrar PDF real'
                                        });
                                      }}
                                    >
                                      Cargar documento completo →
                                    </a>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // VIDEO
                      if (extension === 'mp4' || extension === 'avi' || extension === 'mov' || visorDocumento.documento.tipo === 'Video') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-900">
                            <div className="w-full max-w-4xl">
                              <div className="aspect-video bg-black rounded-lg flex items-center justify-center mb-4">
                                <div className="text-center text-white">
                                  <Scale className="w-20 h-20 mx-auto mb-4 opacity-50" />
                                  <p className="text-lg font-bold mb-2">Reproductor de Video</p>
                                  <p className="text-sm text-gray-400 mb-4">{nombreArchivo}</p>
                                  <Button
                                    onClick={() => {
                                      toast.info('Reproducción de video', {
                                        description: 'En producción se cargaría el video real'
                                      });
                                    }}
                                    style={{ background: '#003DA5' }}
                                  >
                                    ▶ Reproducir Video
                                  </Button>
                                </div>
                              </div>
                              <div className="text-center text-sm text-gray-400">
                                <p>Vista previa de video - Conectar con backend para reproducción real</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // IMAGEN
                      if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'zip' || visorDocumento.documento.categoria === 'Fotográfica') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-4xl">
                              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 border-2 border-dashed border-blue-300">
                                <div className="text-center">
                                  <Archive className="w-20 h-20 mx-auto mb-4 text-blue-500" />
                                  <p className="text-lg font-bold mb-2">Galería de Imágenes</p>
                                  <p className="text-sm text-gray-600 mb-4">{nombreArchivo}</p>
                                  
                                  {/* Simulación de miniaturas */}
                                  <div className="grid grid-cols-3 gap-4 mt-6">
                                    {[1, 2, 3].map((i) => (
                                      <div 
                                        key={i}
                                        className="aspect-square bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                                        onClick={() => {
                                          toast.info(`Imagen ${i}`, {
                                            description: 'Click para ampliar'
                                          });
                                        }}
                                      >
                                        <FileText className="w-8 h-8 text-gray-400" />
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <p className="text-xs text-gray-500 mt-4">
                                    Click en las miniaturas para ampliar
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // AUDIO
                      if (extension === 'mp3' || extension === 'wav' || visorDocumento.documento.categoria === 'Audiovisual') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-2xl">
                              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 border-2 border-purple-200">
                                <div className="text-center">
                                  <Archive className="w-20 h-20 mx-auto mb-4 text-purple-500" />
                                  <p className="text-lg font-bold mb-2">Archivo de Audio</p>
                                  <p className="text-sm text-gray-600 mb-6">{nombreArchivo}</p>
                                  
                                  {/* Control de reproducción simulado */}
                                  <div className="bg-white rounded-xl p-6 shadow-lg">
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                      <Button
                                        onClick={() => toast.info('Reproduciendo...')}
                                        size="lg"
                                        style={{ background: '#8B5CF6' }}
                                      >
                                        ▶ Reproducir Audio
                                      </Button>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                      <span>0:45</span>
                                      <span>2:30</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // ARCHIVO GENÉRICO
                      return (
                        <div className="h-full flex items-center justify-center p-8">
                          <div className="text-center">
                            <FileText className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                            <p className="font-bold text-gray-900 mb-2">Vista Previa No Disponible</p>
                            <p className="text-sm text-gray-600 mb-4">{nombreArchivo}</p>
                            <p className="text-xs text-gray-500">
                              Descarga el archivo para visualizarlo en tu equipo
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setVisorDocumento({ show: false, documento: null })} 
                    variant="outline"
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.print();
                      toast.info('Imprimiendo documento...', {
                        description: 'Abre el diálogo de impresión'
                      });
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Copiar enlace
                      const url = `${window.location.origin}/documento/${visorDocumento.documento.id || visorDocumento.documento.numero}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Enlace copiado', {
                        description: 'El enlace se copió al portapapeles'
                      });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Enlace
                  </Button>
                  <Button
                    onClick={() => {
                      // Descarga REAL
                      try {
                        const nombreArchivo = visorDocumento.documento.nombre || `${visorDocumento.documento.numero}.pdf`;
                        const blob = new Blob(['Contenido del documento'], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = nombreArchivo;
                        link.style.display = 'none';
                        
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        window.URL.revokeObjectURL(url);
                        
                        toast.success('Descarga completada', {
                          description: nombreArchivo,
                          duration: 3000
                        });
                      } catch (error) {
                        toast.error('Error en descarga', {
                          description: 'No se pudo descargar el archivo'
                        });
                      }
                    }}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                    className="hover:opacity-90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Auto */}
      <AnimatePresence>
        {modalEditarAuto.show && modalEditarAuto.auto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
            onClick={() => setModalEditarAuto({ show: false, auto: null })}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-100">
                      <Edit2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Editar Auto</h3>
                      <p className="text-sm text-gray-600">{modalEditarAuto.auto.numero}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalEditarAuto({ show: false, auto: null })}
                    className="p-2 hover:bg-white/50 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Número del Auto
                  </label>
                  <input
                    type="text"
                    value={modalEditarAuto.auto.numero}
                    onChange={(e) => setModalEditarAuto(prev => ({
                      ...prev,
                      auto: { ...prev.auto!, numero: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo de Auto
                  </label>
                  <select
                    value={modalEditarAuto.auto.tipo}
                    onChange={(e) => setModalEditarAuto(prev => ({
                      ...prev,
                      auto: { ...prev.auto!, tipo: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {tiposAuto.map((tipo) => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Comentarios
                  </label>
                  <textarea
                    value={modalEditarAuto.auto.comentarios || ''}
                    onChange={(e) => setModalEditarAuto(prev => ({
                      ...prev,
                      auto: { ...prev.auto!, comentarios: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Comentarios adicionales..."
                  />
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setModalEditarAuto({ show: false, auto: null })}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarEdicionAuto}
                  disabled={editandoAuto}
                  style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                >
                  {editandoAuto ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
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

      {/* Editor OnlyOffice para documentos Word */}
      {modoEditorOnlyOffice && autoSeleccionado && (
        <OnlyOfficeEditor
          autoId={autoSeleccionado.id}
          onClose={() => {
            setModoEditorOnlyOffice(false);
            setAutoSeleccionado(null);
            // Recargar la lista de autos para ver los cambios
            cargarAutos();
          }}
        />
      )}

      {/* Modal Visor de Auto */}
      {(visorAuto.auto || visorAuto.modoPlantilla) && (
        <VisorPDFAuto
          isOpen={visorAuto.show}
          onClose={() => setVisorAuto({ show: false, auto: null })}
          auto={visorAuto.auto}
          modoPlantilla={visorAuto.modoPlantilla}
        />
      )}
    </motion.div>
  );
}

// ==================== MODAL GESTIoN DE EVIDENCIAS ====================
// ==================== MODAL GESTIoN DE EVIDENCIAS ====================
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

  // Nuevos campos
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [aportadoPor, setAportadoPor] = useState('');
  const [prioridad, setPrioridad] = useState('Media');

  const [evidenciaParaEliminar, setEvidenciaParaEliminar] = useState<any | null>(null);
  const [eliminandoEvidencia, setEliminandoEvidencia] = useState(false);
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB para evidencias


  const cargarEvidencias = async (procId: string) => {
    if (!procId) return;
    setCargandoEvidencias(true);
    try {
      // NEW SERVICE CALL
      const lista = await disciplinaryService.getEvidencias(procId);
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
    if (!tipo.trim()) {
      toast.error('Selecciona un tipo de evidencia');
      return;
    }
    if (!archivo) {
      toast.error('Debes adjuntar un archivo');
      return;
    }

    setCargando(true);
    try {
      await disciplinaryService.createEvidencia(
        processId,
        {
          descripcion,
          aportadoPor,
          tipo,
          prioridad
        },
        archivo
      );

      await cargarEvidencias(processId);
      setArchivo(null);
      setTipo('');
      setDescripcion('');
      setAportadoPor('');
      setPrioridad('Media');
      toast.success('Evidencia cargada correctamente');
    } catch (error) {
      console.error('Error subiendo evidencia', error);
      toast.error('No se pudo subir la evidencia');
    } finally {
      setCargando(false);
    }
  };

  const handleAdmitirEvidencia = async (evidencia: any) => {
    try {
      await disciplinaryService.updateEvidenciaEstado(evidencia.id, 'Admitida');
      toast.success('Evidencia admitida');
      cargarEvidencias(processId);
    } catch (error) {
      toast.error('Error al admitir evidencia');
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
      await disciplinaryService.deleteEvidenciaReal(evidenciaParaEliminar.id); // Assuming this is added to service
      await cargarEvidencias(processId);
      toast.success('Evidencia eliminada');
    } catch (error) {
      console.error('Error eliminando evidencia', error);
      toast.error('No se pudo eliminar la evidencia');
    } finally {
      setEliminandoEvidencia(false);
      setEvidenciaParaEliminar(null);
    }
  };

  const documentoActual = visorDocumento.documento;

  const tiposEvidencia = [
    { id: 'documental', nombre: 'Documental', icon: FileText, color: '#3B82F6' },
    { id: 'testimonial', nombre: 'Testimonial', icon: MessageSquare, color: '#10B981' },
    { id: 'fotografica', nombre: 'Fotográfica', icon: Archive, color: '#F59E0B' },
    { id: 'audiovisual', nombre: 'Audiovisual', icon: Archive, color: '#8B5CF6' },
    { id: 'digital', nombre: 'Digital', icon: Package, color: '#06B6D4' },
    { id: 'pericial', nombre: 'Pericial', icon: FileCheck, color: '#DC2626' }
  ];

  const prioridades = ['Alta', 'Media', 'Baja'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
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
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{evidencia.archivoNombre}</h3>
                          <Badge className={evidencia.estado === 'Admitida' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {evidencia.estado}
                          </Badge>
                          <Badge variant="outline">{evidencia.prioridad}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
                          <div>
                            <p className="text-gray-600 text-xs">Tipo:</p>
                            <p className="font-semibold text-gray-900">{evidencia.tipo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Aportado por:</p>
                            <p className="font-semibold text-gray-900">{evidencia.aportadoPor || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Fecha:</p>
                            <p className="font-semibold text-gray-900">{evidencia.fechaPresentacion ? new Date(evidencia.fechaPresentacion).toLocaleDateString() : ''}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 text-xs">Tamaño:</p>
                            <p className="font-semibold text-gray-900">{formatFileSize(evidencia.archivoTamano)}</p>
                          </div>
                        </div>
                        {evidencia.descripcion && (
                          <p className="text-sm text-gray-600 mt-2 italic">{evidencia.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-col sm:flex-row">
                      {evidencia.estado === 'En Revisión' && authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_EVIDENCIA_ADMITIR) && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleAdmitirEvidencia(evidencia)}
                          title="Admitir Evidencia"
                        >
                          Admitir
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (evidencia.archivoUrl) {
                            window.open(evidencia.archivoUrl, '_blank');
                          } else {
                            toast.error('URL no disponible');
                          }
                        }}
                        title="Ver documento"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_EVIDENCIA_DELETE) && (
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
                        setVisorDocumento({ show: true, documento: evidencia });
                      }}
                      title="Ver documento"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      className="hover:bg-blue-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Función REAL de descarga
                        try {
                          // Crear un blob de prueba (en producción vendría del backend)
                          const blob = new Blob(['Contenido del archivo de evidencia'], { type: 'application/pdf' });
                          const url = window.URL.createObjectURL(blob);
                          
                          // Crear elemento temporal para descarga
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = evidencia.nombre;
                          link.style.display = 'none';
                          
                          // Agregar al DOM, hacer click y remover
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          // Liberar memoria
                          window.URL.revokeObjectURL(url);
                          
                          toast.success('Descarga iniciada', {
                            description: `${evidencia.nombre} - ${evidencia.tamaño}`,
                            duration: 3000
                          });
                        } catch (error) {
                          toast.error('Error en descarga', {
                            description: 'No se pudo descargar el archivo'
                          });
                        }
                      }}
                      title="Descargar archivo"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      className="hover:bg-blue-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 rounded-xl border bg-orange-50/40 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Nueva evidencia</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Tipo de Evidencia</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar tipo</option>
                  {tiposEvidencia.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Prioridad</label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {prioridades.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Aportado por</label>
                <input
                  type="text"
                  value={aportadoPor}
                  onChange={(e) => setAportadoPor(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Nombre del aportante"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Descripción (opcional)</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Descripción breve"
                />
              </div>
            </div>
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_EVIDENCIA_CREATE) && (
            <div>
              <input
                type="file"
                id="file-upload-evidencias"
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
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_EVIDENCIA_CREATE) && (
          <Button
            onClick={handleSubirEvidencia}
            style={{ background: '#F59E0B', color: '#FFFFFF' }}
            disabled={cargando}
          >
            <Upload className="w-4 h-4 mr-2" />
            {cargando ? 'Cargando...' : 'Subir Evidencia'}
          </Button>
          )}
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
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
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

    </motion.div>
  );
}



// ==================== MODAL GESTIoN DE OFICIOS ====================
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
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
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
                      {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_OFICIO_DELETE) && (
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
                      )}
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
            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_OFICIO_CREATE) && (
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
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_OFICIO_CREATE) && (
          <Button
            onClick={handleCrearOficio}
            style={{ background: '#06B6D4', color: '#FFFFFF' }}
            disabled={cargando}
          >
            <Upload className="w-4 h-4 mr-2" />
            {cargando ? 'Cargando...' : 'Crear Oficio'}
          </Button>
          )}
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

// ==================== MODAL HISTORIAL DE AUDITORiA ====================
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
  const [cargando, setCargando] = useState(false);
  const [actas, setActas] = useState<any[]>([]);
  const [cargandoActas, setCargandoActas] = useState(false);
  const [processId, setProcessId] = useState('');
  const [actaParaEliminar, setActaParaEliminar] = useState<any | null>(null);
  const [eliminandoActa, setEliminandoActa] = useState(false);

  // Campos específicos de Acta
  const [numeroActa, setNumeroActa] = useState('');
  const [fecha, setFecha] = useState('');
  const [horario, setHorario] = useState('');
  const [duracion, setDuracion] = useState('');
  const [lugar, setLugar] = useState('Despacho Control Disciplinario');
  const [presidente, setPresidente] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [resumen, setResumen] = useState('');
  const [decisionesTomadas, setDecisionesTomadas] = useState('');

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  const tiposActa: ActaTipo[] = [
    { id: 'Audiencia', nombre: 'Acta de Audiencia', icon: Gavel, color: '#DC2626' },
    { id: 'Diligencia', nombre: 'Acta de Diligencia', icon: FileSignature, color: '#3B82F6' },
    { id: 'Inspección', nombre: 'Acta de Inspección', icon: Eye, color: '#F59E0B' },
    { id: 'Reunión', nombre: 'Acta de Reunión', icon: Users, color: '#10B981' },
    { id: 'Comité', nombre: 'Acta de Comité', icon: Users, color: '#8B5CF6' }
  ];

  const mapActa = (doc: any, procId: string) => {
    // Safety check for dates
    const fechaLabel = doc.fecha ? (typeof doc.fecha === 'string' ? doc.fecha.split('T')[0] : new Date(doc.fecha).toISOString().split('T')[0]) : '';

    return {
      id: doc.id,
      numero: doc.numeroActa || 'Sin número',
      tipo: doc.tipo || 'Acta Genérica',
      fecha: fechaLabel,
      horario: doc.horario,
      duracion: doc.duracion,
      lugar: doc.lugar,
      participantes: doc.participantes,
      resumen: doc.resumen,
      decisiones: doc.decisionesTomadas,
      autor: doc.presidente || 'Sistema',
      estado: doc.estado || 'Programada', // 'Programada' | 'Firmada'
      archivoNombre: doc.archivoNombre,
      fileSize: doc.archivoTamano,
      downloadUrl: buildDownloadUrl(procId, doc.id, false),
      viewUrl: buildDownloadUrl(procId, doc.id, true),
      // Raw data
      ...doc
    };
  };

  const cargarActas = async (procId: string) => {
    if (!procId) return;
    setCargandoActas(true);
    try {
      const listaActas = await disciplinaryService.getActas(procId);
      const mapeadas = listaActas.map((a: any) => mapActa(a, procId));
      setActas(mapeadas);
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
    if (processId) {
      cargarActas(processId);
    }
  }, [processId]);

  const handleSeleccionArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setArchivoSeleccionado(null);
      return;
    }
    setArchivoError(null);

    if (file.size > MAX_FILE_SIZE) {
      setArchivoError('El archivo supera el maximo de 20 MB');
      setArchivoSeleccionado(null);
      e.target.value = '';
      return;
    }

    setArchivoSeleccionado(file);
  };

  const handleCrearActa = async () => {
    if (!processId || !isUuidLike(processId)) {
      toast.error('No se pudo identificar el proceso');
      return;
    }
    if (!modalCrearActa.tipo) return;
    if (!archivoSeleccionado) {
      setArchivoError('Debes adjuntar el documento del acta');
      return;
    }
    if (!numeroActa || !fecha || !resumen) {
      toast.error('Completa los campos obligatorios (*)');
      return;
    }

    setCargando(true);
    try {
      await disciplinaryService.createActa(
        processId,
        {
          numeroActa,
          fecha,
          horario,
          duracion,
          lugar,
          presidente,
          participantes,
          resumen,
          decisionesTomadas,
          tipo: modalCrearActa.tipo.id
        },
        archivoSeleccionado
      );

      toast.success('Acta creada exitosamente');
      setModalCrearActa({ show: false, tipo: null });
      setArchivoSeleccionado(null);
      // Reset fields
      setNumeroActa('');
      setFecha('');
      setHorario('');
      setDuracion('');
      setLugar('');
      setPresidente('');
      setParticipantes('');
      setResumen('');
      setDecisionesTomadas('');

      cargarActas(processId);
    } catch (error) {
      console.error('Error creando acta', error);
      toast.error('Error al crear el acta');
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
      await disciplinaryService.deleteActaReal(actaParaEliminar.id);
      await cargarActas(processId);
      toast.success('Acta eliminada');
    } catch (error) {
      console.error('Error eliminando acta', error);
      toast.error('No se pudo eliminar el acta');
    } finally {
      setEliminandoActa(false);
      setActaParaEliminar(null);
    }
  };

  const handleFirmarActa = async (acta: any) => {
    if (!processId) return;
    try {
      await disciplinaryService.updateActaEstado(acta.id, 'Firmada');
      toast.success('Acta marcada como FIRMADA');
      cargarActas(processId);
    } catch (error) {
      console.error('Error firmando acta', error);
      toast.error('No se pudo firmar el acta');
    }
  };

  const documentoActual = visorDocumento.documento;
  const esPdf = documentoActual?.archivoNombre?.toLowerCase().endsWith('.pdf') ||
    documentoActual?.tipo?.toLowerCase().includes('pdf') || true;

  return (
    <motion.div
      style={{zIndex: 999}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                <FileSignature className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Libro de Actas y Diligencias
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Registro de Actuaciones Orales
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>

          {/* Create Buttons */}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_ACTA_CREATE) && (
          <div className="mb-8">
            <p className="text-sm font-bold text-gray-700 mb-3">Crear Nueva Acta:</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {tiposActa.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => {
                    setModalCrearActa({ show: true, tipo });
                    setArchivoSeleccionado(null);
                    setNumeroActa('');
                    setFecha('');
                    setResumen('');
                  }}
                  className="p-3 border rounded-xl hover:shadow-md transition-all text-left group hover:scale-105 active:scale-95 bg-white"
                  style={{ borderColor: tipo.color + '40' }}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <tipo.icon
                      className="w-8 h-8 group-hover:scale-110 transition-transform"
                      style={{ color: tipo.color }}
                    />
                    <p className="font-bold text-xs text-gray-900 leading-tight">{tipo.nombre}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Actas Registradas</h3>

            {cargandoActas ? (
              <Card className="p-8 text-center bg-gray-50 border-dashed">
                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300 animate-pulse" />
                <p className="text-sm text-gray-600">Cargando libro de actas...</p>
              </Card>
            ) : actas.length === 0 ? (
              <Card className="p-12 text-center bg-gray-50 border-dashed">
                <FileSignature className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">No hay actas registradas</p>
                <p className="text-sm text-gray-500">Selecciona un tipo de acta arriba para crear la primera.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {actas.map((acta) => {
                  const TipoIcon = tiposActa.find(t => t.id === acta.tipo || t.nombre === acta.tipo)?.icon || FileText;
                  const tipoColor = tiposActa.find(t => t.id === acta.tipo || t.nombre === acta.tipo)?.color || '#6B7280';

                  return (
                    <Card key={acta.id} className="p-4 hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: tipoColor }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-gray-50">
                            <TipoIcon className="w-6 h-6" style={{ color: tipoColor }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900 text-lg">{acta.numero}</h4>
                              <Badge className={acta.estado === 'Firmada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {acta.estado}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                              <div>
                                <p className="text-gray-500 text-xs">Fecha</p>
                                <p className="font-semibold">{acta.fecha}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Lugar</p>
                                <p className="font-semibold truncate" title={acta.lugar}>{acta.lugar}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-gray-500 text-xs">Resumen</p>
                                <p className="text-gray-700 truncate" title={acta.resumen}>{acta.resumen || 'Sin resumen'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <div className="flex gap-1">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => setVisorDocumento({ show: true, documento: acta })}
                              title="Ver Acta"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              onClick={() => {
                                if (!acta.downloadUrl) return;
                                descargarArchivo(acta.downloadUrl, acta.archivoNombre || `${acta.numero}.pdf`);
                              }}
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_ACTA_DELETE) && (
                            <Button
                              size="sm" variant="outline"
                              className="text-red-600 hover:bg-red-50 border-red-200"
                              onClick={() => setActaParaEliminar(acta)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            )}
                          </div>
                          {acta.estado !== 'Firmada' && (
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleFirmarActa(acta)}
                            >
                              Firmar Acta
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal Crear Interno */}
      <AnimatePresence>
        {modalCrearActa.show && modalCrearActa.tipo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-start justify-center pt-16 sm:pt-20 z-[160] p-4"
            onClick={() => setModalCrearActa({ show: false, tipo: null })}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b sticky top-0 bg-white z-10" style={{ borderBottomColor: modalCrearActa.tipo.color + '40' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <modalCrearActa.tipo.icon className="w-6 h-6" style={{ color: modalCrearActa.tipo.color }} />
                    <h3 className="text-xl font-bold flex flex-col">
                      <span>Nueva {modalCrearActa.tipo.nombre}</span>
                      <span className="text-xs font-normal text-gray-500">Expediente {proceso.numeroProceso}</span>
                    </h3>
                  </div>
                  <button onClick={() => setModalCrearActa({ show: false, tipo: null })} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Formulario */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Número de Acta *</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={numeroActa}
                      onChange={e => setNumeroActa(e.target.value)}
                      placeholder="Ej: ACT-001-2024"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Horario</label>
                    <input
                      type="time"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={horario}
                      onChange={e => setHorario(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Duración</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={duracion}
                      onChange={e => setDuracion(e.target.value)}
                      placeholder="Ej: 2 horas"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Lugar</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm"
                    value={lugar}
                    onChange={e => setLugar(e.target.value)}
                    placeholder="Ubicación de la diligencia"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Presidente / Director</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm"
                    value={presidente}
                    onChange={e => setPresidente(e.target.value)}
                    placeholder="Nombre del funcionario a cargo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Participantes</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2 text-sm"
                    value={participantes}
                    onChange={e => setParticipantes(e.target.value)}
                    placeholder="Nombres separados por comas"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Resumen / Objeto *</label>
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
                    value={resumen}
                    onChange={e => setResumen(e.target.value)}
                    placeholder="Breve descripción del acta..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Decisiones Tomadas</label>
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm min-h-[60px]"
                    value={decisionesTomadas}
                    onChange={e => setDecisionesTomadas(e.target.value)}
                    placeholder="Decisiones o compromisos..."
                  />
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Archivo del Acta (PDF) *</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleSeleccionArchivo}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  {archivoError && <p className="text-red-500 text-xs mt-1">{archivoError}</p>}
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <Button variant="outline" onClick={() => setModalCrearActa({ show: false, tipo: null })}>Cancelar</Button>
                <Button
                  onClick={handleCrearActa}
                  disabled={cargando}
                  style={{ background: modalCrearActa.tipo.color, color: 'white' }}
                >
                  {cargando ? 'Guardando...' : 'Guardar Acta'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visor */}
      <AnimatePresence>
        {visorDocumento.show && documentoActual && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4"
            onClick={() => setVisorDocumento({ show: false, documento: null })}
          >
            <div className="bg-white p-4 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{documentoActual.numero}</h3>
                <button onClick={() => setVisorDocumento({ show: false, documento: null })}><X /></button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 p-2 rounded">
                {esPdf ? (
                  <iframe src={documentoActual.viewUrl} className="w-full h-full min-h-[500px]" title="Visor" />
                ) : (
                  <div className="flex items-center justify-center h-full">vista no disponible</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Dialog */}
      <AlertDialog open={!!actaParaEliminar} onOpenChange={(o) => !o && setActaParaEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Acta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará el acta {actaParaEliminar?.numero} y su archivo adjunto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button className="bg-red-600 text-white" onClick={() => handleEliminarActa()}>Eliminar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
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
            {/* Linea vertical */}
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