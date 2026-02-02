/**
 * EXPEDIENTES ELECTRÓNICOS - Control Interno Disciplinario
 * Diseño limpio y profesional alineado con Gestión Legal (SIGL v5.0)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, FileText, Upload, Download, Eye, Search,
  Scale, BarChart3, Folder, ChevronRight, X, Calendar,
  User, Clock, File, Trash2, Edit2, Plus
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// Interfaces
interface Proceso {
  id: string;
  numero: string;
  tipo: 'Defensa Judicial' | 'Juzgamiento Disciplinario' | 'Derecho de Petición';
  descripcion: string;
  responsable: string;
  inicio: string;
  documentos: number;
  estado: 'En Proceso' | 'Activo' | 'Finalizado';
  etapa?: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: 'Auto' | 'Evidencia' | 'Oficio' | 'Notificación' | 'Acta' | 'Otro';
  carpeta: string;
  tamaño: string;
  fechaCarga: string;
  usuario: string;
}

interface Carpeta {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  documentos: Documento[];
}

// Mock Data - REDUCIDO
const PROCESOS_MOCK: Proceso[] = [
  {
    id: '1',
    numero: 'PJ-2025-001',
    tipo: 'Defensa Judicial',
    descripcion: 'NBD - María González Pérez vs ESAP',
    responsable: 'Dr. Juan Pérez López',
    inicio: '2024-10-15',
    documentos: 15,
    estado: 'En Proceso'
  },
  {
    id: '3',
    numero: 'PD-2025-001',
    tipo: 'Juzgamiento Disciplinario',
    descripcion: 'Disciplinario - Dr. Carlos Rodríguez',
    responsable: 'Dra. Ana López García',
    inicio: '2025-01-08',
    documentos: 6,
    estado: 'Activo',
    etapa: 'Indagación Preliminar'
  }
];

// Carpetas Mock por proceso
const getCarpetasByProceso = (procesoId: string): Carpeta[] => {
  return [
    {
      id: '1',
      nombre: 'Autos',
      color: '#3B82F6',
      icono: 'scale',
      documentos: [
        {
          id: '1',
          nombre: 'Auto de Apertura.pdf',
          tipo: 'Auto',
          carpeta: 'Autos',
          tamaño: '245 KB',
          fechaCarga: '2025-01-10',
          usuario: 'Dr. Juan Pérez López'
        },
        {
          id: '2',
          nombre: 'Auto de Pruebas.pdf',
          tipo: 'Auto',
          carpeta: 'Autos',
          tamaño: '312 KB',
          fechaCarga: '2025-01-15',
          usuario: 'Dr. Juan Pérez López'
        }
      ]
    },
    {
      id: '2',
      nombre: 'Evidencias',
      color: '#8B5CF6',
      icono: 'folder',
      documentos: [
        {
          id: '3',
          nombre: 'Testimonio Testigo 1.pdf',
          tipo: 'Evidencia',
          carpeta: 'Evidencias',
          tamaño: '1.2 MB',
          fechaCarga: '2025-01-12',
          usuario: 'Dra. Ana López García'
        },
        {
          id: '4',
          nombre: 'Prueba Documental A.pdf',
          tipo: 'Evidencia',
          carpeta: 'Evidencias',
          tamaño: '890 KB',
          fechaCarga: '2025-01-14',
          usuario: 'Dra. Ana López García'
        }
      ]
    },
    {
      id: '3',
      nombre: 'Oficios',
      color: '#10B981',
      icono: 'file-text',
      documentos: [
        {
          id: '5',
          nombre: 'Oficio Citación.pdf',
          tipo: 'Oficio',
          carpeta: 'Oficios',
          tamaño: '156 KB',
          fechaCarga: '2025-01-11',
          usuario: 'Dr. Juan Pérez López'
        }
      ]
    },
    {
      id: '4',
      nombre: 'Notificaciones',
      color: '#F59E0B',
      icono: 'bell',
      documentos: [
        {
          id: '6',
          nombre: 'Notificación Personal.pdf',
          tipo: 'Notificación',
          carpeta: 'Notificaciones',
          tamaño: '201 KB',
          fechaCarga: '2025-01-13',
          usuario: 'Dr. Juan Pérez López'
        }
      ]
    },
    {
      id: '5',
      nombre: 'Actas',
      color: '#EF4444',
      icono: 'file-signature',
      documentos: []
    }
  ];
};

// Modal de Cargar Documento
interface ModalCargarDocumentoProps {
  proceso: Proceso;
  onClose: () => void;
  onConfirm: (data: any) => void;
}

function ModalCargarDocumento({ proceso, onClose, onConfirm }: ModalCargarDocumentoProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'Auto' | 'Evidencia' | 'Oficio' | 'Notificación' | 'Acta' | 'Otro'>('Auto');
  const [carpeta, setCarpeta] = useState('Autos');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleConfirmar = () => {
    if (!nombre || !archivo) {
      toast.error('Campos Incompletos', {
        description: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    onConfirm({
      nombre,
      tipo,
      carpeta,
      descripcion,
      archivo,
      tamaño: `${(archivo.size / 1024).toFixed(0)} KB`,
      fechaCarga: new Date().toISOString().split('T')[0],
      usuario: 'Usuario Actual'
    });

    toast.success('Documento Cargado', {
      description: `${nombre} ha sido agregado al expediente ${proceso.numero}`
    });

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                <Upload className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Cargar Documento
                </h2>
                <p className="text-sm text-gray-600">Proceso: {proceso.numero}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Nombre del Documento *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Auto de Apertura"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Tipo de Documento *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="Auto">Auto</option>
                <option value="Evidencia">Evidencia</option>
                <option value="Oficio">Oficio</option>
                <option value="Notificación">Notificación</option>
                <option value="Acta">Acta</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                Carpeta *
              </label>
              <select
                value={carpeta}
                onChange={(e) => setCarpeta(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="Autos">Autos</option>
                <option value="Evidencias">Evidencias</option>
                <option value="Oficios">Oficios</option>
                <option value="Notificaciones">Notificaciones</option>
                <option value="Actas">Actas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Descripción (Opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción breve del documento..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Área de carga de archivo */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Archivo *
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  setArchivo(files[0]);
                }
              }}
            >
              {archivo ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 mx-auto" style={{ color: '#10B981' }} />
                  <p className="text-sm font-semibold text-gray-900">{archivo.name}</p>
                  <p className="text-xs text-gray-600">{(archivo.size / 1024).toFixed(0)} KB</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchivo(null);
                    }}
                    className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Eliminar archivo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">Arrastra y suelta un archivo aquí</p>
                  <p className="text-xs text-gray-500">o haz clic para seleccionar</p>
                  <p className="text-xs text-gray-400 mt-2">PDF, DOC, DOCX (máx. 10 MB)</p>
                </div>
              )}
              <input
                type="file"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!nombre || !archivo}
            className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#003DA5' }}
          >
            <Upload className="w-4 h-4" />
            Cargar Documento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Ver Carpetas
