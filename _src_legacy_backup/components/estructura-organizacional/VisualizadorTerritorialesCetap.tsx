/**
 * COMPONENTE: VISUALIZADOR DE TERRITORIALES Y CETAP
 * Muestra la estructura organizacional completa con territoriales y sus CETAP
 * CETAP: Centro Territorial de Administración Pública
 * Basado en información oficial ESAP 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Grid3x3,
  List,
  Download,
  Eye,
  Map as MapIcon
} from 'lucide-react';
import { TERRITORIALES_ESAP, obtenerEstadisticasEstructura, type TerritorialInfo } from '../../data/territoriales-cetap-completo';

interface VisualizadorTerritorialesCetapProps {
  onCetapSelect?: (cetapId: string, territorialId: string) => void;
  modo?: 'grid' | 'list';
}

export function VisualizadorTerritorialesCetap({ 
  onCetapSelect,
  modo: modoInicial = 'list' 
}: VisualizadorTerritorialesCetapProps) {
  const [expandedTerritorial, setExpandedTerritorial] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modo, setModo] = useState<'grid' | 'list'>(modoInicial);

  const estadisticas = obtenerEstadisticasEstructura();

  // Filtrar territoriales por búsqueda
  const territorialesFiltradas = TERRITORIALES_ESAP.filter(territorial => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      territorial.nombre.toLowerCase().includes(query) ||
      territorial.nombreCorto.toLowerCase().includes(query) ||
      territorial.ciudadPrincipal.toLowerCase().includes(query) ||
      territorial.departamentos.some(dep => dep.toLowerCase().includes(query)) ||
      territorial.cetap.some(cetap => 
        cetap.nombre.toLowerCase().includes(query) ||
        cetap.ciudad?.toLowerCase().includes(query)
      )
    );
  });

  const toggleTerritorial = (territorialId: string) => {
    setExpandedTerritorial(expandedTerritorial === territorialId ? null : territorialId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Estructura Organizacional ESAP
          </h2>
          <p className="text-sm text-gray-600">
            {estadisticas.totalTerritoriales} territoriales • {estadisticas.totalCetap} CETAP en todo el país
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Vista Grid/List */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setModo('list')}
              className={`p-2 rounded-md transition-colors ${
                modo === 'list' 
                  ? 'bg-white text-[#003DA5] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setModo('grid')}
              className={`p-2 rounded-md transition-colors ${
                modo === 'grid' 
                  ? 'bg-white text-[#003DA5] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>

          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar territorial, CETAP, ciudad o departamento..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#003DA5] focus:outline-none transition-colors"
        />
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{estadisticas.totalTerritoriales}</p>
              <p className="text-xs text-blue-700">Territoriales</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">{estadisticas.totalCetap}</p>
              <p className="text-xs text-green-700">CETAP Totales</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-900">32</p>
              <p className="text-xs text-purple-700">Departamentos</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-900">{territorialesFiltradas.length}</p>
              <p className="text-xs text-orange-700">Visibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Territoriales */}
      {modo === 'list' ? (
        <div className="space-y-3">
          {territorialesFiltradas.map((territorial, index) => (
            <motion.div
              key={territorial.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#003DA5] transition-colors"
            >
              {/* Header Territorial */}
              <button
                onClick={() => toggleTerritorial(territorial.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                      boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
                    }}
                  >
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="text-left">
                    <h3 className="font-bold text-lg text-gray-900">
                      {territorial.nombreCorto}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {territorial.ciudadPrincipal}
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-sm text-gray-600">
                        {territorial.totalCetap} CETAP
                      </p>
                      <span className="text-gray-400">•</span>
                      <p className="text-sm text-gray-500">
                        {territorial.departamentos.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {territorial.totalCetap} CETAP
                  </div>
                  {expandedTerritorial === territorial.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* CETAP - Expandible */}
              <AnimatePresence>
                {expandedTerritorial === territorial.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t-2 border-gray-100 bg-gray-50"
                  >
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                        CETAP ({territorial.totalCetap})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {territorial.cetap.map((cetap) => (
                          <button
                            key={cetap.id}
                            onClick={() => onCetapSelect?.(cetap.id, territorial.id)}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-[#003DA5] hover:shadow-sm transition-all text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                              <Building2 className="w-4 h-4 text-gray-600 group-hover:text-[#003DA5]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {cetap.nombre.replace('CETAP ', '')}
                              </p>
                              {cetap.ciudad && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  {cetap.ciudad}
                                </p>
                              )}
                            </div>
                            {cetap.tipo === 'principal' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium flex-shrink-0">
                                Principal
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        // Vista Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {territorialesFiltradas.map((territorial, index) => (
            <motion.div
              key={territorial.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-[#003DA5] hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                    boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
                  }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {territorial.totalCetap} CETAP
                </div>
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {territorial.nombreCorto}
              </h3>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{territorial.ciudadPrincipal}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {territorial.departamentos.join(', ')}
                </p>
              </div>

              <button
                onClick={() => toggleTerritorial(territorial.id)}
                className="w-full py-2 bg-gray-100 hover:bg-[#003DA5] hover:text-white text-gray-700 rounded-lg font-medium transition-colors text-sm"
              >
                {expandedTerritorial === territorial.id ? 'Ocultar' : 'Ver'} CETAP
              </button>

              {/* CETAP en grid card */}
              <AnimatePresence>
                {expandedTerritorial === territorial.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 pt-4 border-t border-gray-200 max-h-64 overflow-y-auto"
                  >
                    <div className="space-y-2">
                      {territorial.cetap.map((cetap) => (
                        <button
                          key={cetap.id}
                          onClick={() => onCetapSelect?.(cetap.id, territorial.id)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors text-left group"
                        >
                          <Building2 className="w-4 h-4 text-gray-400 group-hover:text-[#003DA5] flex-shrink-0" />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate flex-1">
                            {cetap.nombre.replace('CETAP ', '')}
                          </span>
                          {cetap.tipo === 'principal' && (
                            <span className="text-xs text-yellow-600 flex-shrink-0">★</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sin resultados */}
      {territorialesFiltradas.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-sm text-gray-600">
            Intenta con otro término de búsqueda
          </p>
        </div>
      )}
    </div>
  );
}