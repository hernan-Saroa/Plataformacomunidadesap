/**
 * SECCIÓN PLANTILLAS DE AUTOS - Control Interno Disciplinario
 * Gestión de Tipos de Autos con UNA plantilla por tipo
 * ✅ Diseño corporativo ESAP Desktop-First optimizado
 * ✅ Flujo simplificado: 1 Tipo = 1 Plantilla
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Download, Upload, X, FileText, AlertCircle, 
  Info, HelpCircle, CheckCircle, Archive, Scale, FileCheck, Gavel,
  File, Folder, Eye, Clock, ChevronLeft, ChevronRight, ChevronDown,
  Files
} from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../../services/api/disciplinary.service';

// ============ ETAPAS DEL PROCESO DISCIPLINARIO ============

export const ETAPAS_PROCESO = {
  RECEPCION: {
    id: 'RECEPCION',
    nombre: 'Recepción',
    descripcion: 'Recepción de la queja o noticia',
    color: '#6B7280',
    icon: FileText,
    orden: 0
  },
  INDAGACION_PREVIA: {
    id: 'INDAGACION_PREVIA',
    nombre: 'Indagación Previa',
    descripcion: 'Verificación preliminar de los hechos',
    color: '#8B5CF6',
    icon: Info,
    orden: 1
  },
  INDAGACION: {
    id: 'INDAGACION',
    nombre: 'Indagación',
    descripcion: 'Indagación preliminar para determinar si hay mérito para abrir proceso',
    color: '#3B82F6',
    icon: Info,
    orden: 2
  },
  INVESTIGACION: {
    id: 'INVESTIGACION',
    nombre: 'Investigación Disciplinaria',
    descripcion: 'Se recopilan pruebas y testimonios',
    color: '#2962FF',
    icon: FileCheck,
    orden: 3
  },
  EVALUACION: {
    id: 'EVALUACION',
    nombre: 'Evaluación y Análisis',
    descripcion: 'Evaluación de la investigación',
    color: '#F59E0B',
    icon: Scale,
    orden: 4
  },
  CARGOS: {
    id: 'CARGOS',
    nombre: 'Formulación de Cargos',
    descripcion: 'Se formula el pliego de cargos al investigado',
    color: '#F97316',
    icon: Scale,
    orden: 5
  },
  JUZGAMIENTO: {
    id: 'JUZGAMIENTO',
    nombre: 'Juzgamiento',
    descripcion: 'Diligencias de descargos y práctica de pruebas',
    color: '#DC2626',
    icon: Gavel,
    orden: 6
  },
  FALLO: {
    id: 'FALLO',
    nombre: 'Fallo/Decisión',
    descripcion: 'Se emite la decisión final del proceso',
    color: '#10B981',
    icon: Gavel,
    orden: 7
  },
  SEGUNDA_INSTANCIA: {
    id: 'SEGUNDA_INSTANCIA',
    nombre: 'Segunda Instancia',
    descripcion: 'Recurso de apelación',
    color: '#059669',
    icon: FileCheck,
    orden: 8
  },
  ARCHIVO: {
    id: 'ARCHIVO',
    nombre: 'Archivo',
    descripcion: 'Archivos en cualquier etapa del proceso',
    color: '#DC2626',
    icon: Archive,
    orden: 9
  }
} as const;

export type EtapaProcesoId = keyof typeof ETAPAS_PROCESO;

// ============ INTERFACES ============

export interface PlantillaArchivo {
  id: string;
  nombre: string;
  nombreArchivo: string;
  descripcion: string;
  url: string;
  tamano: number;
  tipoArchivo?: string;
  version: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  activo: boolean;
}

export interface TipoAuto {
  id: string;
  nombre: string;
  etapa: string; // Changed from EtapaProcesoId to string for dynamic stages
  plantilla: PlantillaArchivo | null; // ✅ SOLO UNA PLANTILLA POR TIPO
  activo: boolean;
  orden: number;
  fechaCreacion: string;
  fechaModificacion: string;
  tipo?: string; // ✅ Tipo de auto del backend (ej: AUTO_APERTURA_INVESTIGACION)
  // ✅ Campos de plantilla desde autos_configuration
  plantillaUrl?: string | null; // URL de la plantilla
  nombre_plantilla?: string | null;
  descripcion_plantilla?: string | null;
  version_plantilla?: string | null;
  estado_plantilla?: string | null;
}

interface SeccionPlantillasAutosUnificadaProps {
  tiposAutos: TipoAuto[];
  onAgregarTipo: () => void;
  onEditarTipo: (tipo: TipoAuto) => void;
  onEliminarTipo: (id: string) => void;
  onToggleActivoTipo: (id: string, activo: boolean) => void;
  onGestionarPlantilla: (tipo: TipoAuto) => void;
}

export function SeccionPlantillasAutosUnificada({
  tiposAutos,
  onAgregarTipo,
  onEditarTipo,
  onEliminarTipo,
  onToggleActivoTipo,
  onGestionarPlantilla
}: SeccionPlantillasAutosUnificadaProps) {
  const [filtroEtapa, setFiltroEtapa] = useState<string | 'todas'>('todas');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [tipoExpandido, setTipoExpandido] = useState<string | null>(null);
  const [vistaDetalles, setVistaDetalles] = useState<TipoAuto | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  // Validación defensiva
  const tiposAutosValidos = tiposAutos || [];

  const tiposFiltrados = filtroEtapa === 'todas' 
    ? tiposAutosValidos 
    : tiposAutosValidos.filter(t => t.etapa === filtroEtapa);

  // Paginación
  const totalPaginas = Math.ceil(tiposFiltrados.length / ITEMS_POR_PAGINA);
  const tiposPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return tiposFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [tiposFiltrados, paginaActual]);

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEtapa]);

  // Función helper para obtener nombre de etapa
  const getEtapaNombre = (etapaId: string): string => {
    const etapa = ETAPAS_PROCESO[etapaId as keyof typeof ETAPAS_PROCESO];
    return etapa ? etapa.nombre : etapaId;
  };

  const handleDescargarPlantilla = async (plantilla: PlantillaArchivo) => {
    if (!plantilla?.url) {
      toast.error('No hay archivo para descargar', {
        description: 'La plantilla no tiene un archivo asociado'
      });
      return;
    }
    
    try {
      // Usar el servicio de descarga del disciplinary service
      await disciplinaryService.downloadFileFromUrl(plantilla.url, plantilla.nombreArchivo);
      toast.success('Plantilla descargada', {
        description: plantilla.nombreArchivo
      });
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      toast.error('Error al descargar', {
        description: 'No se pudo descargar el archivo'
      });
    }
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
                     style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                  <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base lg:text-lg font-bold text-gray-900">
                    Autos y Plantillas
                  </h2>
                  <p className="text-xs lg:text-sm text-gray-600 mt-0.5 line-clamp-1">
                    Configura los tipos de autos con su plantilla Word/PDF
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => setMostrarGuia(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-all flex-1 lg:flex-initial"
              >
                <HelpCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Ver Guía</span>
                <span className="sm:hidden">Guía</span>
              </button>
              
              <button
                onClick={onAgregarTipo}
                className="flex items-center justify-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg font-semibold text-xs lg:text-sm text-white transition-all hover:shadow-lg flex-1 lg:flex-initial"
                style={{ 
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                  boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                }}
              >
                <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Nuevo Tipo de Auto</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="mt-3 lg:mt-4 bg-blue-50 border-l-4 border-blue-500 p-2.5 lg:p-3 rounded">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs lg:text-sm text-blue-900">
                <p className="font-semibold mb-1">Sistema de gestión de autos</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li><strong>Crear tipos:</strong> Define el tipo de auto (ej: "Auto de Apertura de Investigación")</li>
                  <li><strong>Subir plantilla:</strong> Cada tipo tiene UNA plantilla Word/PDF asociada</li>
                  <li><strong>Expandir/Contraer:</strong> Haz clic para ver la plantilla del tipo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Filtros por Etapa */}
          <div className="mt-3 lg:mt-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltroEtapa('todas')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                filtroEtapa === 'todas'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({tiposAutosValidos.length})
            </button>
            
            {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[])
              .sort((a, b) => ETAPAS_PROCESO[a].orden - ETAPAS_PROCESO[b].orden)
              .map((key) => {
                const etapa = ETAPAS_PROCESO[key];
                const count = tiposAutosValidos.filter(t => t.etapa === key).length;
                const Icon = etapa.icon;
                
                if (count === 0) return null;
                
                return (
                  <button
                    key={key}
                    onClick={() => setFiltroEtapa(key)}
                    className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1 lg:gap-1.5 ${
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
                    <Icon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    <span className="hidden sm:inline">{etapa.nombre}</span>
                    <span className="sm:hidden">{etapa.nombre.split(' ')[0]}</span>
                    ({count})
                  </button>
                );
              })}
          </div>
        </div>

        {/* Lista de Tipos de Autos */}
        <div className="p-3 lg:p-5">
          {tiposFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm text-gray-600 mb-2">
                {filtroEtapa === 'todas' 
                  ? 'No hay tipos de autos configurados'
                  : `No hay tipos de autos para "${getEtapaNombre(filtroEtapa)}"`
                }
              </p>
              <button
                onClick={onAgregarTipo}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                Crear primer tipo de auto
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tiposPaginados
                .sort((a, b) => {
                  const etapaA = ETAPAS_PROCESO[a.etapa];
                  const etapaB = ETAPAS_PROCESO[b.etapa];
                  if (!etapaA || !etapaB) return 0;
                  if (etapaA.orden !== etapaB.orden) return etapaA.orden - etapaB.orden;
                  return a.orden - b.orden;
                })
                .map((tipo) => {
                  const etapa = ETAPAS_PROCESO[tipo.etapa];
                  if (!etapa) return null;
                  
                  const Icon = etapa.icon;
                  const plantillasActivas = tipo.plantilla ? 1 : 0;
                  const expandido = tipoExpandido === tipo.id;
                  
                  return (
                    <div 
                      key={tipo.id}
                      className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all bg-gradient-to-br from-blue-50/30 to-white"
                    >
                      {/* Header del Tipo de Auto */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Botón Expandir/Contraer */}
                          <button
                            onClick={() => toggleExpandirTipo(tipo.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mt-0.5"
                          >
                            {expandido ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                          </button>

                          {/* Icono de Etapa */}
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: etapa.color }}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>

                          {/* Contenido Principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900 mb-1">
                                  {tipo.nombre}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
                                  <span 
                                    className="px-2 py-0.5 rounded font-semibold text-white"
                                    style={{ backgroundColor: etapa.color }}
                                  >
                                    {etapa.nombre}
                                  </span>
                                  <span>•</span>
                                  <span className={`px-2 py-0.5 rounded font-semibold ${
                                    plantillasActivas > 0 
                                      ? 'bg-blue-100 text-blue-700' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <Files className="w-3 h-3 inline mr-1" />
                                    {plantillasActivas} plantilla{plantillasActivas !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  Tipo: {tipo.tipo || 'Sin tipo definido'}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => onGestionarPlantilla(tipo)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 hover:shadow-sm transition-colors font-semibold text-xs ${
                                  tipo.plantilla
                                    ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                                    : 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                                }`}
                              >
                                <Folder className="w-3.5 h-3.5" />
                                {tipo.plantilla ? 'Gestionar Plantilla' : 'Subir Plantilla'}
                              </button>
                              <button
                                onClick={() => onEditarTipo(tipo)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors font-semibold text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => setVistaDetalles(tipo)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-semibold text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Ver
                              </button>
                              <button
                                onClick={() => onEliminarTipo(tipo.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 border-2 border-red-300 text-red-700 hover:bg-red-100 transition-colors font-semibold text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar
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
                            <div className="p-4">
                              {tipo.plantilla ? (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                    <Files className="w-4 h-4" />
                                    PLANTILLA CONFIGURADA
                                  </h4>
                                  <div 
                                    key={tipo.plantilla.id} 
                                    className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-all"
                                  >
                                    <div className="flex items-start gap-3">
                                      <File className="w-7 h-7 text-blue-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                          <p className="text-sm font-semibold text-gray-900 truncate">
                                            {tipo.plantilla.nombre}
                                          </p>
                                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                            v{tipo.plantilla.version}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                          {tipo.plantilla.descripcion}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                          <span className="font-medium truncate">{tipo.plantilla.nombreArchivo}</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDescargarPlantilla(tipo.plantilla!)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white transition-all hover:shadow-lg flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Descargar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <Files className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-600 mb-2">
                                    No hay plantilla configurada
                                  </p>
                                  <button
                                    onClick={() => onGestionarPlantilla(tipo)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                                  >
                                    Subir primera plantilla
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

          {/* Controles de Paginación */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold">{(paginaActual - 1) * ITEMS_POR_PAGINA + 1}</span> a{' '}
                <span className="font-semibold">{Math.min(paginaActual * ITEMS_POR_PAGINA, tiposFiltrados.length)}</span> de{' '}
                <span className="font-semibold">{tiposFiltrados.length}</span> resultados
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setPaginaActual(p)}
                          className={`w-8 h-8 rounded-lg font-semibold text-sm transition-colors ${
                            p === paginaActual
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>
                <button
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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
              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{vistaDetalles.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-0.5 truncate">
                    {ETAPAS_PROCESO[vistaDetalles.etapa].nombre}
                  </p>
                </div>
                <button
                  onClick={() => setVistaDetalles(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)] space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">TIPO:</h4>
                  <p className="text-sm text-gray-700 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    {vistaDetalles.tipo || 'Sin tipo definido'}
                  </p>
                </div>

                {/* Plantilla */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-700">PLANTILLA CONFIGURADA:</h4>
                    <button
                      onClick={() => {
                        onGestionarPlantilla(vistaDetalles);
                        setVistaDetalles(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {vistaDetalles.plantilla ? 'Cambiar' : 'Subir'}
                    </button>
                  </div>
                  
                  {!vistaDetalles.plantilla ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 text-center">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 text-yellow-600" />
                      <p className="text-sm text-yellow-800 font-semibold">
                        No hay plantilla configurada
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Sube un archivo Word (.docx) o PDF como plantilla
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <File className="w-8 h-8 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {vistaDetalles.plantilla.nombre}
                            </p>
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                              v{vistaDetalles.plantilla.version}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {vistaDetalles.plantilla.descripcion}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="font-medium">{vistaDetalles.plantilla.nombreArchivo}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(vistaDetalles.plantilla.fechaCreacion).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDescargarPlantilla(vistaDetalles.plantilla!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white transition-all hover:shadow-lg flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Guía */}
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
                  <h3 className="text-lg font-bold">Guía de Uso - Plantillas de Autos</h3>
                  <p className="text-sm mt-0.5 text-blue-100">
                    Aprende a configurar tipos de autos y sus plantillas
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
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">1. Crear Tipo de Auto</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-blue-800 ml-2">
                      <li>Haz clic en "Nuevo Tipo de Auto"</li>
                      <li>Define el nombre (ej: "Auto de Apertura de Investigación")</li>
                      <li>Selecciona la etapa del proceso disciplinario</li>
                      <li>Escribe una descripción clara de cuándo usar este tipo</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                    <h4 className="text-sm font-bold text-purple-900 mb-2">2. Subir Plantilla</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-purple-800 ml-2">
                      <li>Cada tipo de auto tiene UNA sola plantilla asociada</li>
                      <li>Usa el botón "Subir Plantilla" para cargar el archivo Word (.docx) o PDF</li>
                      <li>La plantilla debe tener los campos que se diligenciarán manualmente</li>
                      <li>Puedes cambiar la plantilla en cualquier momento</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                    <h4 className="text-sm font-bold text-green-900 mb-2">3. Usar en Procesos</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-green-800 ml-2">
                      <li>Ve al módulo de Procesos Disciplinarios</li>
                      <li>Selecciona el proceso y crea un nuevo auto</li>
                      <li>Descarga la plantilla del tipo de auto seleccionado</li>
                      <li>Diligéncia la plantilla en tu PC con los datos específicos del caso</li>
                      <li>Sube el archivo completado como documento adjunto al auto</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      Etapas del Proceso Disciplinario
                    </h4>
                    <div className="space-y-2 text-xs">
                      {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[])
                        .sort((a, b) => ETAPAS_PROCESO[a].orden - ETAPAS_PROCESO[b].orden)
                        .map((key) => {
                          const etapa = ETAPAS_PROCESO[key];
                          const Icon = etapa.icon;
                          return (
                            <div key={key} className="flex items-start gap-2">
                              <div 
                                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: etapa.color }}
                              >
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{etapa.nombre}</p>
                                <p className="text-gray-600">{etapa.descripcion}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
