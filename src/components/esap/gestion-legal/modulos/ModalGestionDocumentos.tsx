/**
 * ModalGestionDocumentos - Gestión completa de documentos adjuntos
 * DISEÑO LIMPIO ESAP 2025 - Funcionalidad completa de carga
 */

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Progress } from '../../../ui/progress';
import {
  Paperclip, X, Upload, Download, FileText, File, FileSpreadsheet,
  Image as ImageIcon, Trash2, Eye, Search, Filter, CheckCircle, AlertCircle,
  FolderOpen, Clock, User, FileCheck
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DocumentoSeleccionado {
  archivo: File;
  categoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno';
  preview?: string;
}

interface DocumentoCargado {
  id: string;
  nombre: string;
  tipo: 'PDF' | 'Word' | 'Excel' | 'Imagen' | 'Otro';
  tamano: string;
  categoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno';
  fechaCarga: Date;
  usuario: string;
}

interface ModalGestionDocumentosProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  tituloContexto?: string;
}

export function ModalGestionDocumentos({
  isOpen,
  onClose,
  requerimientoId,
  tituloContexto = 'Gestión de Documentos'
}: ModalGestionDocumentosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<DocumentoSeleccionado[]>([]);
  const [categoriaActual, setCategoriaActual] = useState<'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno'>('Soporte');
  const [cargando, setCargando] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(0);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Mock data de documentos ya cargados
  const [documentosCargados, setDocumentosCargados] = useState<DocumentoCargado[]>([
    {
      id: 'doc-001',
      nombre: 'Oficio CGR-OF-2024-00125.pdf',
      tipo: 'PDF',
      tamano: '2.4 MB',
      categoria: 'Requerimiento',
      fechaCarga: new Date('2024-12-10'),
      usuario: 'Sistema SIGL'
    },
    {
      id: 'doc-002',
      nombre: 'Anexo 1 - Contratos 2024.xlsx',
      tipo: 'Excel',
      tamano: '5.1 MB',
      categoria: 'Soporte',
      fechaCarga: new Date('2024-12-12'),
      usuario: 'Dra. María Fernández'
    },
    {
      id: 'doc-003',
      nombre: 'Certificación Presupuestal Q4-2024.pdf',
      tipo: 'PDF',
      tamano: '1.8 MB',
      categoria: 'Soporte',
      fechaCarga: new Date('2024-12-13'),
      usuario: 'Área Financiera'
    },
    {
      id: 'doc-004',
      nombre: 'Borrador Respuesta CGR.docx',
      tipo: 'Word',
      tamano: '856 KB',
      categoria: 'Respuesta',
      fechaCarga: new Date('2024-12-15'),
      usuario: 'Dra. María Fernández'
    },
    {
      id: 'doc-005',
      nombre: 'Análisis Jurídico Interno.pdf',
      tipo: 'PDF',
      tamano: '1.2 MB',
      categoria: 'Interno',
      fechaCarga: new Date('2024-12-14'),
      usuario: 'Dr. Carlos Méndez'
    }
  ]);

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
      // Validar tamaño (máximo 10 MB)
      if (archivo.size > 10 * 1024 * 1024) {
        toast.error(`Archivo demasiado grande: ${archivo.name}`, {
          description: 'El tamaño máximo permitido es 10 MB'
        });
        return;
      }

      // Validar tipo de archivo
      const tiposPermitidos = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ];

      if (!tiposPermitidos.includes(archivo.type)) {
        toast.error(`Tipo de archivo no permitido: ${archivo.name}`, {
          description: 'Solo se permiten: PDF, Word, Excel, Imágenes'
        });
        return;
      }

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

  const handleCambiarCategoria = (index: number, nuevaCategoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno') => {
    const nuevosArchivos = [...archivosSeleccionados];
    nuevosArchivos[index].categoria = nuevaCategoria;
    setArchivosSeleccionados(nuevosArchivos);
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

    // Simular carga de archivos
    for (let i = 0; i < archivosSeleccionados.length; i++) {
      const archivoSeleccionado = archivosSeleccionados[i];
      
      // Simular progreso de carga
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgresoCarga(((i + 1) / archivosSeleccionados.length) * 100);

      // Agregar a documentos cargados
      const nuevoDocumento: DocumentoCargado = {
        id: `doc-${Date.now()}-${i}`,
        nombre: archivoSeleccionado.archivo.name,
        tipo: getTipoArchivo(archivoSeleccionado.archivo.type),
        tamano: formatearTamano(archivoSeleccionado.archivo.size),
        categoria: archivoSeleccionado.categoria,
        fechaCarga: new Date(),
        usuario: 'Usuario Actual'
      };

      setDocumentosCargados(prev => [nuevoDocumento, ...prev]);
    }

    setCargando(false);
    setProgresoCarga(0);
    setArchivosSeleccionados([]);

    toast.success('Documentos cargados exitosamente', {
      description: `${archivosSeleccionados.length} archivo(s) agregado(s) al expediente`,
      icon: <CheckCircle className="w-4 h-4" />
    });
  };

  const getTipoArchivo = (mimeType: string): 'PDF' | 'Word' | 'Excel' | 'Imagen' | 'Otro' => {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('word')) return 'Word';
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
    switch(tipo) {
      case 'PDF': return <FileText className="w-5 h-5 text-red-500" />;
      case 'Word': return <File className="w-5 h-5 text-blue-500" />;
      case 'Excel': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'Imagen': return <ImageIcon className="w-5 h-5 text-purple-500" />;
      default: return <Paperclip className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch(categoria) {
      case 'Requerimiento': return 'bg-blue-100 text-blue-700';
      case 'Respuesta': return 'bg-green-100 text-green-700';
      case 'Soporte': return 'bg-yellow-100 text-yellow-700';
      case 'Interno': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDescargar = (nombreArchivo: string) => {
    toast.info('Descargando documento', {
      description: nombreArchivo,
      icon: <Download className="w-4 h-4" />
    });
  };

  const handleEliminarCargado = (id: string) => {
    setDocumentosCargados(prev => prev.filter(doc => doc.id !== id));
    toast.success('Documento eliminado del expediente');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">
          {tituloContexto} - {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión completa de documentos adjuntos al expediente {requerimientoId}. Selecciona archivos de tu computadora, categorízalos y cárgalos al sistema.
        </DialogDescription>
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <Paperclip className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{tituloContexto}</h2>
              <p className="text-sm text-gray-600">
                {requerimientoId} • {documentosCargados.length} documentos • {archivosSeleccionados.length} pendientes de cargar
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
        <div className="p-6 space-y-6">
          
          {/* ZONA DE SELECCIÓN Y CARGA */}
          <div className="border-2 border-blue-300 rounded-lg p-6 bg-blue-50">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Cargar Nuevo Documento
            </h3>

            {/* Input de archivo oculto */}
            <input
              ref={inputFileRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleArchivosCambiados}
              className="hidden"
            />

            {/* Selector de categoría */}
            <div className="mb-4">
              <label className="text-sm font-bold text-gray-900 mb-2 block">
                Categoría de Documento
              </label>
              <Select value={categoriaActual} onValueChange={(value: any) => setCategoriaActual(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Requerimiento">📋 Requerimiento</SelectItem>
                  <SelectItem value="Respuesta">✅ Respuesta</SelectItem>
                  <SelectItem value="Soporte">📎 Soporte</SelectItem>
                  <SelectItem value="Interno">🔒 Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón de selección */}
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-white hover:bg-blue-50 transition-colors">
              <div className="text-center">
                <Upload className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 mb-2">Selecciona archivos para cargar</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Arrastra archivos aquí o haz clic en el botón
                </p>
                <Button
                  onClick={handleSeleccionarArchivo}
                  style={{ background: '#003DA5' }}
                  className="text-white font-bold"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  📂 Seleccionar Archivo
                </Button>
                <p className="text-xs text-gray-500 mt-3">
                  Tamaño máximo: 10 MB por archivo • Formatos: PDF, Word, Excel, Imágenes (JPG, PNG)
                </p>
              </div>
            </div>

            {/* Lista de archivos seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    Archivos Seleccionados ({archivosSeleccionados.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArchivosSeleccionados([])}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpiar todos
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {archivosSeleccionados.map((archivoSel, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getIconoTipo(getTipoArchivo(archivoSel.archivo.type))}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {archivoSel.archivo.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatearTamano(archivoSel.archivo.size)}
                          </p>
                        </div>
                        <Select
                          value={archivoSel.categoria}
                          onValueChange={(value: any) => handleCambiarCategoria(index, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Requerimiento">Requerimiento</SelectItem>
                            <SelectItem value="Respuesta">Respuesta</SelectItem>
                            <SelectItem value="Soporte">Soporte</SelectItem>
                            <SelectItem value="Interno">Interno</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarSeleccionado(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Barra de progreso durante carga */}
                {cargando && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-blue-600">Cargando documentos...</span>
                      <span className="text-gray-600">{Math.round(progresoCarga)}%</span>
                    </div>
                    <Progress value={progresoCarga} className="h-2" />
                  </div>
                )}

                {/* Botón de carga */}
                {!cargando && (
                  <Button
                    onClick={handleCargarDocumentos}
                    className="w-full mt-3 font-bold"
                    style={{ background: '#10B981' }}
                    disabled={archivosSeleccionados.length === 0}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    🚀 Cargar Documentos ({archivosSeleccionados.length})
                  </Button>
                )}
              </div>
            )}
          </div>

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
              <SelectContent>
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

            {documentosFiltrados.length > 0 ? (
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
                        onClick={() => toast.info('Vista previa', { description: doc.nombre })}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDescargar(doc.nombre)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
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
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
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
              onClick={() => toast.info('Descargando todos los documentos...')}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Todos
            </Button>
            <Button
              onClick={handleSeleccionarArchivo}
              style={{ background: '#003DA5' }}
              className="text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Agregar Más Documentos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

