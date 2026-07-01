/**
 * GESTIÓN DE PROFESIONALES - WORLD CLASS ✨
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 * 
 * Sistema avanzado de administración de profesionales con:
 * - Dashboard de carga de trabajo
 * - Asignación y reasignación de procesos
 * - Indicadores de desempeño
 * - Análisis de capacidad
 * - Integración con nomenclatura única de procesos
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Download, Eye, MoreVertical,
  X, Users, Mail, Phone, Award, Target, TrendingUp, Clock,
  AlertTriangle, CheckCircle, FolderOpen, User, Briefcase, MapPin,
  ArrowRightLeft, PieChart, BarChart3, RefreshCw, AlertCircle,
  Calendar, FileText, Shield, ChevronDown, ChevronRight,
  Scale, Hash, Activity, TrendingDown, UserCheck, UserX,
  ArrowUpDown, ArrowUp, ArrowDown, Table2, Grid3x3, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { authService } from '../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { Lock } from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  especialidad: string;
  email: string;
  telefono: string;
  procesosAsignados: number;
  capacidadMaxima: number;
  procesosVencidos: number;
  procesosEnRiesgo: number;
  procesosAlDia: number;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'comision';
  tipoContrato: 'Planta' | 'Contratista' | 'OPS';
  territorial: string;
  etapasAsignadas: string[];
}

interface ProcesoAsignado {
  id: string;
  numeroProceso: string;
  denunciado: string;
  etapa: string;
  diasRestantes: number;
  estado: 'al_dia' | 'riesgo' | 'vencido';
  fechaAsignacion: string;
}

interface Estadisticas {
  totalProfesionales: number;
  activos: number;
  sobreCargados: number;
  disponibles: number;
  capacidadTotal: number;
  capacidadUtilizada: number;
  procesosAsignados: number;
  tasaUtilizacion: number;
}

// ============================================================================
// MOCK DATA - Actualizado con nomenclatura única
// ============================================================================

const PROFESIONALES_MOCK: Profesional[] = [
  {
    id: '1',
    nombre: 'Juan Pérez Rodríguez',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Disciplinario',
    email: 'juan.perez@esap.edu.co',
    telefono: '3001234567',
    procesosAsignados: 8,
    capacidadMaxima: 12,
    procesosVencidos: 1,
    procesosEnRiesgo: 2,
    procesosAlDia: 5,
    fechaIngreso: '2020-03-15',
    estado: 'activo',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional',
    etapasAsignadas: ['Indagación Preliminar', 'Investigación Disciplinaria']
  },
  {
    id: '2',
    nombre: 'María Torres Gómez',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Administrativo',
    email: 'maria.torres@esap.edu.co',
    telefono: '3109876543',
    procesosAsignados: 10,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 3,
    procesosAlDia: 7,
    fechaIngreso: '2021-06-10',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Bogotá',
    etapasAsignadas: ['Juzgamiento', 'Segunda Instancia']
  },
  {
    id: '3',
    nombre: 'Carlos Martínez Silva',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Penal',
    email: 'carlos.martinez@esap.edu.co',
    telefono: '3156789012',
    procesosAsignados: 5,
    capacidadMaxima: 15,
    procesosVencidos: 0,
    procesosEnRiesgo: 1,
    procesosAlDia: 4,
    fechaIngreso: '2019-09-01',
    estado: 'activo',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional',
    etapasAsignadas: ['Valoración', 'Indagación Preliminar', 'Investigación Disciplinaria']
  },
  {
    id: '4',
    nombre: 'Laura González Ruiz',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Constitucional',
    email: 'laura.gonzalez@esap.edu.co',
    telefono: '3187654321',
    procesosAsignados: 3,
    capacidadMaxima: 8,
    procesosVencidos: 0,
    procesosEnRiesgo: 0,
    procesosAlDia: 3,
    fechaIngreso: '2022-01-20',
    estado: 'vacaciones',
    tipoContrato: 'OPS',
    territorial: 'Territorial Antioquia',
    etapasAsignadas: ['Valoración']
  },
  {
    id: '5',
    nombre: 'Diego López Ramírez',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Laboral',
    email: 'diego.lopez@esap.edu.co',
    telefono: '3201112233',
    procesosAsignados: 12,
    capacidadMaxima: 12,
    procesosVencidos: 2,
    procesosEnRiesgo: 4,
    procesosAlDia: 6,
    fechaIngreso: '2018-05-12',
    estado: 'activo',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional',
    etapasAsignadas: ['Investigación Disciplinaria', 'Juzgamiento']
  },
  {
    id: '6',
    nombre: 'Ana Ramírez Castro',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Público',
    email: 'ana.ramirez@esap.edu.co',
    telefono: '3144445555',
    procesosAsignados: 0,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 0,
    procesosAlDia: 0,
    fechaIngreso: '2025-12-01',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Valle',
    etapasAsignadas: ['Valoración', 'Indagación Preliminar']
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface Props {
  onVerProcesos?: (profesional: Profesional) => void;
}

export function GestionProfesionalesWorldClass({ onVerProcesos }: { onVerProcesos?: (p: any) => void }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>(PROFESIONALES_MOCK);
  const [loading, setLoading] = useState(false);
  const [modalReasignar, setModalReasignar] = useState(false);
  
  const hasAccess = authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROFESIONALES_MANAGE);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl shadow-sm border m-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-gray-600 max-w-md">
          No tiene los permisos necesarios para acceder al módulo de gestión de profesionales.
          Por favor, contacte al administrador del sistema si cree que esto es un error.
        </p>
      </div>
    );
  }

  // Cargar profesionales desde el backend
  useEffect(() => {
    const fetchProfesionales = async () => {
      try {
        setLoading(true);
        const data = await disciplinaryService.getProfesionales();
        // Mapear los datos del backend al formato del componente
        const mappedProfesionales: Profesional[] = data.map((p: any) => ({
          id: p.id,
          nombre: p.nombreCompleto || p.nombre || '',
          cargo: p.cargo || 'Profesional',
          especialidad: p.especialidad || 'General',
          email: p.email || '',
          telefono: p.telefono || 'N/A',
          procesosAsignados: p.procesosAsignados || 0,
          capacidadMaxima: p.capacidadMaxima || 10,
          procesosVencidos: p.procesosVencidos || 0,
          procesosEnRiesgo: p.procesosEnRiesgo || 0,
          procesosAlDia: p.procesosAlDia || p.procesosAsignados || 0,
          fechaIngreso: p.fechaIngreso || new Date().toISOString().split('T')[0],
          estado: ((p.estado || 'ACTIVO').toLowerCase() === 'activo' ? 'activo' : (p.estado || 'ACTIVO').toLowerCase() === 'vacaciones' ? 'vacaciones' : (p.estado || 'ACTIVO').toLowerCase() === 'comision' ? 'comision' : 'inactivo') as 'activo' | 'inactivo' | 'vacaciones' | 'comision',
          tipoContrato: (p.tipoContrato || 'Contratista') as 'Planta' | 'Contratista' | 'OPS',
          territorial: p.territorial || 'Nacional',
          etapasAsignadas: p.etapasAsignadas || []
        }));
        setProfesionales(mappedProfesionales);
      } catch (error) {
        console.error('Error fetching professionals:', error);
        console.log('Error details:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method
        });
        console.log('Full error object:', error);
        toast.error('Error al cargar profesionales - usando datos de prueba');
        // Usar datos mock como fallback
        setProfesionales(PROFESIONALES_MOCK);
      } finally {
        setLoading(false);
      }
    };

    fetchProfesionales();
  }, []);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  
  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('todos');
  const [filtroContrato, setFiltroContrato] = useState<string>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [vistaDetalle, setVistaDetalle] = useState(false);
  
  // Estados de ordenamiento y selección
  const [ordenarPor, setOrdenarPor] = useState<keyof Profesional | null>(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [profesionalesSeleccionados, setProfesionalesSeleccionados] = useState<Set<string>>(new Set());

  // ============================================================================
  // CÁLCULO DE ESTADÍSTICAS
  // ============================================================================

  const estadisticas: Estadisticas = useMemo(() => {
    const activos = profesionales.filter(p => p.estado === 'activo');
    const sobreCargados = activos.filter(p => p.procesosAsignados >= p.capacidadMaxima);
    const disponibles = activos.filter(p => p.procesosAsignados < p.capacidadMaxima);
    const capacidadTotal = profesionales.reduce((acc, p) => acc + p.capacidadMaxima, 0);
    const capacidadUtilizada = profesionales.reduce((acc, p) => acc + p.procesosAsignados, 0);
    const procesosAsignados = profesionales.reduce((acc, p) => acc + p.procesosAsignados, 0);

    return {
      totalProfesionales: profesionales.length,
      activos: activos.length,
      sobreCargados: sobreCargados.length,
      disponibles: disponibles.length,
      capacidadTotal,
      capacidadUtilizada,
      procesosAsignados,
      tasaUtilizacion: capacidadTotal > 0 ? (capacidadUtilizada / capacidadTotal) * 100 : 0
    };
  }, [profesionales]);

  // ============================================================================
  // FILTRADO DE PROFESIONALES
  // ============================================================================

  const profesionalesFiltrados = useMemo(() => {
    let resultado = [...profesionales];

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(term) ||
        p.cargo.toLowerCase().includes(term) ||
        p.especialidad.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.territorial.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(p => p.estado === filtroEstado);
    }

    // Filtro por territorial
    if (filtroTerritorial !== 'todos') {
      resultado = resultado.filter(p => p.territorial === filtroTerritorial);
    }

    // Filtro por tipo de contrato
    if (filtroContrato !== 'todos') {
      resultado = resultado.filter(p => p.tipoContrato === filtroContrato);
    }

    return resultado;
  }, [profesionales, searchTerm, filtroEstado, filtroTerritorial, filtroContrato]);

  // Obtener valores únicos para filtros
  const territorialesUnicos = useMemo(() => {
    const territoriales = [...new Set(profesionales.map(p => p.territorial))];
    return territoriales.sort();
  }, [profesionales]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: UserCheck };
      case 'inactivo': return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', icon: UserX };
      case 'vacaciones': return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: Calendar };
      case 'comision': return { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF', icon: Briefcase };
      default: return { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280', icon: User };
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'activo': return 'Activo';
      case 'inactivo': return 'Inactivo';
      case 'vacaciones': return 'Vacaciones';
      case 'comision': return 'Comisión';
      default: return estado;
    }
  };

  const handleReasignar = (profesional: Profesional) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESOS_REASSIGN)) {
      toast.error('No tiene permisos para reasignar procesos');
      return;
    }
    setProfesionalSeleccionado(profesional);
    setModalReasignar(true);
  };

  const getCargaColor = (profesional: Profesional) => {
    const porcentaje = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
    if (porcentaje >= 100) return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' };
    if (porcentaje >= 80) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    if (porcentaje >= 50) return { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' };
    return { bg: '#ECFDF5', border: '#10B981', text: '#065F46' };
  };

  const handleExportarPDF = async () => {
    const profesionalesConProcesos = profesionalesFiltrados.filter(p => p.procesosAsignados > 0);

    if (profesionalesConProcesos.length === 0) {
      toast.warning('Sin datos para exportar', {
        description: 'No hay profesionales con procesos asignados.'
      });
      return;
    }

    const XLSX = await import('xlsx');

    const estadoLabel: Record<string, string> = {
      activo: 'Activo',
      inactivo: 'Inactivo',
      vacaciones: 'Vacaciones',
      comision: 'Comisión',
    };

    const filas = profesionalesConProcesos.map(p => ({
      'Profesional': p.nombre,
      'Cargo': p.cargo,
      'Tipo de Contrato': p.tipoContrato,
      'Estado': estadoLabel[p.estado] ?? p.estado,
      'Territorial': p.territorial,
      'Email': p.email,
      'Procesos Abiertos': p.procesosAsignados,
      'Al Día': p.procesosAlDia,
      'En Riesgo': p.procesosEnRiesgo,
      'Con Vencimiento de Etapa': p.procesosVencidos,
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profesionales');

    const colWidths = Object.keys(filas[0]).map(key => ({ wch: Math.max(key.length + 2, 18) }));
    ws['!cols'] = colWidths;

    const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    XLSX.writeFile(wb, `informe_profesionales_${fecha}.xlsx`);

    toast.success('Informe exportado', {
      description: `${profesionalesConProcesos.length} profesional${profesionalesConProcesos.length !== 1 ? 'es' : ''} incluido${profesionalesConProcesos.length !== 1 ? 's' : ''}`
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
              Gestión de Profesionales
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Administración de carga de trabajo y asignación de procesos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportarPDF}
              className="px-4 py-2 rounded-xl font-semibold border-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Cards de estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Total</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{estadisticas.totalProfesionales}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="text-xs font-semibold" style={{ color: '#065F46' }}>Activos</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{estadisticas.activos}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#FEE2E2', borderColor: '#FECACA' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
              <span className="text-xs font-semibold" style={{ color: '#991B1B' }}>Sobrecarga</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{estadisticas.sobreCargados}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="text-xs font-semibold" style={{ color: '#065F46' }}>Disponibles</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{estadisticas.disponibles}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Capacidad</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{estadisticas.capacidadTotal}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold" style={{ color: '#92400E' }}>Utilizados</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{estadisticas.capacidadUtilizada}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Procesos</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{estadisticas.procesosAsignados}</p>
          </div>

          <div
            className="p-4 rounded-xl border-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold" style={{ color: '#92400E' }}>Utilización</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
              {estadisticas.tasaUtilizacion.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cargo, especialidad o territorial..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors text-sm"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Botón de filtros */}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="px-4 py-3 rounded-xl font-semibold border-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {mostrarFiltros ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Panel de filtros expandible */}
        <AnimatePresence>
          {mostrarFiltros && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 rounded-xl border-2 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                {/* Filtro por estado */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#003DA5] text-sm"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="comision">Comisión</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                {/* Filtro por tipo de contrato */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                    Tipo de Contrato
                  </label>
                  <select
                    value={filtroContrato}
                    onChange={(e) => setFiltroContrato(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#003DA5] text-sm"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="Planta">Planta</option>
                    <option value="Contratista">Contratista</option>
                    <option value="OPS">OPS</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Listado de profesionales */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Cargando profesionales...</p>
          </div>
        ) : profesionalesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <p className="font-semibold" style={{ color: '#6B7280' }}>
              No se encontraron profesionales
            </p>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
            {/* Tabla de profesionales */}
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Header de tabla */}
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Profesional
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Cargo / Especialidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Territorial
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Carga de Trabajo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Al Día
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Riesgo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Vencidos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>

                {/* Body de tabla */}
                <tbody>
                  {profesionalesFiltrados.map((profesional, index) => {
                    const estadoColors = getEstadoColor(profesional.estado);
                    const cargaColors = getCargaColor(profesional);
                    const IconoEstado = estadoColors.icon;
                    const porcentajeCarga = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;

                    return (
                      <motion.tr
                        key={profesional.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#F3F4F6' }}
                      >
                        {/* Columna: Profesional */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                            >
                              <User className="w-5 h-5 text-white" />
                            </div>

                            {/* Info básica */}
                            <div>
                              <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                                {profesional.nombre}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: '#6B7280' }}>
                                <Briefcase className="w-3 h-3" />
                                <span>{profesional.tipoContrato}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Columna: Cargo / Especialidad */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                            {profesional.cargo}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: '#6B7280' }}>
                            <Award className="w-3 h-3" />
                            <span>{profesional.especialidad}</span>
                          </div>
                        </td>

                        {/* Columna: Territorial */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{profesional.territorial}</span>
                          </div>
                        </td>

                        {/* Columna: Estado */}
                        <td className="px-4 py-3 text-center">
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                              background: estadoColors.bg,
                              color: estadoColors.text,
                              border: `1px solid ${estadoColors.border}`
                            }}
                          >
                            <IconoEstado className="w-3.5 h-3.5" />
                            {getEstadoLabel(profesional.estado)}
                          </div>
                        </td>

                        {/* Columna: Carga de trabajo */}
                        <td className="px-4 py-3">
                          <div className="min-w-[150px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                                {profesional.procesosAsignados}/{profesional.capacidadMaxima}
                              </span>
                              <span className="text-xs font-bold" style={{ color: cargaColors.text }}>
                                {Math.round(porcentajeCarga)}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(porcentajeCarga, 100)}%`,
                                  background: porcentajeCarga >= 100 ? '#DC2626' :
                                             porcentajeCarga >= 80 ? '#F59E0B' :
                                             porcentajeCarga >= 50 ? '#2563EB' : '#10B981'
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Columna: Al Día */}
                        <td className="px-4 py-3 text-center">
                          <div
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
                            style={{ background: '#ECFDF5' }}
                          >
                            <span className="text-lg font-bold" style={{ color: '#10B981' }}>
                              {profesional.procesosAlDia}
                            </span>
                          </div>
                        </td>

                        {/* Columna: Riesgo */}
                        <td className="px-4 py-3 text-center">
                          <div
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
                            style={{ background: '#FEF3C7' }}
                          >
                            <span className="text-lg font-bold" style={{ color: '#F59E0B' }}>
                              {profesional.procesosEnRiesgo}
                            </span>
                          </div>
                        </td>

                        {/* Columna: Vencidos */}
                        <td className="px-4 py-3 text-center">
                          <div
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
                            style={{ background: '#FEE2E2' }}
                          >
                            <span className="text-lg font-bold" style={{ color: '#DC2626' }}>
                              {profesional.procesosVencidos}
                            </span>
                          </div>
                        </td>

                        {/* Columna: Acciones */}
                        <td className="px-4 py-3 text-center">
                          {onVerProcesos && profesional.procesosAsignados > 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onVerProcesos(profesional);
                              }}
                              className="px-3 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all text-xs mx-auto"
                              style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              Ver Procesos
                            </button>
                          ) : (
                            <div className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                              Sin procesos
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer de tabla con totales */}
            <div className="border-t-2 px-4 py-3 flex items-center justify-between" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                <Users className="w-4 h-4" />
                <span className="font-semibold">
                  Total: {profesionalesFiltrados.length} profesionales
                </span>
              </div>
              
              <div className="flex items-center gap-6 text-xs" style={{ color: '#6B7280' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#10B981' }}></div>
                  <span>Disponible (0-50%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }}></div>
                  <span>Normal (50-80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }}></div>
                  <span>Riesgo (80-100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#DC2626' }}></div>
                  <span>Sobrecarga (100%+)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}