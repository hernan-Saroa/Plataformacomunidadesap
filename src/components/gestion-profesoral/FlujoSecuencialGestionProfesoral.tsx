import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Users,
  FileText,
  ClipboardCheck,
  Star,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Building2,
  GraduationCap,
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';

// Fases del proceso secuencial
export type FaseGestionProfesoral = 
  | 'planificacion-semestral'
  | 'analisis-necesidades'
  | 'convocatorias'
  | 'programacion-docente'
  | 'evaluacion-docente';

interface Fase {
  id: FaseGestionProfesoral;
  numero: number;
  titulo: string;
  descripcion: string;
  icon: React.ElementType;
  estado: 'completado' | 'en-proceso' | 'pendiente' | 'bloqueado';
  progreso: number; // 0-100
  dependeDe?: FaseGestionProfesoral;
  datos?: {
    sedesActivas?: number;
    programasActivos?: number;
    estudiantesTotal?: number;
    docentesNecesarios?: number;
    docentesDisponibles?: number;
    deficit?: number;
    convocatoriasActivas?: number;
    candidatos?: number;
    seleccionados?: number;
    ptasCreados?: number;
    ptasAprobados?: number;
    evaluacionesPendientes?: number;
  };
}

interface FlujoSecuencialProps {
  onFaseChange?: (fase: FaseGestionProfesoral) => void;
  onVerDetalles?: (fase: FaseGestionProfesoral) => void;
}

