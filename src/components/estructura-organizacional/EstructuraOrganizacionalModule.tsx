/**
 * MÓDULO - ESTRUCTURA ORGANIZACIONAL ESAP
 * Sistema completo de gestión de estructura territorial jerárquica
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Plus, Search, Download, Upload, MapPin,
  ChevronRight, List, GitBranch
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { CreateUnidadModal } from './CreateUnidadModal';
import { TERRITORIALES_ESAP } from '../../data/territoriales-cetap-completo';
import type { 
  UnidadOrganizacional
} from '../../types/estructura-organizacional.types';

export function EstructuraOrganizacionalModule() {
  const [busqueda, setBusqueda] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadOrganizacional | null>(null);
  const [vistaActual, setVistaActual] = useState<'arbol' | 'lista'>('lista'); // ✅ NUEVO: control de vista

  // Handlers
  const handleCrearUnidad = () => {
    setSelectedUnidad(null);
    setShowCreateModal(true);
  };

  const handleGuardarUnidad = (unidadData: Partial<UnidadOrganizacional>) => {
    if (selectedUnidad) {
      console.log('Actualizando unidad:', { ...selectedUnidad, ...unidadData });
    } else {
      console.log('Creando nueva unidad:', unidadData);
    }
    setShowCreateModal(false);
    setSelectedUnidad(null);
  };

  const handleExportar = () => {
    toast.success('Exportando estructura organizacional...');
  };

  const handleImportar = () => {
    toast.info('Importación masiva en desarrollo');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#003DA5] to-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Estructura Organizacional
              </h1>
              <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                Gestión de sedes y unidades territoriales ESAP
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportar}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportar}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button
            onClick={handleCrearUnidad}
            className="gap-2 bg-[#003DA5] hover:bg-[#002d7a] flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            Nueva Unidad
          </Button>
        </div>
      </div>

      {/* Búsqueda y Toggle Vista */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, código o ciudad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* ✅ NUEVO: Toggle de Vistas */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActual('lista')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                vistaActual === 'lista'
                  ? 'bg-white text-[#003DA5] shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm">Lista</span>
            </button>
            <button
              onClick={() => setVistaActual('arbol')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                vistaActual === 'arbol'
                  ? 'bg-[#003DA5] text-white shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span className="text-sm">Vista Árbol</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Vista Condicional */}
      {vistaActual === 'arbol' ? (
        <VistaArbolTerritorialesCetap busqueda={busqueda} />
      ) : (
        <VistaListaTerritorialesCetap busqueda={busqueda} />
      )}

      {/* Modal Crear/Editar Unidad */}
      <CreateUnidadModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedUnidad(null);
        }}
        onSave={handleGuardarUnidad}
        unidadEdit={selectedUnidad}
        unidadesExistentes={[]}
      />
    </div>
  );
}

// ============================================================================
// VISTA ÁRBOL TERRITORIALES Y CETAP
// ============================================================================

