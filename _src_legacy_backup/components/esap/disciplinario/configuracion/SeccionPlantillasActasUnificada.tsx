/**
 * SECCIÓN PLANTILLAS DE ACTAS UNIFICADA - Control Interno Disciplinario
 * Gestión completa de Tipos de Actas + Plantillas en una sola vista
 * ✅ Integra gestión de tipos de actas con sus plantillas
 * ✅ Diseño corporativo ESAP Desktop-First optimizado
 * ✅ Responsive mobile-friendly
 * ✅ MÚLTIPLES PLANTILLAS POR TIPO DE ACTA
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Download, X, FileText, AlertCircle, 
  Info, HelpCircle, CheckCircle, ClipboardList, Users, Mic, 
  File, Folder, Eye, Files, Clock, ChevronDown, ChevronRight,
  FileSignature, Gavel
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS DE ACTAS ============

export const TIPOS_ACTAS = {
  INICIO: {
    id: 'INICIO',
    nombre: 'Acta de Inicio de Diligencia',
    descripcion: 'Registra el inicio formal de una diligencia procesal',
    color: '#3B82F6',
    icon: ClipboardList,
    orden: 1
  },
  PRUEBAS: {
    id: 'PRUEBAS',
    nombre: 'Acta de Práctica de Pruebas',
    descripcion: 'Documenta la práctica de pruebas solicitadas',
    color: '#2962FF',
    icon: FileSignature,
    orden: 2
  },
  AUDIENCIA: {
    id: 'AUDIENCIA',
    nombre: 'Acta de Audiencia',
    descripcion: 'Registra el desarrollo de audiencias procesales',
    color: '#8B5CF6',
    icon: Users,
    orden: 3
  },
  VERSION: {
    id: 'VERSION',
    nombre: 'Acta de Versión Libre',
    descripcion: 'Documenta la versión libre rendida por el investigado',
    color: '#F59E0B',
    icon: Mic,
    orden: 4
  },
  DESCARGOS: {
    id: 'DESCARGOS',
    nombre: 'Acta de Descargos',
    descripcion: 'Registra la presentación de descargos del investigado',
    color: '#10B981',
    icon: FileText,
    orden: 5
  },
  CIERRE: {
    id: 'CIERRE',
    nombre: 'Acta de Cierre',
    descripcion: 'Documenta el cierre formal de una etapa procesal',
    color: '#DC2626',
    icon: Gavel,
    orden: 6
  }
} as const;

export type TipoActaId = keyof typeof TIPOS_ACTAS;

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
}

export interface TipoActa {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoActaId;
  plantillas: PlantillaArchivo[];
  activo: boolean;
  orden: number;
  fechaCreacion: string;
  fechaModificacion: string;
}

interface SeccionPlantillasActasUnificadaProps {
  tiposActas: TipoActa[];
  onAgregarTipo: () => void;
  onEditarTipo: (tipo: TipoActa) => void;
  onEliminarTipo: (id: string) => void;
  onToggleActivoTipo: (id: string, activo: boolean) => void;
  onGestionarPlantillas: (tipo: TipoActa) => void;
}

export function SeccionPlantillasActasUnificada({
  tiposActas,
  onAgregarTipo,
  onEditarTipo,
  onEliminarTipo,
  onToggleActivoTipo,
  onGestionarPlantillas
}: SeccionPlantillasActasUnificadaProps) {
  const [filtroTipo, setFiltroTipo] = useState<TipoActaId | 'todas'>('todas');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [tipoExpandido, setTipoExpandido] = useState<string | null>(null);
  const [vistaDetalles, setVistaDetalles] = useState<TipoActa | null>(null);

  // Validación defensiva
  const tiposActasValidos = tiposActas || [];

  const tiposFiltrados = filtroTipo === 'todas' 
    ? tiposActasValidos 
    : tiposActasValidos.filter(t => t.tipo === filtroTipo);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDescargarPlantilla = (plantilla: PlantillaArchivo) => {
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
                     style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                  <ClipboardList className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base lg:text-lg font-bold text-gray-900">
                    Actas y Plantillas
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-0.5 line-clamp-1">
                    Gestiona tipos de actas y sus plantillas Word/PDF
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => setMostrarGuia(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm border-2 border-amber-200 text-amber-700 hover:bg-amber-50 transition-all flex-1 lg:flex-initial"
              >
                <HelpCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Ver Guía</span>
                <span className="sm:hidden">Guía</span>
              </button>
              
              <button
                onClick={onAgregarTipo}
                className="flex items-center justify-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg font-semibold text-xs lg:text-sm text-white transition-all hover:shadow-lg flex-1 lg:flex-initial"
                style={{ 
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                }}
              >
                <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Nueva Acta</span>
                <span className="sm:hidden">Nueva</span>
              </button>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="mt-3 lg:mt-4 bg-amber-50 border-l-4 border-amber-500 p-2.5 lg:p-3 rounded">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs lg:text-sm text-amber-900">
                <p className="font-semibold mb-1">Sistema de gestión de actas</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li><strong>Crear tipos:</strong> Define los tipos de actas (Audiencia, Versión Libre, etc.)</li>
                  <li><strong>Agregar plantillas:</strong> Cada tipo puede tener múltiples archivos Word/PDF</li>
                  <li><strong>Expandir/Contraer:</strong> Haz clic en un tipo para ver todas sus plantillas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Filtros por Tipo */}
          <div className="mt-3 lg:mt-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltroTipo('todas')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                filtroTipo === 'todas'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({tiposActasValidos.length})
            </button>
            
            {(Object.keys(TIPOS_ACTAS) as TipoActaId[])
              .sort((a, b) => TIPOS_ACTAS[a].orden - TIPOS_ACTAS[b].orden)
              .map((key) => {
                const tipo = TIPOS_ACTAS[key];
                const count = tiposActasValidos.filter(t => t.tipo === key).length;
                const Icon = tipo.icon;
                
                if (count === 0) return null;
                
                return (
                  <button
                    key={key}
                    onClick={() => setFiltroTipo(key)}
                    className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1 lg:gap-1.5 ${
                      filtroTipo === key
                        ? 'text-white shadow-md'
                        : 'bg-white border-2 hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: filtroTipo === key ? tipo.color : undefined,
                      borderColor: filtroTipo !== key ? tipo.color : undefined,
                      color: filtroTipo !== key ? tipo.color : undefined
                    }}
                  >
                    <Icon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    <span className="hidden sm:inline">{tipo.nombre.replace('Acta de ', '')}</span>
                    <span className="sm:hidden">{tipo.nombre.split(' ')[2] || tipo.nombre.split(' ')[0]}</span>
                    ({count})
                  </button>
                );
              })}
          </div>
        </div>

        {/* Lista de Tipos de Actas */}
        <div className="p-3 lg:p-5">
          {tiposFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-600 mb-2">
                {filtroTipo === 'todas' 
                  ? 'No hay tipos de actas configurados'
                  : `No hay actas de tipo "${TIPOS_ACTAS[filtroTipo].nombre}"`
                }
              </p>
              <button
                onClick={onAgregarTipo}
                className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
              >
                Crear primera acta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tiposFiltrados
                .sort((a, b) => {
                  const tipoA = TIPOS_ACTAS[a.tipo];
                  const tipoB = TIPOS_ACTAS[b.tipo];
                  if (!tipoA || !tipoB) return 0;
                  if (tipoA.orden !== tipoB.orden) return tipoA.orden - tipoB.orden;
                  return a.orden - b.orden;
                })
                .map((acta) => {
                  const tipo = TIPOS_ACTAS[acta.tipo];
                  if (!tipo) return null;
                  
                  const Icon = tipo.icon;
                  const plantillasActivas = acta.plantillas.filter(p => p.activo).length;
                  const expandido = tipoExpandido === acta.id;
                  
                  return (
                    <div 
                      key={acta.id}
                      className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-amber-300 transition-all bg-gradient-to-br from-amber-50/30 to-white"
                    >
                      {/* Header del Tipo de Acta */}
                      <div className="p-3 lg:p-4">
                        <div className="flex items-start gap-2 lg:gap-3">
                          {/* Botón Expandir/Contraer */}
                          <button
                            onClick={() => toggleExpandirTipo(acta.id)}
                            className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
                          >
                            {expandido ? (
                              <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                            )}
                          </button>

                          {/* Icono de Tipo */}
                          <div 
                            className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: tipo.color }}
                          >
                            <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                          </div>

                          {/* Contenido Principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 lg:gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm lg:text-base font-bold text-gray-900 mb-1 line-clamp-2">
                                  {acta.nombre}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                  <span 
                                    className="px-2 py-0.5 rounded font-semibold text-white"
                                    style={{ backgroundColor: tipo.color }}
                                  >
                                    {tipo.nombre.replace('Acta de ', '')}
                                  </span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className={`px-2 py-0.5 rounded font-semibold ${
                                    plantillasActivas > 0 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <Files className="w-3 h-3 inline mr-1" />
                                    {plantillasActivas} plantilla{plantillasActivas !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                                  {acta.descripcion}
                                </p>
                              </div>

                              {/* Toggle Activo */}
                              <button
                                onClick={() => onToggleActivoTipo(acta.id, !acta.activo)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                                  acta.activo ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                title={acta.activo ? 'Activo' : 'Inactivo'}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    acta.activo ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                              <button
                                onClick={() => onGestionarPlantillas(acta)}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-amber-50 border-2 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors font-semibold text-xs"
                              >
                                <Folder className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Gestionar Plantillas</span>
                                <span className="sm:hidden">Plantillas</span>
                              </button>
                              <button
                                onClick={() => onEditarTipo(acta)}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors font-semibold text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Editar</span>
                              </button>
                              <button
                                onClick={() => setVistaDetalles(acta)}
                                className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors font-semibold text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Ver</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar "${acta.nombre}"?\n\nSe eliminará el tipo y todas sus plantillas.\n\nEsta acción NO se puede deshacer.`)) {
                                    onEliminarTipo(acta.id);
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
                              {acta.plantillas.length === 0 ? (
                                <div className="text-center py-6">
                                  <Files className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-xs lg:text-sm text-gray-600 mb-2">
                                    No hay plantillas configuradas
                                  </p>
                                  <button
                                    onClick={() => onGestionarPlantillas(acta)}
                                    className="text-xs lg:text-sm text-amber-600 hover:text-amber-700 font-semibold"
                                  >
                                    Agregar primera plantilla
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <Files className="w-4 h-4" />
                                    PLANTILLAS DISPONIBLES ({acta.plantillas.filter(p => p.activo).length})
                                  </h4>
                                  {acta.plantillas
                                    .filter(p => p.activo)
                                    .map((plantilla) => (
                                      <div 
                                        key={plantilla.id} 
                                        className="bg-white border border-gray-200 rounded-lg p-2.5 lg:p-3 hover:border-amber-300 transition-all"
                                      >
                                        <div className="flex items-start gap-2 lg:gap-3">
                                          <File className="w-6 h-6 lg:w-7 lg:h-7 text-amber-600 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 mb-1">
                                              <p className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                                                {plantilla.nombre}
                                              </p>
                                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                                                v{plantilla.version}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                              {plantilla.descripcion}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                              <span className="font-medium truncate">{plantilla.nombreArchivo}</span>
                                              <span className="hidden sm:inline">•</span>
                                              <span>{formatBytes(plantilla.tamano)}</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleDescargarPlantilla(plantilla)}
                                            className="flex items-center gap-1 lg:gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-semibold text-xs text-white transition-all hover:shadow-lg flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            <span className="hidden lg:inline">Descargar</span>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
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

      {/* Modales simplificados */}
      {vistaDetalles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="border-b px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{vistaDetalles.nombre}</h3>
              <button onClick={() => setVistaDetalles(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 mb-4">{vistaDetalles.descripcion}</p>
              <h4 className="text-xs font-bold mb-2">PLANTILLAS ({vistaDetalles.plantillas.filter(p => p.activo).length})</h4>
              {vistaDetalles.plantillas.filter(p => p.activo).map(p => (
                <div key={p.id} className="bg-gray-50 border p-3 rounded-lg mb-2">
                  <p className="font-semibold text-sm">{p.nombre}</p>
                  <p className="text-xs text-gray-600">{p.nombreArchivo}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {mostrarGuia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full"
          >
            <div 
              className="px-5 py-4 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            >
              <h3 className="text-lg font-bold">Guía de Actas</h3>
              <button onClick={() => setMostrarGuia(false)} className="p-1.5 rounded-lg hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm">Gestiona los tipos de actas procesales y sus plantillas asociadas.</p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
