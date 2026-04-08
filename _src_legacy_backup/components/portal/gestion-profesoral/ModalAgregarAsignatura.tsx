/**
 * Modal Agregar Asignatura - UX Clase Mundial
 * Con sugerencias inteligentes, búsqueda y cálculo automático
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Calculator, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  MapPin,
  Users
} from 'lucide-react';

interface Asignatura {
  id: string;
  nombre: string;
  codigo: string;
  creditos: number;
  programa: string;
  nivel: 'Pregrado' | 'Posgrado';
  horasPorCredito: number;
}

interface Sugerencia {
  asignatura: Asignatura;
  razon: string;
  probabilidad: number;
}

interface ModalAgregarAsignaturaProps {
  isOpen: boolean;
  onClose: () => void;
  onAgregar: (data: AsignaturaFormData) => void;
  docentePerfil: {
    nombre: string;
    area: string;
    historialAsignaturas: string[];
  };
}

interface AsignaturaFormData {
  asignaturaId: string;
  asignaturaNombre: string;
  programa: string;
  territorial: string;
  grupo: string;
  cetap: string;
  creditos: number;
  horasCalculadas: number;
}

export function ModalAgregarAsignatura({
  isOpen,
  onClose,
  onAgregar,
  docentePerfil
}: ModalAgregarAsignaturaProps) {
  const [paso, setPaso] = useState<'busqueda' | 'sugerencias' | 'formulario'>('sugerencias');
  const [busqueda, setBusqueda] = useState('');
  const [programaSeleccionado, setProgramaSeleccionado] = useState('');
  const [territorialSeleccionada, setTerritorialSeleccionada] = useState('');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<Asignatura | null>(null);
  const [grupo, setGrupo] = useState('');
  const [cetap, setCetap] = useState('');
  const [horasCalculadas, setHorasCalculadas] = useState(0);

  // Datos mock de programas
  const programas = [
    'APT - Administración Pública Territorial',
    'AP - Administración Pública',
    'Maestría en Gobierno y Políticas Públicas',
    'Especialización en Gestión Pública'
  ];

  const territoriales = [
    'Bogotá - Sede Central',
    'Antioquia',
    'Atlántico',
    'Valle del Cauca',
    'Santander'
  ];

  const grupos = ['Grupo 1', 'Grupo 2', 'Grupo 3'];
  const cetaps = ['CETAP Bogotá', 'CETAP Virtual', 'CETAP Nocturno'];

  // Asignaturas mock
  const asignaturasDisponibles: Asignatura[] = [
    {
      id: 'ASG-001',
      nombre: 'Gestión Pública I',
      codigo: 'GP101',
      creditos: 3,
      programa: 'APT',
      nivel: 'Pregrado',
      horasPorCredito: 16
    },
    {
      id: 'ASG-002',
      nombre: 'Gestión Pública II',
      codigo: 'GP102',
      creditos: 3,
      programa: 'APT',
      nivel: 'Pregrado',
      horasPorCredito: 16
    },
    {
      id: 'ASG-003',
      nombre: 'Políticas Públicas',
      codigo: 'PP201',
      creditos: 3,
      programa: 'APT',
      nivel: 'Pregrado',
      horasPorCredito: 16
    },
    {
      id: 'ASG-004',
      nombre: 'Seminario de Investigación',
      codigo: 'SI301',
      creditos: 2,
      programa: 'Maestría',
      nivel: 'Posgrado',
      horasPorCredito: 24
    }
  ];

  // Generar sugerencias inteligentes
  const sugerencias: Sugerencia[] = [
    {
      asignatura: asignaturasDisponibles[1], // Gestión Pública II
      razon: 'Dictaste Gestión Pública I el periodo anterior',
      probabilidad: 95
    },
    {
      asignatura: asignaturasDisponibles[3], // Seminario de Investigación
      razon: 'Popular entre docentes de tu área',
      probabilidad: 78
    },
    {
      asignatura: asignaturasDisponibles[2], // Políticas Públicas
      razon: 'Coincide con tu perfil académico',
      probabilidad: 65
    }
  ];

  // Calcular horas cuando se selecciona asignatura
  useEffect(() => {
    if (asignaturaSeleccionada) {
      // Fórmula: Créditos × HorasPorCrédito × Factor(1+2)
      // Factor 1+2 = 3 (1 hora clase + 2 horas trabajo independiente)
      const horas = asignaturaSeleccionada.creditos * asignaturaSeleccionada.horasPorCredito * 3;
      setHorasCalculadas(horas);
    }
  }, [asignaturaSeleccionada]);

  const handleSeleccionarSugerencia = (asignatura: Asignatura) => {
    setAsignaturaSeleccionada(asignatura);
    setPaso('formulario');
  };

  const handleAgregar = () => {
    if (asignaturaSeleccionada && programaSeleccionado && territorialSeleccionada && grupo) {
      onAgregar({
        asignaturaId: asignaturaSeleccionada.id,
        asignaturaNombre: asignaturaSeleccionada.nombre,
        programa: programaSeleccionado,
        territorial: territorialSeleccionada,
        grupo,
        cetap,
        creditos: asignaturaSeleccionada.creditos,
        horasCalculadas
      });
      onClose();
    }
  };

  const asignaturasFiltradas = asignaturasDisponibles.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    a.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0052d4] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Agregar Asignatura</h2>
              <p className="text-xs text-blue-100">Componente de Docencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de navegación */}
        <div className="border-b border-gray-200 bg-gray-50 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setPaso('sugerencias')}
              className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${paso === 'sugerencias'
                  ? 'border-[#003DA5] text-[#003DA5]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Sugerencias
              </div>
            </button>
            <button
              onClick={() => setPaso('busqueda')}
              className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${paso === 'busqueda'
                  ? 'border-[#003DA5] text-[#003DA5]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar manualmente
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {/* Paso 1: Sugerencias Inteligentes */}
            {paso === 'sugerencias' && (
              <motion.div
                key="sugerencias"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Sugerencias personalizadas para ti
                      </h3>
                      <p className="text-sm text-gray-700">
                        Basado en tu historial y perfil académico, estas asignaturas
                        podrían interesarte:
                      </p>
                    </div>
                  </div>
                </div>

                {sugerencias.map((sugerencia, index) => (
                  <motion.div
                    key={sugerencia.asignatura.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white border-2 border-gray-200 hover:border-[#003DA5] rounded-xl p-4 transition-all cursor-pointer group"
                    onClick={() => handleSeleccionarSugerencia(sugerencia.asignatura)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 group-hover:text-[#003DA5] transition-colors">
                            {sugerencia.asignatura.nombre}
                          </h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {sugerencia.asignatura.codigo}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="text-amber-600">★</span> {sugerencia.razon}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {sugerencia.asignatura.creditos} créditos
                          </span>
                          <span>•</span>
                          <span>{sugerencia.asignatura.programa}</span>
                          <span>•</span>
                          <span>{sugerencia.asignatura.nivel}</span>
                        </div>

                        {/* Probabilidad */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">Compatibilidad</span>
                            <span className="font-semibold text-gray-900">{sugerencia.probabilidad}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${sugerencia.probabilidad}%` }}
                              transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                              className={`h-full ${
                                sugerencia.probabilidad >= 80
                                  ? 'bg-green-500'
                                  : sugerencia.probabilidad >= 60
                                  ? 'bg-blue-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#003DA5] transition-colors ml-4 flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Paso 2: Búsqueda Manual */}
            {paso === 'busqueda' && (
              <motion.div
                key="busqueda"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o código de asignatura..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  {asignaturasFiltradas.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No se encontraron asignaturas</p>
                      <p className="text-sm">Intenta con otro término de búsqueda</p>
                    </div>
                  ) : (
                    asignaturasFiltradas.map((asignatura) => (
                      <motion.div
                        key={asignatura.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white border-2 border-gray-200 hover:border-[#003DA5] rounded-lg p-4 transition-all cursor-pointer group"
                        onClick={() => {
                          setAsignaturaSeleccionada(asignatura);
                          setPaso('formulario');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 group-hover:text-[#003DA5] transition-colors">
                                {asignatura.nombre}
                              </h4>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                                {asignatura.codigo}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>{asignatura.creditos} créditos</span>
                              <span>•</span>
                              <span>{asignatura.programa}</span>
                              <span>•</span>
                              <span>{asignatura.nivel}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#003DA5] transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Paso 3: Formulario de Detalles */}
            {paso === 'formulario' && asignaturaSeleccionada && (
              <motion.div
                key="formulario"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Asignatura seleccionada */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {asignaturaSeleccionada.nombre}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{asignaturaSeleccionada.codigo}</span>
                        <span>•</span>
                        <span>{asignaturaSeleccionada.creditos} créditos</span>
                        <span>•</span>
                        <span>{asignaturaSeleccionada.nivel}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAsignaturaSeleccionada(null);
                        setPaso('sugerencias');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Programa
                      </label>
                      <select
                        value={programaSeleccionado}
                        onChange={(e) => setProgramaSeleccionado(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {programas.map((prog) => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Territorial
                      </label>
                      <select
                        value={territorialSeleccionada}
                        onChange={(e) => setTerritorialSeleccionada(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {territoriales.map((terr) => (
                          <option key={terr} value={terr}>{terr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Grupo
                      </label>
                      <select
                        value={grupo}
                        onChange={(e) => setGrupo(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {grupos.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CETAP
                      </label>
                      <select
                        value={cetap}
                        onChange={(e) => setCetap(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {cetaps.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cálculo Automático */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calculator className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        📊 CÁLCULO AUTOMÁTICO
                      </h4>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Créditos:</span>
                          <span className="font-medium text-gray-900">{asignaturaSeleccionada.creditos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Horas por crédito:</span>
                          <span className="font-medium text-gray-900">{asignaturaSeleccionada.horasPorCredito}h ({asignaturaSeleccionada.nivel})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Factor 1+2:</span>
                          <span className="font-medium text-gray-900">×3 (prep + clase + acomp.)</span>
                        </div>
                      </div>

                      <div className="border-t-2 border-green-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">TOTAL:</span>
                          <span className="text-3xl font-bold text-green-600">{horasCalculadas} horas</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mt-3">
                        💡 Este cálculo sigue la Circular Dispositiva 003/2025
                      </p>
                    </div>
                  </div>
                </div>

                {/* Validación */}
                {(!programaSeleccionado || !territorialSeleccionada || !grupo) && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-900">
                      Completa todos los campos requeridos para continuar
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          {paso === 'formulario' && (
            <button
              onClick={handleAgregar}
              disabled={!programaSeleccionado || !territorialSeleccionada || !grupo}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${programaSeleccionado && territorialSeleccionada && grupo
                  ? 'bg-[#003DA5] hover:bg-[#002875] text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <CheckCircle2 className="w-4 h-4" />
              Agregar asignatura
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
