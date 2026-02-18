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

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Save, Plus, Edit2, Trash2, AlertCircle, CheckCircle2,
  Clock, TrendingUp, Settings, UserPlus, Activity, Target,
  BarChart3, X, Info, Search, Filter, UserCheck
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

// Usuario del sistema (viene de Administración - Perfiles)
interface UsuarioSistema {
  id: string;
  nombre: string;
  identificacion: string;
  email: string;
  cargo?: string;
  area?: string;
  activo: boolean;
}

// Configuración OCIG del profesional
interface ConfiguracionOCIG {
  usuarioId: string;
  rolOCIG: 'Jefe OCIG' | 'Auditor Sénior' | 'Auditor' | 'Auditor Júnior' | 'Apoyo Técnico';
  especialidades: string[];
  capacidadMaximaAuditorias: number;
  horasMensualesDisponibles: number;
  puedeSerLider: boolean;
  activo: boolean;
  fechaAsignacion: string;
  observaciones?: string;
}

// Profesional OCIG (Usuario + Configuración)
interface ProfesionalOCIG {
  usuario: UsuarioSistema;
  configuracion: ConfiguracionOCIG;
  estadisticas: {
    auditoriasTotales: number;
    auditoriasComoLider: number;
    auditoriasComoEquipo: number;
    cargaPonderada: number;
    porcentajeCarga: number;
    horasAsignadas: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MOCK DATA - USUARIOS DEL SISTEMA
// ════════════════════════════════════════════════════════════════════════════

const USUARIOS_SISTEMA_MOCK: UsuarioSistema[] = [
  { id: 'USR-001', nombre: 'Mario Oswaldo Bernal Rodríguez', identificacion: '79123456', email: 'mario.bernal@esap.edu.co', cargo: 'Profesional Especializado', area: 'Control Interno', activo: true },
  { id: 'USR-002', nombre: 'Ana María López Gómez', identificacion: '52987654', email: 'ana.lopez@esap.edu.co', cargo: 'Profesional Universitario', area: 'Control Interno', activo: true },
  { id: 'USR-003', nombre: 'Carlos Andrés Mendoza Silva', identificacion: '80456789', email: 'carlos.mendoza@esap.edu.co', cargo: 'Profesional Universitario', area: 'Control Interno', activo: true },
  { id: 'USR-004', nombre: 'Laura Patricia Rodríguez Pérez', identificacion: '53654321', email: 'laura.rodriguez@esap.edu.co', cargo: 'Tecnólogo', area: 'Control Interno', activo: true },
  { id: 'USR-005', nombre: 'Juan Pablo García Martínez', identificacion: '1020304050', email: 'juan.garcia@esap.edu.co', cargo: 'Contratista', area: 'Control Interno', activo: true },
  { id: 'USR-006', nombre: 'Sandra Patricia Montero Díaz', identificacion: '52123789', email: 'sandra.montero@esap.edu.co', cargo: 'Profesional Universitario', area: 'Planeación', activo: true },
  { id: 'USR-007', nombre: 'Diego Fernando Castro López', identificacion: '79987123', email: 'diego.castro@esap.edu.co', cargo: 'Contratista', area: 'Sistemas', activo: true },
  { id: 'USR-008', nombre: 'Patricia Elena Vargas Torres', identificacion: '53789456', email: 'patricia.vargas@esap.edu.co', cargo: 'Profesional Especializado', area: 'Financiera', activo: true }
];

// ════════════════════════════════════════════════════════════════════════════
// MOCK DATA - PROFESIONALES YA ASIGNADOS A OCIG
// ════════════════════════════════════════════════════════════════════════════

const CONFIGURACIONES_OCIG_MOCK: ConfiguracionOCIG[] = [
  {
    usuarioId: 'USR-001',
    rolOCIG: 'Jefe OCIG',
    especialidades: ['Gestión Pública', 'Estrategia', 'Control Interno'],
    capacidadMaximaAuditorias: 3,
    horasMensualesDisponibles: 120,
    puedeSerLider: true,
    activo: true,
    fechaAsignacion: '2024-01-15',
    observaciones: 'Jefe de la Oficina de Control Interno de Gestión'
  },
  {
    usuarioId: 'USR-002',
    rolOCIG: 'Auditor Sénior',
    especialidades: ['Auditoría Financiera', 'Cumplimiento Normativo', 'Gestión de Riesgos'],
    capacidadMaximaAuditorias: 5,
    horasMensualesDisponibles: 160,
    puedeSerLider: true,
    activo: true,
    fechaAsignacion: '2024-02-01'
  },
  {
    usuarioId: 'USR-003',
    rolOCIG: 'Auditor',
    especialidades: ['Auditoría TI', 'Seguridad de la Información', 'Gestión Tecnológica'],
    capacidadMaximaAuditorias: 4,
    horasMensualesDisponibles: 150,
    puedeSerLider: true,
    activo: true,
    fechaAsignacion: '2024-03-10'
  },
  {
    usuarioId: 'USR-004',
    rolOCIG: 'Auditor',
    especialidades: ['Cumplimiento Normativo', 'Auditoría de Gestión'],
    capacidadMaximaAuditorias: 4,
    horasMensualesDisponibles: 150,
    puedeSerLider: true,
    activo: true,
    fechaAsignacion: '2024-04-05'
  },
  {
    usuarioId: 'USR-005',
    rolOCIG: 'Auditor Júnior',
    especialidades: ['Auditoría de Gestión'],
    capacidadMaximaAuditorias: 3,
    horasMensualesDisponibles: 140,
    puedeSerLider: false,
    activo: true,
    fechaAsignacion: '2024-06-20'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// MOCK DATA - AUDITORÍAS ASIGNADAS (para calcular carga)
// ════════════════════════════════════════════════════════════════════════════

const AUDITORIAS_ASIGNADAS_MOCK = [
  { id: 'AUD-001', auditorLider: 'Ana María López Gómez', equipo: ['Carlos Andrés Mendoza Silva'], horasEstimadas: 140 },
  { id: 'AUD-002', auditorLider: 'Mario Oswaldo Bernal Rodríguez', equipo: ['Laura Patricia Rodríguez Pérez'], horasEstimadas: 120 },
  { id: 'AUD-003', auditorLider: 'Ana María López Gómez', equipo: ['Laura Patricia Rodríguez Pérez', 'Juan Pablo García Martínez'], horasEstimadas: 160 },
  { id: 'AUD-004', auditorLider: 'Carlos Andrés Mendoza Silva', equipo: ['Laura Patricia Rodríguez Pérez'], horasEstimadas: 150 },
  { id: 'AUD-005', auditorLider: 'Carlos Andrés Mendoza Silva', equipo: ['Juan Pablo García Martínez'], horasEstimadas: 120 }
];

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const ESPECIALIDADES_DISPONIBLES = [
  'Auditoría Financiera',
  'Auditoría de Gestión',
  'Auditoría TI',
  'Cumplimiento Normativo',
  'Gestión de Riesgos',
  'Control Interno',
  'Seguridad de la Información',
  'Gestión Tecnológica',
  'Gestión Pública',
  'Estrategia',
  'Contratación Pública',
  'Gestión Presupuestal'
];

const ROLES_OCIG = [
  'Jefe OCIG',
  'Auditor Sénior',
  'Auditor',
  'Auditor Júnior',
  'Apoyo Técnico'
] as const;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionProfesionalesModule() {
  const [configuracionesOCIG, setConfiguracionesOCIG] = useState<ConfiguracionOCIG[]>(CONFIGURACIONES_OCIG_MOCK);
  const [mostrarModalAgregar, setMostrarModalAgregar] = useState(false);
  const [profesionalEditando, setProfesionalEditando] = useState<ProfesionalOCIG | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');

  // ════════════════════════════════════════════════════════════════════════════
  // CALCULAR PROFESIONALES OCIG CON ESTADÍSTICAS
  // ════════════════════════════════════════════════════════════════════════════

  const profesionalesOCIG: ProfesionalOCIG[] = useMemo(() => {
    return configuracionesOCIG
      .filter(config => config.activo)
      .map(config => {
        const usuario = USUARIOS_SISTEMA_MOCK.find(u => u.id === config.usuarioId);
        if (!usuario) return null;

        // Calcular estadísticas de carga
        const auditoriasComoLider = AUDITORIAS_ASIGNADAS_MOCK.filter(
          a => a.auditorLider === usuario.nombre
        ).length;

        const auditoriasComoEquipo = AUDITORIAS_ASIGNADAS_MOCK.filter(
          a => a.equipo.includes(usuario.nombre) && a.auditorLider !== usuario.nombre
        ).length;

        // Carga ponderada: Líder = 1.0, Equipo = 0.3
        const cargaPonderada = auditoriasComoLider + (auditoriasComoEquipo * 0.3);
        const porcentajeCarga = Math.round((cargaPonderada / config.capacidadMaximaAuditorias) * 100);

        // Calcular horas asignadas
        const auditoriasParticipando = AUDITORIAS_ASIGNADAS_MOCK.filter(
          a => a.auditorLider === usuario.nombre || a.equipo.includes(usuario.nombre)
        );
        const horasAsignadas = auditoriasParticipando.reduce((sum, a) => sum + a.horasEstimadas, 0);

        return {
          usuario,
          configuracion: config,
          estadisticas: {
            auditoriasTotales: auditoriasComoLider + auditoriasComoEquipo,
            auditoriasComoLider,
            auditoriasComoEquipo,
            cargaPonderada,
            porcentajeCarga,
            horasAsignadas
          }
        };
      })
      .filter((p): p is ProfesionalOCIG => p !== null);
  }, [configuracionesOCIG]);

  // Filtrar profesionales
  const profesionalesFiltrados = useMemo(() => {
    return profesionalesOCIG.filter(p => {
      const cumpleBusqueda = busqueda === '' || 
        p.usuario.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.usuario.email.toLowerCase().includes(busqueda.toLowerCase());
      
      const cumpleFiltroRol = filtroRol === 'TODOS' || p.configuracion.rolOCIG === filtroRol;
      
      return cumpleBusqueda && cumpleFiltroRol;
    });
  }, [profesionalesOCIG, busqueda, filtroRol]);

  // Usuarios disponibles para agregar (no asignados a OCIG)
  const usuariosDisponibles = useMemo(() => {
    const idsAsignados = new Set(configuracionesOCIG.map(c => c.usuarioId));
    return USUARIOS_SISTEMA_MOCK.filter(u => !idsAsignados.has(u.id) && u.activo);
  }, [configuracionesOCIG]);

  // ════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleAgregarProfesional = (config: ConfiguracionOCIG) => {
    setConfiguracionesOCIG([...configuracionesOCIG, config]);
    setMostrarModalAgregar(false);
    toast.success('✅ Profesional agregado al equipo OCIG');
  };

  const handleActualizarProfesional = (usuarioId: string, cambios: Partial<ConfiguracionOCIG>) => {
    setConfiguracionesOCIG(prev =>
      prev.map(c => (c.usuarioId === usuarioId ? { ...c, ...cambios } : c))
    );
    setProfesionalEditando(null);
    toast.success('✅ Configuración actualizada exitosamente');
  };

  const handleEliminarProfesional = (usuarioId: string) => {
    setConfiguracionesOCIG(prev => prev.filter(c => c.usuarioId !== usuarioId));
    toast.success('🗑️ Profesional removido del equipo OCIG');
  };

  // Estadísticas globales
  const estadisticasGlobales = useMemo(() => {
    const totalProfesionales = profesionalesOCIG.length;
    const capacidadTotal = profesionalesOCIG.reduce((sum, p) => sum + p.configuracion.capacidadMaximaAuditorias, 0);
    const horasTotales = profesionalesOCIG.reduce((sum, p) => sum + p.configuracion.horasMensualesDisponibles, 0);
    const auditoriasTotales = profesionalesOCIG.reduce((sum, p) => sum + p.estadisticas.auditoriasTotales, 0);
    const cargaPromedio = totalProfesionales > 0
      ? Math.round(profesionalesOCIG.reduce((sum, p) => sum + p.estadisticas.porcentajeCarga, 0) / totalProfesionales)
      : 0;
    const sobrecargados = profesionalesOCIG.filter(p => p.estadisticas.porcentajeCarga > 90).length;

    return {
      totalProfesionales,
      capacidadTotal,
      horasTotales,
      auditoriasTotales,
      cargaPromedio,
      sobrecargados
    };
  }, [profesionalesOCIG]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Profesionales OCIG
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Gestiona el equipo de Control Interno y su capacidad de trabajo
              </p>
            </div>
          </div>
          
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
          >
            <option value="TODOS">Todos los roles</option>
            {ROLES_OCIG.map(rol => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>
        </div>
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

        <div className="bg-white rounded-xl border-2 border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700">Capacidad Total</span>
            <Target className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-black text-green-700">{estadisticasGlobales.capacidadTotal}</p>
          <p className="text-xs text-green-600">auditorías máx.</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700">Horas Totales</span>
            <Clock className="w-4 h-4 text-purple-600" />
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
      {/* INFORMACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-6 bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong className="block mb-2">Información Importante:</strong>
            <ul className="list-disc list-inside space-y-1">
              <li>Los profesionales se crean en <strong>Administración → Perfiles de Usuario</strong></li>
              <li>Aquí solo se asignan al equipo OCIG y se configura su capacidad de trabajo</li>
              <li><strong>Capacidad Máxima:</strong> Número de auditorías que puede manejar simultáneamente</li>
              <li><strong>Carga Ponderada:</strong> Líder = 100%, Equipo = 30% del peso</li>
              <li>La información se sincroniza con el módulo de <strong>Universo Auditable → Profesionales</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODALES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mostrarModalAgregar && (
        <ModalAgregarProfesional
          usuariosDisponibles={usuariosDisponibles}
          onAgregar={handleAgregarProfesional}
          onCerrar={() => setMostrarModalAgregar(false)}
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
  editando: boolean;
  onEditar: () => void;
  onCancelar: () => void;
  onGuardar: (cambios: Partial<ConfiguracionOCIG>) => void;
  onEliminar: () => void;
}

function TarjetaProfesional({
  profesional,
  editando,
  onEditar,
  onCancelar,
  onGuardar,
  onEliminar
}: TarjetaProfesionalProps) {
  const [form, setForm] = useState(profesional.configuracion);

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
            <select
              value={form.rolOCIG}
              onChange={(e) => setForm({ ...form, rolOCIG: e.target.value as any })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
            >
              {ROLES_OCIG.map(rol => (
                <option key={rol} value={rol}>{rol}</option>
              ))}
            </select>
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

          {/* Puede ser líder */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-bold text-gray-900">Puede ser Auditor Líder</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, puedeSerLider: !form.puedeSerLider })}
              className={`relative w-12 h-6 rounded-full transition-all ${
                form.puedeSerLider ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  form.puedeSerLider ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
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
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                  {profesional.configuracion.rolOCIG}
                </span>
                {profesional.configuracion.puedeSerLider && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                    Puede ser Líder
                  </span>
                )}
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
              <button
                onClick={onEliminar}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                title="Remover de OCIG"
              >
                <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
              </button>
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
  onAgregar: (config: ConfiguracionOCIG) => void;
  onCerrar: () => void;
}

function ModalAgregarProfesional({ usuariosDisponibles, onAgregar, onCerrar }: ModalAgregarProfesionalProps) {
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
  const [rolOCIG, setRolOCIG] = useState<ConfiguracionOCIG['rolOCIG']>('Auditor');
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [capacidad, setCapacidad] = useState(4);
  const [horas, setHoras] = useState(150);
  const [puedeSerLider, setPuedeSerLider] = useState(true);
  const [busquedaEspecialidad, setBusquedaEspecialidad] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usuarioSeleccionado) {
      toast.error('❌ Debes seleccionar un usuario');
      return;
    }

    if (especialidades.length === 0) {
      toast.error('❌ Debes agregar al menos una especialidad');
      return;
    }

    const nuevaConfig: ConfiguracionOCIG = {
      usuarioId: usuarioSeleccionado,
      rolOCIG,
      especialidades,
      capacidadMaximaAuditorias: capacidad,
      horasMensualesDisponibles: horas,
      puedeSerLider,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Asignar Profesional a OCIG</h2>
                <p className="text-sm text-blue-100 mt-1">
                  Configura el rol y capacidad del profesional en el equipo
                </p>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Formulario */}
          <div className="p-6 space-y-6">
            {/* Seleccionar Usuario */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Profesional <span className="text-red-600">*</span>
              </label>
              <select
                value={usuarioSeleccionado}
                onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                required
              >
                <option value="">-- Seleccionar profesional --</option>
                {usuariosDisponibles.map(usuario => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} - {usuario.email}
                  </option>
                ))}
              </select>
              {usuariosDisponibles.length === 0 && (
                <p className="text-sm text-yellow-600 mt-2">
                  ⚠️ No hay usuarios disponibles. Todos los profesionales activos ya están asignados a OCIG.
                </p>
              )}
            </div>

            {/* Rol OCIG */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Rol en OCIG <span className="text-red-600">*</span>
              </label>
              <select
                value={rolOCIG}
                onChange={(e) => setRolOCIG(e.target.value as any)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
              >
                {ROLES_OCIG.map(rol => (
                  <option key={rol} value={rol}>{rol}</option>
                ))}
              </select>
            </div>

            {/* Especialidades */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Especialidades <span className="text-red-600">*</span>
              </label>
              <div className="space-y-2">
                {/* Especialidades seleccionadas */}
                {especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                    {especialidades.map(esp => (
                      <span
                        key={esp}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2"
                      >
                        {esp}
                        <button
                          type="button"
                          onClick={() => removerEspecialidad(esp)}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Buscar especialidad */}
                <input
                  type="text"
                  placeholder="Buscar especialidad..."
                  value={busquedaEspecialidad}
                  onChange={(e) => setBusquedaEspecialidad(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />

                {/* Lista de especialidades disponibles */}
                {busquedaEspecialidad && especialidadesFiltradas.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border-2 border-gray-200 rounded-lg">
                    {especialidadesFiltradas.map(esp => (
                      <button
                        key={esp}
                        type="button"
                        onClick={() => agregarEspecialidad(esp)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm"
                      >
                        {esp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Capacidades */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Capacidad Máxima
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={capacidad}
                  onChange={(e) => setCapacidad(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Auditorías simultáneas</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Horas Mensuales
                </label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  step="10"
                  value={horas}
                  onChange={(e) => setHoras(parseInt(e.target.value) || 40)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Horas disponibles</p>
              </div>
            </div>

            {/* Puede ser líder */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-bold text-gray-900">Puede ser Auditor Líder</div>
                <div className="text-sm text-gray-600">Habilita al profesional para liderar auditorías</div>
              </div>
              <button
                type="button"
                onClick={() => setPuedeSerLider(!puedeSerLider)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  puedeSerLider ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    puedeSerLider ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!usuarioSeleccionado || especialidades.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCheck className="w-5 h-5" />
              Asignar a OCIG
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
