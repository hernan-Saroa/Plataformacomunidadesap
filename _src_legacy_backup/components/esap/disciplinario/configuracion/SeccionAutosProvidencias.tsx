/**
 * SECCIÓN AUTOS Y PROVIDENCIAS - Configuración
 * Sistema completo de gestión de MÚLTIPLES plantillas Word/PDF por cada Tipo de Auto
 * Permite subir varios archivos por tipo, descargarlos y gestionarlos
 * ✅ Diseño corporativo ESAP Desktop-First
 * ✅ MÚLTIPLES PLANTILLAS POR TIPO DE AUTO
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Download, Upload, X, FileText, AlertCircle, 
  Info, HelpCircle, CheckCircle, Archive, Scale, FileCheck, Gavel,
  File, Folder, Eye, ToggleLeft, ToggleRight, Files, Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ============ ETAPAS DEL PROCESO DISCIPLINARIO ============

export const ETAPAS_PROCESO = {
  NOTICIA: {
    id: 'noticia',
    nombre: 'Noticia/Queja',
    descripcion: 'Etapa inicial de recepción de quejas o denuncias',
    color: '#6B7280',
    icon: FileText,
    orden: 1
  },
  INDAGACION: {
    id: 'indagacion',
    nombre: 'Indagación Preliminar',
    descripcion: 'Se investiga si hay mérito para abrir proceso',
    color: '#3B82F6',
    icon: Info,
    orden: 2
  },
  INVESTIGACION: {
    id: 'investigacion',
    nombre: 'Investigación Disciplinaria',
    descripcion: 'Se recopilan pruebas y testimonios',
    color: '#2962FF',
    icon: FileCheck,
    orden: 3
  },
  CARGOS: {
    id: 'cargos',
    nombre: 'Formulación de Cargos',
    descripcion: 'Se formula el pliego de cargos al investigado',
    color: '#F59E0B',
    icon: Scale,
    orden: 4
  },
  DESCARGOS: {
    id: 'descargos',
    nombre: 'Descargos y Pruebas',
    descripcion: 'El investigado presenta su defensa',
    color: '#8B5CF6',
    icon: FileText,
    orden: 5
  },
  FALLO: {
    id: 'fallo',
    nombre: 'Fallo/Decisión',
    descripcion: 'Se emite la decisión final del proceso',
    color: '#10B981',
    icon: Gavel,
    orden: 6
  },
  ARCHIVO: {
    id: 'archivo',
    nombre: 'Archivo',
    descripcion: 'Archivos en cualquier etapa del proceso',
    color: '#DC2626',
    icon: Archive,
    orden: 7
  },
  GENERAL: {
    id: 'general',
    nombre: 'General/Transversal',
    descripcion: 'Autos que aplican en cualquier etapa',
    color: '#64748B',
    icon: CheckCircle,
    orden: 8
  }
} as const;

export type EtapaProcesoId = keyof typeof ETAPAS_PROCESO;

// ============ INTERFACES ============

// ✅ NUEVA ESTRUCTURA: Plantilla Individual
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
}

// ✅ ESTRUCTURA ACTUALIZADA: TipoAuto con múltiples plantillas
export interface TipoAuto {
  id: string;
  nombre: string;
  descripcion: string;
  etapa: EtapaProcesoId;
  plantillas: PlantillaArchivo[]; // ✅ CAMBIO: Ahora es un array de plantillas
  activo: boolean;
  orden: number;
  fechaCreacion: string;
  fechaModificacion: string;
}

interface SeccionAutosProvidenciasProps {
  tiposAutos: TipoAuto[];
  onAgregar: () => void;
  onEditar: (tipo: TipoAuto) => void;
  onEliminar: (id: string) => void;
  onToggleActivo: (id: string, activo: boolean) => void;
  onGestionarPlantillas: (tipo: TipoAuto) => void; // ✅ NUEVO: Gestionar plantillas del tipo
}

export function SeccionAutosProvidencias({ 
  tiposAutos, 
  onAgregar, 
  onEditar, 
  onEliminar, 
  onToggleActivo,
  onGestionarPlantillas
}: SeccionAutosProvidenciasProps) {
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaProcesoId | 'todas'>('todas');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [vistaDetalles, setVistaDetalles] = useState<TipoAuto | null>(null);

  // Agrupar tipos de autos por etapa
  const autosPorEtapa = Object.keys(ETAPAS_PROCESO).reduce((acc, key) => {
    const etapaId = key as EtapaProcesoId;
    acc[etapaId] = tiposAutos.filter(t => t.etapa === etapaId);
    return acc;
  }, {} as Record<EtapaProcesoId, TipoAuto[]>);

  const tiposFiltrados = filtroEtapa === 'todas' 
    ? tiposAutos 
    : tiposAutos.filter(t => t.etapa === filtroEtapa);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // ✅ NUEVA FUNCIÓN: Descargar plantilla específica
  const handleDescargarPlantilla = (plantilla: PlantillaArchivo) => {
    // Simular descarga
    const link = document.createElement('a');
    link.href = plantilla.url;
    link.download = plantilla.nombreArchivo;
    link.click();
    
    toast.success('Plantilla descargada', {
      description: plantilla.nombreArchivo
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Autos y Providencias
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Gestiona tipos de autos y sus plantillas Word/PDF (múltiples por tipo)
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMostrarGuia(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all"
              >
                <HelpCircle className="w-4 h-4" />
                Ver Guía
              </button>
              
              <button
                onClick={onAgregar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                  boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                }}
              >
                <Plus className="w-4 h-4" />
                Nuevo Tipo de Auto
              </button>
            </div>
          </div>

          {/* MENSAJE INFORMATIVO DESTACADO */}
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold">¿Cómo gestionar los tipos de autos?</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                  <li><strong>Editar:</strong> Haz clic en el botón <Edit2 className="w-3 h-3 inline" /> azul en la columna "Acciones" para modificar nombre, descripción y etapa</li>
                  <li><strong>Eliminar:</strong> Usa el botón <Trash2 className="w-3 h-3 inline" /> rojo para eliminar un tipo de auto (requiere confirmación)</li>
                  <li><strong>Gestionar plantillas:</strong> Usa el botón <Folder className="w-3 h-3 inline" /> morado para agregar/editar múltiples plantillas Word/PDF</li>
                  <li><strong>Activar/Desactivar:</strong> Usa el interruptor en la columna "Estado" para habilitar o deshabilitar un tipo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Filtros por Etapa */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltroEtapa('todas')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filtroEtapa === 'todas'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({tiposAutos.length})
            </button>
            
            {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[]).map((key) => {
              const etapa = ETAPAS_PROCESO[key];
              const count = autosPorEtapa[key]?.length || 0;
              const Icon = etapa.icon;
              
              return (
                <button
                  key={key}
                  onClick={() => setFiltroEtapa(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    filtroEtapa === key
                      ? 'text-white shadow-md'
                      : 'bg-white border-2 hover:shadow-sm'
                  }`}
                  style={{
                    backgroundColor: filtroEtapa === key ? etapa.color : undefined,
                    borderColor: filtroEtapa !== key ? etapa.color : undefined,
                    color: filtroEtapa !== key ? etapa.color : undefined
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {etapa.nombre} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla de Tipos de Autos */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Etapa
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nombre del Auto
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Descripción/Uso
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Plantillas
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tiposFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600 mb-2">
                      {filtroEtapa === 'todas' 
                        ? 'No hay tipos de autos configurados'
                        : `No hay tipos de autos para la etapa "${ETAPAS_PROCESO[filtroEtapa].nombre}"`
                      }
                    </p>
                    <button
                      onClick={onAgregar}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Crear primer tipo de auto
                    </button>
                  </td>
                </tr>
              ) : (
                tiposFiltrados
                  .sort((a, b) => {
                    // ✅ VALIDACIÓN: Manejar etapas que no existen en ETAPAS_PROCESO
                    const etapaA = ETAPAS_PROCESO[a.etapa];
                    const etapaB = ETAPAS_PROCESO[b.etapa];
                    
                    // Si alguna etapa no existe, colocarla al final
                    if (!etapaA && !etapaB) return a.orden - b.orden;
                    if (!etapaA) return 1;
                    if (!etapaB) return -1;
                    
                    const ordenA = etapaA.orden;
                    const ordenB = etapaB.orden;
                    if (ordenA !== ordenB) return ordenA - ordenB;
                    return a.orden - b.orden;
                  })
                  .map((tipo) => {
                    const etapa = ETAPAS_PROCESO[tipo.etapa];
                    
                    // ✅ VALIDACIÓN: Si la etapa no existe, usar valores por defecto
                    if (!etapa) {
                      console.warn(`⚠️ Etapa no encontrada: ${tipo.etapa} para el tipo de auto: ${tipo.nombre}`);
                      return null;
                    }
                    
                    const Icon = etapa.icon;
                    const plantillasActivas = tipo.plantillas.filter(p => p.activo).length;
                    
                    return (
                      <tr key={tipo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <button
                            onClick={() => onToggleActivo(tipo.id, !tipo.activo)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
                        </td>
                        
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                            style={{ backgroundColor: etapa.color }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {etapa.nombre}
                          </div>
                        </td>
                        
                        <td className="px-5 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {tipo.nombre}
                          </div>
                        </td>
                        
                        <td className="px-5 py-3 hidden lg:table-cell">
                          <div className="text-xs text-gray-600 max-w-md line-clamp-2">
                            {tipo.descripcion}
                          </div>
                        </td>
                        
                        <td className="px-5 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              plantillasActivas > 0 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Files className="w-3.5 h-3.5" />
                              {plantillasActivas} plantilla{plantillasActivas !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setVistaDetalles(tipo)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors font-semibold text-xs"
                              title="Ver información completa y plantillas"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden xl:inline">Ver</span>
                            </button>
                            <button
                              onClick={() => onGestionarPlantillas(tipo)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 border-2 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition-colors font-semibold text-xs"
                              title="Agregar, editar o eliminar plantillas de este tipo"
                            >
                              <Folder className="w-4 h-4" />
                              <span className="hidden xl:inline">Plantillas</span>
                            </button>
                            <button
                              onClick={() => onEditar(tipo)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors font-semibold text-xs"
                              title="Editar nombre, descripción y etapa del tipo de auto"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span className="hidden xl:inline">Editar</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Estás seguro de eliminar "${tipo.nombre}"?\n\nEsta acción eliminará el tipo de auto y todas sus plantillas asociadas.\n\nEsta acción NO se puede deshacer.`)) {
                                  onEliminar(tipo.id);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 transition-colors font-semibold text-xs"
                              title="Eliminar este tipo de auto y todas sus plantillas"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden xl:inline">Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Vista Detalles */}
      <AnimatePresence>
        {vistaDetalles && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{vistaDetalles.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {ETAPAS_PROCESO[vistaDetalles.etapa].nombre}
                  </p>
                </div>
                <button
                  onClick={() => setVistaDetalles(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-2">CUÁNDO USAR:</h4>
                    <p className="text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      {vistaDetalles.descripcion}
                    </p>
                  </div>

                  {/* Lista de Plantillas */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-gray-700">
                        PLANTILLAS DISPONIBLES ({vistaDetalles.plantillas.length}):
                      </h4>
                      <button
                        onClick={() => {
                          onGestionarPlantillas(vistaDetalles);
                          setVistaDetalles(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        Gestionar
                      </button>
                    </div>
                    
                    {vistaDetalles.plantillas.length === 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <Files className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          No hay plantillas configuradas para este tipo de auto
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vistaDetalles.plantillas
                          .filter(p => p.activo)
                          .map((plantilla) => (
                            <div key={plantilla.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <File className="w-7 h-7 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {plantilla.nombre}
                                    </p>
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                      v{plantilla.version}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-1">
                                    {plantilla.descripcion}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="font-medium">{plantilla.nombreArchivo}</span>
                                    <span>•</span>
                                    <span>{formatBytes(plantilla.tamano)}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(plantilla.fechaCreacion).toLocaleDateString('es-CO')}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDescargarPlantilla(plantilla)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Descargar
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 mb-2">ESTADO:</h4>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        vistaDetalles.activo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {vistaDetalles.activo ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            ACTIVO
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            INACTIVO
                          </>
                        )}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 mb-2">FECHA CREACIÓN:</h4>
                      <p className="text-sm text-gray-700">
                        {new Date(vistaDetalles.fechaCreacion).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Guía de Etapas */}
      <AnimatePresence>
        {mostrarGuia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div 
                className="px-5 py-4 flex items-center justify-between text-white"
                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
              >
                <div>
                  <h3 className="text-lg font-bold">Guía de Etapas del Proceso Disciplinario</h3>
                  <p className="text-sm mt-0.5 text-blue-100">
                    Conoce cuándo usar cada tipo de auto o providencia
                  </p>
                </div>
                <button
                  onClick={() => setMostrarGuia(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[])
                    .sort((a, b) => ETAPAS_PROCESO[a].orden - ETAPAS_PROCESO[b].orden)
                    .map((key) => {
                      const etapa = ETAPAS_PROCESO[key];
                      const Icon = etapa.icon;
                      const autosEtapa = autosPorEtapa[key] || [];
                      
                      return (
                        <div key={key} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: etapa.color }}>
                          <div 
                            className="px-4 py-3 flex items-center gap-2.5 text-white"
                            style={{ backgroundColor: etapa.color }}
                          >
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold">
                                {etapa.orden}. {etapa.nombre}
                              </h4>
                              <p className="text-xs text-white/90 mt-0.5">
                                {etapa.descripcion}
                              </p>
                            </div>
                            <div className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">
                              {autosEtapa.length} tipo{autosEtapa.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {autosEtapa.length > 0 && (
                            <div className="px-4 py-3 bg-gray-50">
                              <h5 className="text-xs font-bold text-gray-700 mb-2">TIPOS DE AUTOS CONFIGURADOS:</h5>
                              <div className="space-y-1.5">
                                {autosEtapa.map((auto) => (
                                  <div key={auto.id} className="bg-white rounded-lg p-2.5 border border-gray-200">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h6 className="text-sm font-semibold text-gray-900">{auto.nombre}</h6>
                                        <p className="text-xs text-gray-600 mt-0.5">{auto.descripcion}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <Files className="w-3 h-3 text-blue-600" />
                                          <span className="text-xs text-gray-700">{auto.plantillas.filter(p => p.activo).length} plantilla{auto.plantillas.filter(p => p.activo).length !== 1 ? 's' : ''}</span>
                                        </div>
                                      </div>
                                      {auto.activo ? (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                          ACTIVO
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                                          INACTIVO
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}