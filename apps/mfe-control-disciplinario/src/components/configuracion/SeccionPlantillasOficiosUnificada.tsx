/**
 * SECCIÓN PLANTILLAS DE OFICIOS UNIFICADA - Control Interno Disciplinario
 * Gestión completa de Tipos de Oficios + Plantillas en una sola vista
 * ✅ Integra gestión de tipos de oficios con sus plantillas
 * ✅ Diseño corporativo ESAP Desktop-First optimizado
 * ✅ Responsive mobile-friendly
 * ✅ MÚLTIPLES PLANTILLAS POR TIPO DE OFICIO
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Download, X, FileText, AlertCircle, 
  Info, HelpCircle, CheckCircle, Send, Mail, FileCheck, 
  File, Folder, Eye, Files, Clock, ChevronDown, ChevronRight,
  Bell, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

// ============ CATEGORÍAS DE OFICIOS ============

export const CATEGORIAS_OFICIOS = {
  NOTIFICACION: {
    id: 'NOTIFICACION',
    nombre: 'Oficios de Notificación',
    descripcion: 'Comunicaciones oficiales de actuaciones procesales',
    color: '#8B5CF6',
    icon: Mail,
    orden: 1
  },
  CITACION: {
    id: 'CITACION',
    nombre: 'Oficios de Citación',
    descripcion: 'Citaciones a audiencias y diligencias',
    color: '#F59E0B',
    icon: Bell,
    orden: 2
  },
  COMUNICACION_EXTERNA: {
    id: 'COMUNICACION_EXTERNA',
    nombre: 'Comunicación Externa',
    descripcion: 'Oficios a entidades externas (Fiscalía, Procuraduría, etc.)',
    color: '#10B981',
    icon: Send,
    orden: 3
  },
  REQUERIMIENTO: {
    id: 'REQUERIMIENTO',
    nombre: 'Oficios de Requerimiento',
    descripcion: 'Solicitudes formales a entidades o personas',
    color: '#2962FF',
    icon: FileCheck,
    orden: 4
  },
  TRAMITE: {
    id: 'TRAMITE',
    nombre: 'Oficios de Trámite',
    descripcion: 'Oficios internos de gestión y trámite del proceso',
    color: '#3B82F6',
    icon: FileText,
    orden: 5
  },
  REMISION: {
    id: 'REMISION',
    nombre: 'Oficios de Remisión',
    descripcion: 'Envío de expedientes o documentos a otras entidades',
    color: '#EC4899',
    icon: ArrowRight,
    orden: 6
  }
} as const;

export type CategoriaOficioId = keyof typeof CATEGORIAS_OFICIOS;

// ============ INTERFACES ============

export interface PlantillaArchivo {
  id: string;
  nombre: string;
  nombreArchivo: string;
  descripcion: string;
  url: string;
  tamano: number;
  version: string;
  fechaCreacion: string;
  fechaModificacion: string;
  activo: boolean;
  tipoArchivo?: string; // Opcional - tipo MIME del archivo
}

export interface TipoOficio {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaOficioId;
  plantilla: PlantillaArchivo | null; // Una sola plantilla
  plantillas?: PlantillaArchivo[]; // Array de plantillas (para modales)
  activo: boolean;
  orden: number;
  fechaCreacion: string;
  fechaModificacion: string;
}

interface SeccionPlantillasOficiosUnificadaProps {
  tiposOficios: TipoOficio[];
  onAgregarTipo: () => void;
  onEditarTipo: (tipo: TipoOficio) => void;
  onEliminarTipo: (id: string) => void;
  onToggleActivoTipo: (id: string, activo: boolean) => void;
  onGestionarPlantilla: (tipo: TipoOficio) => void; // ✅ Cambiado de onGestionarPlantillas a onGestionarPlantilla
}

export function SeccionPlantillasOficiosUnificada({
  tiposOficios,
  onAgregarTipo,
  onEditarTipo,
  onEliminarTipo,
  onToggleActivoTipo,
  onGestionarPlantilla
}: SeccionPlantillasOficiosUnificadaProps) {
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaOficioId | 'todas'>('todas');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [tipoExpandido, setTipoExpandido] = useState<string | null>(null);
  const [vistaDetalles, setVistaDetalles] = useState<TipoOficio | null>(null);

  // Validación defensiva
  const tiposOficiosValidos = tiposOficios || [];

  const tiposFiltrados = filtroCategoria === 'todas' 
    ? tiposOficiosValidos 
    : tiposOficiosValidos.filter(t => t.categoria === filtroCategoria);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDescargarPlantilla = (plantilla: PlantillaArchivo | null) => {
    if (!plantilla) return;
    
    const link = document.createElement('a');
    link.href = plantilla.url;
    link.download = plantilla.nombreArchivo;
    link.click();
    
    toast.success('Plantilla descargada', {
      description: plantilla.nombreArchivo
    });
  };

  const toggleExpandirTipo = (tipoId: string) => {
    setTipoExpandido(tipoExpandido === tipoId ? null : tipoId);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 lg:px-5 py-3 lg:py-4">
          <div className="flex items-start justify-between flex-col lg:flex-row gap-3">
            <div className="flex-1 w-full lg:w-auto">
              <div className="flex items-center gap-2 lg:gap-2.5">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                  <Mail className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base lg:text-lg font-bold text-gray-900">
                    Oficios y Plantillas
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-0.5 line-clamp-1">
                    Gestiona tipos de oficios y sus plantillas Word/PDF
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => setMostrarGuia(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm border-2 border-purple-200 text-purple-700 hover:bg-purple-50 transition-all flex-1 lg:flex-initial"
              >
                <HelpCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Ver Guía</span>
                <span className="sm:hidden">Guía</span>
              </button>
              
              <button
                onClick={onAgregarTipo}
                className="flex items-center justify-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg font-semibold text-xs lg:text-sm text-white transition-all hover:shadow-lg flex-1 lg:flex-initial"
                style={{ 
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)'
                }}
              >
                <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Nuevo Tipo de Oficio</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="mt-3 lg:mt-4 bg-purple-50 border-l-4 border-purple-500 p-2.5 lg:p-3 rounded">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs lg:text-sm text-purple-900">
                <p className="font-semibold mb-1">Sistema de gestión de oficios</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li><strong>Crear tipos:</strong> Define los tipos de oficios (Notificación, Requerimiento, etc.)</li>
                  <li><strong>Agregar plantillas:</strong> Cada tipo puede tener múltiples archivos Word/PDF</li>
                  <li><strong>Expandir/Contraer:</strong> Haz clic en un tipo para ver todas sus plantillas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Filtros por Categoría */}
          <div className="mt-3 lg:mt-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltroCategoria('todas')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                filtroCategoria === 'todas'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({tiposOficiosValidos.length})
            </button>
            
            {(Object.keys(CATEGORIAS_OFICIOS) as CategoriaOficioId[])
              .sort((a, b) => CATEGORIAS_OFICIOS[a].orden - CATEGORIAS_OFICIOS[b].orden)
              .map((key) => {
                const categoria = CATEGORIAS_OFICIOS[key];
                const count = tiposOficiosValidos.filter(t => t.categoria === key).length;
                const Icon = categoria.icon;
                
                if (count === 0) return null;
                
                return (
                  <button
                    key={key}
                    onClick={() => setFiltroCategoria(key)}
                    className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1 lg:gap-1.5 ${
                      filtroCategoria === key
                        ? 'text-white shadow-md'
                        : 'bg-white border-2 hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: filtroCategoria === key ? categoria.color : undefined,
                      borderColor: filtroCategoria !== key ? categoria.color : undefined,
                      color: filtroCategoria !== key ? categoria.color : undefined
                    }}
                  >
                    <Icon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    <span className="hidden sm:inline">{categoria.nombre.replace('Oficios de ', '')}</span>
                    <span className="sm:hidden">{categoria.nombre.split(' ')[2] || categoria.nombre.split(' ')[0]}</span>
                    ({count})
                  </button>
                );
              })}
          </div>
        </div>

        {/* Lista de Tipos de Oficios */}
        <div className="p-3 lg:p-5">
          {tiposFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-600 mb-2">
                {filtroCategoria === 'todas' 
                  ? 'No hay tipos de oficios configurados'
                  : `No hay tipos de oficios para "${CATEGORIAS_OFICIOS[filtroCategoria].nombre}"`
                }
              </p>
              <button
                onClick={onAgregarTipo}
                className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
              >
                Crear primer tipo de oficio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tiposFiltrados
                .sort((a, b) => {
                  const categoriaA = CATEGORIAS_OFICIOS[a.categoria];
                  const categoriaB = CATEGORIAS_OFICIOS[b.categoria];
                  if (!categoriaA || !categoriaB) return 0;
                  if (categoriaA.orden !== categoriaB.orden) return categoriaA.orden - categoriaB.orden;
                  return a.orden - b.orden;
                })
                .map((tipo) => {
                  const categoria = CATEGORIAS_OFICIOS[tipo.categoria];
                  if (!categoria) return null;
                  
                  const Icon = categoria.icon;
                  const plantillasActivas = tipo.plantilla ? 1 : 0;
                  const expandido = tipoExpandido === tipo.id;
                  
                  return (
                    <div 
                      key={tipo.id}
                      className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-all bg-gradient-to-br from-purple-50/30 to-white"
                    >
                      {/* Header del Tipo de Oficio */}
                      <div className="p-3 lg:p-4">
                        <div className="flex items-start gap-2 lg:gap-3">
                          {/* Botón Expandir/Contraer */}
                          <button
                            onClick={() => toggleExpandirTipo(tipo.id)}
                            className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
                          >
                            {expandido ? (
                              <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                            )}
                          </button>

                          {/* Icono de Categoría */}
                          <div 
                            className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: categoria.color }}
                          >
                            <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                          </div>

                          {/* Contenido Principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 lg:gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm lg:text-base font-bold text-gray-900 mb-1 line-clamp-2">
                                  {tipo.nombre}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                  <span 
                                    className="px-2 py-0.5 rounded font-semibold text-white"
                                    style={{ backgroundColor: categoria.color }}
                                  >
                                    {categoria.nombre.replace('Oficios de ', '')}
                                  </span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className={`px-2 py-0.5 rounded font-semibold ${
                                    plantillasActivas > 0 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <Files className="w-3 h-3 inline mr-1" />
                                    {plantillasActivas} plantilla{plantillasActivas !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                                  {tipo.descripcion}
                                </p>
                              </div>

                              {/* Toggle Activo */}
                              <button
                                onClick={() => onToggleActivoTipo(tipo.id, !tipo.activo)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                                  tipo.activo ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                title={tipo.activo ? 'Activo' : 'Inactivo'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    tipo.activo ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                              <button
                                onClick={() => onGestionarPlantilla(tipo)}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-purple-50 border-2 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors font-semibold text-xs"
                              >
                                <Folder className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Gestionar Plantillas</span>
                                <span className="sm:hidden">Plantillas</span>
                              </button>
                              <button
                                onClick={() => onEditarTipo(tipo)}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors font-semibold text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Editar</span>
                              </button>
                              <button
                                onClick={() => setVistaDetalles(tipo)}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors font-semibold text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Ver</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar "${tipo.nombre}"?\n\nSe eliminará el tipo y todas sus plantillas.\n\nEsta acción NO se puede deshacer.`)) {
                                    onEliminarTipo(tipo.id);
                                  }
                                }}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 transition-colors font-semibold text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Eliminar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Plantillas Expandidas */}
                      <AnimatePresence>
                        {expandido && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t-2 border-gray-200 bg-gray-50 overflow-hidden"
                          >
                            <div className="p-3 lg:p-4">
                              {tipo.plantilla ? (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <Files className="w-4 h-4" />
                                    PLANTILLAS DISPONIBLES ({tipo.plantilla ? 1 : 0})
                                  </h4>
                                  <div 
                                    key={tipo.plantilla.id} 
                                    className="bg-white border border-gray-200 rounded-lg p-2.5 lg:p-3 hover:border-purple-300 transition-all"
                                  >
                                    <div className="flex items-start gap-2 lg:gap-3">
                                      <File className="w-6 h-6 lg:w-7 lg:h-7 text-purple-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 mb-1">
                                          <p className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                                            {tipo.plantilla.nombre}
                                          </p>
                                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                            v{tipo.plantilla.version}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                          {tipo.plantilla.descripcion}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                          <span className="font-medium truncate">{tipo.plantilla.nombreArchivo}</span>
                                          <span className="hidden sm:inline">•</span>
                                          <span>{formatBytes(tipo.plantilla.tamano)}</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDescargarPlantilla(tipo.plantilla)}
                                        className="flex items-center gap-1 lg:gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-semibold text-xs text-white transition-all hover:shadow-lg flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span className="hidden lg:inline">Descargar</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <Files className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-xs lg:text-sm text-gray-600 mb-2">
                                    No hay plantillas configuradas
                                  </p>
                                  <button
                                    onClick={() => onGestionarPlantilla(tipo)}
                                    className="text-xs lg:text-sm text-purple-600 hover:text-purple-700 font-semibold"
                                  >
                                    Agregar primera plantilla
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Vista Detalles - Implementación similar a Autos */}
      {vistaDetalles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="border-b border-gray-200 px-4 lg:px-5 py-3 lg:py-4 flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <h3 className="text-base lg:text-lg font-bold text-gray-900 truncate">{vistaDetalles.nombre}</h3>
                <p className="text-xs lg:text-sm text-gray-600 mt-0.5 truncate">
                  {CATEGORIAS_OFICIOS[vistaDetalles.categoria].nombre}
                </p>
              </div>
              <button
                onClick={() => setVistaDetalles(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 lg:p-5 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded mb-4">
                <p className="text-xs lg:text-sm text-purple-900">{vistaDetalles.descripcion}</p>
              </div>
              <h4 className="text-xs font-bold text-gray-700 mb-2">
                PLANTILLAS ({vistaDetalles.plantilla ? 1 : 0})
              </h4>
              {vistaDetalles.plantilla && (
                <div key={vistaDetalles.plantilla.id} className="bg-gray-50 border p-3 rounded-lg mb-2 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{vistaDetalles.plantilla.nombre}</p>
                    <p className="text-xs text-gray-600">{vistaDetalles.plantilla.nombreArchivo} • {formatBytes(vistaDetalles.plantilla.tamano)}</p>
                  </div>
                  <button
                    onClick={() => handleDescargarPlantilla(vistaDetalles.plantilla)}
                    className="ml-3 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Guía - Similar a Autos */}
      {mostrarGuia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          >
            <div 
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
            >
              <h3 className="text-lg font-bold">Guía de Oficios</h3>
              <button onClick={() => setMostrarGuia(false)} className="p-1.5 rounded-lg hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <p className="text-sm text-gray-700">
                Gestiona los diferentes tipos de oficios utilizados en los procesos disciplinarios. 
                Cada tipo puede tener múltiples plantillas asociadas.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}