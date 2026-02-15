/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WIZARD DE GESTIÓN DE ACTAS - WORLD CLASS ENTERPRISE DESIGN  ║
 * ║  Control Interno Disciplinario - ESAP                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * 🏆 WORLD CLASS FEATURES:
 * ✅ Premium visual design con glassmorphism
 * ✅ Micro-interacciones sofisticadas
 * ✅ Responsive inteligente sin sacrificar estética
 * ✅ Animaciones fluidas y profesionales
 * ✅ Sistema de spacing perfecto
 * ✅ Tipografía enterprise-grade
 * ✅ Feedback visual instantáneo
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, FileCheck, Download, Upload, CheckCircle, AlertCircle,
  Calendar, Users, MessageSquare, Search, Clock, Paperclip,
  Shield, Sparkles, Zap, Star, User, AlertTriangle, Info,
  FileText, Tag
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BadgeNomenclatura } from './components/BadgeNomenclatura';
import { generarNomenclatura, previsualizarNomenclatura, type DocumentoNomenclatura } from './utils/nomenclaturaDocumentos';

// ==================== TIPOS DE ACTAS ====================
const TIPOS_ACTAS = [
  {
    id: 'version-libre',
    nombre: 'Acta de Versión Libre',
    descripcion: 'Registro de la declaración voluntaria del investigado sobre los hechos',
    icon: MessageSquare,
    color: '#3B82F6',
    plantilla: {
      nombreArchivo: 'ACTA_VERSION_LIBRE_v2024.docx',
      version: '2.0'
    }
  },
  {
    id: 'audiencia',
    nombre: 'Acta de Audiencia',
    descripcion: 'Registro de audiencias disciplinarias (audiencia pública, audiencia de cargos, etc.)',
    icon: Users,
    color: '#10B981',
    plantilla: {
      nombreArchivo: 'ACTA_AUDIENCIA_v2024.docx',
      version: '1.8'
    }
  },
  {
    id: 'descargos',
    nombre: 'Acta de Descargos',
    descripcion: 'Registro de la diligencia de descargos presentada por el investigado',
    icon: FileText,
    color: '#F59E0B',
    plantilla: {
      nombreArchivo: 'ACTA_DESCARGOS_v2024.docx',
      version: '1.5'
    }
  },
  {
    id: 'diligencia',
    nombre: 'Acta de Diligencia',
    descripcion: 'Registro de cualquier diligencia realizada en el proceso disciplinario',
    icon: FileCheck,
    color: '#DC2626',
    plantilla: {
      nombreArchivo: 'ACTA_DILIGENCIA_v2024.docx',
      version: '1.3'
    }
  }
];

// ==================== INTERFACES ====================
interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface ProcesoCompleto {
  numeroProceso: string;
  denunciado: Persona;
  denunciante: Persona;
  profesionalAsignado: Persona;
  etapaActual: string;
  cedula: string;
  noticiaOrigen: string;
}

interface Participante {
  nombre: string;
  rol: string;
  identificacion: string;
}

interface ActaGenerada {
  id: string;
  numero: string;
  tipo: string;
  fecha: string;
  participantes: number;
  firmada: boolean;
}

interface WizardActasWorldClassProps {
  proceso: ProcesoCompleto;
  onClose: () => void;
  onActaCreada?: (acta: any) => void;
}