function VistaArbolTerritorialesCetap({ busqueda }: { busqueda: string }) {
  const [expandidosSedeCentral, setExpandidosSedeCentral] = useState(false); // ✅ CERRADO por defecto
  const [territorialesExpandidas, setTerritorialesExpandidas] = useState<Record<string, boolean>>({});

  const toggleTerritorial = (id: string) => {
    setTerritorialesExpandidas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtrar territoriales y CETAP según búsqueda
  const territorialesFiltradas = TERRITORIALES_ESAP.map(territorial => {
    const territorialMatch = busqueda === '' ||
      territorial.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      territorial.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      territorial.ciudadPrincipal.toLowerCase().includes(busqueda.toLowerCase());

    const cetapFiltrados = territorial.cetap.filter(cetap =>
      busqueda === '' ||
      cetap.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      cetap.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      cetap.ciudad.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Mostrar territorial si coincide o si tiene CETAP que coinciden
    if (territorialMatch || cetapFiltrados.length > 0) {
      return {
        ...territorial,
        cetap: cetapFiltrados.length > 0 ? cetapFiltrados : territorial.cetap
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <Card className="p-6">
      <div className="space-y-2">
        {/* SEDE CENTRAL */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
              <button
                onClick={() => setExpandidosSedeCentral(!expandidosSedeCentral)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${expandidosSedeCentral ? 'rotate-90' : ''}`} />
              </button>

              <Badge className="bg-blue-100 text-blue-700 border-0">
                Sede Central
              </Badge>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">ESAP - Sede Central</span>
                  <span className="text-sm text-gray-500">(ESAP-CENTRAL)</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Bogotá D.C., Bogotá D.C.
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    17 Territoriales | 307 CETAP
                  </span>
                </div>
              </div>

              <Badge variant="default">activo</Badge>
            </div>
          </motion.div>

          {/* 17 TERRITORIALES */}
          <AnimatePresence>
            {expandidosSedeCentral && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 ml-6 space-y-2"
              >
                {territorialesFiltradas.map((territorial) => {
                  if (!territorial) return null;
                  const isExpandida = territorialesExpandidas[territorial.id] === true; // ✅ CERRADO por defecto
                  
                  return (
                    <div key={territorial.id}>
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
                          <button
                            onClick={() => toggleTerritorial(territorial.id)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpandida ? 'rotate-90' : ''}`} />
                          </button>

                          <Badge className="bg-green-100 text-green-700 border-0">
                            territorial
                          </Badge>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{territorial.nombre}</span>
                              <span className="text-sm text-gray-500">({territorial.codigo})</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {territorial.ciudadPrincipal}, {territorial.departamentos[0]}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {territorial.totalCetap} CETAP
                              </span>
                            </div>
                          </div>

                          <Badge variant="default">activo</Badge>
                        </div>
                      </motion.div>

                      {/* CETAP de esta territorial */}
                      <AnimatePresence>
                        {isExpandida && territorial.cetap.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 ml-6 space-y-1"
                          >
                            {territorial.cetap.map((cetap) => (
                              <motion.div
                                key={cetap.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="group"
                              >
                                <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-sm transition-all bg-gray-50">
                                  <div className="w-6" />

                                  <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                                    CETAP
                                  </Badge>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">{cetap.nombre}</span>
                                      <span className="text-xs text-gray-500">({cetap.codigo})</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {cetap.ciudad}
                                      </span>
                                    </div>
                                  </div>

                                  <Badge variant="secondary" className="text-xs">activo</Badge>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// VISTA LISTA TERRITORIALES Y CETAP
// ============================================================================

function VistaListaTerritorialesCetap({ busqueda }: { busqueda: string }) {
  // Filtrar territoriales y CETAP según búsqueda
  const territorialesFiltradas = TERRITORIALES_ESAP.map(territorial => {
    const territorialMatch = busqueda === '' ||
      territorial.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      territorial.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      territorial.ciudadPrincipal.toLowerCase().includes(busqueda.toLowerCase());

    const cetapFiltrados = territorial.cetap.filter(cetap =>
      busqueda === '' ||
      cetap.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      cetap.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      cetap.ciudad.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Mostrar territorial si coincide o si tiene CETAP que coinciden
    if (territorialMatch || cetapFiltrados.length > 0) {
      return {
        ...territorial,
        cetap: cetapFiltrados.length > 0 ? cetapFiltrados : territorial.cetap
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <Card className="p-6">
      <div className="space-y-2">
        {/* SEDE CENTRAL */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
              <Badge className="bg-blue-100 text-blue-700 border-0">
                Sede Central
              </Badge>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">ESAP - Sede Central</span>
                  <span className="text-sm text-gray-500">(ESAP-CENTRAL)</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Bogotá D.C., Bogotá D.C.
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    17 Territoriales | 307 CETAP
                  </span>
                </div>
              </div>

              <Badge variant="default">activo</Badge>
            </div>
          </motion.div>

          {/* 17 TERRITORIALES */}
          <AnimatePresence>
            {territorialesFiltradas.map((territorial) => {
              if (!territorial) return null;
              
              return (
                <div key={territorial.id}>
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
                      <Badge className="bg-green-100 text-green-700 border-0">
                        territorial
                      </Badge>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{territorial.nombre}</span>
                          <span className="text-sm text-gray-500">({territorial.codigo})</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {territorial.ciudadPrincipal}, {territorial.departamentos[0]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {territorial.totalCetap} CETAP
                          </span>
                        </div>
                      </div>

                      <Badge variant="default">activo</Badge>
                    </div>
                  </motion.div>

                  {/* CETAP de esta territorial */}
                  <AnimatePresence>
                    {territorial.cetap.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 ml-6 space-y-1"
                      >
                        {territorial.cetap.map((cetap) => (
                          <motion.div
                            key={cetap.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group"
                          >
                            <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-sm transition-all bg-gray-50">
                              <div className="w-6" />

                              <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                                CETAP
                              </Badge>

                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{cetap.nombre}</span>
                                  <span className="text-xs text-gray-500">({cetap.codigo})</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {cetap.ciudad}
                                  </span>
                                </div>
                              </div>

                              <Badge variant="secondary" className="text-xs">activo</Badge>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}