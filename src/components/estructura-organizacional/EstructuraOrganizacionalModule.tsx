/**
 * MÓDULO - ESTRUCTURA ORGANIZACIONAL ESAP
 * Sistema completo de gestión de estructura territorial jerárquica
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Plus, Search, Download, Upload, MapPin,
  ChevronRight, List, GitBranch, Network, Users
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
              <Network className="w-4 h-4" />
              <span className="text-sm">Organigrama</span>
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
// VISTA ORGANIGRAMA - ESTRUCTURA JERÁRQUICA ESAP (WORLD-CLASS)
// ============================================================================

function VistaListaTerritorialesCetap({ busqueda }: { busqueda: string }) {
  const [territorialExpandida, setTerritorialExpandida] = useState<string | null>(null);
  const [hoveredTerritorial, setHoveredTerritorial] = useState<string | null>(null);

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

  // Calcular totales y estadísticas
  const totalCetap = territorialesFiltradas.reduce((acc, t) => acc + (t?.cetap?.length || 0), 0);
  const totalUsuariosEstimados = territorialesFiltradas.length * 45 + totalCetap * 12;

  return (
    <div className="space-y-6">
      {/* Dashboard de Métricas - Diseño Mejorado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#0052CC] flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-0">Nacional</Badge>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1">1</p>
              <p className="text-sm text-gray-600">Sede Central</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2962FF] to-[#1E40AF] flex items-center justify-center shadow-lg">
                <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-0">Activas</Badge>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{territorialesFiltradas.length}</p>
              <p className="text-sm text-gray-600">Unidades Territoriales</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Network className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <Badge className="bg-orange-100 text-orange-700 border-0">Red</Badge>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{totalCetap}</p>
              <p className="text-sm text-gray-600">CETAP en Colombia</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#2962FF] flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-0">Total</Badge>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{totalUsuariosEstimados.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Usuarios Aprox.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Organigrama Jerárquico - Diseño World-Class */}
      <Card className="relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30" />
        
        <div className="relative p-8 md:p-12">
          {/* NIVEL 1: SEDE CENTRAL - Diseño Premium */}
          <div className="flex flex-col items-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
            >
              {/* Tarjeta Sede Central */}
              <div 
                className="relative px-10 py-8 rounded-3xl border-4 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 50%, #2962FF 100%)',
                  borderColor: '#002D7A',
                  minWidth: '420px',
                  maxWidth: '420px'
                }}
              >
                {/* Decoración de fondo */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16" />
                </div>

                <div className="relative">
                  <div className="flex items-center gap-5 mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-xl border border-white/30">
                      <Building2 className="w-9 h-9 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <Badge className="bg-white/30 text-white border-white/40 border mb-2 backdrop-blur">
                        Sede Nacional
                      </Badge>
                      <h3 className="text-2xl font-bold text-white mb-1">ESAP Colombia</h3>
                      <div className="flex items-center gap-2 text-blue-100">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">Bogotá D.C.</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-white/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-100">Territoriales</p>
                        <p className="text-lg font-bold text-white">{territorialesFiltradas.length}</p>
                      </div>
                    </div>
                    <div className="w-px h-10 bg-white/30" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Network className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-100">CETAP</p>
                        <p className="text-lg font-bold text-white">{totalCetap}</p>
                      </div>
                    </div>
                    <div className="w-px h-10 bg-white/30" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-100">Cobertura</p>
                        <p className="text-lg font-bold text-white">100%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conector SVG mejorado */}
              <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: '100%', width: '2px', height: '60px' }}>
                <defs>
                  <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#003DA5" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#2962FF" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <line x1="1" y1="0" x2="1" y2="60" stroke="url(#connector-gradient)" strokeWidth="2" />
                <circle cx="1" cy="60" r="4" fill="#2962FF" />
              </svg>
            </motion.div>
          </div>

          {/* NIVEL 2: TERRITORIALES - Grid Optimizado */}
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {territorialesFiltradas.map((territorial, index) => {
                if (!territorial) return null;
                const isExpanded = territorialExpandida === territorial.id;
                const isHovered = hoveredTerritorial === territorial.id;

                return (
                  <motion.div
                    key={territorial.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.04,
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="relative"
                    onMouseEnter={() => setHoveredTerritorial(territorial.id)}
                    onMouseLeave={() => setHoveredTerritorial(null)}
                  >
                    {/* Línea conectora SVG */}
                    <svg 
                      className="absolute left-1/2 -translate-x-1/2" 
                      style={{ bottom: '100%', width: '2px', height: '24px' }}
                    >
                      <line 
                        x1="1" 
                        y1="0" 
                        x2="1" 
                        y2="24" 
                        stroke={isHovered || isExpanded ? '#2962FF' : '#BFDBFE'} 
                        strokeWidth="2"
                        className="transition-colors duration-300"
                      />
                    </svg>

                    {/* Tarjeta Territorial - Diseño Premium */}
                    <div 
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                        isExpanded ? 'shadow-2xl scale-[1.02]' : 'shadow-lg hover:shadow-xl'
                      }`}
                      style={{
                        borderColor: isExpanded ? '#2962FF' : isHovered ? '#93C5FD' : '#E5E7EB',
                        background: isExpanded 
                          ? 'linear-gradient(135deg, #2962FF 0%, #1E40AF 100%)' 
                          : 'white'
                      }}
                    >
                      {/* Decoración superior */}
                      {!isExpanded && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400" />
                      )}

                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <div 
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                              isExpanded 
                                ? 'bg-white/20 backdrop-blur-xl border border-white/30' 
                                : 'bg-gradient-to-br from-blue-50 to-blue-100'
                            }`}
                          >
                            <MapPin 
                              className="w-6 h-6" 
                              style={{ color: isExpanded ? 'white' : '#2962FF' }}
                              strokeWidth={2.5}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge 
                              className="mb-2 border-0"
                              style={{
                                background: isExpanded ? 'rgba(255,255,255,0.25)' : '#DBEAFE',
                                color: isExpanded ? 'white' : '#1E40AF'
                              }}
                            >
                              Territorial
                            </Badge>
                            <h4 
                              className="font-bold text-base line-clamp-2 mb-1.5 leading-tight"
                              style={{ color: isExpanded ? 'white' : '#111827' }}
                            >
                              {territorial.nombre}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <MapPin 
                                className="w-3.5 h-3.5 shrink-0" 
                                style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}
                              />
                              <p 
                                className="text-sm truncate"
                                style={{ color: isExpanded ? 'rgba(255,255,255,0.9)' : '#6B7280' }}
                              >
                                {territorial.ciudadPrincipal}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div 
                          className="flex items-center gap-3 py-3 px-3 rounded-xl mb-3"
                          style={{
                            background: isExpanded 
                              ? 'rgba(255,255,255,0.15)' 
                              : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Network 
                              className="w-4 h-4 shrink-0" 
                              style={{ color: isExpanded ? 'white' : '#2962FF' }}
                            />
                            <div>
                              <p 
                                className="text-xs"
                                style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}
                              >
                                CETAP
                              </p>
                              <p 
                                className="text-lg font-bold leading-none"
                                style={{ color: isExpanded ? 'white' : '#111827' }}
                              >
                                {territorial.totalCetap}
                              </p>
                            </div>
                          </div>
                          <div className="w-px h-10" style={{ background: isExpanded ? 'rgba(255,255,255,0.3)' : '#BFDBFE' }} />
                          <div className="flex items-center gap-2 flex-1">
                            <Users 
                              className="w-4 h-4 shrink-0" 
                              style={{ color: isExpanded ? 'white' : '#2962FF' }}
                            />
                            <div>
                              <p 
                                className="text-xs"
                                style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}
                              >
                                Usuarios
                              </p>
                              <p 
                                className="text-lg font-bold leading-none"
                                style={{ color: isExpanded ? 'white' : '#111827' }}
                              >
                                ~{(45 + territorial.totalCetap * 12).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => setTerritorialExpandida(isExpanded ? null : territorial.id)}
                          className="w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2"
                          style={{
                            background: isExpanded 
                              ? 'rgba(255,255,255,0.2)' 
                              : 'linear-gradient(135deg, #2962FF 0%, #1E40AF 100%)',
                            color: 'white',
                            border: isExpanded ? '1px solid rgba(255,255,255,0.3)' : 'none'
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronRight className="w-4 h-4 rotate-90" />
                              Ocultar CETAP
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4 -rotate-90" />
                              Ver {territorial.totalCetap} CETAP
                            </>
                          )}
                        </button>
                      </div>

                      {/* NIVEL 3: CETAP (expandible) - Diseño Mejorado */}
                      <AnimatePresence>
                        {isExpanded && territorial.cetap.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="border-t-2 border-white/30 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl p-4"
                          >
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/20">
                              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Network className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white/80">CETAP Asociados</p>
                                <p className="text-sm font-bold text-white">{territorial.cetap.length} Unidades</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar-white pr-1">
                              {territorial.cetap.map((cetap, cetapIndex) => (
                                <motion.div
                                  key={cetap.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ 
                                    delay: cetapIndex * 0.03,
                                    duration: 0.3,
                                    ease: [0.22, 1, 0.36, 1]
                                  }}
                                  className="group bg-white rounded-xl p-3 hover:shadow-md transition-all duration-200"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                      <span className="text-xs font-bold text-orange-700">
                                        {cetapIndex + 1}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
                                        {cetap.nombre}
                                      </p>
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                                        <p className="text-xs text-gray-600 truncate">{cetap.ciudad}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <Badge className="text-xs bg-gray-100 text-gray-700 border-0">
                                          {cetap.codigo}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Estilos mejorados */}
      <style>{`
        .custom-scrollbar-white::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-white::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar-white::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.4);
          border-radius: 3px;
        }
        .custom-scrollbar-white::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}