// ==================== COMPONENTE PRINCIPAL ====================
export function WizardActasWorldClass({
  proceso,
  onClose,
  onActaCreada
}: WizardActasWorldClassProps) {
  // Estados del Wizard
  const [paso, setPaso] = useState(1);
  const [vistaActual, setVistaActual] = useState<'wizard' | 'lista'>('wizard');

  // Estados del Paso 1
  const [tipoSeleccionado, setTipoSeleccionado] = useState<typeof TIPOS_ACTAS[0] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [plantillaDescargada, setPlantillaDescargada] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // ✅ Estados de Nomenclatura
  const [nomenclaturaGenerada, setNomenclaturaGenerada] = useState<DocumentoNomenclatura | null>(null);

  // Estados del Paso 2
  const [fechaActa, setFechaActa] = useState('');
  const [lugarDiligencia, setLugarDiligencia] = useState('');
  const [participantes, setParticipantes] = useState<Participante[]>([
    { nombre: '', rol: 'Investigado', identificacion: '' }
  ]);
  const [observaciones, setObservaciones] = useState('');

  // Estados del Paso 3
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [observacionesAdjunto, setObservacionesAdjunto] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Actas Generadas
  const [actasGeneradas] = useState<ActaGenerada[]>([]);

  // ==================== EFECTOS ====================
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFechaActa(today);
  }, []);

  // ==================== FUNCIONES ====================
  const handleSeleccionarTipo = (tipo: typeof TIPOS_ACTAS[0]) => {
    setTipoSeleccionado(tipo);
    setPlantillaDescargada(false);
  };

  const handleDescargarPlantilla = async () => {
    if (!tipoSeleccionado?.plantilla) return;

    setDescargando(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success('Plantilla descargada correctamente', {
      description: tipoSeleccionado.plantilla.nombreArchivo,
      duration: 3000,
    });
    
    setPlantillaDescargada(true);
    setDescargando(false);
  };

  const handleSiguiente = () => {
    if (paso === 1 && !tipoSeleccionado) {
      toast.error('Debes seleccionar un tipo de acta');
      return;
    }
    if (paso === 2) {
      if (!fechaActa) {
        toast.error('Debes ingresar la fecha del acta');
        return;
      }
      if (!lugarDiligencia || lugarDiligencia.length < 3) {
        toast.error('Debes ingresar el lugar de la diligencia');
        return;
      }
      if (participantes.some(p => !p.nombre || !p.identificacion)) {
        toast.error('Completa la información de todos los participantes');
        return;
      }
    }
    if (paso === 3 && !archivoAdjunto) {
      toast.error('Debes adjuntar el archivo del acta');
      return;
    }
    setPaso(paso + 1);
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubiendo(true);
      setTimeout(() => {
        setArchivoAdjunto(file);
        setSubiendo(false);
        toast.success('Archivo cargado correctamente');
      }, 600);
    }
  };

  const handleCrearActa = () => {
    // ✅ Generar nomenclatura única para el acta
    const nomenclatura = generarNomenclatura(
      'ACTA',
      proceso.numeroProceso,
      proceso.numeroProceso
    );
    setNomenclaturaGenerada(nomenclatura);

    toast.success('Acta creada exitosamente', {
      description: `${nomenclatura.nomenclatura} - ${tipoSeleccionado?.nombre}`,
      duration: 4000,
    });
    
    if (onActaCreada) {
      onActaCreada({
        tipo: tipoSeleccionado?.nombre,
        nomenclatura: nomenclatura.nomenclatura, // ✅ Incluir nomenclatura
        fecha: fechaActa,
        lugar: lugarDiligencia,
        participantes,
        observaciones,
        archivo: archivoAdjunto?.name
      });
    }
    
    onClose();
  };

  const resetearWizard = () => {
    setPaso(1);
    setTipoSeleccionado(null);
    setFechaActa(new Date().toISOString().split('T')[0]);
    setLugarDiligencia('');
    setParticipantes([{ nombre: '', rol: 'Investigado', identificacion: '' }]);
    setObservaciones('');
    setArchivoAdjunto(null);
    setObservacionesAdjunto('');
    setPlantillaDescargada(false);
    setBusqueda('');
    setNomenclaturaGenerada(null); // ✅ Resetear nomenclatura
  };

  const handleNuevoActa = () => {
    resetearWizard();
    setVistaActual('wizard');
  };

  const agregarParticipante = () => {
    setParticipantes([...participantes, { nombre: '', rol: '', identificacion: '' }]);
  };

  const eliminarParticipante = (index: number) => {
    if (participantes.length > 1) {
      setParticipantes(participantes.filter((_, i) => i !== index));
    }
  };

  const actualizarParticipante = (index: number, campo: keyof Participante, valor: string) => {
    const nuevosParticipantes = [...participantes];
    nuevosParticipantes[index] = { ...nuevosParticipantes[index], [campo]: valor };
    setParticipantes(nuevosParticipantes);
  };

  const tiposFiltrados = TIPOS_ACTAS.filter(tipo =>
    tipo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    tipo.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ==================== RENDER ====================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-[150] p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        transition={{ type: 'spring', duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* ==================== HEADER PREMIUM ==================== */}
        <div className="relative overflow-hidden">
          {/* Gradient Background - Púrpura/Violeta para Actas */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)'
            }}
          />
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          {/* Content */}
          <div className="relative px-6 sm:px-8 py-5 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Icon Container con Glassmorphism */}
                <div 
                  className="p-3 rounded-2xl backdrop-blur-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <FileCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Gestión de Actas
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-purple-100 font-medium">
                      {proceso.numeroProceso}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-purple-300" />
                    <p className="text-sm text-purple-100 font-medium hidden sm:block">
                      {proceso.denunciado.nombre}
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

        {/* ==================== TABS PREMIUM ==================== */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <div className="px-6 sm:px-8 pt-4">
            <div className="flex gap-2">
              <button
                onClick={handleNuevoActa}
                className={`relative px-5 py-3 rounded-t-2xl font-bold text-sm transition-all duration-300 ${
                  vistaActual === 'wizard'
                    ? 'text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${vistaActual === 'wizard' ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">Crear Nueva Acta</span>
                  <span className="sm:hidden">Nueva Acta</span>
                </div>
                {vistaActual === 'wizard' && (
                  <motion.div
                    layoutId="activeTabActa"
                    className="absolute inset-0 bg-white rounded-t-2xl -z-10 shadow-lg"
                    initial={false}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </button>
              
              <button
                onClick={() => setVistaActual('lista')}
                className={`relative px-5 py-3 rounded-t-2xl font-bold text-sm transition-all duration-300 ${
                  vistaActual === 'lista'
                    ? 'text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Actas Generadas</span>
                  <span className="sm:hidden">Lista</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    vistaActual === 'lista' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {actasGeneradas.length}
                  </span>
                </div>
                {vistaActual === 'lista' && (
                  <motion.div
                    layoutId="activeTabActa"
                    className="absolute inset-0 bg-white rounded-t-2xl -z-10 shadow-lg"
                    initial={false}
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ==================== CONTENIDO ==================== */}
        <div className="flex-1 overflow-y-auto">
          {vistaActual === 'wizard' ? (
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {/* Indicador de Progreso Premium */}
              <div className="mb-8 sm:mb-10">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between">
                    {[
                      { num: 1, label: 'Seleccionar Tipo', icon: Search },
                      { num: 2, label: 'Información', icon: Users },
                      { num: 3, label: 'Adjuntar Archivo', icon: Upload },
                      { num: 4, label: 'Confirmar', icon: Shield }
                    ].map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = paso > step.num;
                      const isCurrent = paso === step.num;
                      const isPending = paso < step.num;

                      return (
                        <div key={step.num} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <motion.div
                              initial={false}
                              animate={{
                                scale: isCurrent ? 1.1 : 1,
                                rotate: isCompleted ? 360 : 0
                              }}
                              transition={{ duration: 0.5 }}
                              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                                isCompleted
                                  ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                                  : isCurrent
                                  ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-xl shadow-purple-500/40'
                                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                              ) : (
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                              )}
                              
                              {isCurrent && (
                                <motion.div
                                  className="absolute inset-0 rounded-2xl border-2 border-purple-600"
                                  initial={{ scale: 1, opacity: 0.5 }}
                                  animate={{ scale: 1.3, opacity: 0 }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                              )}
                            </motion.div>
                            
                            <p className={`text-xs sm:text-sm font-bold mt-2.5 text-center transition-colors duration-300 hidden sm:block ${
                              isCurrent ? 'text-purple-700' : isPending ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {step.label}
                            </p>
                          </div>
                          
                          {idx < 3 && (
                            <div className="relative flex-1 h-1 mx-2 sm:mx-3">
                              <div className="absolute inset-0 bg-gray-200 rounded-full" />
                              <motion.div
                                className={`absolute inset-0 rounded-full ${
                                  isCompleted ? 'bg-gradient-to-r from-purple-500 to-violet-600' : 'bg-gray-200'
                                }`}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: isCompleted ? 1 : 0 }}
                                transition={{ duration: 0.5 }}
                                style={{ transformOrigin: 'left' }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ==================== PASO 1: SELECCIONAR TIPO ==================== */}
              <AnimatePresence mode="wait">
                {paso === 1 && (
                  <motion.div
                    key="paso1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-6xl mx-auto space-y-6"
                  >
                    {/* Info Box Premium */}
                    <div 
                      className="relative overflow-hidden rounded-2xl p-5"
                      style={{
                        background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.2)'
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-purple-600/10">
                          <Info className="w-5 h-5 text-purple-700" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-purple-900 mb-2">
                            Información del Proceso
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                              <span className="text-purple-700 font-semibold">Proceso:</span>
                              <span className="ml-1.5 text-purple-900 font-bold">{proceso.numeroProceso}</span>
                            </div>
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                              <span className="text-purple-700 font-semibold">Etapa:</span>
                              <span className="ml-1.5 text-purple-900 font-bold">{proceso.etapaActual}</span>
                            </div>
                            <div className="bg-white/60 rounded-lg px-3 py-2 backdrop-blur-sm sm:col-span-1 col-span-1">
                              <span className="text-purple-700 font-semibold">Investigado:</span>
                              <span className="ml-1.5 text-purple-900 font-bold">{proceso.denunciado.nombre}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filtros Premium */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                        <input
                          type="text"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Buscar tipo de acta..."
                          className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm font-medium placeholder:text-gray-400 bg-white shadow-sm hover:shadow-md"
                        />
                      </div>
                    </div>

                    {/* Grid de Tipos Premium */}
                    {tiposFiltrados.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-2">
                          No se encontraron tipos de actas
                        </p>
                        <p className="text-sm text-gray-500">
                          Intenta con otros términos de búsqueda
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {tiposFiltrados.map((tipo) => {
                          const Icon = tipo.icon;
                          const seleccionado = tipoSeleccionado?.id === tipo.id;

                          return (
                            <motion.div
                              key={tipo.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ y: -4, transition: { duration: 0.2 } }}
                              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                                seleccionado
                                  ? 'shadow-2xl shadow-purple-500/20 ring-2 ring-purple-600'
                                  : 'shadow-md hover:shadow-xl border-2 border-gray-200 hover:border-gray-300'
                              }`}
                              style={{
                                background: seleccionado 
                                  ? 'linear-gradient(135deg, #EDE9FE 0%, #FFFFFF 100%)'
                                  : '#FFFFFF'
                              }}
                            >
                              {/* Contenido Principal */}
                              <div 
                                onClick={() => handleSeleccionarTipo(tipo)}
                                className="p-5"
                              >
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                                      seleccionado ? 'scale-110' : 'group-hover:scale-105'
                                    }`}
                                    style={{ 
                                      background: `linear-gradient(135deg, ${tipo.color} 0%, ${tipo.color}DD 100%)`,
                                      boxShadow: `0 8px 16px ${tipo.color}40`
                                    }}
                                  >
                                    <Icon className="w-7 h-7 text-white" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <h3 className="text-sm font-black text-gray-900 leading-tight pr-2">
                                        {tipo.nombre}
                                      </h3>
                                      {seleccionado && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="flex-shrink-0"
                                        >
                                          <CheckCircle className="w-6 h-6 text-purple-600" />
                                        </motion.div>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">
                                      {tipo.descripcion}
                                    </p>
                                    
                                    <div className="flex items-center gap-2">
                                      {tipo.plantilla && (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
                                          v{tipo.plantilla.version}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Sección de Descarga de Plantilla */}
                              {seleccionado && tipo.plantilla && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t-2 border-purple-100 bg-gradient-to-r from-purple-50/50 to-violet-50/50 p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-purple-100">
                                        <FileText className="w-4 h-4 text-purple-700" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                          {tipo.plantilla.nombreArchivo}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          Plantilla oficial ESAP
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDescargarPlantilla();
                                      }}
                                      disabled={descargando}
                                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                                        plantillaDescargada
                                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
                                          : 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900'
                                      }`}
                                    >
                                      {descargando ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          <span className="hidden sm:inline">Descargando...</span>
                                        </>
                                      ) : plantillaDescargada ? (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          <span className="hidden sm:inline">Descargada</span>
                                          <span className="sm:hidden">✓</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-4 h-4" />
                                          <span className="hidden sm:inline">Descargar</span>
                                          <span className="sm:hidden">Descargar</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {plantillaDescargada && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="mt-3 p-2.5 bg-purple-50 border border-purple-200 rounded-lg"
                                    >
                                      <p className="text-xs font-semibold text-purple-800 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5" />
                                        Plantilla lista para diligenciar. Completa el formulario mientras trabajas en el documento.
                                      </p>
                                    </motion.div>
                                  )}

                                  {/* ✅ NUEVO: Vista Previa de Nomenclatura */}
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-amber-100">
                                          <Tag className="w-4 h-4 text-amber-700" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-900 mb-0.5">
                                            Nomenclatura Asignada:
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            Se generará automáticamente al crear el acta
                                          </p>
                                        </div>
                                      </div>
                                      <BadgeNomenclatura 
                                        nomenclatura={previsualizarNomenclatura('ACTA')}
                                        tipo="ACTA"
                                        size="sm"
                                        showIcon={true}
                                        showCopy={false}
                                      />
                                    </div>
                                  </motion.div>
                                </motion.div>
                              )}

                              {!seleccionado && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-violet-500/5" />
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ==================== PASO 2: INFORMACIÓN ==================== */}
                {paso === 2 && tipoSeleccionado && (
                  <motion.div
                    key="paso2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    <div 
                      className="rounded-2xl p-5"
                      style={{
                        background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-purple-600/10">
                          <CheckCircle className="w-5 h-5 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-purple-900 mb-1">
                            Tipo de Acta Seleccionada
                          </p>
                          <p className="text-base font-black text-purple-900">
                            {tipoSeleccionado.nombre}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-600" />
                              Fecha de la Diligencia
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={fechaActa}
                              onChange={(e) => setFechaActa(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm font-medium shadow-sm"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-purple-600" />
                              Lugar
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={lugarDiligencia}
                              onChange={(e) => setLugarDiligencia(e.target.value)}
                              placeholder="Ej: Sede ESAP Bogotá"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm font-medium shadow-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-600" />
                              Participantes
                              <span className="text-red-500">*</span>
                            </label>
                            <button
                              onClick={agregarParticipante}
                              className="px-3 py-1.5 rounded-lg font-bold text-xs text-white shadow-sm hover:shadow-md transition-all"
                              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                            >
                              + Agregar
                            </button>
                          </div>

                          <div className="space-y-3">
                            {participantes.map((participante, index) => (
                              <div key={index} className="bg-gray-50 rounded-xl p-4 relative">
                                {participantes.length > 1 && (
                                  <button
                                    onClick={() => eliminarParticipante(index)}
                                    className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Nombre Completo
                                    </label>
                                    <input
                                      type="text"
                                      value={participante.nombre}
                                      onChange={(e) => actualizarParticipante(index, 'nombre', e.target.value)}
                                      placeholder="Nombre..."
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Rol
                                    </label>
                                    <input
                                      type="text"
                                      value={participante.rol}
                                      onChange={(e) => actualizarParticipante(index, 'rol', e.target.value)}
                                      placeholder="Ej: Testigo"
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                      Identificación
                                    </label>
                                    <input
                                      type="text"
                                      value={participante.identificacion}
                                      onChange={(e) => actualizarParticipante(index, 'identificacion', e.target.value)}
                                      placeholder="CC..."
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-purple-600" />
                            Observaciones
                            <span className="text-xs text-gray-500 font-normal">(Opcional)</span>
                          </label>
                          <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={4}
                            placeholder="Notas adicionales sobre la diligencia..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm font-medium resize-none shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================== PASO 3: ADJUNTAR ==================== */}
                {paso === 3 && tipoSeleccionado && (
                  <motion.div
                    key="paso3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-3xl mx-auto space-y-6"
                  >
                    {!plantillaDescargada && (
                      <div 
                        className="rounded-2xl p-5"
                        style={{
                          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-2 rounded-xl bg-amber-600/10">
                            <AlertTriangle className="w-5 h-5 text-amber-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900 mb-1">
                              Recuerda descargar la plantilla
                            </p>
                            <p className="text-xs text-amber-800">
                              Asegúrate de haber descargado y diligenciado la plantilla oficial antes de adjuntar el archivo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-lg">
                      {!archivoAdjunto ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer group hover:border-purple-500 hover:bg-purple-50/30 transition-all duration-300"
                        >
                          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-10 h-10 text-purple-600" />
                          </div>
                          <p className="text-lg font-bold text-gray-900 mb-2">
                            {subiendo ? 'Cargando archivo...' : 'Arrastra o haz clic para subir'}
                          </p>
                          <p className="text-sm text-gray-600 mb-4">
                            Formatos soportados: .doc, .docx, .pdf
                          </p>
                          {subiendo && (
                            <div className="w-48 h-1.5 mx-auto bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-purple-600 to-purple-800"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="space-y-4"
                        >
                          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-5">
                            <div className="flex items-start gap-4">
                              <div className="p-3 rounded-xl bg-purple-600/10">
                                <FileText className="w-6 h-6 text-purple-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-purple-900 mb-1 truncate">
                                  {archivoAdjunto.name}
                                </p>
                                <p className="text-xs text-purple-700">
                                  {(archivoAdjunto.size / 1024).toFixed(2)} KB • Cargado correctamente
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setArchivoAdjunto(null);
                                  setObservacionesAdjunto('');
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <X className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-bold text-gray-900 mb-2 block">
                              Notas sobre el archivo (Opcional)
                            </label>
                            <textarea
                              value={observacionesAdjunto}
                              onChange={(e) => setObservacionesAdjunto(e.target.value)}
                              rows={3}
                              placeholder="Agrega notas adicionales sobre el archivo adjuntado..."
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                          </div>
                        </motion.div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ==================== PASO 4: CONFIRMAR ==================== */}
                {paso === 4 && tipoSeleccionado && archivoAdjunto && (
                  <motion.div
                    key="paso4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-4xl mx-auto space-y-6"
                  >
                    <div 
                      className="rounded-2xl p-6"
                      style={{
                        background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-purple-600/10">
                          <Shield className="w-8 h-8 text-purple-700" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-purple-900 mb-1">
                            ✅ Todo listo para crear el acta
                          </p>
                          <p className="text-sm text-purple-700 font-medium">
                            Revisa cuidadosamente la información antes de confirmar
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                          <Star className="w-5 h-5 text-purple-600" />
                          Resumen del Acta
                        </h3>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1">PROCESO</p>
                            <p className="text-sm font-black text-gray-900">{proceso.numeroProceso}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1">ETAPA</p>
                            <p className="text-sm font-black text-gray-900">{proceso.etapaActual}</p>
                          </div>
                        </div>

                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                          <p className="text-xs font-semibold text-purple-700 mb-2">TIPO DE ACTA</p>
                          <p className="text-base font-black text-purple-900">{tipoSeleccionado.nombre}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              FECHA
                            </p>
                            <p className="text-sm font-black text-gray-900">{fechaActa}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-1">LUGAR</p>
                            <p className="text-sm font-black text-gray-900">{lugarDiligencia}</p>
                          </div>
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                          <p className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            PARTICIPANTES ({participantes.length})
                          </p>
                          <div className="space-y-2">
                            {participantes.map((p, idx) => (
                              <div key={idx} className="bg-white/60 rounded-lg px-3 py-2">
                                <p className="text-sm font-bold text-blue-900">{p.nombre}</p>
                                <p className="text-xs text-blue-700">{p.rol} • {p.identificacion}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {observaciones && (
                          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                            <p className="text-xs font-semibold text-amber-700 mb-2">OBSERVACIONES</p>
                            <p className="text-sm text-amber-900 leading-relaxed">{observaciones}</p>
                          </div>
                        )}

                        {/* ✅ NUEVO: Nomenclatura que se generará */}
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                NOMENCLATURA ASIGNADA
                              </p>
                              <p className="text-sm text-amber-800 font-medium mb-1">
                                Se generará al confirmar la creación
                              </p>
                              <p className="text-xs text-amber-600">
                                Formato: ACT-NNN-{new Date().getFullYear()}
                              </p>
                            </div>
                            <BadgeNomenclatura 
                              nomenclatura={previsualizarNomenclatura('ACTA')}
                              tipo="ACTA"
                              size="md"
                              showIcon={true}
                              showCopy={false}
                            />
                          </div>
                        </div>

                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 rounded-xl bg-purple-600/10">
                              <Paperclip className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1">ARCHIVO ADJUNTO</p>
                              <p className="text-sm font-black text-purple-900">{archivoAdjunto.name}</p>
                              <p className="text-xs text-purple-700 mt-0.5">
                                {(archivoAdjunto.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          {observacionesAdjunto && (
                            <div className="mt-3 pt-3 border-t border-purple-200">
                              <p className="text-xs text-purple-800 italic">{observacionesAdjunto}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              {actasGeneradas.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileCheck className="w-12 h-12 text-gray-300" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    Aún no has creado ningún acta
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Crea tu primera acta para este proceso
                  </p>
                  <button
                    onClick={handleNuevoActa}
                    className="px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Crear Primera Acta
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ==================== FOOTER PREMIUM ==================== */}
        {vistaActual === 'wizard' && (
          <div className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                {paso > 1 && (
                  <button
                    onClick={handleAnterior}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <X className="w-4 h-4 rotate-90" />
                    <span>Anterior</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold text-sm border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                >
                  Cancelar
                </button>
                
                {paso < 4 ? (
                  <button
                    onClick={handleSiguiente}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                  >
                    <span>Siguiente</span>
                    <X className="w-4 h-4 -rotate-90" />
                  </button>
                ) : (
                  <button
                    onClick={handleCrearActa}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Crear Acta</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
