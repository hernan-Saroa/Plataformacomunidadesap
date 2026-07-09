/**
 * Página Pública para Visualizar Expediente Compartido
 * Esta página es accesible públicamente sin necesidad de autenticación
 * Permite ver un expediente disciplinario compartido mediante un token
 */

import { useState, useEffect, use } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Clock, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Lock,
  Unlock,
  ArrowLeft,
  ExternalLink,
  Play,
  User,
  Scale,
  Building
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import disciplinaryService from '../services/api/disciplinary.service';
import { API_MODE, buildApiUrl } from '../config/environment';
import * as mammoth from 'mammoth';
import { useIsMobile } from '../hooks/useIsMobile';

// Tipos
interface ExpedienteCompartidoData {
  token: string;
  requiereClave: boolean;
  fechaExpiracionEnlace: string | null;
  proceso: {
    id: string;
    radicado: string;
    etapaActual: string;
    estado: string;
    fechaVencimientoEtapa: string;
    news?: {
      disciplinable?: {
        nombre: string;
        cargo: string;
        dependencia?: string;
      };
    };
  };
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  etapa: string;
  version: number;
  tamaño: string;
  fechaCarga: string;
  usuarioCarga: string;
  descripcion: string;
  url?: string;
  urlExterna?: string;
  downloadUrl?: string;
  archivoNombre?: string;
  fileType?: string;
  processId?: string;
  metadatos: {
    firmado?: boolean;
    notificado?: boolean;
    folios?: number;
  };
}

type FilePreviewType = 'pdf' | 'video' | 'audio' | 'image' | 'document' | 'spreadsheet' | 'html' | 'other';

