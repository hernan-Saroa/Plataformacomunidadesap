/**
 * SECCIÓN PLANTILLAS DE AUTOS - Configuración
 * ✅ Con etapas del proceso claramente definidas
 * ✅ Diseño corporativo ESAP Desktop-First (coherente con SeccionAutosProvidencias)
 * ✅ Colores corporativos ESAP (#2962FF, #003DA5, #F57C00)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Eye, X, FileText, AlertCircle, Save, 
  Info, HelpCircle, CheckCircle, Archive, Scale, FileCheck, Gavel, ToggleLeft, ToggleRight
} from 'lucide-react';
import { toast } from 'sonner';

// ============ ETAPAS DEL PROCESO DISCIPLINARIO ============
// ✅ Colores corporativos ESAP coherentes con el resto del sistema

export const ETAPAS_PROCESO = {
  NOTICIA: {
    id: 'noticia',
    nombre: 'Noticia/Queja',
    descripcion: 'Etapa inicial de recepción de quejas o denuncias',
    color: '#6B7280', // Gris
    icon: FileText,
    orden: 1
  },
  INDAGACION: {
    id: 'indagacion',
    nombre: 'Indagación Preliminar',
    descripcion: 'Se investiga si hay mérito para abrir proceso',
    color: '#3B82F6', // Azul
    icon: Info,
    orden: 2
  },
  INVESTIGACION: {
    id: 'investigacion',
    nombre: 'Investigación Disciplinaria',
    descripcion: 'Se recopilan pruebas y testimonios',
    color: '#2962FF', // Azul ESAP corporativo
    icon: FileCheck,
    orden: 3
  },
  CARGOS: {
    id: 'cargos',
    nombre: 'Formulación de Cargos',
    descripcion: 'Se formula el pliego de cargos al investigado',
    color: '#F59E0B', // Naranja
    icon: Scale,
    orden: 4
  },
  DESCARGOS: {
    id: 'descargos',
    nombre: 'Descargos y Pruebas',
    descripcion: 'El investigado presenta su defensa',
    color: '#8B5CF6', // Púrpura
    icon: FileText,
    orden: 5
  },
  FALLO: {
    id: 'fallo',
    nombre: 'Fallo/Decisión',
    descripcion: 'Se emite la decisión final del proceso',
    color: '#10B981', // Verde
    icon: Gavel,
    orden: 6
  },
  ARCHIVO: {
    id: 'archivo',
    nombre: 'Archivo',
    descripcion: 'Archivos en cualquier etapa del proceso',
    color: '#DC2626', // Rojo
    icon: Archive,
    orden: 7
  },
  GENERAL: {
    id: 'general',
    nombre: 'General/Transversal',
    descripcion: 'Autos que aplican en cualquier etapa',
    color: '#64748B', // Gris oscuro
    icon: CheckCircle,
    orden: 8
  }
} as const;

export type EtapaProcesoId = keyof typeof ETAPAS_PROCESO;

export interface PlantillaAuto {
  id: string;
  tipo: string;
  nombre: string;
  contenido: string;
  variables: string[];
  activo: boolean;
  etapa: EtapaProcesoId; // Nueva propiedad
  descripcionUso: string; // Nueva propiedad
}

interface SeccionPlantillasAutosProps {
  plantillas: PlantillaAuto[];
  onAgregar: () => void;
  onEditar: (plantilla: PlantillaAuto) => void;
  onEliminar: (id: string) => void;
  onToggleActivo: (id: string, activo: boolean) => void;
}

export function SeccionPlantillasAutos({ 
  plantillas, 
  onAgregar, 
  onEditar, 
  onEliminar, 
  onToggleActivo 
}: SeccionPlantillasAutosProps) {
  const [vistaPrevia, setVistaPrevia] = useState<PlantillaAuto | null>(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaProcesoId | 'todas'>('todas');

  // Agrupar plantillas por etapa
  const plantillasPorEtapa = Object.keys(ETAPAS_PROCESO).reduce((acc, key) => {
    const etapaId = key as EtapaProcesoId;
    acc[etapaId] = plantillas.filter(p => p.etapa === etapaId);
    return acc;
  }, {} as Record<EtapaProcesoId, PlantillaAuto[]>);

  const plantillasFiltradas = filtroEtapa === 'todas' 
    ? plantillas 
    : plantillas.filter(p => p.etapa === filtroEtapa);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header - Diseño compacto desktop-first coherente con ESAP */}
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
                    Plantillas de Autos (Texto)
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Gestiona plantillas de texto con variables por etapa del proceso
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
                Nueva Plantilla
              </button>
            </div>
          </div>

          {/* Filtros por Etapa - Compacto desktop-first */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltroEtapa('todas')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filtroEtapa === 'todas'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({plantillas.length})
            </button>
            
            {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[]).map((key) => {
              const etapa = ETAPAS_PROCESO[key];
              const count = plantillasPorEtapa[key]?.length || 0;
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

        {/* Tabla de Plantillas - Diseño compacto desktop-first */}
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
                  Tipo
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Nombre
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Cuándo Usar
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plantillasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-base text-gray-600 mb-3">
                      {filtroEtapa === 'todas' 
                        ? 'No hay plantillas configuradas'
                        : `No hay plantillas para la etapa "${ETAPAS_PROCESO[filtroEtapa].nombre}"`
                      }
                    </p>
                    <button
                      onClick={onAgregar}
                      className="text-base text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Crear primera plantilla
                    </button>
                  </td>
                </tr>
              ) : (
                plantillasFiltradas
                  .sort((a, b) => {
                    // Ordenar por etapa primero, luego por nombre
                    const etapaA = ETAPAS_PROCESO[a.etapa];
                    const etapaB = ETAPAS_PROCESO[b.etapa];
                    
                    // Si alguna etapa no existe, colocarla al final
                    if (!etapaA && !etapaB) return a.nombre.localeCompare(b.nombre);
                    if (!etapaA) return 1;
                    if (!etapaB) return -1;
                    
                    const ordenA = etapaA.orden;
                    const ordenB = etapaB.orden;
                    if (ordenA !== ordenB) return ordenA - ordenB;
                    return a.nombre.localeCompare(b.nombre);
                  })
                  .map((plantilla) => {
                    const etapa = ETAPAS_PROCESO[plantilla.etapa];
                    const Icon = etapa.icon;
                    
                    return (
                      <tr key={plantilla.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => onToggleActivo(plantilla.id, !plantilla.activo)}
                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                              plantilla.activo ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                plantilla.activo ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          <div 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                            style={{ backgroundColor: etapa.color }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {etapa.nombre}
                          </div>
                        </td>
                        
                        <td className="px-5 py-2.5">
                          <div className="text-sm font-semibold text-gray-900">
                            {plantilla.tipo}
                          </div>
                        </td>
                        
                        <td className="px-5 py-2.5 hidden md:table-cell">
                          <div className="text-sm text-gray-700">
                            {plantilla.nombre}
                          </div>
                        </td>
                        
                        <td className="px-5 py-2.5 hidden lg:table-cell">
                          <div className="text-xs text-gray-600 max-w-md">
                            {plantilla.descripcionUso || 'Sin descripción'}
                          </div>
                        </td>
                        
                        <td className="px-5 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setVistaPrevia(plantilla)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="Vista previa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEditar(plantilla)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
                                  onEliminar(plantilla.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Modal Vista Previa */}
      <AnimatePresence>
        {vistaPrevia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-gray-200 px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{vistaPrevia.nombre}</h3>
                  <p className="text-base text-gray-600 mt-1">
                    {vistaPrevia.tipo} • {ETAPAS_PROCESO[vistaPrevia.etapa].nombre}
                  </p>
                </div>
                <button
                  onClick={() => setVistaPrevia(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">CUÁNDO USAR:</h4>
                  <p className="text-base text-gray-700 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    {vistaPrevia.descripcionUso || 'Sin descripción'}
                  </p>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">VARIABLES DISPONIBLES:</h4>
                  <div className="flex flex-wrap gap-2">
                    {vistaPrevia.variables.map((variable) => (
                      <span
                        key={variable}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-mono"
                      >
                        {`{${variable}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2">CONTENIDO DE LA PLANTILLA:</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {vistaPrevia.contenido}
                    </pre>
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
              className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div 
                className="px-6 py-5 flex items-center justify-between text-white"
                style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
              >
                <div>
                  <h3 className="text-2xl font-bold">Guía de Etapas del Proceso Disciplinario</h3>
                  <p className="text-lg mt-1 text-blue-100">
                    Conoce cuándo usar cada tipo de auto o providencia
                  </p>
                </div>
                <button
                  onClick={() => setMostrarGuia(false)}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-6">
                  {(Object.keys(ETAPAS_PROCESO) as EtapaProcesoId[])
                    .sort((a, b) => ETAPAS_PROCESO[a].orden - ETAPAS_PROCESO[b].orden)
                    .map((key) => {
                      const etapa = ETAPAS_PROCESO[key];
                      const Icon = etapa.icon;
                      const plantillasEtapa = plantillasPorEtapa[key] || [];
                      
                      return (
                        <div key={key} className="border-2 rounded-xl overflow-hidden" style={{ borderColor: etapa.color }}>
                          <div 
                            className="px-6 py-4 flex items-center gap-3 text-white"
                            style={{ backgroundColor: etapa.color }}
                          >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold">
                                {etapa.orden}. {etapa.nombre}
                              </h4>
                              <p className="text-sm text-white/90 mt-0.5">
                                {etapa.descripcion}
                              </p>
                            </div>
                            <div className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                              {plantillasEtapa.length} plantilla{plantillasEtapa.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {plantillasEtapa.length > 0 && (
                            <div className="px-6 py-4 bg-gray-50">
                              <h5 className="text-sm font-bold text-gray-700 mb-3">PLANTILLAS CONFIGURADAS:</h5>
                              <div className="space-y-2">
                                {plantillasEtapa.map((p) => (
                                  <div key={p.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h6 className="text-base font-semibold text-gray-900">{p.tipo}</h6>
                                        <p className="text-sm text-gray-600 mt-1">{p.descripcionUso}</p>
                                      </div>
                                      {p.activo ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                          ACTIVO
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
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