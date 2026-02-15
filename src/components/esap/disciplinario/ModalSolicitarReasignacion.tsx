/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MODAL SOLICITAR REASIGNACIÓN - WORLD CLASS DESIGN          ║
 * ║  Control Interno Disciplinario - ESAP                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * Modal para solicitar reasignación de un proceso a otro profesional.
 * Requiere aprobación del Jefe de OCID.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, UserCheck, Users, AlertCircle, FileText, Send,
  ChevronRight, Shield, Clock, Award, Mail, Phone,
  MapPin, Briefcase, CheckCircle, AlertTriangle, Search,
  Info, ArrowRight, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ==================== INTERFACES ====================
interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  id: string;
  numeroProceso: string;
  denunciado: Persona;
  etapaActual: string;
  profesionalAsignado: Persona;
  profesionalAsignadoId?: string;
}

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

interface ModalSolicitarReasignacionProps {
  proceso: Proceso;
  onClose: () => void;
  onSolicitar: (profesionalId: string, profesionalNombre: string, justificacion: string, prioridad: 'urgente' | 'normal') => void;
}

// ==================== MOCK DATA - PROFESIONALES ====================
const PROFESIONALES_DISPONIBLES: Profesional[] = [
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
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Antioquia'
  }
];

// ==================== COMPONENTE PRINCIPAL ====================
export function ModalSolicitarReasignacion({
  proceso,
  onClose,
  onSolicitar
}: ModalSolicitarReasignacionProps) {
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<string>('');
  const [justificacion, setJustificacion] = useState('');
  const [prioridad, setPrioridad] = useState<'urgente' | 'normal'>('normal');
  const [busqueda, setBusqueda] = useState('');

  // Filtrar profesionales activos y excluir el actual
  const profesionalesActivos = PROFESIONALES_DISPONIBLES
    .filter(p => p.estado === 'activo')
    .filter(p => p.id !== proceso.profesionalAsignadoId)
    .filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.especialidad.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cargo.toLowerCase().includes(busqueda.toLowerCase())
    );

  const handleSolicitar = () => {
    if (!profesionalSeleccionado) {
      toast.error('Debe seleccionar un profesional', {
        description: 'Selecciona el profesional al que se reasignará el proceso'
      });
      return;
    }

    if (!justificacion.trim() || justificacion.length < 50) {
      toast.error('Justificación insuficiente', {
        description: 'Debes escribir al menos 50 caracteres explicando el motivo de la reasignación'
      });
      return;
    }

    const profesional = PROFESIONALES_DISPONIBLES.find(p => p.id === profesionalSeleccionado);
    if (!profesional) return;

    onSolicitar(profesional.id, profesional.nombre, justificacion, prioridad);
  };

  const calcularPorcentajeCarga = (profesional: Profesional) => {
    return Math.round((profesional.procesosAsignados / profesional.capacidadMaxima) * 100);
  };

  const getColorCarga = (porcentaje: number) => {
    if (porcentaje < 60) return '#10B981';
    if (porcentaje < 85) return '#F59E0B';
    return '#DC2626';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* ==================== HEADER ==================== */}
          <div className="relative overflow-hidden">
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #F57C00 0%, #E65100 50%, #BF360C 100%)'
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
                    <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Solicitar Reasignación de Proceso
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-orange-100 font-medium">
                        {proceso.numeroProceso}
                      </p>
                      <div className="w-1 h-1 rounded-full bg-orange-300" />
                      <p className="text-sm text-orange-100 font-medium">
                        {proceso.etapaActual}
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
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200 px-6 sm:px-8 py-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-orange-300 shadow-sm">
                <Shield className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-900">
                  Requiere Aprobación del Jefe OCID
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 flex items-start gap-2">
                  <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>
                    La reasignación será enviada al Jefe de la Oficina de Control Interno Disciplinario para su autorización.
                    Asegúrate de proporcionar una justificación detallada.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* ==================== CONTENT ==================== */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
            {/* Profesional Actual */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Profesional Actual</h3>
              </div>
              <div className="flex items-center gap-3 ml-8">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
                  {proceso.profesionalAsignado.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{proceso.profesionalAsignado.nombre}</p>
                  <p className="text-sm text-gray-600">{proceso.profesionalAsignado.tipoIdentificacion} {proceso.profesionalAsignado.numeroIdentificacion}</p>
                </div>
              </div>
            </div>

            {/* Prioridad de la Solicitud */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Prioridad de la Solicitud
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPrioridad('normal')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    prioridad === 'normal'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`w-5 h-5 ${prioridad === 'normal' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className={`font-bold text-sm ${prioridad === 'normal' ? 'text-blue-900' : 'text-gray-700'}`}>
                        Normal
                      </div>
                      <div className="text-xs text-gray-600">Proceso estándar</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setPrioridad('urgente')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    prioridad === 'urgente'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${prioridad === 'urgente' ? 'text-red-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className={`font-bold text-sm ${prioridad === 'urgente' ? 'text-red-900' : 'text-gray-700'}`}>
                        Urgente
                      </div>
                      <div className="text-xs text-gray-600">Requiere atención inmediata</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Justificación */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Justificación de la Reasignación <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Explica detalladamente las razones que justifican la reasignación del proceso (mínimo 50 caracteres)..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {justificacion.length < 50 ? (
                    <span className="text-red-600 font-medium">
                      Mínimo 50 caracteres ({50 - justificacion.length} restantes)
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium">
                      ✓ Justificación completa
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{justificacion.length} caracteres</p>
              </div>
            </div>

            {/* Buscador */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Seleccionar Nuevo Profesional <span className="text-red-500">*</span>
              </label>
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
              {profesionalesActivos.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No se encontraron profesionales disponibles</p>
                </div>
              ) : (
                profesionalesActivos.map((profesional) => {
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
                            <ArrowRight className="w-5 h-5" />
                            <span className="font-bold text-sm">Nuevo Profesional Seleccionado</span>
                          </div>
                        </motion.div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
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
                onClick={handleSolicitar}
                disabled={!profesionalSeleccionado || !justificacion.trim() || justificacion.length < 50}
                className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all ${
                  profesionalSeleccionado && justificacion.length >= 50
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Enviar Solicitud al Jefe OCID</span>
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
