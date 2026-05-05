/**
 * Expedientes Electrónicos - Control Interno Disciplinario
 * Gestión de documentos organizados por tipo de proceso
 * IDÉNTICO a Gestión Legal pero adaptado a procesos disciplinarios
 */

import { useState } from 'react';
import { 
  FolderOpen, Search, Download, Upload, ChevronRight, FileText, 
  Filter, Eye, EyeOff, Calendar, User, Hash, AlertCircle,
  FileCheck, FileWarning, Scale, Gavel, AlertTriangle, Shield,
  FileSignature, MessageSquare, Bell, X
} from 'lucide-react';

// ============ INTERFACES ============

interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  icon: typeof FileText;
  color: string;
  colorBg: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  fechaSubida: string;
  subidoPor: string;
  tamano: string;
}

interface ExpedienteElectronico {
  id: string;
  radicado: string;
  estado: 'valoracion' | 'indagacion' | 'investigacion' | 'juzgamiento' | 'finalizado';
  nombreDisciplinado: string;
  tipoProceso: string;
  responsable: string;
  fechaInicio: string;
  totalDocumentos: number;
  documentosPorTipo: Record<string, number>;
}

// ============ DATOS DE EJEMPLO ============

const TIPOS_DOCUMENTO: TipoDocumento[] = [
  {
    id: 'queja',
    nombre: 'Quejas y Denuncias',
    descripcion: 'Denuncias presentadas contra funcionarios',
    icon: FileWarning,
    color: '#EF4444',
    colorBg: '#FEE2E2'
  },
  {
    id: 'apertura',
    nombre: 'Auto de Apertura',
    descripcion: 'Autos de apertura de procesos disciplinarios',
    icon: FileCheck,
    color: '#3B82F6',
    colorBg: '#DBEAFE'
  },
  {
    id: 'pruebas',
    nombre: 'Pruebas y Testimonios',
    descripcion: 'Documentos probatorios, evidencias, anexos',
    icon: FolderOpen,
    colorBg: '#D1FAE5',
    color: '#10B981'
  },
  {
    id: 'informes',
    nombre: 'Informes de Investigación',
    descripcion: 'Informes técnicos y de investigación',
    icon: FileText,
    color: '#8B5CF6',
    colorBg: '#EDE9FE'
  },
  {
    id: 'pliego',
    nombre: 'Pliego de Cargos',
    descripcion: 'Pliegos de cargos formulados',
    icon: Scale,
    color: '#F59E0B',
    colorBg: '#FEF3C7'
  },
  {
    id: 'descargos',
    nombre: 'Descargos',
    descripcion: 'Contestaciones y respuestas al pliego',
    icon: MessageSquare,
    color: '#06B6D4',
    colorBg: '#CFFAFE'
  },
  {
    id: 'fallos',
    nombre: 'Fallos y Decisiones',
    descripcion: 'Sentencias, fallos, providencias judiciales',
    icon: Gavel,
    color: '#EC4899',
    colorBg: '#FCE7F3'
  },
  {
    id: 'recursos',
    nombre: 'Recursos',
    descripcion: 'Recursos de apelación, reposición, súplica',
    icon: AlertTriangle,
    color: '#F97316',
    colorBg: '#FFEDD5'
  },
  {
    id: 'notificaciones',
    nombre: 'Notificaciones',
    descripcion: 'Oficios, notificaciones, comunicaciones',
    icon: Bell,
    color: '#64748B',
    colorBg: '#F1F5F9'
  }
];