export function FlujoSecuencialGestionProfesoral({ 
  onFaseChange,
  onVerDetalles 
}: FlujoSecuencialProps) {
  const [faseActual, setFaseActual] = useState<FaseGestionProfesoral>('planificacion-semestral');
  const [expandedFase, setExpandedFase] = useState<FaseGestionProfesoral | null>('planificacion-semestral');
  const [mostrarDetallesCompletos, setMostrarDetallesCompletos] = useState(false);

  // Definición de las fases del proceso
  const fases: Fase[] = [
    {
      id: 'planificacion-semestral',
      numero: 1,
      titulo: 'Planificación Semestral',
      descripcion: 'Identificar sedes activas, programas académicos, asignaturas y grupos para estimar necesidades docentes',
      icon: Calendar,
      estado: 'en-proceso',
      progreso: 75,
      datos: {
        sedesActivas: 3,
        programasActivos: 6,
        estudiantesTotal: 1435,
        docentesNecesarios: 55,
        docentesDisponibles: 46,
        deficit: 9
      }
    },
    {
      id: 'analisis-necesidades',
      numero: 2,
      titulo: 'Análisis de Necesidades',
      descripcion: 'Calcular déficit de docentes y determinar necesidad de convocatorias (planta o cátedra)',
      icon: TrendingUp,
      estado: 'en-proceso',
      progreso: 60,
      dependeDe: 'planificacion-semestral',
      datos: {
        docentesNecesarios: 55,
        docentesDisponibles: 46,
        deficit: 9,
        convocatoriasActivas: 2
      }
    },
    {
      id: 'convocatorias',
      numero: 3,
      titulo: 'Convocatorias Docentes',
      descripcion: 'Proceso de convocatorias nacional para docentes de planta y hora cátedra según necesidades',
      icon: UserPlus,
      estado: 'en-proceso',
      progreso: 45,
      dependeDe: 'analisis-necesidades',
      datos: {
        convocatoriasActivas: 2,
        candidatos: 47,
        seleccionados: 7
      }
    },
    {
      id: 'programacion-docente',
      numero: 4,
      titulo: 'Programación Docente',
      descripcion: 'Crear PTAs (docentes planta) y programación horaria (hora cátedra) con docentes seleccionados',
      icon: FileText,
      estado: 'pendiente',
      progreso: 25,
      dependeDe: 'convocatorias',
      datos: {
        ptasCreados: 9,
        ptasAprobados: 1
      }
    },
    {
      id: 'evaluacion-docente',
      numero: 5,
      titulo: 'Evaluación Docente',
      descripcion: 'Evaluación integral de desempeño docente al finalizar el semestre',
      icon: Star,
      estado: 'bloqueado',
      progreso: 0,
      dependeDe: 'programacion-docente',
      datos: {
        evaluacionesPendientes: 0
      }
    }
  ];

  const handleFaseClick = (fase: Fase) => {
    if (fase.estado !== 'bloqueado') {
      setFaseActual(fase.id);
      setExpandedFase(expandedFase === fase.id ? null : fase.id);
      onFaseChange?.(fase.id);
    }
  };

  const handleVerDetalles = (faseId: FaseGestionProfesoral) => {
    onVerDetalles?.(faseId);
  };

  const getEstadoColor = (estado: Fase['estado']) => {
    switch (estado) {
      case 'completado': return 'text-green-600';
      case 'en-proceso': return 'text-blue-600';
      case 'pendiente': return 'text-yellow-600';
      case 'bloqueado': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getEstadoBadge = (estado: Fase['estado']) => {
    switch (estado) {
      case 'completado': return { variant: 'success' as const, label: 'Completado' };
      case 'en-proceso': return { variant: 'primary' as const, label: 'En Proceso' };
      case 'pendiente': return { variant: 'warning' as const, label: 'Pendiente' };
      case 'bloqueado': return { variant: 'default' as const, label: 'Bloqueado' };
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900 mb-2">Flujo Secuencial de Gestión Profesoral</h1>
        <p className="text-slate-600">
          Proceso completo desde la planificación semestral hasta la evaluación docente
        </p>
      </div>

      {/* Timeline Visual */}
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          {fases.map((fase, index) => (
            <div key={fase.id} className="flex items-center flex-1">
              {/* Círculo de fase */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  whileHover={{ scale: fase.estado !== 'bloqueado' ? 1.1 : 1 }}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${fase.estado === 'completado' ? 'bg-green-100 border-2 border-green-600' :
                      fase.estado === 'en-proceso' ? 'bg-blue-100 border-2 border-blue-600' :
                      fase.estado === 'pendiente' ? 'bg-yellow-100 border-2 border-yellow-600' :
                      'bg-gray-100 border-2 border-gray-300'}
                    ${fase.estado !== 'bloqueado' ? 'cursor-pointer' : 'cursor-not-allowed'}
                    transition-all duration-200
                  `}
                  onClick={() => handleFaseClick(fase)}
                >
                  {fase.estado === 'completado' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <fase.icon className={`w-6 h-6 ${getEstadoColor(fase.estado)}`} />
                  )}
                </motion.div>
                
                <div className="mt-2 text-center">
                  <p className="text-xs text-slate-500">Fase {fase.numero}</p>
                  <p className={`text-xs font-medium ${getEstadoColor(fase.estado)}`}>
                    {fase.progreso}%
                  </p>
                </div>
              </div>

              {/* Línea conectora */}
              {index < fases.length - 1 && (
                <div className="flex-1 h-1 mx-2 relative">
                  <div className="absolute inset-0 bg-gray-200 rounded-full" />
                  <motion.div
                    className={`
                      absolute inset-y-0 left-0 rounded-full
                      ${fases[index + 1].estado === 'completado' || fases[index + 1].estado === 'en-proceso' 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300'}
                    `}
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: fases[index + 1].estado === 'bloqueado' ? '0%' : '100%' 
                    }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tarjetas de Fases */}
      <div className="space-y-4">
        {fases.map((fase) => (
          <motion.div
            key={fase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardSIGL
              variant={fase.estado === 'bloqueado' ? 'default' : 'elevated'}
              className={`
                ${fase.estado === 'bloqueado' ? 'opacity-50' : ''}
                ${faseActual === fase.id ? 'ring-2 ring-blue-500' : ''}
                transition-all duration-200
              `}
            >
              <div className="p-6">
                {/* Header de la tarjeta */}
                <div
                  className={`flex items-start justify-between mb-4 ${
                    fase.estado !== 'bloqueado' ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => handleFaseClick(fase)}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`
                      p-3 rounded-lg
                      ${fase.estado === 'completado' ? 'bg-green-100' :
                        fase.estado === 'en-proceso' ? 'bg-blue-100' :
                        fase.estado === 'pendiente' ? 'bg-yellow-100' :
                        'bg-gray-100'}
                    `}>
                      <fase.icon className={`w-6 h-6 ${getEstadoColor(fase.estado)}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-slate-900 font-semibold">
                          {fase.numero}. {fase.titulo}
                        </span>
                        <BadgeSIGL {...getEstadoBadge(fase.estado)} />
                      </div>
                      <p className="text-slate-600 text-sm mb-3">
                        {fase.descripcion}
                      </p>
                      
                      {/* Barra de progreso */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className={`
                              h-full rounded-full
                              ${fase.estado === 'completado' ? 'bg-green-600' :
                                fase.estado === 'en-proceso' ? 'bg-blue-600' :
                                fase.estado === 'pendiente' ? 'bg-yellow-600' :
                                'bg-gray-400'}
                            `}
                            initial={{ width: 0 }}
                            animate={{ width: `${fase.progreso}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-sm text-slate-500 min-w-[3rem] text-right">
                          {fase.progreso}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="text-slate-400 hover:text-slate-600 transition-colors ml-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFase(expandedFase === fase.id ? null : fase.id);
                    }}
                  >
                    {expandedFase === fase.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Contenido expandido */}
                <AnimatePresence>
                  {expandedFase === fase.id && fase.datos && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="pt-4 border-t border-slate-200">
                        {/* Datos de la fase */}
                        {fase.id === 'planificacion-semestral' && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <Building2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-blue-600">
                                {fase.datos.sedesActivas}
                              </p>
                              <p className="text-xs text-slate-600">Sedes Activas</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <GraduationCap className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-purple-600">
                                {fase.datos.programasActivos}
                              </p>
                              <p className="text-xs text-slate-600">Programas</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-green-600">
                                {fase.datos.estudiantesTotal?.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-600">Estudiantes</p>
                            </div>
                            <div className="text-center p-3 bg-indigo-50 rounded-lg">
                              <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-indigo-600">
                                {fase.datos.docentesNecesarios}
                              </p>
                              <p className="text-xs text-slate-600">Docentes Necesarios</p>
                            </div>
                            <div className="text-center p-3 bg-teal-50 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-teal-600">
                                {fase.datos.docentesDisponibles}
                              </p>
                              <p className="text-xs text-slate-600">Disponibles</p>
                            </div>
                          </div>
                        )}

                        {fase.id === 'analisis-necesidades' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-blue-600">
                                {fase.datos.docentesNecesarios}
                              </p>
                              <p className="text-xs text-slate-600">Necesarios</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-green-600">
                                {fase.datos.docentesDisponibles}
                              </p>
                              <p className="text-xs text-slate-600">Disponibles</p>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-red-600">
                                {fase.datos.deficit}
                              </p>
                              <p className="text-xs text-slate-600">Déficit</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <UserPlus className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-purple-600">
                                {fase.datos.convocatoriasActivas}
                              </p>
                              <p className="text-xs text-slate-600">Convocatorias</p>
                            </div>
                          </div>
                        )}

                        {fase.id === 'convocatorias' && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-blue-600">
                                {fase.datos.convocatoriasActivas}
                              </p>
                              <p className="text-xs text-slate-600">Activas</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <UserPlus className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-purple-600">
                                {fase.datos.candidatos}
                              </p>
                              <p className="text-xs text-slate-600">Candidatos</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-green-600">
                                {fase.datos.seleccionados}
                              </p>
                              <p className="text-xs text-slate-600">Seleccionados</p>
                            </div>
                          </div>
                        )}

                        {fase.id === 'programacion-docente' && (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-blue-600">
                                {fase.datos.ptasCreados}
                              </p>
                              <p className="text-xs text-slate-600">PTAs Creados</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-green-600">
                                {fase.datos.ptasAprobados}
                              </p>
                              <p className="text-xs text-slate-600">PTAs Aprobados</p>
                            </div>
                          </div>
                        )}

                        {fase.id === 'evaluacion-docente' && (
                          <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-slate-600">
                              La evaluación docente se realizará al finalizar el semestre
                            </p>
                          </div>
                        )}

                        {/* Botón Ver Detalles */}
                        {fase.estado !== 'bloqueado' && (
                          <div className="flex justify-end mt-4">
                            <ButtonSIGL
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerDetalles(fase.id)}
                            >
                              Ver Detalles
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </ButtonSIGL>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardSIGL>
          </motion.div>
        ))}
      </div>

      {/* Resumen de Progreso General */}
      <CardSIGL variant="primary">
        <div className="p-6">
          <h3 className="text-slate-900 font-semibold mb-4">Progreso General del Proceso</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Progreso Total</span>
              <span className="text-slate-900 font-semibold">
                {Math.round(fases.reduce((sum, f) => sum + f.progreso, 0) / fases.length)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${fases.reduce((sum, f) => sum + f.progreso, 0) / fases.length}%` 
                }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 text-center text-sm">
              <div>
                <p className="text-green-600 font-semibold">
                  {fases.filter(f => f.estado === 'completado').length}
                </p>
                <p className="text-slate-600">Completadas</p>
              </div>
              <div>
                <p className="text-blue-600 font-semibold">
                  {fases.filter(f => f.estado === 'en-proceso').length}
                </p>
                <p className="text-slate-600">En Proceso</p>
              </div>
              <div>
                <p className="text-yellow-600 font-semibold">
                  {fases.filter(f => f.estado === 'pendiente').length}
                </p>
                <p className="text-slate-600">Pendientes</p>
              </div>
              <div>
                <p className="text-gray-600 font-semibold">
                  {fases.filter(f => f.estado === 'bloqueado').length}
                </p>
                <p className="text-slate-600">Bloqueadas</p>
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}