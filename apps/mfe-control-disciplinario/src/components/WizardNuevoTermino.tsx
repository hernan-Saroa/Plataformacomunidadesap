/**
 * WIZARD NUEVO TÉRMINO - WORLD CLASS ✨
 * Sistema de creación de términos procesales en 4 pasos
 * Diseño corporativo ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Calendar, Clock, User, Mail,
  CheckCircle, FileText, AlertCircle, Save, Target, Scale,
  Building2, MapPin, Users
} from 'lucide-react';
import { toast } from 'sonner';

// Función para validar email
const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ============================================================================
// INTERFACES
// ============================================================================

interface Termino {
  id: string;
  procesoId: string;
  numeroProceso: string;
  denunciado: string;
  actuacion: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string;
  diasHabiles: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido' | 'suspendido';
  alertaEnviada: boolean;
  etapaProcesal: string;
}

interface WizardNuevoTerminoProps {
  isOpen: boolean;
  onClose: () => void;
  onCrearTermino: (termino: Omit<Termino, 'id' | 'diasRestantes' | 'alertaEnviada'>) => void;
  procesos?: any[];
}

// ============================================================================
// DATOS MOCK
// ============================================================================

const ETAPAS_PROCESALES = [
  'Indagación Preliminar',
  'Investigación Disciplinaria',
  'Juzgamiento',
  'Archivo',
  'Recurso de Apelación'
];

const ACTUACIONES_TIPO = [
  'Notificación Auto de Apertura',
  'Traslado de Cargos',
  'Citación a Audiencia',
  'Decreto de Pruebas',
  'Presentación de Descargos',
  'Alegatos de Conclusión',
  'Fallo de Primera Instancia',
  'Recurso de Apelación',
  'Fallo de Segunda Instancia'
];

const RESPONSABLES_MOCK = [
  { nombre: 'María Torres', email: 'maria.torres@esap.edu.co', cargo: 'Sustanciadora' },
  { nombre: 'Carlos Martínez', email: 'carlos.martinez@esap.edu.co', cargo: 'Sustanciador' },
  { nombre: 'Laura González', email: 'laura.gonzalez@esap.edu.co', cargo: 'Jefe OCID' },
  { nombre: 'Diego López', email: 'diego.lopez@esap.edu.co', cargo: 'Sustanciador' },
  { nombre: 'Ana María Ruiz', email: 'ana.ruiz@esap.edu.co', cargo: 'Sustanciadora' }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function WizardNuevoTermino({ isOpen, onClose, onCrearTermino, procesos = [] }: WizardNuevoTerminoProps) {
  const [paso, setPaso] = useState(1);
  const [enviando, setEnviando] = useState(false);

  // Estados del formulario
  const [procesoSeleccionado, setProcesoSeleccionado] = useState('');
  const [numeroProceso, setNumeroProceso] = useState('');
  const [denunciado, setDenunciado] = useState('');
  const [etapaProcesal, setEtapaProcesal] = useState('');
  
  const [actuacion, setActuacion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [diasHabiles, setDiasHabiles] = useState(5);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  
  const [responsableNombre, setResponsableNombre] = useState('');
  const [responsableEmail, setResponsableEmail] = useState('');

  // ============================================================================
  // CÁLCULO DE FECHA DE VENCIMIENTO
  // ============================================================================

  const calcularFechaVencimiento = (inicio: string, dias: number) => {
    if (!inicio) return '';
    
    const fecha = new Date(inicio);
    let diasSumados = 0;
    
    while (diasSumados < dias) {
      fecha.setDate(fecha.getDate() + 1);
      const diaSemana = fecha.getDay();
      // Solo cuenta días hábiles (lunes a viernes)
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasSumados++;
      }
    }
    
    return fecha.toISOString().split('T')[0];
  };

  // Auto-calcular fecha de vencimiento
  const handleFechaInicioChange = (fecha: string) => {
    setFechaInicio(fecha);
    const vencimiento = calcularFechaVencimiento(fecha, diasHabiles);
    setFechaVencimiento(vencimiento);
  };

  const handleDiasHabilesChange = (dias: number) => {
    setDiasHabiles(dias);
    if (fechaInicio) {
      const vencimiento = calcularFechaVencimiento(fechaInicio, dias);
      setFechaVencimiento(vencimiento);
    }
  };

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  const validarPaso1 = () => {
    if (!numeroProceso.trim()) {
      toast.error('Número de proceso requerido');
      return false;
    }
    if (!denunciado.trim()) {
      toast.error('Nombre del denunciado requerido');
      return false;
    }
    if (!etapaProcesal) {
      toast.error('Etapa procesal requerida');
      return false;
    }
    return true;
  };

  const validarPaso2 = () => {
    if (!actuacion.trim()) {
      toast.error('Actuación requerida');
      return false;
    }
    if (!fechaInicio) {
      toast.error('Fecha de inicio requerida');
      return false;
    }
    if (diasHabiles < 1) {
      toast.error('Días hábiles debe ser al menos 1');
      return false;
    }
    return true;
  };

  const validarPaso3 = () => {
    if (!responsableNombre.trim()) {
      toast.error('Responsable requerido');
      return false;
    }
    if (!responsableEmail.trim()) {
      toast.error('Email del responsable requerido');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(responsableEmail)) {
      toast.error('Email inválido');
      return false;
    }
    return true;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSiguiente = () => {
    if (paso === 1 && !validarPaso1()) return;
    if (paso === 2 && !validarPaso2()) return;
    if (paso === 3 && !validarPaso3()) return;
    setPaso(paso + 1);
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const handleCrear = async () => {
    setEnviando(true);

    // Simular delay de creación
    await new Promise(resolve => setTimeout(resolve, 1500));

    const nuevoTermino: Omit<Termino, 'id' | 'diasRestantes' | 'alertaEnviada'> = {
      procesoId: procesoSeleccionado || 'proc-' + Date.now(),
      numeroProceso,
      denunciado,
      actuacion,
      responsable: responsableNombre,
      emailResponsable: responsableEmail,
      fechaInicio,
      diasHabiles,
      fechaVencimiento,
      estado: 'pendiente',
      etapaProcesal
    };

    onCrearTermino(nuevoTermino);
    setEnviando(false);
    setPaso(4);
  };

  const handleCerrar = () => {
    // Reset del formulario
    setPaso(1);
    setProcesoSeleccionado('');
    setNumeroProceso('');
    setDenunciado('');
    setEtapaProcesal('');
    setActuacion('');
    setFechaInicio('');
    setDiasHabiles(5);
    setFechaVencimiento('');
    setResponsableNombre('');
    setResponsableEmail('');
    onClose();
  };

  const seleccionarResponsable = (resp: typeof RESPONSABLES_MOCK[0]) => {
    setResponsableNombre(resp.nombre);
    setResponsableEmail(resp.email);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#FFFFFF', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-6 border-b-2" style={{ borderColor: '#E5E7EB', background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                <FileText className="w-6 h-6" style={{ color: 'white' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'white' }}>
                  Nuevo Término Procesal
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Paso {paso} de 4
                </p>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'white' }} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
            <motion.div
              className="h-full"
              style={{ background: 'white' }}
              initial={{ width: '25%' }}
              animate={{ width: `${(paso / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <AnimatePresence mode="wait">
            {/* PASO 1: Datos del Proceso */}
            {paso === 1 && (
              <motion.div
                key="paso1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
                    Información del Proceso
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Ingresa los datos básicos del proceso disciplinario
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Número de Proceso *
                  </label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="text"
                      value={numeroProceso}
                      onChange={(e) => setNumeroProceso(e.target.value)}
                      placeholder="ESAP-DN-OCID-XX-XXX-2026"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Formato: ESAP-DN-OCID-[ETAPA]-[CONSECUTIVO]-[AÑO]
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Denunciado *
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="text"
                      value={denunciado}
                      onChange={(e) => setDenunciado(e.target.value)}
                      placeholder="Nombre completo del denunciado"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Etapa Procesal *
                  </label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <select
                      value={etapaProcesal}
                      onChange={(e) => setEtapaProcesal(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <option value="">Seleccionar etapa...</option>
                      {ETAPAS_PROCESALES.map(etapa => (
                        <option key={etapa} value={etapa}>{etapa}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASO 2: Fechas y Plazos */}
            {paso === 2 && (
              <motion.div
                key="paso2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
                    Fechas y Plazos
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Define la actuación procesal y los términos correspondientes
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Actuación Procesal *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <select
                      value={actuacion}
                      onChange={(e) => setActuacion(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <option value="">Seleccionar actuación...</option>
                      {ACTUACIONES_TIPO.map(act => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Fecha de Inicio *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => handleFechaInicioChange(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Días Hábiles *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={diasHabiles}
                        onChange={(e) => handleDiasHabilesChange(parseInt(e.target.value) || 1)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                    </div>
                  </div>
                </div>

                {fechaVencimiento && (
                  <div className="p-4 rounded-xl border-2" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5" style={{ color: '#2563EB' }} />
                      <span className="font-bold text-sm" style={{ color: '#1E40AF' }}>
                        Fecha de Vencimiento Calculada
                      </span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                      {new Date(fechaVencimiento).toLocaleDateString('es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                      Calculado en base a {diasHabiles} días hábiles (excluye sábados y domingos)
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* PASO 3: Responsable */}
            {paso === 3 && (
              <motion.div
                key="paso3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
                    Asignación de Responsable
                  </h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    Selecciona el funcionario responsable del seguimiento
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {RESPONSABLES_MOCK.map(resp => (
                    <div
                      key={resp.email}
                      onClick={() => seleccionarResponsable(resp)}
                      className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all"
                      style={{
                        borderColor: responsableNombre === resp.nombre ? '#003DA5' : '#E5E7EB',
                        background: responsableNombre === resp.nombre ? '#EFF6FF' : '#FFFFFF'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                          background: responsableNombre === resp.nombre ? '#003DA5' : '#F3F4F6'
                        }}>
                          <User className="w-5 h-5" style={{
                            color: responsableNombre === resp.nombre ? 'white' : '#6B7280'
                          }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                            {resp.nombre}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            {resp.cargo}
                          </p>
                        </div>
                        {responsableNombre === resp.nombre && (
                          <CheckCircle className="w-5 h-5" style={{ color: '#003DA5' }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                  <p className="text-sm font-bold mb-3" style={{ color: '#6B7280' }}>
                    O ingresar manualmente:
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                        Nombre del Responsable *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                        <input
                          type="text"
                          value={responsableNombre}
                          onChange={(e) => setResponsableNombre(e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                          style={{ borderColor: '#E5E7EB' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                        Email del Responsable *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                        <input
                          type="email"
                          value={responsableEmail}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || validarEmail(value)) {
                              setResponsableEmail(value);
                            }
                          }}
                          placeholder="correo@esap.edu.co"
                          className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                          style={{ borderColor: '#E5E7EB' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASO 4: Confirmación */}
            {paso === 4 && (
              <motion.div
                key="paso4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                  <CheckCircle className="w-12 h-12" style={{ color: '#10B981' }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#1F2937' }}>
                  ¡Término Creado Exitosamente!
                </h3>
                <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                  El término ha sido agregado al sistema de control
                </p>

                <div className="max-w-md mx-auto p-4 rounded-xl border-2 text-left" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Proceso:</span>
                      <span className="font-bold font-mono" style={{ color: '#003DA5' }}>{numeroProceso}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Denunciado:</span>
                      <span className="font-bold" style={{ color: '#1F2937' }}>{denunciado}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Actuación:</span>
                      <span className="font-bold" style={{ color: '#1F2937' }}>{actuacion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Vencimiento:</span>
                      <span className="font-bold" style={{ color: '#DC2626' }}>
                        {new Date(fechaVencimiento).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#6B7280' }}>Responsable:</span>
                      <span className="font-bold" style={{ color: '#1F2937' }}>{responsableNombre}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-center justify-between">
            {paso < 4 ? (
              <>
                <button
                  onClick={paso === 1 ? handleCerrar : handleAnterior}
                  className="px-6 py-3 rounded-xl font-semibold border-2 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                  disabled={enviando}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {paso === 1 ? 'Cancelar' : 'Anterior'}
                </button>

                {paso < 3 ? (
                  <button
                    onClick={handleSiguiente}
                    className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleCrear}
                    disabled={enviando}
                    className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    {enviando ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Clock className="w-4 h-4" />
                        </motion.div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Crear Término
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleCerrar}
                className="w-full px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
              >
                <CheckCircle className="w-4 h-4" />
                Finalizar
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
