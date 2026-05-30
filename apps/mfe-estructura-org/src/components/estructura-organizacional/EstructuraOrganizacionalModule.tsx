/**
 * MODULO - ESTRUCTURA ORGANIZACIONAL ESAP
 * Sistema completo de gestion de estructura territorial jerarquica
 * Usa las tablas auth.seccionales, auth.sedes y auth.geopolitica
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Search, Download, Upload, MapPin,
  ChevronRight, GitBranch, Network, Users, Loader2, ChevronDown, Pencil, Trash2,
  GraduationCap, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, Button, Badge, Input } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { estructuraService } from '../../services/estructuraService';
import { CreateSeccionalSedeModal } from './CreateSeccionalSedeModal';
import { AsignarUsuariosModal } from './AsignarUsuariosModal';
import { useAuth } from '../../hooks';
import type { Seccional, Sede, EstadisticasEstructuraOrganizacional } from '../../services/api/types';

type TipoCreacion = 'seccional' | 'sede';

export function EstructuraOrganizacionalModule() {
  const [busqueda, setBusqueda] = useState('');
  const [seccionales, setSeccionales] = useState<Seccional[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<EstadisticasEstructuraOrganizacional | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'arbol'>('arbol');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tipoCreacion, setTipoCreacion] = useState<TipoCreacion>('sede');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editItem, setEditItem] = useState<Seccional | Sede | null>(null);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [sinTerritorial, setSinTerritorial] = useState(0);
  const [sinCetap, setSinCetap] = useState(0);
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

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

    try {
      const resp = await estructuraService.getUsuariosSinAsignar();
      if (resp.success && resp.data) {
        setSinTerritorial(resp.data.filter((u: any) => u.sinTerritorial).length);
        setSinCetap(resp.data.filter((u: any) => !u.cetapId).length);
      }
    } catch {
      // endpoint no disponible aún, no mostrar alerta
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
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
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
            onClick={cargarDatos}
            className="gap-2"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
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
          {isSuperAdmin && (
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
          )}
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

      {/* Alerta usuarios sin asignar */}
      {(sinTerritorial > 0 || sinCetap > 0) && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-sm text-amber-800">
            {sinTerritorial > 0 && (
              <span className="font-medium">{sinTerritorial} usuario(s) sin territorial</span>
            )}
            {sinTerritorial > 0 && sinCetap > 0 && <span> · </span>}
            {sinCetap > 0 && (
              <span className="font-medium">{sinCetap} usuario(s) sin CETAP</span>
            )}
          </div>
          <button
            onClick={() => setShowAsignarModal(true)}
            className="text-sm font-medium text-amber-800 underline hover:text-amber-900 shrink-0"
          >
            Asignar ahora
          </button>
        </div>
      )}

      {/* Vista segun seleccion */}
      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
            <p className="text-sm text-gray-600">Cargando estructura organizacional...</p>
          </div>
        </Card>
      ) : (
        vistaActual === 'arbol' ? (
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
        ) : (
          <VistaListaTerritorialesCetap
            busqueda={busqueda}
            seccionales={seccionales}
            sedes={sedes}
          />
        )
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

      {/* Modal Asignar Usuarios */}
      <AsignarUsuariosModal
        isOpen={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        onSuccess={cargarDatos}
        territoriales={seccionales
          .filter(s => s.codSeccional?.toUpperCase() !== 'SCENT')
          .map(s => ({
            id: String(s.idSeccional),
            nombre: s.nomSeccional,
            cetap: sedes
              .filter(sede => sede.idSeccional === s.idSeccional)
              .map(sede => ({ id: String(sede.idSede), nombre: sede.nomSede }))
          }))
        }
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
  const [expandidosSedeCentral, setExpandidosSedeCentral] = useState(true); // ✅ CERRADO por defecto
  const [seccionalesExpandidas, setSeccionalesExpandidas] = useState<Record<number, boolean>>({});

  const toggleSeccional = (id: number) => {
    setSeccionalesExpandidas(prev => ({
      ...prev,
      [id]: !(prev[id] ?? false)
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

  const sedeCentral = seccionales.find(
    (seccional) => seccional.codSeccional?.toUpperCase() === 'SCENT'
  ) ?? null;

  // Filtrar territoriales (excluye sede central) que coinciden con la busqueda o tienen sedes que coinciden
  const territorialesFiltradas = seccionales
    .filter((seccional) => seccional.idSeccional !== sedeCentral?.idSeccional)
    .map(seccional => {
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
        {territorialesFiltradas.length === 0 && !sedeCentral ? (
          <div className="text-center py-8 text-gray-500">
            No se encontraron resultados para "{busqueda}"
          </div>
        ) : (
          <div className="space-y-2">
            {sedeCentral && (
              <div className="mb-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
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
                      <span className="font-semibold text-gray-900">
                        {sedeCentral.nomSeccional}
                      </span>
                      {sedeCentral.codSeccional && (
                        <span className="text-sm text-gray-500">({sedeCentral.codSeccional})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      {sedeCentral.ubicacion && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sedeCentral.ubicacion.nomDivGeopolitica}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {territorialesFiltradas.length} Territoriales
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence>
            {expandidosSedeCentral && (
              <motion.div
                key="territoriales-sede-central"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="ml-6 space-y-2 overflow-hidden"
              >
                {territorialesFiltradas.map((item, index) => {
                  if (!item) return null;
                  const { seccional, sedes: sedesSeccional } = item;
                  const isExpandida = seccionalesExpandidas[seccional.idSeccional] ?? false;

                  return (
                    <div
                      key={seccional.idSeccional ?? `seccional-${index}`}
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
                        Territorial
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

                      {/* Sedes de esta seccional */}
                      <AnimatePresence>
                      {isExpandida && sedesSeccional.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-2 ml-6 space-y-1 overflow-hidden"
                        >
                          {sedesSeccional.map((sede, sedeIndex) => (
                            <div
                              key={sede.idSede ?? `sede-${sedeIndex}`}
                              className="group"
                            >
                          <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-sm transition-all bg-gray-50">
                            <div className="w-6" />

                            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                              CETAP
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
                            </div>
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
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// VISTA ORGANIGRAMA - ESTRUCTURA JERÁRQUICA ESAP (WORLD-CLASS)
// ============================================================================

function VistaListaTerritorialesCetap({
  busqueda,
  seccionales,
  sedes,
}: {
  busqueda: string;
  seccionales: Seccional[];
  sedes: Sede[];
}) {
  const [territorialExpandida, setTerritorialExpandida] = useState<number | null>(null);
  const [hoveredTerritorial, setHoveredTerritorial] = useState<number | null>(null);

  const sedeCentral = seccionales.find(
    (seccional) => seccional.codSeccional?.toUpperCase() === 'SCENT'
  ) ?? null;

  const searchLower = busqueda.trim().toLowerCase();

  const territorialesFiltradas = seccionales
    .filter((seccional) => seccional.idSeccional !== sedeCentral?.idSeccional)
    .map((seccional) => {
      const sedesTerritorial = sedes.filter((sede) => sede.idSeccional === seccional.idSeccional);

      if (!searchLower) {
        return { seccional, sedes: sedesTerritorial };
      }

      const matchSeccional =
        seccional.nomSeccional.toLowerCase().includes(searchLower) ||
        (seccional.codSeccional ?? '').toLowerCase().includes(searchLower) ||
        (seccional.ubicacion?.nomDivGeopolitica ?? '').toLowerCase().includes(searchLower);

      const sedesFiltradas = sedesTerritorial.filter(
        (sede) =>
          sede.nomSede.toLowerCase().includes(searchLower) ||
          (sede.codSede ?? '').toLowerCase().includes(searchLower) ||
          (sede.geopolitica?.nomDivGeopolitica ?? '').toLowerCase().includes(searchLower)
      );

      if (matchSeccional || sedesFiltradas.length > 0) {
        return {
          seccional,
          sedes: sedesFiltradas.length > 0 ? sedesFiltradas : sedesTerritorial,
        };
      }

      return null;
    })
    .filter(Boolean) as Array<{ seccional: Seccional; sedes: Sede[] }>;

  const totalCetap = territorialesFiltradas.reduce((acc, item) => acc + item.sedes.length, 0);
  const totalTerritoriales = territorialesFiltradas.length;

  return (
    <>
    <Toaster position="bottom-right" richColors />
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
              <p className="text-sm text-gray-600">{sedeCentral?.nomSeccional || 'Sede Central'}</p>
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
              <p className="text-3xl font-bold text-gray-900 mb-1">{totalTerritoriales}</p>
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
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {(totalTerritoriales + totalCetap).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Unidades Totales</p>
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
            <div className="relative z-10">
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
                        <span className="text-sm">
                          {sedeCentral?.ubicacion?.nomDivGeopolitica ?? 'Sede principal'}
                        </span>
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
                        <p className="text-lg font-bold text-white">{totalTerritoriales}</p>
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
            </div>
          </div>

          {/* NIVEL 2: TERRITORIALES - Grid Optimizado */}
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {territorialesFiltradas.map((item, index) => {
                const { seccional, sedes: sedesTerritorial } = item;
                const isExpanded = territorialExpandida === seccional.idSeccional;
                const isHovered = hoveredTerritorial === seccional.idSeccional;

                return (
                  <div
                    key={seccional.idSeccional ?? `seccional-${index}`}
                    className="relative"
                    onMouseEnter={() => setHoveredTerritorial(seccional.idSeccional)}
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
                              {seccional.nomSeccional}
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
                                {seccional.ubicacion?.nomDivGeopolitica ?? 'Sin ubicación'}
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
                                {sedesTerritorial.length}
                              </p>
                            </div>
                          </div>
                          <div className="w-px h-10" style={{ background: isExpanded ? 'rgba(255,255,255,0.3)' : '#BFDBFE' }} />
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
                                Código
                              </p>
                              <p 
                                className="text-lg font-bold leading-none"
                                style={{ color: isExpanded ? 'white' : '#111827' }}
                              >
                                {seccional.codSeccional ?? 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => setTerritorialExpandida(isExpanded ? null : seccional.idSeccional)}
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
                              Ver {sedesTerritorial.length} CETAP
                            </>
                          )}
                        </button>
                      </div>

                      {/* NIVEL 3: CETAP (expandible) - Diseño Mejorado */}
                      <AnimatePresence>
                      {isExpanded && sedesTerritorial.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t-2 border-white/30 bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-xl p-4 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/20">
                              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                <Network className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white/80">CETAP Asociados</p>
                                <p className="text-sm font-bold text-white">{sedesTerritorial.length} Unidades</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar-white pr-1">
                              {sedesTerritorial.map((sede, sedeIndex) => (
                                <div
                                  key={sede.idSede ?? `sede-${sedeIndex}`}
                                  className="group bg-white rounded-xl p-3 hover:shadow-md transition-all duration-200"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                      <span className="text-xs font-bold text-orange-700">
                                        {sedeIndex + 1}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
                                        {sede.nomSede}
                                      </p>
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                                        <p className="text-xs text-gray-600 truncate">
                                          {sede.geopolitica?.nomDivGeopolitica ?? 'Sin ubicación'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <Badge className="text-xs bg-gray-100 text-gray-700 border-0">
                                          {sede.codSede || 'SIN-COD'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </div>
                  </div>
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
    </>
  );
}
