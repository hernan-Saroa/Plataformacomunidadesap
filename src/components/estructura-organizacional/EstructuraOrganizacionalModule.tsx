/**
 * MODULO - ESTRUCTURA ORGANIZACIONAL ESAP
 * Sistema completo de gestion de estructura territorial jerarquica
 * Usa las tablas auth.seccionales, auth.sedes y auth.geopolitica
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Search, Download, Upload, MapPin,
  ChevronRight, Loader2, Plus, ChevronDown, Pencil, Trash2,
  GraduationCap, Users
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { estructuraService } from '../../services/estructuraService';
import { CreateSeccionalSedeModal } from './CreateSeccionalSedeModal';
import type { Seccional, Sede, EstadisticasEstructuraOrganizacional } from '../../services/api/types';

type TipoCreacion = 'seccional' | 'sede';

export function EstructuraOrganizacionalModule() {
  const [busqueda, setBusqueda] = useState('');
  const [seccionales, setSeccionales] = useState<Seccional[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<EstadisticasEstructuraOrganizacional | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tipoCreacion, setTipoCreacion] = useState<TipoCreacion>('sede');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editItem, setEditItem] = useState<Seccional | Sede | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [estructuraResponse, statsResponse] = await Promise.all([
        estructuraService.obtenerEstructura(),
        estructuraService.obtenerEstadisticas(),
      ]);
      setSeccionales(estructuraResponse.data.seccionales);
      setSedes(estructuraResponse.data.sedes);
      setEstadisticas(statsResponse.data);
    } catch (error) {
      console.error('Error cargando estructura organizacional:', error);
      toast.error('Error al cargar la estructura organizacional');
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = (tipo: TipoCreacion) => {
    setTipoCreacion(tipo);
    setEditItem(null);
    setShowCreateModal(true);
    setShowDropdown(false);
  };

  const handleEditar = (tipo: TipoCreacion, item: Seccional | Sede) => {
    setTipoCreacion(tipo);
    setEditItem(item);
    setShowCreateModal(true);
  };

  const handleEliminarSeccional = async (seccional: Seccional) => {
    const sedesCount = sedes.filter(s => s.idSeccional === seccional.idSeccional).length;

    if (sedesCount > 0) {
      toast.error(`No se puede eliminar la seccional porque tiene ${sedesCount} sedes asociadas`);
      return;
    }

    if (!confirm(`¿Estas seguro de eliminar la seccional "${seccional.nomSeccional}"?`)) {
      return;
    }

    try {
      await estructuraService.eliminarSeccional(seccional.idSeccional);
      toast.success('Seccional eliminada exitosamente');
      cargarDatos();
    } catch (error: any) {
      console.error('Error eliminando seccional:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la seccional');
    }
  };

  const handleEliminarSede = async (sede: Sede) => {
    if (!confirm(`¿Estas seguro de eliminar la sede "${sede.nomSede}"?`)) {
      return;
    }

    try {
      await estructuraService.eliminarSede(sede.idSede);
      toast.success('Sede eliminada exitosamente');
      cargarDatos();
    } catch (error: any) {
      console.error('Error eliminando sede:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la sede');
    }
  };

  const handleExportar = () => {
    toast.success('Exportando estructura organizacional...');
  };

  const handleImportar = () => {
    toast.info('Importacion masiva en desarrollo');
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditItem(null);
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
                Gestion de seccionales y sedes ESAP
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

          {/* Dropdown para crear */}
          <div className="relative">
            <Button
              onClick={() => setShowDropdown(!showDropdown)}
              className="gap-2 bg-[#003DA5] hover:bg-[#002d7a]"
            >
              <Plus className="w-4 h-4" />
              Nuevo
              <ChevronDown className="w-4 h-4" />
            </Button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => handleCrear('seccional')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Nueva Seccional
                  </button>
                  <button
                    onClick={() => handleCrear('sede')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    Nueva Sede
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Busqueda */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o codigo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#003DA5] text-white rounded-lg px-4 py-2">
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">Vista Arbol</span>
          </div>
        </div>
      </Card>

      {/* Vista Arbol */}
      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
            <p className="text-sm text-gray-600">Cargando estructura organizacional...</p>
          </div>
        </Card>
      ) : (
        <VistaArbolSeccionalesSedes
          busqueda={busqueda}
          seccionales={seccionales}
          sedes={sedes}
          estadisticas={estadisticas}
          onEditarSeccional={(seccional) => handleEditar('seccional', seccional)}
          onEditarSede={(sede) => handleEditar('sede', sede)}
          onEliminarSeccional={handleEliminarSeccional}
          onEliminarSede={handleEliminarSede}
        />
      )}

      {/* Modal Crear/Editar Seccional/Sede */}
      <CreateSeccionalSedeModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={cargarDatos}
        tipo={tipoCreacion}
        seccionales={seccionales}
        editItem={editItem}
      />
    </div>
  );
}

// ============================================================================
// VISTA ARBOL SECCIONALES Y SEDES
// ============================================================================

interface VistaArbolProps {
  busqueda: string;
  seccionales: Seccional[];
  sedes: Sede[];
  estadisticas: EstadisticasEstructuraOrganizacional | null;
  onEditarSeccional: (seccional: Seccional) => void;
  onEditarSede: (sede: Sede) => void;
  onEliminarSeccional: (seccional: Seccional) => void;
  onEliminarSede: (sede: Sede) => void;
}