const EXPEDIENTES_EJEMPLO: ExpedienteElectronico[] = [
  {
    id: 'exp-001',
    radicado: 'CD-2025-001',
    estado: 'investigacion',
    nombreDisciplinado: 'Carlos Ramírez Gómez',
    tipoProceso: 'Presunta Irregularidad Administrativa',
    responsable: 'Dra. María González Pérez',
    fechaInicio: '2024-10-15',
    totalDocumentos: 15,
    documentosPorTipo: {
      queja: 1,
      apertura: 1,
      pruebas: 8,
      informes: 2,
      pliego: 1,
      descargos: 1,
      fallos: 0,
      recursos: 0,
      notificaciones: 1
    }
  },
  {
    id: 'exp-002',
    radicado: 'CD-2025-002',
    estado: 'indagacion',
    nombreDisciplinado: 'Ana Lucía Torres Díaz',
    tipoProceso: 'Presunto Incumplimiento de Deberes',
    responsable: 'Dr. Juan Pérez López',
    fechaInicio: '2024-11-20',
    totalDocumentos: 6,
    documentosPorTipo: {
      queja: 1,
      apertura: 1,
      pruebas: 3,
      informes: 1,
      pliego: 0,
      descargos: 0,
      fallos: 0,
      recursos: 0,
      notificaciones: 0
    }
  },
  {
    id: 'exp-003',
    radicado: 'CD-2024-087',
    estado: 'finalizado',
    nombreDisciplinado: 'Roberto Méndez Suárez',
    tipoProceso: 'Presunto Abuso de Autoridad',
    responsable: 'Dra. Patricia Rodríguez',
    fechaInicio: '2024-03-10',
    totalDocumentos: 22,
    documentosPorTipo: {
      queja: 1,
      apertura: 1,
      pruebas: 12,
      informes: 3,
      pliego: 1,
      descargos: 1,
      fallos: 1,
      recursos: 1,
      notificaciones: 1
    }
  },
  {
    id: 'exp-004',
    radicado: 'CD-2025-003',
    estado: 'valoracion',
    nombreDisciplinado: 'Sandra Jiménez Castro',
    tipoProceso: 'Presunta Negligencia',
    responsable: 'Dr. Miguel Ángel Sánchez',
    fechaInicio: '2025-01-08',
    totalDocumentos: 3,
    documentosPorTipo: {
      queja: 1,
      apertura: 0,
      pruebas: 2,
      informes: 0,
      pliego: 0,
      descargos: 0,
      fallos: 0,
      recursos: 0,
      notificaciones: 0
    }
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ExpedientesElectronicos() {
  const [expedientes] = useState<ExpedienteElectronico[]>(EXPEDIENTES_EJEMPLO);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [showModalSubirDocumento, setShowModalSubirDocumento] = useState(false);
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState<string>('');

  // Filtrar expedientes
  const expedientesFiltrados = expedientes.filter(exp => {
    const cumpleFiltro = filtroEstado === 'todos' || exp.estado === filtroEstado;
    const cumpleBusqueda = busqueda === '' || 
      exp.radicado.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.nombreDisciplinado.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  const expedienteActivo = expedientes.find(e => e.id === expedienteSeleccionado);

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'valoracion':
        return { label: 'Valoración', color: '#3B82F6', bg: '#DBEAFE' };
      case 'indagacion':
        return { label: 'Indagación', color: '#F59E0B', bg: '#FEF3C7' };
      case 'investigacion':
        return { label: 'En Proceso', color: '#10B981', bg: '#D1FAE5' };
      case 'juzgamiento':
        return { label: 'Juzgamiento', color: '#EC4899', bg: '#FCE7F3' };
      case 'finalizado':
        return { label: 'Finalizado', color: '#64748B', bg: '#F1F5F9' };
      default:
        return { label: 'Desconocido', color: '#9CA3AF', bg: '#F3F4F6' };
    }
  };

  const handleSubirDocumento = (tipoId: string) => {
    setTipoDocumentoSeleccionado(tipoId);
    setShowModalSubirDocumento(true);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                <FolderOpen size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Expedientes Electrónicos
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Gestión documental de procesos disciplinarios
                </p>
              </div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-gray-600">Total Expedientes</p>
              <p className="text-xl font-bold" style={{ color: '#003DA5' }}>
                {expedientes.length}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs text-gray-600">En Proceso</p>
              <p className="text-xl font-bold text-green-700">
                {expedientes.filter(e => e.estado === 'investigacion' || e.estado === 'juzgamiento').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Herramientas */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por radicado o nombre del proceso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700 hidden sm:inline">
              Filtrar:
            </span>
            {[
              { id: 'todos', label: 'Todos', count: expedientes.length },
              { id: 'valoracion', label: 'Valoración', count: expedientes.filter(e => e.estado === 'valoracion').length },
              { id: 'investigacion', label: 'En Proceso', count: expedientes.filter(e => e.estado === 'investigacion').length },
              { id: 'finalizado', label: 'Finalizados', count: expedientes.filter(e => e.estado === 'finalizado').length }
            ].map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => setFiltroEstado(filtro.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroEstado === filtro.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={filtroEstado === filtro.id ? {
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)'
                } : {}}
              >
                {filtro.label} ({filtro.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {expedientesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">No se encontraron expedientes</p>
              <p className="text-sm text-gray-500 mt-1">Intenta ajustar los filtros o la búsqueda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expedientesFiltrados.map((expediente) => (
                <div key={expediente.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header del Expediente */}
                  <div className="p-4 sm:p-5 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg"
                          style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                        >
                          {expediente.radicado.split('-')[2]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {expediente.radicado}
                            </h3>
                            <span 
                              className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                              style={{ 
                                color: getEstadoConfig(expediente.estado).color,
                                backgroundColor: getEstadoConfig(expediente.estado).bg
                              }}
                            >
                              {getEstadoConfig(expediente.estado).label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">
                            NED: {expediente.nombreDisciplinado}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Función de descarga/imprimir
                            console.log('Descargar expediente:', expediente.id);
                          }}
                          className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-sm font-semibold flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Cargar
                        </button>
                        <button
                          onClick={() => {
                            if (expedienteSeleccionado === expediente.id) {
                              setExpedienteSeleccionado(null);
                            } else {
                              setExpedienteSeleccionado(expediente.id);
                            }
                          }}
                          className="px-3 py-2 rounded-lg text-white font-semibold text-sm transition-all hover:shadow-lg flex items-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                        >
                          {expedienteSeleccionado === expediente.id ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Ver
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Información del expediente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Tipo:</p>
                          <p className="text-sm font-semibold text-gray-900">{expediente.tipoProceso}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Responsable:</p>
                          <p className="text-sm font-semibold text-gray-900">{expediente.responsable}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Inicio:</p>
                          <p className="text-sm font-semibold text-gray-900">{expediente.fechaInicio}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Documentos:</p>
                          <p className="text-sm font-semibold text-gray-900">{expediente.totalDocumentos}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documentos por Tipo - Se muestra si el expediente está seleccionado */}
                  {expedienteSeleccionado === expediente.id && (
                    <div className="p-4 sm:p-5 bg-gray-50">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: '#003DA5' }} />
                        Documentos por Tipo
                      </h4>
                      <div className="space-y-3">
                        {TIPOS_DOCUMENTO.map((tipo) => {
                          const Icon = tipo.icon;
                          const cantidad = expediente.documentosPorTipo[tipo.id] || 0;
                          
                          return (
                            <div
                              key={tipo.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white border-l-4 hover:shadow-sm transition-all cursor-pointer"
                              style={{ borderLeftColor: tipo.color }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: tipo.colorBg }}
                                >
                                  <Icon className="w-5 h-5" style={{ color: tipo.color }} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-gray-900">{tipo.nombre}</p>
                                  <p className="text-xs text-gray-500">{tipo.descripcion}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <span 
                                  className="px-3 py-1.5 rounded-full text-sm font-bold"
                                  style={{ 
                                    color: tipo.color,
                                    backgroundColor: tipo.colorBg
                                  }}
                                >
                                  {cantidad}
                                </span>
                                <button
                                  onClick={() => handleSubirDocumento(tipo.id)}
                                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Subir documento"
                                >
                                  <Upload className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Ver documentos"
                                >
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Subir Documento */}
      {showModalSubirDocumento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Subir Documento</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Tipo: {TIPOS_DOCUMENTO.find(t => t.id === tipoDocumentoSeleccionado)?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setShowModalSubirDocumento(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del documento
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Queja inicial 2025-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Archivo
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="text-blue-600 font-semibold">Haz clic para subir</span> o arrastra el archivo
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX, XLS, XLSX (Máx. 10MB)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Ingrese observaciones sobre el documento..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowModalSubirDocumento(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Lógica de subida
                    setShowModalSubirDocumento(false);
                  }}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                    boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                  }}
                >
                  Subir Documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