export function ExpedienteCompartidoPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [verificandoClave, setVerificandoClave] = useState(false);
  const [expedienteData, setExpedienteData] = useState<ExpedienteCompartidoData | null>(null);
  const [claveIngresada, setClaveIngresada] = useState('');
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [showModalVisor, setShowModalVisor] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [cargandoPDF, setCargandoPDF] = useState(false);
  const [errorPDF, setErrorPDF] = useState<string | null>(null);
  const [esDocumentoConvertido, setEsDocumentoConvertido] = useState(false);

  // Cargar datos iniciales del expediente
  useEffect(() => {
    const cargarExpediente = async () => {
      if (!token) {
        setErrorAcceso('Token de acceso no válido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await disciplinaryService.obtenerExpedientePublico(token);
        setExpedienteData(data);
        
        // Si no requiere clave, cargar los documentos directamente
        if (!data.requiereClave) {
          await cargarDocumentos(token);
        }
      } catch (error: any) {
        console.error('Error al cargar expediente:', error);
        if (error.message?.includes('401') || error.message?.includes('403')) {
          setErrorAcceso('El enlace ha expirado o no es válido');
        } else if (error.message?.includes('404')) {
          setErrorAcceso('El expediente compartido no existe');
        } else {
          setErrorAcceso('Error al cargar el expediente. Intente más tarde.');
        }
      } finally {
        setLoading(false);
      }
    };

    cargarExpediente();
  }, [token]);

  // Cargar documentos del expediente compartido
  const cargarDocumentos = async (token: string) => {
    try {
      setCargandoDocumentos(true);
      const respuesta = await disciplinaryService.obtenerDocumentosExpedienteCompartido(token);

      if (respuesta && respuesta.documentos) {
        setDocumentos(respuesta.documentos as Documento[]);
      }
    } catch (error: any) {
      console.error('Error al cargar documentos:', error);
      toast.error('Error al cargar documentos', {
        description: 'No se pudieron cargar los documentos del expediente'
      });
    } finally {
      setCargandoDocumentos(false);
    }
  };

  // Verificar acceso con clave
  const verificarClave = async () => {
    if (!token || !claveIngresada) {
      toast.error('Ingrese la clave de acceso');
      return;
    }

    try {
      setVerificandoClave(true);
      const result = await disciplinaryService.verificarAccesoCompartido(token, claveIngresada);
      
      if (result.tieneAcceso) {
        // Volver a cargar los datos del expediente
        const data = await disciplinaryService.obtenerExpedientePublico(token);
        setExpedienteData(data);
        await cargarDocumentos(token);
        setErrorAcceso(null);
      } else {
        setErrorAcceso('Clave de acceso incorrecta');
      }
    } catch (error: any) {
      console.error('Error al verificar clave:', error);
      setErrorAcceso('Error al verificar la clave. Intente más tarde.');
    } finally {
      setVerificandoClave(false);
    }
  };

  // Detectar si es dispositivo móvil
  // const isMobile = () => {
  //   return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // };

  const getDocumentoFileName = (doc: Documento): string => {
    return doc.archivoNombre || doc.nombre || doc.downloadUrl || doc.url || doc.urlExterna || 'documento';
  };

  const getFileType = (filename: string, mimeType?: string): FilePreviewType => {
    const mime = (mimeType || '').toLowerCase();
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return 'spreadsheet';
    if (mime.includes('html')) return 'html';
    if (mime.includes('wordprocessingml') || mime.includes('msword') || mime.startsWith('text/')) return 'document';

    const ext = filename.toLowerCase().split('?')[0].split('#')[0].split('.').pop() || '';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(ext)) return 'document';
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return 'spreadsheet';
    if (['html', 'htm'].includes(ext)) return 'html';
    return 'other';
  };

  const getFileTypeIconColor = (filename: string, mimeType?: string): string => {
    const colors: Record<FilePreviewType, string> = {
      pdf: '#DC2626',
      video: '#7C3AED',
      audio: '#DB2777',
      image: '#059669',
      document: '#2563EB',
      spreadsheet: '#059669',
      html: '#0891B2',
      other: '#6B7280'
    };
    return colors[getFileType(filename, mimeType)];
  };

  const getFileTypeDisplayName = (filename: string, mimeType?: string): string => {
    const names: Record<FilePreviewType, string> = {
      pdf: 'PDF',
      video: 'Video',
      audio: 'Audio',
      image: 'Imagen',
      document: 'Documento',
      spreadsheet: 'Hoja de cálculo',
      html: 'HTML',
      other: 'Archivo'
    };
    return names[getFileType(filename, mimeType)];
  };

  const isDocxFile = (doc: Documento, mimeType?: string): boolean => {
    const filename = getDocumentoFileName(doc).toLowerCase();
    const mime = (mimeType || doc.fileType || '').toLowerCase();
    return filename.split('?')[0].endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  };

  const buildControlApiUrl = (path: string): string => {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    normalizedPath = normalizedPath.replace(/^\/control-disciplinario\/api\/v1/, '/api/v1');

    if (API_MODE === 'direct') {
      normalizedPath = normalizedPath.replace(/^\/api\/v1/, '') || '/';
    } else if (!normalizedPath.startsWith('/api/v1')) {
      normalizedPath = `/api/v1${normalizedPath}`;
    }

    return buildApiUrl('control-disciplinario', normalizedPath);
  };

  const appendViewParam = (url: string): string => {
    if (!/\/download(?:\?|$)/.test(url) || /[?&]view=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}view=true`;
  };

  const resolveDocumentoUrl = (doc: Documento, forViewer = false): string => {
    const rawUrl = doc.downloadUrl || doc.url || doc.urlExterna;

    if (rawUrl) {
      if (/^https?:\/\//i.test(rawUrl)) {
        return forViewer ? appendViewParam(rawUrl) : rawUrl;
      }

      const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      const isApiPath =
        path.startsWith('/control-disciplinario/api/v1') ||
        path.startsWith('/api/v1') ||
        path.startsWith('/disciplinary-') ||
        path.startsWith('/compartir-expediente/');

      if (isApiPath) {
        const apiUrl = buildControlApiUrl(path);
        return forViewer ? appendViewParam(apiUrl) : apiUrl;
      }

      return disciplinaryService.getAbsoluteFileUrl(path);
    }

    const processId = doc.processId || expedienteData?.proceso?.id;
    if (processId) {
      const restPath = `/disciplinary-processes/${processId}/documents/${doc.id}/download`;
      const apiUrl = buildControlApiUrl(restPath);
      return forViewer ? appendViewParam(apiUrl) : apiUrl;
    }

    if (!token) {
      throw new Error('Token de acceso no válido');
    }

    const sharedPath = `/compartir-expediente/documento/${token}/${doc.id}/download`;
    const sharedUrl = buildControlApiUrl(sharedPath);
    return forViewer ? appendViewParam(sharedUrl) : sharedUrl;
  };

  // Ver documento
  const handleVerDocumento = async (doc: Documento) => {
    if (!token || !doc.id) {
      toast.error('Información del documento incompleta');
      return;
    }

    setDocumentoSeleccionado(doc);
    setShowModalVisor(true);
    setPdfBlobUrl(null);
    setCargandoPDF(true);
    setErrorPDF(null);
    setEsDocumentoConvertido(false);

    try {
      const downloadUrl = resolveDocumentoUrl(doc, true);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // En móviles, abrir archivos pesados de audio/video en nueva pestaña.
      const previewType = getFileType(getDocumentoFileName(doc), blob.type || doc.fileType);
      if (isMobile && (previewType === 'video' || previewType === 'audio')) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        setShowModalVisor(false);
        toast.info('Documento abierto en nueva pestaña');
        return;
      }

      // Check if it's a DOCX file and convert to HTML for display
      if (isDocxFile(doc, blob.type)) {
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
          setPdfBlobUrl(url);
          setEsDocumentoConvertido(true);
        } catch (conversionError) {
          console.error('Error converting DOCX to HTML:', conversionError);
          // Fallback to original blob
          const url = window.URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        setEsDocumentoConvertido(false);
      }
    } catch (error: any) {
      console.error('Error al cargar documento:', error);
      setErrorPDF(error.message || 'No se pudo cargar el documento');
      toast.error('No se pudo cargar el documento');
    } finally {
      setCargandoPDF(false);
    }
  };

  // Descargar documento
  const handleDescargarDocumento = async (doc: Documento) => {
    try {
      if (!token || !doc.id) {
        toast.error('Información del documento incompleta');
        return;
      }

      toast.loading('Descargando documento...', { id: 'download' });

      const downloadUrl = resolveDocumentoUrl(doc, false);

      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = getDocumentoFileName(doc);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Descarga completada', {
        id: 'download',
        description: doc.nombre
      });
    } catch (error: any) {
      toast.error('Error al descargar', {
        id: 'download',
        description: error.message || 'No se pudo descargar el documento'
      });
    }
  };

  // Obtener color según tipo de documento
  const getFileTypeColor = (nombreArchivo: string): { bg: string; icon: string } => {
    const nombre = nombreArchivo.toLowerCase();
    if (nombre.endsWith('.pdf')) return { bg: '#FEE2E2', icon: '#DC2626' };
    if (nombre.endsWith('.doc') || nombre.endsWith('.docx')) return { bg: '#DBEAFE', icon: '#2563EB' };
    if (nombre.endsWith('.xls') || nombre.endsWith('.xlsx')) return { bg: '#D1FAE5', icon: '#059669' };
    return { bg: '#FEF3C7', icon: '#F59E0B' };
  };

  // Estado del proceso
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return { bg: '#D1FAE5', color: '#059669', text: 'Activo' };
      case 'SUSPENDIDO':
        return { bg: '#FEF3C7', color: '#D97706', text: 'Suspendido' };
      case 'ARCHIVADO':
        return { bg: '#DBEAFE', color: '#2563EB', text: 'Archivado' };
      case 'PRESCRITO':
        return { bg: '#FEE2E2', color: '#DC2626', text: 'Prescrito' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: estado };
    }
  };

  // Renderizado
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
          <p className="text-lg font-semibold text-gray-700">Cargando expediente...</p>
        </div>
      </div>
    );
  }

  if (errorAcceso && !expedienteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">{errorAcceso}</p>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-[#003DA5] hover:bg-[#002870]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  // Si requiere clave y no se ha verificado
  if (expedienteData?.requiereClave && !documentos.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Protegido</h1>
            <p className="text-gray-600">
              Este expediente requiere una clave de acceso para poder verlo.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave de Acceso
              </label>
              <input
                type="password"
                value={claveIngresada}
                onChange={(e) => setClaveIngresada(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verificarClave()}
                placeholder="Ingrese la clave proporcionada"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#003DA5]"
              />
            </div>

            {errorAcceso && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700">{errorAcceso}</p>
              </div>
            )}

            <Button
              onClick={verificarClave}
              disabled={verificandoClave || !claveIngresada}
              className="w-full bg-[#003DA5] hover:bg-[#002870]"
            >
              {verificandoClave ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Acceder al Expediente
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const estadoBadge = expedienteData ? getEstadoBadge(expedienteData.proceso.estado) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0056D6] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8" />
                <h1 className="text-2xl font-bold">Expediente Disciplinario Compartido</h1>
              </div>
              <p className="text-blue-100">
                Visualización pública de proceso disciplinario
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
              className="bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Información del Proceso */}
        {expedienteData && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Scale className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {expedienteData.proceso.radicado}
                  </h2>
                  {estadoBadge && (
                    <Badge 
                      className="mt-1"
                      style={{ backgroundColor: estadoBadge.bg, color: estadoBadge.color }}
                    >
                      {estadoBadge.text}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Etapa Actual</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {expedienteData.proceso.etapaActual || 'Sin etapa'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Vencimiento del Enlace</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {expedienteData.fechaExpiracionEnlace
                    ? new Date(expedienteData.fechaExpiracionEnlace).toLocaleDateString('es-CO')
                    : 'Sin expiración'
                  }
                </p>
              </div>

              {expedienteData.proceso.news?.disciplinable && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Investigado</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {expedienteData.proceso.news.disciplinable.nombre}
                  </p>
                </div>
              )}

              {expedienteData.proceso.news?.disciplinable?.cargo && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Building className="w-4 h-4" />
                    <span className="text-sm font-medium">Cargo</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {expedienteData.proceso.news.disciplinable.cargo}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documentos */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Documentos del Expediente
              <Badge className="ml-2 bg-blue-100 text-blue-700">
                {documentos.length}
              </Badge>
            </h3>
          </div>

          {cargandoDocumentos ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando documentos...</p>
            </div>
          ) : documentos.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No hay documentos en este expediente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Etapa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documentos.map((doc) => {
                    const colors = getFileTypeColor(doc.nombre);
                    const fileName = getDocumentoFileName(doc);
                    const previewType = getFileType(fileName, doc.fileType);
                    const previewColor = getFileTypeIconColor(fileName, doc.fileType);
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: colors.bg }}
                            >
                              <FileText className="w-5 h-5" style={{ color: colors.icon }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{doc.nombre}</p>
                              <p className="text-xs text-gray-500">{doc.tamaño}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge>{doc.tipo}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {doc.etapa}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {doc.metadatos.firmado && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                ✓ Firmado
                              </Badge>
                            )}
                            {doc.metadatos.notificado && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                ✓ Notificado
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleVerDocumento(doc)}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              title={`Ver ${getFileTypeDisplayName(fileName, doc.fileType)}`}
                            >
                              {previewType === 'video' || previewType === 'audio' ? (
                                <Play className="w-4 h-4 mr-1" style={{ color: previewColor }} />
                              ) : (
                                <Eye className="w-4 h-4 mr-1" style={{ color: previewColor }} />
                              )}
                              Ver
                            </Button>
                            <Button
                              onClick={() => handleDescargarDocumento(doc)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer informativo */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Este es un acceso compartido al expediente disciplinario. 
            Para más información, contacte con la Oficina de Control Interno Disciplinario de la ESAP.
          </p>
        </div>
      </div>

      {/* Modal Visor de Documento */}
      {showModalVisor && documentoSeleccionado && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowModalVisor(false); setPdfBlobUrl(null); setEsDocumentoConvertido(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col" style={{ height: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {documentoSeleccionado.nombre}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {esDocumentoConvertido
                      ? 'Documento Word convertido'
                      : getFileTypeDisplayName(getDocumentoFileName(documentoSeleccionado), documentoSeleccionado.fileType)}
                    {' '}• Versión {documentoSeleccionado.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pdfBlobUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(pdfBlobUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Nueva pestaña
                    </Button>
                  )}
                  <button
                    onClick={() => { setShowModalVisor(false); setPdfBlobUrl(null); setEsDocumentoConvertido(false); }}
                    className="p-2 hover:bg-gray-200 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Visor */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {cargandoPDF && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                    <p className="text-gray-600">Cargando documento...</p>
                  </div>
                </div>
              )}

              {errorPDF && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold mb-2">Error al cargar el documento</p>
                    <p className="text-sm text-gray-600 mb-4">{errorPDF}</p>
                    <Button onClick={() => handleVerDocumento(documentoSeleccionado)}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              )}

              {pdfBlobUrl && !cargandoPDF && !errorPDF && (() => {
                const fileName = getDocumentoFileName(documentoSeleccionado);
                const previewType = esDocumentoConvertido
                  ? 'html'
                  : getFileType(fileName, documentoSeleccionado.fileType);

                if (previewType === 'video') {
                  return (
                    <div className="h-full bg-black flex items-center justify-center">
                      <video src={pdfBlobUrl} controls className="w-full max-h-full">
                        Tu navegador no soporta la reproducción de video.
                      </video>
                    </div>
                  );
                }

                if (previewType === 'audio') {
                  return (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-100 p-8">
                      <Play className="w-16 h-16 text-purple-600 mb-4" />
                      <audio src={pdfBlobUrl} controls className="w-full max-w-xl">
                        Tu navegador no soporta la reproducción de audio.
                      </audio>
                    </div>
                  );
                }

                if (previewType === 'image') {
                  return (
                    <div className="h-full flex items-center justify-center bg-gray-100 p-4">
                      <img
                        src={pdfBlobUrl}
                        alt={documentoSeleccionado.nombre}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  );
                }

                if (previewType === 'pdf') {
                  if (isMobile) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
                        <FileText className="w-16 h-16 text-red-500" />
                        <p className="text-gray-700 font-medium">El PDF está listo para visualizarse</p>
                        <p className="text-sm text-gray-500">Los navegadores móviles no soportan la vista previa integrada. Ábrelo en una nueva pestaña para verlo.</p>
                        <Button onClick={() => window.open(pdfBlobUrl, '_blank', 'noopener,noreferrer')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Abrir PDF
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <iframe
                      src={pdfBlobUrl}
                      className="w-full"
                      style={{ height: '100%', border: 'none' }}
                      title={`Visor de ${documentoSeleccionado.nombre}`}
                    />
                  );
                }

                if (previewType === 'html') {
                  return (
                    <iframe
                      src={pdfBlobUrl}
                      className="w-full"
                      style={{ height: '65vh', minHeight: '500px', border: 'none' }}
                      title={`Visor de ${documentoSeleccionado.nombre}`}
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  );
                }

                return (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-lg font-semibold text-gray-700 mb-2">Vista previa no disponible</p>
                    <p className="text-sm text-gray-600 mb-6">
                      El tipo de archivo "{getFileTypeDisplayName(fileName, documentoSeleccionado.fileType)}" no tiene vista previa en el navegador.
                    </p>
                    <Button onClick={() => handleDescargarDocumento(documentoSeleccionado)}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar archivo
                    </Button>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <Button
                onClick={() => handleDescargarDocumento(documentoSeleccionado)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowModalVisor(false); setPdfBlobUrl(null); setEsDocumentoConvertido(false); }}
                className="ml-auto"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpedienteCompartidoPage;