function VistaArbolSeccionalesSedes({
  busqueda,
  seccionales,
  sedes,
  estadisticas,
  onEditarSeccional,
  onEditarSede,
  onEliminarSeccional,
  onEliminarSede,
}: VistaArbolProps) {
  const [seccionalesExpandidas, setSeccionalesExpandidas] = useState<Record<number, boolean>>({});

  const toggleSeccional = (id: number) => {
    setSeccionalesExpandidas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtrar seccionales por busqueda
  const filtrarSeccional = (seccional: Seccional): boolean => {
    if (busqueda === '') return true;
    const searchLower = busqueda.toLowerCase();
    return (
      seccional.nomSeccional.toLowerCase().includes(searchLower) ||
      seccional.codSeccional?.toLowerCase().includes(searchLower) ||
      seccional.ubicacion?.nomDivGeopolitica?.toLowerCase().includes(searchLower) ||
      false
    );
  };

  // Filtrar sedes por busqueda
  const filtrarSede = (sede: Sede): boolean => {
    if (busqueda === '') return true;
    const searchLower = busqueda.toLowerCase();
    return (
      sede.nomSede.toLowerCase().includes(searchLower) ||
      sede.codSede?.toLowerCase().includes(searchLower) ||
      sede.geopolitica?.nomDivGeopolitica?.toLowerCase().includes(searchLower) ||
      false
    );
  };

  // Filtrar seccionales que coinciden con la busqueda o tienen sedes que coinciden
  const seccionalesFiltradas = seccionales.map(seccional => {
    const seccionalMatch = filtrarSeccional(seccional);
    const sedesHijas = sedes.filter(s => s.idSeccional === seccional.idSeccional && filtrarSede(s));

    if (seccionalMatch || sedesHijas.length > 0) {
      return {
        seccional,
        sedes: sedesHijas.length > 0 ? sedesHijas : sedes.filter(s => s.idSeccional === seccional.idSeccional)
      };
    }
    return null;
  }).filter(Boolean) as Array<{ seccional: Seccional; sedes: Sede[] }>;

  return (
    <Card className="p-6">
      {/* Estadisticas */}
      <div className="mb-6 flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-600" />
          <span className="font-medium">{estadisticas?.totalSeccionales || 0} Seccionales</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-600" />
          <span className="font-medium">{estadisticas?.totalSedes || 0} Sedes</span>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-600" />
          <span className="font-medium">{estadisticas?.totalEstudiantes || 0} Estudiantes</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="font-medium">{estadisticas?.totalDocentes || 0} Docentes</span>
        </div>
      </div>

      <div className="space-y-2">
        {seccionalesFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No se encontraron resultados para "{busqueda}"
          </div>
        ) : (
          seccionalesFiltradas.map((item) => {
            if (!item) return null;
            const { seccional, sedes: sedesSeccional } = item;
            const isExpandida = seccionalesExpandidas[seccional.idSeccional] !== false;

            return (
              <div key={seccional.idSeccional}>
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
                    <button
                      onClick={() => toggleSeccional(seccional.idSeccional)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform ${isExpandida ? 'rotate-90' : ''}`} />
                    </button>

                    <Badge className="bg-green-100 text-green-700 border-0">
                      Seccional
                    </Badge>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{seccional.nomSeccional}</span>
                        {seccional.codSeccional && (
                          <span className="text-sm text-gray-500">({seccional.codSeccional})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        {seccional.ubicacion && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {seccional.ubicacion.nomDivGeopolitica}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {sedesSeccional.length} Sedes
                        </span>
                        <span className="flex items-center gap-1" title="Total estudiantes">
                          <GraduationCap className="w-3 h-3 text-blue-500" />
                          {sedesSeccional.reduce((sum, s) => sum + (s.capacidadEstudiantes ?? 0), 0)}
                        </span>
                        <span className="flex items-center gap-1" title="Total docentes">
                          <Users className="w-3 h-3 text-green-500" />
                          {sedesSeccional.reduce((sum, s) => sum + (s.capacidadDocentes ?? 0), 0)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de accion para Seccional */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditarSeccional(seccional)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Editar seccional"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEliminarSeccional(seccional)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        title="Eliminar seccional"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Sedes de esta seccional */}
                <AnimatePresence>
                  {isExpandida && sedesSeccional.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 ml-6 space-y-1"
                    >
                      {sedesSeccional.map((sede) => (
                        <motion.div
                          key={sede.idSede}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group"
                        >
                          <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-sm transition-all bg-gray-50">
                            <div className="w-6" />

                            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                              Sede
                            </Badge>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{sede.nomSede}</span>
                                {sede.codSede && (
                                  <span className="text-xs text-gray-500">({sede.codSede})</span>
                                )}
                                {sede.sedeAct && sede.sedeAct !== 'ACTIVO' && (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    {sede.sedeAct}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                                {sede.geopolitica && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {sede.geopolitica.nomDivGeopolitica}
                                  </span>
                                )}
                                <span className="flex items-center gap-1" title="Capacidad de estudiantes">
                                  <GraduationCap className="w-3 h-3 text-blue-500" />
                                  {sede.capacidadEstudiantes ?? 0}
                                </span>
                                <span className="flex items-center gap-1" title="Capacidad de docentes">
                                  <Users className="w-3 h-3 text-green-500" />
                                  {sede.capacidadDocentes ?? 0}
                                </span>
                              </div>
                            </div>

                            {/* Botones de accion para Sede */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onEditarSede(sede)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                                title="Editar sede"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onEliminarSede(sede)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                title="Eliminar sede"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
