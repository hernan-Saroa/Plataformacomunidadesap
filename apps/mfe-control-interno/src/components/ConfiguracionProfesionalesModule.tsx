/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE PROFESIONALES OCIG - ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo para asignar y configurar profesionales del equipo OCIG.
 * 
 * ✅ NO CREA PROFESIONALES (eso se hace en Administración - Perfiles)
 * ✅ Asigna profesionales existentes al equipo OCIG
 * ✅ Configura roles/especialidades dentro del Control Interno
 * ✅ Define capacidad de trabajo (auditorías simultáneas, horas disponibles)
 * ✅ Muestra carga actual por auditorías asignadas
 * ✅ Integra con Universo Auditable para cálculo de capacidad
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Save, Plus, Edit2, Trash2, AlertCircle, CheckCircle2,
  Clock, TrendingUp, Settings, UserPlus, Activity, Target,
  BarChart3, X, Info, Search, Filter, UserCheck, Wifi, WifiOff,
  Loader2, RefreshCw, Check, ChevronsUpDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@esap-mfe/shared-ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@esap-mfe/shared-ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@esap-mfe/shared-ui/popover';
import { toast } from 'sonner';
import { HeaderSeccionConfig } from './HeaderSeccionConfig';
import {
  useConfiguracionProfesionales,
  type UsuarioSistema,
  type ConfiguracionOCIG,
  type ProfesionalOCIG,
  ESPECIALIDADES_DISPONIBLES,
  ROLES_OCIG
} from './services/useConfiguracionProfesionales';
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';
import { useConfiguracionCapacidadesGlobales } from './services/useConfiguracionCapacidadesGlobales';
import { ModalConfiguracionCapacidadesRoles } from './ModalConfiguracionCapacidadesRoles';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS (importados desde el hook)
// ════════════════════════════════════════════════════════════════════════════