interface ModalVerCarpetasProps {
  proceso: Proceso;
  onClose: () => void;
}

function ModalVerCarpetas({ proceso, onClose }: ModalVerCarpetasProps) {
  const [carpetas] = useState<Carpeta[]>(getCarpetasByProceso(proceso.id));
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<Carpeta | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleVerDocumento = (documento: Documento) => {
    toast.info('Visualizar Documento', {
      description: `Abriendo ${documento.nombre}`
    });
  };

  const handleDescargarDocumento = (documento: Documento) => {
    toast.success('Descarga Iniciada', {
      description: `Descargando ${documento.nombre}`
    });
  };

  const totalDocumentos = carpetas.reduce((acc, carpeta) => acc + carpeta.documentos.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                <FolderOpen className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Expediente Electrónico
                </h2>
                <p className="text-sm text-gray-600">{proceso.numero} - {proceso.descripcion}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {!carpetaSeleccionada ? (
            <>
              {/* Vista de carpetas */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                    Carpetas del Expediente
                  </h3>
                  <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                    {totalDocumentos} documentos totales
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carpetas.map((carpeta) => (
                    <div
                      key={carpeta.id}
                      onClick={() => setCarpetaSeleccionada(carpeta)}
                      className="bg-white rounded-xl border-2 p-5 cursor-pointer hover:shadow-lg transition-all"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `${carpeta.color}20` }}
                        >
                          <Folder className="w-6 h-6" style={{ color: carpeta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-bold mb-1" style={{ color: '#1F2937' }}>
                            {carpeta.nombre}
                          </h4>
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            {carpeta.documentos.length} {carpeta.documentos.length === 1 ? 'documento' : 'documentos'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Vista de documentos de una carpeta */}
              <div className="mb-4">
                <button
                  onClick={() => setCarpetaSeleccionada(null)}
                  className="flex items-center gap-2 text-sm font-semibold hover:underline mb-4"
                  style={{ color: '#003DA5' }}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Volver a Carpetas
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: `${carpetaSeleccionada.color}20` }}
                  >
                    <Folder className="w-6 h-6" style={{ color: carpetaSeleccionada.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: '#1F2937' }}>
                      {carpetaSeleccionada.nombre}
                    </h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      {carpetaSeleccionada.documentos.length} {carpetaSeleccionada.documentos.length === 1 ? 'documento' : 'documentos'}
                    </p>
                  </div>
                </div>

                {/* Lista de documentos */}
                {carpetaSeleccionada.documentos.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
                    <p className="text-lg font-semibold mb-2" style={{ color: '#6B7280' }}>
                      No hay documentos
                    </p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Esta carpeta está vacía
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carpetaSeleccionada.documentos.map((documento) => (
                      <div
                        key={documento.id}
                        className="bg-white rounded-xl border-2 p-4 hover:shadow-md transition-all"
                        style={{ borderColor: '#E5E7EB' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
                            <FileText className="w-5 h-5" style={{ color: '#F59E0B' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
                              {documento.nombre}
                            </h4>
                            <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
                              <span>{documento.tamaño}</span>
                              <span>•</span>
                              <span>{documento.fechaCarga}</span>
                              <span>•</span>
                              <span>{documento.usuario}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVerDocumento(documento)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" style={{ color: '#6B7280' }} />
                            </button>
                            <button
                              onClick={() => handleDescargarDocumento(documento)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" style={{ color: '#6B7280' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: '#003DA5' }}
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente Principal
export function ExpedienteElectronico() {
  const [searchQuery, setSearchQuery] = useState('');
  const [vistaActual, setVistaActual] = useState<'procesos' | 'estadisticas'>('procesos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Activo' | 'En Proceso' | 'Finalizado'>('Todos');
  const [modalCargar, setModalCargar] = useState(false);
  const [modalCarpetas, setModalCarpetas] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(null);

  // Filtrar procesos
  const procesosFiltrados = PROCESOS_MOCK.filter(proceso => {
    const matchesSearch = searchQuery === '' || 
      proceso.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proceso.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proceso.responsable.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filtroEstado === 'Todos' || proceso.estado === filtroEstado;
    
    return matchesSearch && matchesEstado;
  });

  // Contar por estado
  const contadores = {
    todos: PROCESOS_MOCK.length,
    activos: PROCESOS_MOCK.filter(p => p.estado === 'Activo').length,
    enProceso: PROCESOS_MOCK.filter(p => p.estado === 'En Proceso').length,
    finalizados: PROCESOS_MOCK.filter(p => p.estado === 'Finalizado').length
  };

  const handleCargar = (proceso: Proceso) => {
    setProcesoSeleccionado(proceso);
    setModalCargar(true);
  };

  const handleVerCarpetas = (proceso: Proceso) => {
    setProcesoSeleccionado(proceso);
    setModalCarpetas(true);
  };

  const handleConfirmarCarga = (data: any) => {
    // Aquí se implementaría la lógica real de carga
    console.log('Documento cargado:', data);
  };

  // Obtener color según tipo de proceso
  const getTipoColor = (tipo: string) => {
    switch(tipo) {
      case 'Defensa Judicial':
        return {
          bg: '#10B981',
          text: '#FFFFFF',
          icon: Scale
        };
      case 'Juzgamiento Disciplinario':
        return {
          bg: '#DC2626',
          text: '#FFFFFF',
          icon: Scale
        };
      case 'Derecho de Petición':
        return {
          bg: '#3B82F6',
          text: '#FFFFFF',
          icon: File
        };
      default:
        return {
          bg: '#6B7280',
          text: '#FFFFFF',
          icon: Folder
        };
    }
  };

  // Obtener badge de estado
  const getEstadoBadge = (estado: string) => {
    switch(estado) {
      case 'En Proceso':
        return { bg: '#FEF3C7', color: '#D97706', text: 'En Proceso' };
      case 'Finalizado':
        return { bg: '#DBEAFE', color: '#2563EB', text: 'Finalizado' };
      case 'Activo':
        return { bg: '#D1FAE5', color: '#059669', text: 'Activo' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: estado };
    }
  };

  return (
    <div className="w-full max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#1F2937' }}>
          Expedientes Electrónicos
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Sistema Integrado de Gestión Legal (SIGL v5.0)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={() => setVistaActual('procesos')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'procesos'
              ? 'border-[#003DA5] text-[#003DA5]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Folder className="w-4 h-4" />
          Expedientes por Proceso
          <Badge className="ml-2" style={{ background: '#003DA5', color: '#FFFFFF' }}>
            {PROCESOS_MOCK.length}
          </Badge>
        </button>
        <button
          onClick={() => setVistaActual('estadisticas')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'estadisticas'
              ? 'border-[#003DA5] text-[#003DA5]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Estadísticas
        </button>
      </div>

      {vistaActual === 'procesos' ? (
        <>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Buscar por radicado o nombre del proceso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
          </div>

          {/* Filtros por estado */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setFiltroEstado('Todos')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'Todos'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'Todos'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Todos ({contadores.todos})
            </button>
            <button
              onClick={() => setFiltroEstado('Activo')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'Activo'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'Activo'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Activos ({contadores.activos})
            </button>
            <button
              onClick={() => setFiltroEstado('En Proceso')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'En Proceso'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'En Proceso'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              En Proceso ({contadores.enProceso})
            </button>
            <button
              onClick={() => setFiltroEstado('Finalizado')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filtroEstado === 'Finalizado'
                  ? 'text-white'
                  : 'bg-white text-gray-700 border-2'
              }`}
              style={
                filtroEstado === 'Finalizado'
                  ? { background: '#003DA5' }
                  : { borderColor: '#E5E7EB' }
              }
            >
              Finalizados ({contadores.finalizados})
            </button>
          </div>

          {/* Lista de Procesos */}
          <div className="space-y-4">
            {procesosFiltrados.map((proceso) => {
              const tipoConfig = getTipoColor(proceso.tipo);
              const estadoBadge = getEstadoBadge(proceso.estado);
              const IconoTipo = tipoConfig.icon;

              return (
                <div
                  key={proceso.id}
                  className="bg-white rounded-xl border-2 p-5 hover:shadow-lg transition-all"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icono */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: tipoConfig.bg }}
                    >
                      <IconoTipo className="w-6 h-6" style={{ color: tipoConfig.text }} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
                              {proceso.numero}
                            </h3>
                            <Badge
                              className="px-3 py-1 rounded-md text-xs font-bold"
                              style={{ background: estadoBadge.bg, color: estadoBadge.color }}
                            >
                              {estadoBadge.text}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mb-3" style={{ color: '#6B7280' }}>
                            {proceso.descripcion}
                          </p>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleCargar(proceso)}
                            className="px-4 py-2 rounded-lg font-semibold border-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                          >
                            <Upload className="w-4 h-4" />
                            Cargar
                          </button>
                          <button
                            onClick={() => handleVerCarpetas(proceso)}
                            className="px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                            style={{ background: '#003DA5' }}
                          >
                            <FolderOpen className="w-4 h-4" />
                            Ver Carpetas
                          </button>
                        </div>
                      </div>

                      {/* Metadatos */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Tipo:</span>
                          <span className="text-xs font-bold" style={{ color: '#1F2937' }}>{proceso.tipo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Responsable:</span>
                          <span className="text-xs font-bold" style={{ color: '#1F2937' }}>{proceso.responsable}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Inicio:</span>
                          <span className="text-xs font-bold" style={{ color: '#1F2937' }}>{proceso.inicio}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Documentos:</span>
                          <span className="text-xs font-bold" style={{ color: '#003DA5' }}>{proceso.documentos}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {procesosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
                <p className="text-lg font-semibold mb-2" style={{ color: '#6B7280' }}>
                  No se encontraron procesos
                </p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border-2 p-8 text-center" style={{ borderColor: '#E5E7EB' }}>
          <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: '#003DA5' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1F2937' }}>
            Estadísticas de Expedientes
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Sección en desarrollo
          </p>
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {modalCargar && procesoSeleccionado && (
          <ModalCargarDocumento
            proceso={procesoSeleccionado}
            onClose={() => {
              setModalCargar(false);
              setProcesoSeleccionado(null);
            }}
            onConfirm={handleConfirmarCarga}
          />
        )}

        {modalCarpetas && procesoSeleccionado && (
          <ModalVerCarpetas
            proceso={procesoSeleccionado}
            onClose={() => {
              setModalCarpetas(false);
              setProcesoSeleccionado(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
