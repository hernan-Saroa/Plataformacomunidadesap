/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MODAL REASIGNACIÓN DE PROFESIONAL - WORLD CLASS DESIGN     ║
 * ║  Control Interno Disciplinario - ESAP                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Modal para reasignar profesional especializado cuando un proceso
 * ya tiene un profesional asignado y se requiere cambiarlo.
 * Crea una solicitud de reasignación que requiere aprobación del Jefe OCID.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Users, TrendingUp, AlertTriangle, CheckCircle,
  Award, Mail, Phone, MapPin, Briefcase, Target, Clock,
  AlertCircle, Shield, ChevronRight, Search, Star,
  RotateCcw, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

// ==================== INTERFACES ====================

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
  estado: 'activo' | 'inactivo' | 'vacaciones';
  tipoContrato: 'Planta' | 'Contratista';
  territorial: string;
}

interface Proceso {
  id: string;
  numeroProceso: string;
  profesionalAsignado?: string; // nombre del profesional actual
  etapaActual: string;
}

interface ModalReasignarProfesionalProps {
  proceso: Proceso;
  onClose: () => void;
  onSolicitarReasignacion: (nuevoProfesionalId: string, nuevoProfesionalNombre: string, justificacion: string, prioridad: 'NORMAL' | 'URGENTE') => void;
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ModalReasignarProfesional({
  proceso,
  onClose,
  onSolicitarReasignacion
}: ModalReasignarProfesionalProps) {
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<string>('');
  const [justificacion, setJustificacion] = useState('');
  const [prioridad, setPrioridad] = useState<'NORMAL' | 'URGENTE'>('NORMAL');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);

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
          estado: ((p.estado || 'ACTIVO').toLowerCase() === 'activo' ? 'activo' : (p.estado || 'ACTIVO').toLowerCase() === 'vacaciones' ? 'vacaciones' : 'inactivo') as 'activo' | 'inactivo' | 'vacaciones',
          tipoContrato: (p.tipoContrato || 'Contratista') as 'Planta' | 'Contratista',
          territorial: p.territorial || 'Nacional'
        }));
        setProfesionales(mappedProfesionales);
      } catch (error) {
        console.error('Error fetching professionals:', error);
        toast.error('Error al cargar profesionales');
        setProfesionales([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfesionales();
  }, []);

  // Filtrar solo profesionales activos
  const profesionalesDisponibles = profesionales
    .filter(p => p.estado === 'activo')
    .filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.especialidad.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cargo.toLowerCase().includes(busqueda.toLowerCase())
    );

  const handleSolicitarReasignacion = () => {
    if (!profesionalSeleccionado) {
      toast.error('Debe seleccionar un profesional', {
        description: 'Selecciona un profesional diferente al actual'
      });
      return;
    }

    if (!justificacion.trim()) {
      toast.error('Justificación requerida', {
        description: 'Explique por qué solicita la reasignación'
      });
      return;
    }

    const profesional = profesionales.find(p => p.id === profesionalSeleccionado);
    if (!profesional) return;

    onSolicitarReasignacion(profesional.id, profesional.nombre, justificacion.trim(), prioridad);
    onClose();
  };

  const calcularPorcentajeCarga = (profesional: Profesional) => {
    return Math.round((profesional.procesosAsignados / profesional.capacidadMaxima) * 100);
  };

  const getColorCarga = (porcentaje: number) => {
    if (porcentaje < 60) return '#10B981'; // Verde
    if (porcentaje < 85) return '#F59E0B'; // Amarillo
    return '#DC2626'; // Rojo
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* ==================== HEADER ==================== */}
          <div className="relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD23F 100%)'
              }}
            />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative px-6 sm:px-8 py-5 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-2xl backdrop-blur-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <RotateCcw className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Solicitar Reasignación de Profesional
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-orange-100 font-medium">
                        {proceso.numeroProceso}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-orange-300" />
                      <p className="text-sm text-orange-100 font-medium">
                        Profesional actual: {proceso.profesionalAsignado?.nombre || 'Sin asignar'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>
            </div>
          </div>

          {/* ==================== INFO BAR ==================== */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 sm:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-orange-200 shadow-sm">
                <Shield className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-900">
                  Requiere aprobación del Jefe OCID
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>Se creará una solicitud para revisión</span>
              </div>
            </div>
          </div>

          {/* ==================== CONTENT ==================== */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
            {/* Buscador */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, cargo o especialidad..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Lista de Profesionales */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Cargando profesionales...</p>
                </div>
              ) : profesionalesDisponibles.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No se encontraron profesionales disponibles</p>
                </div>
              ) : (
                profesionalesDisponibles.map((profesional) => {
                  const porcentajeCarga = calcularPorcentajeCarga(profesional);
                  const colorCarga = getColorCarga(porcentajeCarga);
                  const isSeleccionado = profesionalSeleccionado === profesional.id;
                  const estaEnCapacidadMaxima = porcentajeCarga >= 100;

                  return (
                    <button
                      key={profesional.id}
                      onClick={() => !estaEnCapacidadMaxima && setProfesionalSeleccionado(profesional.id)}
                      disabled={estaEnCapacidadMaxima}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSeleccionado
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : estaEnCapacidadMaxima
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Info Profesional */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                              isSeleccionado ? 'bg-orange-600' : 'bg-gray-400'
                            }`}>
                              {profesional.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-base truncate">
                                {profesional.nombre}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Briefcase className="w-3.5 h-3.5" />
                                <span className="truncate">{profesional.cargo}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Award className="w-3.5 h-3.5" />
                              <span className="truncate">{profesional.especialidad}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{profesional.territorial}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{profesional.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{profesional.telefono}</span>
                            </div>
                          </div>
                        </div>

                        {/* Estadísticas */}
                        <div className="flex flex-col items-end gap-2">
                          {/* Carga de trabajo */}
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-500 mb-1">Carga Actual</div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-lg font-black" style={{ color: colorCarga }}>
                                  {profesional.procesosAsignados}/{profesional.capacidadMaxima}
                                </div>
                                <div className="text-xs font-medium text-gray-500">
                                  {porcentajeCarga}%
                                </div>
                              </div>
                              <div className="w-16 h-16 relative">
                                <svg className="w-16 h-16 transform -rotate-90">
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="#E5E7EB"
                                    strokeWidth="6"
                                    fill="none"
                                  />
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke={colorCarga}
                                    strokeWidth="6"
                                    fill="none"
                                    strokeDasharray={`${(porcentajeCarga / 100) * 176} 176`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  {porcentajeCarga < 60 ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : porcentajeCarga < 85 ? (
                                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Semáforo de procesos */}
                          <div className="flex items-center gap-1 text-xs">
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-md">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="font-medium text-green-700">{profesional.procesosAlDia}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-md">
                              <Clock className="w-3 h-3 text-yellow-600" />
                              <span className="font-medium text-yellow-700">{profesional.procesosEnRiesgo}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span className="font-medium text-red-700">{profesional.procesosVencidos}</span>
                            </div>
                          </div>

                          {estaEnCapacidadMaxima && (
                            <div className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md">
                              CAPACIDAD MÁXIMA
                            </div>
                          )}
                        </div>
                      </div>

                      {isSeleccionado && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 pt-4 border-t border-orange-200"
                        >
                          <div className="flex items-center gap-2 text-orange-700">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">Profesional Seleccionado para Reasignación</span>
                          </div>
                        </motion.div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Justificación y Prioridad */}
            {profesionalSeleccionado && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-4"
              >
                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Prioridad de la Solicitud
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPrioridad('NORMAL')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        prioridad === 'NORMAL'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setPrioridad('URGENTE')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        prioridad === 'URGENTE'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Urgente
                    </button>
                  </div>
                </div>

                {/* Justificación */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Justificación de la Reasignación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    placeholder="Explique detalladamente por qué solicita la reasignación del proceso..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Esta justificación será revisada por el Jefe OCID para aprobar o rechazar la solicitud.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* ==================== FOOTER ==================== */}
          <div className="border-t border-gray-200 px-6 sm:px-8 py-4 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSolicitarReasignacion}
                disabled={!profesionalSeleccionado || !justificacion.trim()}
                className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all ${
                  profesionalSeleccionado && justificacion.trim()
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Solicitar Reasignación</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}