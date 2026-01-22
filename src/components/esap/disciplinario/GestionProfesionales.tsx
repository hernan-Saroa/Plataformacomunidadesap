/**
 * ASIGNACIÓN Y SEGUIMIENTO DE PROFESIONALES - Control Disciplinario
 * 
 * ⚠️ IMPORTANTE - GOBERNANZA DE DATOS OTIC:
 * - NO se crean usuarios desde aquí
 * - NO se editan datos personales
 * - NO se asignan roles
 * - La gestión de personas es EXCLUSIVA del módulo "Gestión de Personas"
 * 
 * FUNCIONES DE ESTE MÓDULO:
 * ✓ Visualizar profesionales del área disciplinaria
 * ✓ Asignar/reasignar procesos entre profesionales
 * ✓ Ver carga de trabajo y capacidad
 * ✓ Generar reportes de desempeño
 * ✓ Redistribuir casos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Download, Eye, MoreVertical,
  X, Users, Mail, Phone, Award, Target, TrendingUp, Clock,
  AlertTriangle, CheckCircle, FolderOpen, User, Briefcase, MapPin,
  ArrowRightLeft, PieChart, BarChart3, RefreshCw, AlertCircle,
  Calendar, FileText, Shield, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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
  estado: 'activo' | 'inactivo' | 'vacaciones';
  tipoContrato: 'Planta' | 'Contratista';
  territorial: string;
}

interface ProcesoParaAsignar {
  id: string;
  numero: string;
  disciplinable: string;
  etapa: string;
  diasRestantes: number;
  prioridad: 'alta' | 'media' | 'baja';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const PROFESIONALES_DATA: Profesional[] = [
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
    territorial: 'Dirección Nacional'
  },
  {
    id: '2',
    nombre: 'María Torres Gómez',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Administrativo',
    email: 'maria.torres@esap.edu.co',
    telefono: '3109876543',
    procesosAsignados: 6,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 1,
    procesosAlDia: 5,
    fechaIngreso: '2021-06-10',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Bogotá'
  },
  {
    id: '3',
    nombre: 'Carlos Mendoza Silva',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Disciplinario',
    email: 'carlos.mendoza@esap.edu.co',
    telefono: '3205551234',
    procesosAsignados: 11,
    capacidadMaxima: 12,
    procesosVencidos: 2,
    procesosEnRiesgo: 3,
    procesosAlDia: 6,
    fechaIngreso: '2019-01-20',
    estado: 'activo',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional'
  },
  {
    id: '4',
    nombre: 'Ana González López',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Público',
    email: 'ana.gonzalez@esap.edu.co',
    telefono: '3157778899',
    procesosAsignados: 5,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 0,
    procesosAlDia: 5,
    fechaIngreso: '2022-08-05',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Antioquia'
  },
  {
    id: '5',
    nombre: 'Roberto Sánchez Cruz',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Disciplinario',
    email: 'roberto.sanchez@esap.edu.co',
    telefono: '3008887766',
    procesosAsignados: 0,
    capacidadMaxima: 12,
    procesosVencidos: 0,
    procesosEnRiesgo: 0,
    procesosAlDia: 0,
    fechaIngreso: '2018-05-12',
    estado: 'vacaciones',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional'
  },
  {
    id: '6',
    nombre: 'Laura Martínez Díaz',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Administrativo',
    email: 'laura.martinez@esap.edu.co',
    telefono: '3156667788',
    procesosAsignados: 4,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 1,
    procesosAlDia: 3,
    fechaIngreso: '2023-02-01',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Valle'
  }
];

const PROCESOS_SIN_ASIGNAR: ProcesoParaAsignar[] = [
  {
    id: 'p1',
    numero: 'PD-2025-0156',
    disciplinable: 'Carlos López Martínez',
    etapa: 'Valoración',
    diasRestantes: 15,
    prioridad: 'media'
  },
  {
    id: 'p2',
    numero: 'PD-2025-0157',
    disciplinable: 'Laura Gómez Silva',
    etapa: 'Indagación',
    diasRestantes: 3,
    prioridad: 'alta'
  },
  {
    id: 'p3',
    numero: 'PD-2025-0158',
    disciplinable: 'Diego Ramírez Castro',
    etapa: 'Valoración',
    diasRestantes: 25,
    prioridad: 'baja'
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function GestionProfesionales({ onVerProcesos }: { onVerProcesos?: (profesional: any) => void }) {
  const [profesionales, setProfesionales] = useState<Profesional[]>(PROFESIONALES_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterTerritorial, setFilterTerritorial] = useState<string>('all');
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalAsignacion, setShowModalAsignacion] = useState(false);
  const [showModalRedistribucion, setShowModalRedistribucion] = useState(false);

  // Filtrado
  const profesionalesFiltrados = profesionales.filter(p => {
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cargo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.especialidad.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || p.estado === filterEstado;
    const matchesTerritorial = filterTerritorial === 'all' || p.territorial === filterTerritorial;

    return matchesSearch && matchesEstado && matchesTerritorial;
  });

  // Territoriales únicos
  const territoriales = [...new Set(profesionales.map(p => p.territorial))];

  // Estadísticas
  const stats = {
    totalProfesionales: profesionales.length,
    activos: profesionales.filter(p => p.estado === 'activo').length,
    cargaPromedio: Math.round(
      profesionales.reduce((sum, p) => sum + (p.procesosAsignados / p.capacidadMaxima) * 100, 0) / profesionales.length
    ),
    procesosTotales: profesionales.reduce((sum, p) => sum + p.procesosAsignados, 0),
    procesosVencidos: profesionales.reduce((sum, p) => sum + p.procesosVencidos, 0),
    procesosSinAsignar: PROCESOS_SIN_ASIGNAR.length
  };

  const handleAsignarProceso = (profesionalId: string, procesoId: string) => {
    toast.success('Proceso asignado exitosamente', {
      description: 'El proceso ha sido asignado al profesional seleccionado'
    });
    setShowModalAsignacion(false);
  };

  const handleRedistribuir = () => {
    toast.success('Redistribución completada', {
      description: 'Los procesos han sido redistribuidos equitativamente'
    });
    setShowModalRedistribucion(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header World-Class */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" 
                style={{ backgroundColor: '#E0EDFF' }}
              >
                <Users size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Profesionales del Área
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Asignación y seguimiento de carga de trabajo
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-2 rounded-lg border bg-blue-50 border-blue-200">
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-lg sm:text-xl font-bold text-blue-700">{stats.totalProfesionales}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border bg-green-50 border-green-200">
              <p className="text-xs text-gray-600">Activos</p>
              <p className="text-lg sm:text-xl font-bold text-green-700">{stats.activos}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border bg-purple-50 border-purple-200">
              <p className="text-xs text-gray-600">Procesos</p>
              <p className="text-lg sm:text-xl font-bold text-purple-700">{stats.procesosTotales}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border bg-orange-50 border-orange-200">
              <p className="text-xs text-gray-600">Sin Asignar</p>
              <p className="text-lg sm:text-xl font-bold text-orange-700">{stats.procesosSinAsignar}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Informativo - Gobernanza */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-bold text-purple-900 mb-1">
                🔒 Gobernanza de Datos OTIC
              </p>
              <p className="text-xs sm:text-sm">
                La gestión de usuarios, roles y permisos se realiza <strong>ÚNICAMENTE</strong> desde el módulo de 
                <strong> Gestión de Personas</strong>. Este módulo solo permite asignar y visualizar la carga de trabajo 
                de los profesionales del área disciplinaria.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Acciones */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar profesional..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-semibold"
            >
              <option value="all">Todos</option>
              <option value="activo">✓ Activos</option>
              <option value="vacaciones">🏖️ Vacaciones</option>
              <option value="inactivo">✗ Inactivos</option>
            </select>
            <select
              value={filterTerritorial}
              onChange={(e) => setFilterTerritorial(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-semibold"
            >
              <option value="all">Todas las territoriales</option>
              {territoriales.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModalAsignacion(true)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Asignar</span>
            </button>
            <button
              onClick={() => setShowModalRedistribucion(true)}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Redistribuir</span>
            </button>
            <button
              onClick={() => toast.info('Exportando reporte...')}
              className="px-3 py-2 rounded-lg text-white font-bold hover:shadow-lg transition-all text-xs sm:text-sm flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Reporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Profesionales */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Profesional
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Cargo y Especialidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Territorial
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Carga de Trabajo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Al Día
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      En Riesgo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Vencidos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {profesionalesFiltrados.map((profesional) => {
                    const porcentajeCarga = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
                    const colorCarga = 
                      porcentajeCarga >= 90 ? '#DC2626' :
                      porcentajeCarga >= 70 ? '#F59E0B' :
                      '#10B981';

                    return (
                      <tr key={profesional.id} className="hover:bg-gray-50 transition-colors">
                        {/* Profesional con Avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                            >
                              {profesional.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-sm" style={{ color: '#003DA5' }}>
                                {profesional.nombre}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {profesional.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cargo y Especialidad */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{profesional.cargo}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Award className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{profesional.especialidad}</span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            {profesional.tipoContrato}
                          </span>
                        </td>

                        {/* Territorial */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" style={{ color: '#003DA5' }} />
                            <span className="text-sm text-gray-900">{profesional.territorial}</span>
                          </div>
                        </td>

                        {/* Carga de Trabajo */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: colorCarga }}>
                              {profesional.procesosAsignados} / {profesional.capacidadMaxima}
                            </span>
                            <div className="w-full max-w-[120px]">
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${porcentajeCarga}%`,
                                    backgroundColor: colorCarga
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-600 text-center mt-1">
                                {porcentajeCarga.toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Al Día */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
                            <span className="text-lg font-bold text-green-700">
                              {profesional.procesosAlDia}
                            </span>
                          </div>
                        </td>

                        {/* En Riesgo */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-50">
                            <span className="text-lg font-bold text-yellow-700">
                              {profesional.procesosEnRiesgo}
                            </span>
                          </div>
                        </td>

                        {/* Vencidos */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-50">
                            <span className="text-lg font-bold text-red-700">
                              {profesional.procesosVencidos}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: 
                                profesional.estado === 'activo' ? '#D1FAE5' :
                                profesional.estado === 'vacaciones' ? '#FEF3C7' : '#FEE2E2',
                              color:
                                profesional.estado === 'activo' ? '#059669' :
                                profesional.estado === 'vacaciones' ? '#D97706' : '#DC2626'
                            }}
                          >
                            {profesional.estado === 'activo' ? '✓ Activo' : 
                             profesional.estado === 'vacaciones' ? '🏖️ Vacaciones' : '✗ Inactivo'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setProfesionalSeleccionado(profesional);
                                setShowModalDetalle(true);
                              }}
                              className="p-2 rounded-lg hover:bg-gray-100 border border-gray-300"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (onVerProcesos) {
                                  onVerProcesos(profesional);
                                } else {
                                  toast.info(`Procesos de ${profesional.nombre}`, {
                                    description: `${profesional.procesosAsignados} procesos asignados`
                                  });
                                }
                              }}
                              className="p-2 rounded-lg text-white hover:shadow-lg transition-all"
                              style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                              title="Ver procesos"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {profesionalesFiltrados.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No se encontraron profesionales
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Detalle Profesional */}
      <AnimatePresence>
        {showModalDetalle && profesionalSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalDetalle(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                    >
                      {profesionalSeleccionado.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                        {profesionalSeleccionado.nombre}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {profesionalSeleccionado.cargo}
                      </p>
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold mt-2"
                        style={{
                          backgroundColor: 
                            profesionalSeleccionado.estado === 'activo' ? '#D1FAE5' :
                            profesionalSeleccionado.estado === 'vacaciones' ? '#FEF3C7' : '#FEE2E2',
                          color:
                            profesionalSeleccionado.estado === 'activo' ? '#059669' :
                            profesionalSeleccionado.estado === 'vacaciones' ? '#D97706' : '#DC2626'
                        }}
                      >
                        {profesionalSeleccionado.estado.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModalDetalle(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-6">
                {/* Información de Contacto */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Información de Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                        <Mail className="w-5 h-5" style={{ color: '#003DA5' }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-600">EMAIL</p>
                        <p className="text-sm text-gray-900">{profesionalSeleccionado.email}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                        <Phone className="w-5 h-5" style={{ color: '#003DA5' }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-600">TELÉFONO</p>
                        <p className="text-sm text-gray-900">{profesionalSeleccionado.telefono}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información Laboral */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Información Laboral
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs font-bold text-gray-600 mb-1">ESPECIALIDAD</p>
                      <p className="text-sm text-gray-900">{profesionalSeleccionado.especialidad}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs font-bold text-gray-600 mb-1">TIPO CONTRATO</p>
                      <p className="text-sm text-gray-900">{profesionalSeleccionado.tipoContrato}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                      <p className="text-xs font-bold text-gray-600 mb-1">TERRITORIAL</p>
                      <p className="text-sm text-gray-900">{profesionalSeleccionado.territorial}</p>
                    </div>
                  </div>
                </div>

                {/* Métricas de Desempeño */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Métricas de Desempeño
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-lg bg-blue-50 text-center">
                      <p className="text-2xl font-bold text-blue-700">{profesionalSeleccionado.procesosAsignados}</p>
                      <p className="text-xs text-gray-600 mt-1">Total Asignados</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 text-center">
                      <p className="text-2xl font-bold text-green-700">{profesionalSeleccionado.procesosAlDia}</p>
                      <p className="text-xs text-gray-600 mt-1">Al Día</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-50 text-center">
                      <p className="text-2xl font-bold text-yellow-700">{profesionalSeleccionado.procesosEnRiesgo}</p>
                      <p className="text-xs text-gray-600 mt-1">En Riesgo</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 text-center">
                      <p className="text-2xl font-bold text-red-700">{profesionalSeleccionado.procesosVencidos}</p>
                      <p className="text-xs text-gray-600 mt-1">Vencidos</p>
                    </div>
                  </div>
                </div>

                {/* Carga de Trabajo */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Carga de Trabajo
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-700">Capacidad</p>
                      <p className="text-sm font-bold" style={{ color: '#003DA5' }}>
                        {profesionalSeleccionado.procesosAsignados} / {profesionalSeleccionado.capacidadMaxima}
                      </p>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${(profesionalSeleccionado.procesosAsignados / profesionalSeleccionado.capacidadMaxima) * 100}%`,
                          background: 'linear-gradient(90deg, #2962FF 0%, #003DA5 100%)'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {((profesionalSeleccionado.procesosAsignados / profesionalSeleccionado.capacidadMaxima) * 100).toFixed(1)}% de capacidad utilizada
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowModalDetalle(false)}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      if (onVerProcesos) {
                        onVerProcesos(profesionalSeleccionado);
                        setShowModalDetalle(false);
                      }
                    }}
                    className="px-6 py-2.5 rounded-lg text-white font-bold hover:shadow-lg transition-all flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Ver Procesos Asignados
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Asignación de Proceso */}
      <AnimatePresence>
        {showModalAsignacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalAsignacion(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Asignar Proceso a Profesional</h2>
                  </div>
                  <button
                    onClick={() => setShowModalAsignacion(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Seleccionar Proceso Sin Asignar
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccione un proceso</option>
                    {PROCESOS_SIN_ASIGNAR.map(proceso => (
                      <option key={proceso.id} value={proceso.id}>
                        {proceso.numero} - {proceso.disciplinable} ({proceso.etapa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Asignar a Profesional
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccione un profesional</option>
                    {profesionales
                      .filter(p => p.estado === 'activo')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.procesosAsignados}/{p.capacidadMaxima})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowModalAsignacion(false)}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleAsignarProceso('', '')}
                    className="px-6 py-2.5 rounded-lg text-white font-bold hover:shadow-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    Asignar Proceso
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Redistribución */}
      <AnimatePresence>
        {showModalRedistribucion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[200] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModalRedistribucion(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-white rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Redistribuir Carga de Trabajo</h2>
                  </div>
                  <button
                    onClick={() => setShowModalRedistribucion(false)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <p className="font-bold text-yellow-900 mb-1">
                        ⚠️ Redistribución Automática
                      </p>
                      <p className="text-xs">
                        Esta función redistribuirá equitativamente todos los procesos entre los profesionales activos, 
                        respetando las capacidades máximas configuradas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700">Profesionales que participarán:</p>
                  {profesionales.filter(p => p.estado === 'activo').map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900">{p.nombre}</span>
                      <span className="text-xs font-bold text-gray-600">
                        {p.procesosAsignados}/{p.capacidadMaxima}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowModalRedistribucion(false)}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRedistribuir}
                    className="px-6 py-2.5 rounded-lg text-white font-bold hover:shadow-lg transition-all"
                    style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}
                  >
                    Redistribuir Ahora
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