// Los tipos UsuarioSistema, ConfiguracionOCIG y ProfesionalOCIG se importan
// desde useConfiguracionProfesionales

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionProfesionalesModule() {
  // Hook para conectar con backend
  const {
    loading,
    saving,
    error,
    profesionalesOCIG,
    usuariosDisponiblesParaOCIG,
    estadisticasGlobales,
    cargarDatos,
    agregarProfesional,
    actualizarProfesional,
    eliminarProfesional,
    ROLES_OCIG: rolesDisponibles,
    ESPECIALIDADES_DISPONIBLES: especialidadesDisponibles
  } = useConfiguracionProfesionales();

  // Estado local del UI
  const [mostrarModalAgregar, setMostrarModalAgregar] = useState(false);
  const [mostrarModalConfiguracion, setMostrarModalConfiguracion] = useState(false);
  const [profesionalEditando, setProfesionalEditando] = useState<ProfesionalOCIG | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');

  // Integración permisos y capacidades
  const { tienePermiso } = useControlInternoPermissions();
  const puedeConfigurarCapacidades = tienePermiso('configuraciones:capacidades');
  const { capacidadesRoles, guardarCapacidades, getCapacidadPorRol } = useConfiguracionCapacidadesGlobales();

  const handleGuardarConfiguracionGlobal = async (nuevasCapacidades: any[]) => {
    // 1. Guardar en storage local
    await guardarCapacidades(nuevasCapacidades);

    // 2. Aplicar a todos los profesionales actuales
    try {
      let actualizados = 0;
      for (const prof of profesionalesOCIG) {
        const capacidadParaRol = nuevasCapacidades.find(c => c.rol === prof.configuracion.rolOCI);
        if (capacidadParaRol) {
          // Solo actualizamos si cambiaron para no bombardear el backend innecesariamente
          if (prof.configuracion.capacidadMaximaAuditorias !== capacidadParaRol.capacidadMaximaAuditorias ||
            prof.configuracion.horasMensualesDisponibles !== capacidadParaRol.horasMensualesDisponibles) {

            await actualizarProfesional(prof.usuario.id, {
              capacidadMaximaAuditorias: capacidadParaRol.capacidadMaximaAuditorias,
              horasMensualesDisponibles: capacidadParaRol.horasMensualesDisponibles
            });
            actualizados++;
          }
        }
      }

      toast.success(`Capacidad global actualizada. Se actualizaron ${actualizados} profesionales.`);
      setMostrarModalConfiguracion(false);

      // Recargar datos para estar seguros
      await cargarDatos();
    } catch (e) {
      toast.error('Ocurrió un error al aplicar las capacidades a los profesionales actuales');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // FILTRAR PROFESIONALES
  // ════════════════════════════════════════════════════════════════════════════

  const profesionalesFiltrados = useMemo(() => {
    return profesionalesOCIG.filter(p => {
      const cumpleBusqueda = busqueda === '' ||
        p.usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.usuario.email.toLowerCase().includes(busqueda.toLowerCase());

      const cumpleFiltroRol = filtroRol === 'TODOS' || p.configuracion.rolOCI === filtroRol;

      return cumpleBusqueda && cumpleFiltroRol;
    });
  }, [profesionalesOCIG, busqueda, filtroRol]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleAgregarProfesional = async (config: ConfiguracionOCIG) => {
    await agregarProfesional(config);
    setMostrarModalAgregar(false);
  };

  const handleActualizarProfesional = async (usuarioId: string, cambios: Partial<ConfiguracionOCIG>) => {
    await actualizarProfesional(usuarioId, cambios);
    setProfesionalEditando(null);
  };

  const handleEliminarProfesional = async (usuarioId: string) => {
    await eliminarProfesional(usuarioId);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando profesionales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <HeaderSeccionConfig
        icon={<Users className="w-full h-full" />}
        titulo="Profesionales OCIG"
        subtitulo="Gestiona el equipo de Control Interno y su capacidad de trabajo"
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
          <Wifi className="w-3 h-3" />
          Conectado
        </span>
        <button
          onClick={cargarDatos}
          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium border border-gray-300"
          title="Recargar datos"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
        <button
          onClick={() => setMostrarModalAgregar(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors text-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Agregar Profesional</span>
        </button>
      </HeaderSeccionConfig>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <Select value={filtroRol} onValueChange={setFiltroRol}>
          <SelectTrigger className="w-[200px] font-semibold">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los roles</SelectItem>
            {rolesDisponibles.map(rol => (
              <SelectItem key={rol} value={rol}>{rol}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ESTADÍSTICAS GLOBALES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700">Profesionales</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700">{estadisticasGlobales.totalProfesionales}</p>
          <p className="text-xs text-blue-600">activos en OCIG</p>
        </div>

        <div
          className={`bg-white rounded-xl border-2 ${puedeConfigurarCapacidades ? 'border-green-300 hover:border-green-500 cursor-pointer shadow-sm hover:shadow-md transition-all group' : 'border-green-200'} p-4 relative`}
          onClick={() => puedeConfigurarCapacidades && setMostrarModalConfiguracion(true)}
          title={puedeConfigurarCapacidades ? "Configurar capacidad por rol..." : undefined}
        >
          {puedeConfigurarCapacidades && (
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-green-50 text-green-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100 z-10 shadow-sm border border-green-200">
              <Settings className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700">Capacidad Total</span>
            <Target className={`w-4 h-4 text-green-600 ${puedeConfigurarCapacidades ? 'group-hover:invisible' : ''}`} />
          </div>
          <p className="text-2xl font-black text-green-700">{estadisticasGlobales.capacidadTotal}</p>
          <p className="text-xs text-green-600">auditorías máx.</p>
        </div>

        <div
          className={`bg-white rounded-xl border-2 ${puedeConfigurarCapacidades ? 'border-purple-300 hover:border-purple-500 cursor-pointer shadow-sm hover:shadow-md transition-all group' : 'border-purple-200'} p-4 relative`}
          onClick={() => puedeConfigurarCapacidades && setMostrarModalConfiguracion(true)}
          title={puedeConfigurarCapacidades ? "Configurar horas por rol..." : undefined}
        >
          {puedeConfigurarCapacidades && (
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-purple-50 text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 z-10 shadow-sm border border-purple-200">
              <Settings className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700">Horas Totales</span>
            <Clock className={`w-4 h-4 text-purple-600 ${puedeConfigurarCapacidades ? 'group-hover:invisible' : ''}`} />
          </div>
          <p className="text-2xl font-black text-purple-700">{estadisticasGlobales.horasTotales}</p>
          <p className="text-xs text-purple-600">horas/mes</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-yellow-700">Auditorías Activas</span>
            <Activity className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-black text-yellow-700">{estadisticasGlobales.auditoriasTotales}</p>
          <p className="text-xs text-yellow-600">en ejecución</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-cyan-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-700">Carga Promedio</span>
            <BarChart3 className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-black text-cyan-700">{estadisticasGlobales.cargaPromedio}%</p>
          <p className="text-xs text-cyan-600">del equipo</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-red-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-red-700">Sobrecargados</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700">{estadisticasGlobales.sobrecargados}</p>
          <p className="text-xs text-red-600">profesionales</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LISTA DE PROFESIONALES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {profesionalesFiltrados.map((profesional) => (
          <TarjetaProfesional
            key={profesional.usuario.id}
            profesional={profesional}
            rolesDisponibles={rolesDisponibles}
            editando={profesionalEditando?.usuario.id === profesional.usuario.id}
            onEditar={() => setProfesionalEditando(profesional)}
            onCancelar={() => setProfesionalEditando(null)}
            onGuardar={(cambios) => handleActualizarProfesional(profesional.usuario.id, cambios)}
            onEliminar={() => handleEliminarProfesional(profesional.usuario.id)}
          />
        ))}

        {profesionalesFiltrados.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-500">
              No se encontraron profesionales
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {busqueda || filtroRol !== 'TODOS'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Agrega profesionales al equipo OCIG'}
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ENLACE A PROGRAMA DE AUDITORÍA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">Configuración y carga de trabajo</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Aquí configuras perfiles y capacidades del equipo OCI. La <strong>carga real</strong> calculada
            desde auditorías asignadas se visualiza en <strong>Programa de Auditoría → Profesionales</strong> (menú lateral).
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mostrarModalAgregar && (
        <ModalAgregarProfesional
          usuariosDisponibles={usuariosDisponiblesParaOCIG}
          rolesDisponibles={rolesDisponibles}
          especialidadesDisponibles={especialidadesDisponibles}
          onAgregar={handleAgregarProfesional}
          onCerrar={() => setMostrarModalAgregar(false)}
        />
      )}

      {mostrarModalConfiguracion && (
        <ModalConfiguracionCapacidadesRoles
          capacidadesIniciales={capacidadesRoles}
          onGuardar={handleGuardarConfiguracionGlobal}
          onCerrar={() => setMostrarModalConfiguracion(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE PROFESIONAL
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaProfesionalProps {
  profesional: ProfesionalOCIG;
  rolesDisponibles: readonly string[];
  editando: boolean;
  onEditar: () => void;
  onCancelar: () => void;
  onGuardar: (cambios: Partial<ConfiguracionOCIG>) => void;
  onEliminar: () => void;
}

function TarjetaProfesional({
  profesional,
  rolesDisponibles,
  editando,
  onEditar,
  onCancelar,
  onGuardar,
  onEliminar
}: TarjetaProfesionalProps) {
  const [form, setForm] = useState(profesional.configuracion);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const handleGuardar = () => {
    onGuardar(form);
  };

  // Determinar color de carga
  const getColorCarga = (porcentaje: number) => {
    if (porcentaje < 70) return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', bar: 'from-green-500 to-green-600' };
    if (porcentaje <= 90) return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', bar: 'from-yellow-500 to-yellow-600' };
    return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', bar: 'from-red-500 to-red-600' };
  };

  const colorCarga = getColorCarga(profesional.estadisticas.porcentajeCarga);

  if (editando) {
    return (
      <motion.div
        initial={{ backgroundColor: '#EFF6FF' }}
        animate={{ backgroundColor: '#EFF6FF' }}
        className="bg-white rounded-xl border-2 border-blue-400 p-6"
      >
        <div className="mb-4">
          <h3 className="text-lg font-black text-gray-900">{profesional.usuario.nombre}</h3>
          <p className="text-sm text-gray-600">{profesional.usuario.email}</p>
        </div>

        <div className="space-y-4">
          {/* Rol OCIG */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Rol en OCIG</label>
            <Select value={form.rolOCIG} onValueChange={(value) => setForm({ ...form, rolOCIG: value as any })}>
              <SelectTrigger className="w-full font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rolesDisponibles.map(rol => (
                  <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid de capacidades */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Capacidad Máxima</label>
              <input
                type="number"
                min="1"
                max="10"
                value={form.capacidadMaximaAuditorias}
                onChange={(e) => setForm({ ...form, capacidadMaximaAuditorias: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Auditorías simultáneas</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Horas Mensuales</label>
              <input
                type="number"
                min="40"
                max="200"
                step="10"
                value={form.horasMensualesDisponibles}
                onChange={(e) => setForm({ ...form, horasMensualesDisponibles: parseInt(e.target.value) || 40 })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Horas disponibles</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancelar}
              className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border-2 ${colorCarga.border} p-6 hover:shadow-lg transition-all`}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Información del Usuario */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-1">
                {profesional.usuario.nombre}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{profesional.usuario.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                {/* Rol OCIG (principal en este módulo) */}
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  profesional.configuracion.rolOCIG === 'Jefe OCI' ? 'bg-red-100 text-red-700' :
                  profesional.configuracion.rolOCIG === 'Auditor Sénior' ? 'bg-blue-100 text-blue-700' :
                  profesional.configuracion.rolOCIG === 'Auditor' ? 'bg-cyan-100 text-cyan-700' :
                  profesional.configuracion.rolOCIG === 'Auditor Júnior' ? 'bg-green-100 text-green-700' :
                  profesional.configuracion.rolOCIG === 'Apoyo Técnico' ? 'bg-purple-100 text-purple-700' :
                  profesional.configuracion.rolOCIG === 'Aprobador PAI' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {profesional.configuracion.rolOCIG || 'Sin rol OCIG'}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                  CC: {profesional.usuario.identificacion}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={onEditar}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                title="Editar configuración"
              >
                <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </button>
              {!confirmandoEliminar ? (
                <button
                  onClick={() => setConfirmandoEliminar(true)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                  title="Remover de OCIG"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  <span className="text-[11px] text-red-700 font-semibold whitespace-nowrap">¿Eliminar?</span>
                  <button
                    onClick={() => { onEliminar(); setConfirmandoEliminar(false); }}
                    className="px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setConfirmandoEliminar(false)}
                    className="px-2 py-0.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Especialidades */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-500 mb-2">ESPECIALIDADES:</div>
            <div className="flex flex-wrap gap-2">
              {profesional.configuracion.especialidades.map((esp, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                  {esp}
                </span>
              ))}
            </div>
          </div>

          {/* Capacidades */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <div className="text-xs font-bold text-blue-600 mb-1">CAPACIDAD MÁXIMA</div>
              <div className="text-2xl font-black text-blue-700">
                {profesional.configuracion.capacidadMaximaAuditorias}
              </div>
              <div className="text-xs text-blue-600">auditorías simultáneas</div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <div className="text-xs font-bold text-purple-600 mb-1">HORAS MENSUALES</div>
              <div className="text-2xl font-black text-purple-700">
                {profesional.configuracion.horasMensualesDisponibles}
              </div>
              <div className="text-xs text-purple-600">horas disponibles</div>
            </div>
          </div>
        </div>

        {/* Estadísticas de Carga */}
        <div className={`${colorCarga.bg} border-2 ${colorCarga.border} rounded-xl p-6 lg:w-80`}>
          <div className="text-center mb-4">
            <div className={`text-5xl font-black ${colorCarga.text} mb-2`}>
              {profesional.estadisticas.porcentajeCarga}%
            </div>
            <div className="text-sm font-bold text-gray-600">Carga Actual</div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full bg-gradient-to-r ${colorCarga.bar} transition-all duration-500`}
              style={{ width: `${Math.min(profesional.estadisticas.porcentajeCarga, 100)}%` }}
            />
          </div>

          {/* Detalles de auditorías */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 mb-1">Como Líder</div>
              <div className="text-xl font-black text-blue-600">
                {profesional.estadisticas.auditoriasComoLider}
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 mb-1">En Equipo</div>
              <div className="text-xl font-black text-purple-600">
                {profesional.estadisticas.auditoriasComoEquipo}
              </div>
            </div>
          </div>

          <div className="mt-3 bg-white rounded-lg p-2 text-center">
            <div className="text-xs text-gray-500 mb-1">Carga Ponderada</div>
            <div className="text-xl font-black text-gray-700">
              {profesional.estadisticas.cargaPonderada.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">
              de {profesional.configuracion.capacidadMaximaAuditorias} máx.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: AGREGAR PROFESIONAL AL EQUIPO OCIG
// ════════════════════════════════════════════════════════════════════════════

interface ModalAgregarProfesionalProps {
  usuariosDisponibles: UsuarioSistema[];
  rolesDisponibles: readonly string[];
  especialidadesDisponibles: string[];
  onAgregar: (config: ConfiguracionOCIG) => void;
  onCerrar: () => void;
}

function ModalAgregarProfesional({ 
  usuariosDisponibles, 
  rolesDisponibles,
  especialidadesDisponibles,
  onAgregar, 
  onCerrar 
}: ModalAgregarProfesionalProps) {
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openEspecialidades, setOpenEspecialidades] = useState(false);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const { getCapacidadPorRol } = useConfiguracionCapacidadesGlobales();
  
  // Estado para el rol, inicializado con el primer rol disponible si existe
  const [rolOCIG, setRolOCIG] = useState<string>(rolesDisponibles[0] || '');
  const [capacidad, setCapacidad] = useState(1);
  const [horas, setHoras] = useState(160);

  // Efecto para actualizar el rol por defecto cuando los roles se cargan
  useEffect(() => {
    if (rolesDisponibles.length > 0 && !rolOCIG) {
      const primerRol = rolesDisponibles[0];
      setRolOCIG(primerRol);
      const defaults = getCapacidadPorRol(primerRol);
      setCapacidad(defaults.capacidadMaximaAuditorias);
      setHoras(defaults.horasMensualesDisponibles);
    }
  }, [rolesDisponibles, rolOCIG, getCapacidadPorRol]);

  const handleRolCambio = (nuevoRol: string) => {
    setRolOCIG(nuevoRol);
    const defaults = getCapacidadPorRol(nuevoRol);
    setCapacidad(defaults.capacidadMaximaAuditorias);
    setHoras(defaults.horasMensualesDisponibles);
  };
  const [busquedaEspecialidad, setBusquedaEspecialidad] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioSeleccionado) {
      toast.error('❌ Debes seleccionar un usuario');
      return;
    }

    if (!rolOCIG) {
      toast.error('❌ Debes seleccionar un rol para el profesional');
      return;
    }

    // Especialidades son opcionales

    // Obtener el usuario para conseguir idTercero
    const usuario = usuariosDisponibles.find(u => u.id === usuarioSeleccionado);
    if (!usuario) {
      toast.error('❌ Usuario no encontrado');
      return;
    }

    const nuevaConfig: ConfiguracionOCIG = {
      usuarioId: usuarioSeleccionado,
      idTercero: usuario.idTercero,
      rolOCI: rolOCIG as ConfiguracionOCIG['rolOCI'],
      especialidades: especialidades.length > 0 ? especialidades : ['Control Interno'],
      capacidadMaximaAuditorias: capacidad,
      horasMensualesDisponibles: horas,
      puedeSerLider: true,
      activo: true,
      fechaAsignacion: new Date().toISOString().split('T')[0]
    };

    onAgregar(nuevaConfig);
  };

  const agregarEspecialidad = (especialidad: string) => {
    if (!especialidades.includes(especialidad)) {
      setEspecialidades([...especialidades, especialidad]);
      setBusquedaEspecialidad('');
    }
  };

  const removerEspecialidad = (especialidad: string) => {
    setEspecialidades(especialidades.filter(e => e !== especialidad));
  };

  const especialidadesFiltradas = ESPECIALIDADES_DISPONIBLES.filter(
    e => !especialidades.includes(e) && e.toLowerCase().includes(busquedaEspecialidad.toLowerCase())
  );

  // ── Wizard step state ──
  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 3;

  const canAdvanceStep = (step: number) => {
    if (step === 1) return !!usuarioSeleccionado;
    if (step === 2) return !!rolOCIG;
    return true;
  };

  const selectedUser = usuariosDisponibles.find(u => u.id === usuarioSeleccionado);

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, isolation: 'isolate' }}
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.95, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          maxWidth: 'min(540px, 100vw)',
          maxHeight: 'min(calc(100dvh - 1rem), 95dvh)',
          height: 'auto',
          margin: '0 auto',
          marginTop: 'env(safe-area-inset-top, 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[inherit]">
          {/* ═══ Header ESAP Corporate Blue ═══ */}
          <div
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #002d7a 60%, #001f5c 100%)',
              padding: '1.25rem 1.25rem 1rem',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
              borderRadius: '1rem 1rem 0 0',
            }}
          >
            {/* Decorative background elements */}
            <div style={{ position: 'absolute', top: '-2rem', right: '-2rem', width: '7rem', height: '7rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: '-1.5rem', left: '-1.5rem', width: '5rem', height: '5rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.04)' }} />

            {/* Title row */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.2)', margin: 0 }}>
                  Asignar Profesional
                </h2>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'rgba(255,255,255,0.65)', margin: '0.25rem 0 0' }}>
                  Equipo OCIG — Control Interno de Gestión
                </p>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: '#ffffff', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ═══ Step Indicator ═══ */}
            <div className="relative flex items-center">
              {[
                { num: 1, label: 'Profesional', icon: '👤' },
                { num: 2, label: 'Rol y Área', icon: '🎯' },
                { num: 3, label: 'Capacidad', icon: '⚡' },
              ].map((step, i) => (
                <div key={step.num} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (step.num < wizardStep || canAdvanceStep(wizardStep)) {
                        setWizardStep(step.num);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full transition-all"
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      ...(wizardStep === step.num
                        ? { backgroundColor: '#ffffff', color: '#003DA5', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
                        : wizardStep > step.num
                          ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#ffffff' }
                          : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
                      )
                    }}
                  >
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: '1.2rem', height: '1.2rem', fontSize: '0.55rem', fontWeight: 900,
                        ...(wizardStep > step.num
                          ? { backgroundColor: '#22c55e', color: '#fff' }
                          : wizardStep === step.num
                            ? { backgroundColor: '#003DA5', color: '#fff' }
                            : { backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                        )
                      }}
                    >
                      {wizardStep > step.num ? '✓' : step.num}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.icon}</span>
                  </button>
                  {i < 2 && (
                    <div
                      className="flex-1 mx-1 rounded-full"
                      style={{
                        height: '2px',
                        backgroundColor: wizardStep > step.num ? '#22c55e' : 'rgba(255,255,255,0.15)',
                        transition: 'background-color 0.3s'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Step Content ═══ */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ minHeight: 0, maxHeight: 'calc(100dvh - 14rem)', WebkitOverflowScrolling: 'touch' }}>
            <AnimatePresence mode="wait">
              {/* ──────── STEP 1: Seleccionar profesional ──────── */}
              {wizardStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-gray-800">¿Quién se unirá al equipo?</span>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar por nombre o email..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition-colors"
                      onChange={(e) => {
                        const term = e.target.value.toLowerCase();
                        document.querySelectorAll('[data-prof-item]').forEach((el: any) => {
                          const searchText = el.getAttribute('data-prof-search') || '';
                          el.style.display = searchText.includes(term) ? '' : 'none';
                        });
                      }}
                    />
                  </div>

                  {/* User list */}
                  <div className="max-h-[35dvh] sm:max-h-[240px] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 -webkit-overflow-scrolling-touch">
                    {usuariosDisponibles.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                        Todos los profesionales ya están asignados
                      </div>
                    ) : (
                      usuariosDisponibles.map(usuario => (
                        <button
                          key={usuario.id}
                          type="button"
                          data-prof-item
                          data-prof-search={`${usuario.nombre} ${usuario.email} ${usuario.identificacion}`.toLowerCase()}
                          onClick={() => setUsuarioSeleccionado(usuario.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all text-sm ${usuarioSeleccionado === usuario.id
                            ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
                            : 'hover:bg-gray-50'
                            }`}
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${usuarioSeleccionado === usuario.id
                            ? 'text-white'
                            : 'bg-gray-200 text-gray-600'
                            }`} style={usuarioSeleccionado === usuario.id ? { backgroundColor: '#003DA5' } : {}}>
                            {getInitials(usuario.nombre)}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{usuario.nombre}</div>
                            <div className="text-[11px] text-gray-400 truncate">{usuario.email}</div>
                          </div>
                          {/* Role badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${usuario.roles?.[0]?.includes('Jefe') ? 'bg-purple-100 text-purple-700' :
                            usuario.roles?.[0]?.includes('Líder') ? 'bg-blue-100 text-blue-700' :
                              usuario.roles?.[0]?.includes('Senior') ? 'bg-cyan-100 text-cyan-700' :
                                usuario.roles?.[0]?.includes('Junior') ? 'bg-green-100 text-green-700' :
                                  usuario.roles?.[0]?.includes('Auditado') ? 'bg-amber-100 text-amber-700' :
                                    usuario.roles?.[0]?.includes('Super') ? 'bg-red-100 text-red-700' :
                                      usuario.roles?.[0]?.includes('Profesional') ? 'bg-teal-100 text-teal-700' :
                                        usuario.roles?.[0]?.includes('Administrador') ? 'bg-indigo-100 text-indigo-700' :
                                          'bg-gray-100 text-gray-600'
                            }`}>
                            {usuario.roles?.[0] || 'Sin rol'}
                          </span>
                          {/* Check */}
                          {usuarioSeleccionado === usuario.id && (
                            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#003DA5' }} />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Selection hint */}
                  {!usuarioSeleccionado && usuariosDisponibles.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                      Selecciona un profesional para continuar
                    </p>
                  )}
                </motion.div>
              )}

              {/* ──────── STEP 2: Especialidades ──────── */}
              {wizardStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Selected user preview */}
                  {selectedUser && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-black" style={{ backgroundColor: '#003DA5' }}>
                        {getInitials(selectedUser.nombre)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{selectedUser.nombre}</div>
                        <div className="text-xs text-gray-500">{selectedUser.email}</div>
                      </div>
                    </div>
                  )}

                  {/* Rol OCIG */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Rol en OCIG
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {rolesDisponibles.map(rol => (
                        <button
                          key={rol}
                          type="button"
                          onClick={() => handleRolCambio(rol)}
                          className={`px-2 py-2 rounded-lg text-xs font-bold text-center transition-all ${rolOCIG === rol
                            ? 'text-white shadow-md ring-2 ring-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          style={rolOCIG === rol ? { backgroundColor: '#003DA5' } : {}}
                        >
                          {rol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Especialidades */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Especialidades
                      <span className="ml-1 text-gray-400 normal-case font-normal">({especialidades.length} seleccionadas) — Opcional</span>
                    </label>

                    {/* Selected chips */}
                    {especialidades.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {especialidades.map(esp => (
                          <motion.span
                            key={esp}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-semibold shadow-sm"
                          >
                            {esp}
                            <button
                              type="button"
                              onClick={() => removerEspecialidad(esp)}
                              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.span>
                        ))}
                      </div>
                    )}

                    {/* Available chips */}
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-xl border border-gray-200 max-h-[120px] overflow-y-auto">
                      {especialidadesDisponibles.filter(e => !especialidades.includes(e)).map(esp => (
                        <button
                          key={esp}
                          type="button"
                          onClick={() => agregarEspecialidad(esp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          {esp}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ──────── STEP 3: Capacidad ──────── */}
              {wizardStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Summary card */}
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full text-white flex items-center justify-center text-sm font-black" style={{ backgroundColor: '#003DA5' }}>
                        {selectedUser ? getInitials(selectedUser.nombre) : '?'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{selectedUser?.nombre}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{rolOCIG}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{especialidades.length} especialidad(es)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {especialidades.map(e => (
                        <span key={e} className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">{e}</span>
                      ))}
                    </div>
                  </div>

                  {/* Capacity controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Auditorías Simultáneas
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={capacidad}
                          onChange={(e) => setCapacidad(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">1</span>
                          <span className="text-lg font-black text-blue-600">{capacidad}</span>
                          <span className="text-[10px] text-gray-400">10</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Horas / Mes
                      </label>
                      <div className="relative">
                        <input
                          type="range"
                          min="40"
                          max="200"
                          step="10"
                          value={horas}
                          onChange={(e) => setHoras(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-gray-400">40h</span>
                          <span className="text-lg font-black text-blue-600">{horas}h</span>
                          <span className="text-[10px] text-gray-400">200h</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick capacity presets */}
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Perfiles predefinidos</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1">
                      {[
                        { label: 'Dedicación Parcial', cap: 2, hrs: 80 },
                        { label: 'Dedicación Media', cap: 4, hrs: 120 },
                        { label: 'Dedicación Completa', cap: 6, hrs: 160 },
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => { setCapacidad(preset.cap); setHoras(preset.hrs); }}
                          className={`p-2 rounded-lg border text-center transition-all ${capacidad === preset.cap && horas === preset.hrs
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                            }`}
                        >
                          <div className="text-[10px] font-bold text-gray-700">{preset.label}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{preset.cap} aud · {preset.hrs}h</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ Footer ═══ */}
          <div className="shrink-0 border-t border-gray-200 px-3 sm:px-4 py-3 flex items-center gap-2" style={{ backgroundColor: '#f9fafb', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
            {wizardStep > 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWizardStep(wizardStep - 1);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ← Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={onCerrar}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            )}

            <div className="flex-1" />

            {/* Step counter */}
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
              Paso {wizardStep} de {totalSteps}
            </span>

            {wizardStep < totalSteps ? (
              <button
                type="button"
                disabled={!canAdvanceStep(wizardStep)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWizardStep(wizardStep + 1);
                }}
                className="px-5 py-2 text-white text-sm font-bold rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                style={{ backgroundColor: canAdvanceStep(wizardStep) ? '#003DA5' : '#9ca3af' }}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="submit"
                disabled={!usuarioSeleccionado}
                className="px-5 py-2 text-white text-sm font-bold rounded-lg transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #16a34a, #059669)' }}
              >
                <UserCheck className="w-4 h-4" />
                Asignar a OCIG
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
