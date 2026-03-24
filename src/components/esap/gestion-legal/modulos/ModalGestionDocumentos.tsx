/**
 * ModalGestionDocumentos - Gestión completa de documentos adjuntos
 * DISEÑO LIMPIO ESAP 2025 - Funcionalidad completa de carga (API integrada)
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Progress } from '../../../ui/progress';
import {
  Paperclip, X, Upload, Download, FileText, File, FileSpreadsheet,
  Image as ImageIcon, Trash2, Eye, Search, Filter, CheckCircle, AlertCircle,
  FolderOpen, Clock, User, FileCheck, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { ocService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';

import { Permissions } from '../../../../enums/permissions';

interface DocumentoSeleccionado {
  archivo: File;
  categoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno';
  preview?: string;
}

interface DocumentoCargado {
  id: string;
  nombre: string;
  tipo: string;
  tamano: string;
  categoria: string;
  fechaCarga: Date;
  usuario: string;
  url?: string;
}

interface ModalGestionDocumentosProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  tituloContexto?: string;
  nombreRequerimiento?: string;
}

const CATEGORIES_MAP: Record<string, 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno'> = {
  'oficio': 'Requerimiento',
  'respuesta': 'Respuesta',
  'acuse': 'Respuesta',
  'anexo': 'Soporte',
  'evidencia': 'Soporte',
  'informe': 'Soporte',
  'otro': 'Interno'
};

const CATEGORIES_REVERSE_MAP: Record<string, string> = {
  'Requerimiento': 'oficio',
  'Respuesta': 'respuesta',
  'Soporte': 'anexo',
  'Interno': 'otro'
};

export function ModalGestionDocumentos({
  isOpen,
  onClose,
  requerimientoId,
  tituloContexto = 'Gestión de Documentos',
  nombreRequerimiento
}: ModalGestionDocumentosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<DocumentoSeleccionado[]>([]);
  const [categoriaActual, setCategoriaActual] = useState<'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno'>('Soporte');
  const [cargando, setCargando] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(0);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [documentosCargados, setDocumentosCargados] = useState<DocumentoCargado[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Cargar documentos reales al abrir
  useEffect(() => {
    if (isOpen && requerimientoId) {
      cargarDocumentos();
    }
  }, [isOpen, requerimientoId]);

  const cargarDocumentos = async () => {
    try {
      setLoadingDocs(true);
      const docs = await ocService.getDocumentosByRequerimiento(requerimientoId);

      const docsMapeados = docs.map((d: any) => ({
        id: d.id,
        nombre: d.nombre,
        tipo: d.mimeType ? getTipoArchivo(d.mimeType) : 'Otro',
        tamano: d.tamanoBytes ? formatearTamano(d.tamanoBytes) : 'Desc.',
        categoria: CATEGORIES_MAP[d.tipoDocumento] || 'Interno',
        fechaCarga: d.createdAt ? new Date(d.createdAt) : new Date(),
        usuario: d.subidoPor || 'Sistema',
        url: d.archivoUrl
      }));

      setDocumentosCargados(docsMapeados);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      toast.error('No se pudieron cargar los documentos');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Filtrar documentos cargados
  const documentosFiltrados = documentosCargados.filter(doc => {
    const cumpleBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCategoria = filtroCategoria === 'todos' || doc.categoria === filtroCategoria;
    return cumpleBusqueda && cumpleCategoria;
  });

  const handleSeleccionarArchivo = () => {
    inputFileRef.current?.click();
  };

  const handleArchivosCambiados = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = event.target.files;
    if (!archivos) return;

    const nuevosArchivos: DocumentoSeleccionado[] = [];

    Array.from(archivos).forEach((archivo) => {
      // Validar tamaño (máximo 50 MB)
      if (archivo.size > 50 * 1024 * 1024) {
        toast.error(`Archivo demasiado grande: ${archivo.name}`, {
          description: 'El tamaño máximo permitido es 50 MB'
        });
        return;
      }

      // Validar tipo de archivo (opcional, por ahora permitimos todos los comunes)

      // Crear preview para imágenes
      let preview: string | undefined;
      if (archivo.type.startsWith('image/')) {
        preview = URL.createObjectURL(archivo);
      }

      nuevosArchivos.push({
        archivo,
        categoria: categoriaActual,
        preview
      });
    });

    if (nuevosArchivos.length > 0) {
      setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
      toast.success(`${nuevosArchivos.length} archivo(s) seleccionado(s)`, {
        icon: <CheckCircle className="w-4 h-4" />
      });
    }

    // Limpiar input
    if (inputFileRef.current) {
      inputFileRef.current.value = '';
    }
  };

  const handleEliminarSeleccionado = (index: number) => {
    const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
    setArchivosSeleccionados(nuevosArchivos);
    toast.info('Archivo removido de la lista');
  };

  /* Corrección: Actualización inmutable del estado */
  const handleCambiarCategoria = (index: number, nuevaCategoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno') => {
    setArchivosSeleccionados(prev => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], categoria: nuevaCategoria };
      return nuevos;
    });
  };

  const handleCargarDocumentos = async () => {
    if (archivosSeleccionados.length === 0) {
      toast.error('No hay archivos seleccionados', {
        description: 'Selecciona al menos un archivo para cargar'
      });
      return;
    }

    setCargando(true);
    setProgresoCarga(0);

    try {
      for (let i = 0; i < archivosSeleccionados.length; i++) {
        const archivoSel = archivosSeleccionados[i];
        const tipoDocBackend = CATEGORIES_REVERSE_MAP[archivoSel.categoria] || 'otro';

        await ocService.createDocumento(requerimientoId, {
          nombre: archivoSel.archivo.name,
          tipoDocumento: tipoDocBackend,
          archivo: archivoSel.archivo,
          subidoPor: 'Usuario Actual' // TODO: Integrar auth real
        });

        // Actualizar progreso
        setProgresoCarga(((i + 1) / archivosSeleccionados.length) * 100);
      }

      setArchivosSeleccionados([]);
      toast.success('Documentos cargados exitosamente', {
        description: `${archivosSeleccionados.length} archivo(s) agregado(s) al expediente`,
        icon: <CheckCircle className="w-4 h-4" />
      });
      cargarDocumentos(); // Recargar la lista
    } catch (error) {
      console.error('Error subiendo documentos:', error);
      toast.error('Error al subir algunos documentos');
    } finally {
      setCargando(false);
      setProgresoCarga(0);
    }
  };

  const getTipoArchivo = (mimeType: string): string => {
    if (!mimeType) return 'Otro';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'Word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
    if (mimeType.startsWith('image/')) return 'Imagen';
    return 'Otro';
  };

  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'PDF': return <FileText className="w-5 h-5 text-red-500" />;
      case 'Word': return <File className="w-5 h-5 text-blue-500" />;
      case 'Excel': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'Imagen': return <ImageIcon className="w-5 h-5 text-purple-500" />;
      default: return <Paperclip className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'Requerimiento': return 'bg-blue-100 text-blue-700';
      case 'Respuesta': return 'bg-green-100 text-green-700';
      case 'Soporte': return 'bg-yellow-100 text-yellow-700';
      case 'Interno': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };



  const handleDescargar = async (doc: DocumentoCargado) => {
    if (!doc.url) return;
    toast.info('Descargando documento...', {
      description: doc.nombre,
      icon: <Download className="w-4 h-4" />
    });
    try {
      const baseUrl = getServiceUrl('legal');
      // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
      const prefix = API_MODE === 'direct' ? '' : '/legal';
      let filename = doc.url;
      if (doc.url.includes('/files/')) filename = doc.url.split('/files/').pop()!;
      else if (doc.url.includes('files/')) filename = doc.url.split('files/').pop()!;

      const fullUrl = `${baseUrl}${prefix}/files/${filename}`;

      // Fetching data to force download (with auth header)
      const token = localStorage.getItem('esap_auth_token');
      const response = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const donwloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = donwloadUrl;
      link.setAttribute('download', doc.nombre || filename); // Default to origin filename
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(donwloadUrl);
      
      toast.success('Descarga iniciada');
    } catch (e) {
      console.error(e);
      toast.error('Error al descargar documento');
    }
  };

  const handleDescargarTodos = () => {
    try {
      const url = ocService.getDocumentosDownloadUrl(requerimientoId, nombreRequerimiento);
      window.open(url, '_blank');
      toast.success('Iniciando descarga de todos los documentos');
    } catch (e) {
      console.error(e);
      toast.error('Error al iniciar descarga ZIP');
    }
  };

  const handleEliminarCargado = async (id: string) => {
    // if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    try {
      await ocService.deleteDocumento(id);
      toast.success('Documento eliminado del expediente');
      cargarDocumentos();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar documento');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton style={{ maxWidth: '900px' }} className="fixed !left-1/2 !top-1/2 !z-[9999] grid w-full !-translate-x-1/2 !-translate-y-1/2 gap-0 border bg-white p-0 shadow-lg duration-200 sm:rounded-lg !max-h-[85vh] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">
          {tituloContexto} - {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión completa de documentos adjuntos al expediente {requerimientoId}. Selecciona archivos de tu computadora, categorízalos y cárgalos al sistema.
        </DialogDescription>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-5 bg-white border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <Paperclip className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{tituloContexto}</h2>
              <p className="text-sm text-gray-600">
                {nombreRequerimiento || requerimientoId} • {documentosCargados.length} documentos
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">



          {/* FILTROS Y BÚSQUEDA */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar documentos..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100000]">
                <SelectItem value="todos">Todas las categorías</SelectItem>
                <SelectItem value="Requerimiento">Requerimiento</SelectItem>
                <SelectItem value="Respuesta">Respuesta</SelectItem>
                <SelectItem value="Soporte">Soporte</SelectItem>
                <SelectItem value="Interno">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-bold">Requerimientos</p>
              <p className="text-2xl font-bold text-blue-900">
                {documentosCargados.filter(d => d.categoria === 'Requerimiento').length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 font-bold">Respuestas</p>
              <p className="text-2xl font-bold text-green-900">
                {documentosCargados.filter(d => d.categoria === 'Respuesta').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-600 font-bold">Soportes</p>
              <p className="text-2xl font-bold text-yellow-900">
                {documentosCargados.filter(d => d.categoria === 'Soporte').length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-600 font-bold">Internos</p>
              <p className="text-2xl font-bold text-purple-900">
                {documentosCargados.filter(d => d.categoria === 'Interno').length}
              </p>
            </div>
          </div>

          {/* LISTA DE DOCUMENTOS CARGADOS */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              Documentos en el Expediente ({documentosFiltrados.length})
            </h3>

            {loadingDocs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : documentosFiltrados.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documentosFiltrados.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getIconoTipo(doc.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{doc.nombre}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge className={`text-xs ${getCategoriaColor(doc.categoria)}`}>
                            {doc.categoria}
                          </Badge>
                          <span className="text-xs text-gray-500">{doc.tamano}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {doc.fechaCarga.toLocaleDateString('es-CO')}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.usuario}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDescargar(doc)}
                        title="Descargar Documento"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDescargarTodos()}
                      >
                        <Download className="w-4 h-4" />
                      </Button> */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarCargado(doc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">No se encontraron documentos</p>
                <p className="text-xs text-gray-500 mt-1">
                  Intenta con otros criterios de búsqueda
                </p>
              </div>
            )}
          </div>

          {/* INFORMACIÓN */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-bold mb-1">💡 Gestión de Documentos:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li><strong>Requerimiento:</strong> Oficio original del órgano de control</li>
                  <li><strong>Respuesta:</strong> Oficios de respuesta elaborados por ESAP</li>
                  <li><strong>Soporte:</strong> Documentos que soportan la respuesta (certificaciones, contratos, etc.)</li>
                  <li><strong>Interno:</strong> Análisis jurídico, notas internas, documentos de trabajo</li>
                  <li>Todos los documentos quedan registrados en el historial del expediente</li>
                  <li>Puedes cambiar la categoría de cada archivo antes de cargarlo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDescargarTodos}
              disabled={documentosCargados.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Todos
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}