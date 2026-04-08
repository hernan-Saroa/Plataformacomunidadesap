/**
 * Mi PTA Dashboard V3 - Integración Completa
 * Dashboard con todos los modales y Context API integrados
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  Edit,
  FileText,
  Sparkles,
  Upload
} from 'lucide-react';
import { usePTA } from '../../../contexts/PTAContext';
import { PTAWizardProgress } from './PTAWizardProgress';
import { PTAOnboarding } from './PTAOnboarding';
import { ModalAgregarAsignatura } from './ModalAgregarAsignatura';
import { ModalEnviarAprobacion } from './ModalEnviarAprobacion';
import { toast } from 'sonner';

interface MiPTADashboardV3Props {
  docenteNombre: string;
  docenteCodigo: string;
  tipoVinculacion: string;
  territorial: string;
  horasBase: number;
  periodo: string;
}

export function MiPTADashboardV3({
  docenteNombre,
  docenteCodigo,
  tipoVinculacion,
  territorial,
  horasBase,
  periodo
}: MiPTADashboardV3Props) {
  // Context
  const {
    pta,
    inicializarPTA,
    agregarAsignatura,
    calcularHorasTotales,
    calcularHorasDocencia,
    calcularHorasInvestigacion,
    calcularHorasExtension,
    calcularHorasComplementarias,
    calcularEvidenciasCompletas,
    enviarAAprobacion,
    isSaving
  } = usePTA();

  // Estados locales
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [componenteActivo, setComponenteActivo] = useState<string | null>(null);
  const [modalAsignaturaAbierto, setModalAsignaturaAbierto] = useState(false);
  const [modalEnvioAbierto, setModalEnvioAbierto] = useState(false);

  // Inicializar PTA si no existe
  useEffect(() => {
    if (!pta) {
      inicializarPTA(docenteCodigo, periodo, horasBase);
    }
  }, []);

  // Verificar si es primera vez
  useEffect(() => {
    const esPrimeraVez = !localStorage.getItem('pta_onboarding_completed');
    if (esPrimeraVez && pta) {
      setMostrarOnboarding(true);
    }
  }, [pta]);

  const handleCompletarOnboarding = () => {
    localStorage.setItem('pta_onboarding_completed', 'true');
    setMostrarOnboarding(false);
  };

  // Cálculos
  const horasAsignadas = calcularHorasTotales();
  const porcentajeAvance = Math.round((horasAsignadas / horasBase) * 100);
  const horasFaltantes = horasBase - horasAsignadas;
  const { completas: evidenciasCompletas, totales: evidenciasTotales } = calcularEvidenciasCompletas();

  // Componentes para wizard
  const componentesProgreso = [
    {
      id: 'docencia',
      nombre: 'DOCENCIA',
      horas: calcularHorasDocencia(),
      horasMaximas: undefined,
      completado: calcularHorasDocencia() > 0,
      enCurso: false,
      pendiente: calcularHorasDocencia() === 0,
      color: '#003DA5',
      emoji: '🔵'
    },
    {
      id: 'investigacion',
      nombre: 'INVEST.',
      horas: calcularHorasInvestigacion(),
      horasMaximas: horasBase / 2,
      completado: calcularHorasInvestigacion() > 0,
      enCurso: false,
      pendiente: calcularHorasInvestigacion() === 0,
      color: '#FF6B35',
      emoji: '🟠'
    },
    {
      id: 'extension',
      nombre: 'EXTENSIÓN',
      horas: calcularHorasExtension(),
      horasMaximas: horasBase / 4,
      completado: false,
      enCurso: calcularHorasExtension() > 0,
      pendiente: calcularHorasExtension() === 0,
      color: '#8B5CF6',
      emoji: '🟣'
    },
    {
      id: 'complementarias',
      nombre: 'COMPLEM.',
      horas: calcularHorasComplementarias(),
      horasMaximas: horasBase / 4,
      completado: false,
      enCurso: false,
      pendiente: true,
      color: '#10B981',
      emoji: '🟢'
    },
    {
      id: 'revisar',
      nombre: 'REVISAR',
      horas: 0,
      horasMaximas: undefined,
      completado: false,
      enCurso: false,
      pendiente: true,
      color: '#6B7280',
      emoji: '✓'
    }
  ];

  // Handler para agregar asignatura
  const handleAgregarAsignatura = (data: any) => {
    agregarAsignatura(data);
    toast.success('Asignatura agregada correctamente', {
      description: `${data.asignaturaNombre} - ${data.horasCalculadas} horas`,
      duration: 3000
    });
  };

  // Handler para enviar a aprobación
  const handleEnviarAprobacion = async () => {
    try {
      const radicado = await enviarAAprobacion();
      toast.success('PTA enviado exitosamente', {
        description: `Radicado: ${radicado}`,
        duration: 5000
      });
    } catch (error) {
      toast.error('Error al enviar PTA', {
        description: 'Por favor intenta de nuevo',
        duration: 3000
      });
    }
  };

  if (!pta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando tu PTA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Onboarding */}
      {mostrarOnboarding && (
        <PTAOnboarding
          docenteNombre={docenteNombre}
          vinculacion={tipoVinculacion}
          territorial={territorial}
          horasBase={horasBase}
          periodo={periodo}
          onComplete={handleCompletarOnboarding}
          onSkip={() => setMostrarOnboarding(false)}
        />
      )}

      {/* Modales */}
      <ModalAgregarAsignatura
        isOpen={modalAsignaturaAbierto}
        onClose={() => setModalAsignaturaAbierto(false)}
        onAgregar={handleAgregarAsignatura}
        docentePerfil={{
          nombre: docenteNombre,
          area: 'Administración Pública',
          historialAsignaturas: []
        }}
      />

      <ModalEnviarAprobacion
        isOpen={modalEnvioAbierto}
        onClose={() => setModalEnvioAbierto(false)}
        onEnviar={handleEnviarAprobacion}
        pta={{
          periodo: periodo,
          horasBase: horasBase,
          horasAsignadas: horasAsignadas,
          componentes: [
            {
              nombre: 'DOCENCIA',
              emoji: '🔵',
              color: '#003DA5',
              horas: calcularHorasDocencia(),
              porcentaje: Math.round((calcularHorasDocencia() / horasBase) * 100),
              actividades: pta.asignaturas.length,
              completado: calcularHorasDocencia() > 0
            },
            {
              nombre: 'INVESTIGACIÓN',
              emoji: '🟠',
              color: '#FF6B35',
              horas: calcularHorasInvestigacion(),
              porcentaje: Math.round((calcularHorasInvestigacion() / horasBase) * 100),
              actividades: pta.actividadesInvestigacion.length,
              completado: calcularHorasInvestigacion() > 0
            },
            {
              nombre: 'EXTENSIÓN',
              emoji: '🟣',
              color: '#8B5CF6',
              horas: calcularHorasExtension(),
              porcentaje: Math.round((calcularHorasExtension() / horasBase) * 100),
              actividades: pta.actividadesExtension.length,
              completado: calcularHorasExtension() > 0
            },
            {
              nombre: 'COMPLEMENTARIAS',
              emoji: '🟢',
              color: '#10B981',
              horas: calcularHorasComplementarias(),
              porcentaje: Math.round((calcularHorasComplementarias() / horasBase) * 100),
              actividades: pta.actividadesComplementarias.length,
              completado: calcularHorasComplementarias() > 0
            }
          ],
          evidenciasCompletas: evidenciasCompletas,
          evidenciasTotales: evidenciasTotales,
          fechaLimite: '15 de diciembre de 2025'
        }}
        aprobadores={[
          {
            nivel: 1,
            rol: 'Coordinación Académica',
            nombre: 'Dr. Carlos Méndez',
            descripcion: 'Validación de programación docente'
          },
          {
            nivel: 2,
            rol: 'Subdirección de Investigaciones',
            nombre: 'Dra. María González',
            descripcion: 'Validación de actividades de investigación'
          },
          {
            nivel: 3,
            rol: 'Director Territorial Bogotá',
            nombre: 'Dr. Luis Rodríguez',
            descripcion: 'Aprobación final del PTA'
          }
        ]}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MI PTA {periodo}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Plan de Trabajo Académico • {tipoVinculacion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSaving ? (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Guardado
                </span>
              )}
              <span className="text-xs text-gray-500">Auto</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Wizard de Progreso */}
        <PTAWizardProgress
          componentesProgreso={componentesProgreso}
          onClickComponente={(id) => setComponenteActivo(id)}
        />

        {/* Progreso General */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">PROGRESO GENERAL</h3>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{horasAsignadas}/{horasBase}h</span>
              <span className="text-lg font-semibold text-gray-700">{porcentajeAvance}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${porcentajeAvance}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#003DA5] to-[#0052d4]"
              />
            </div>
          </div>
          
          {horasFaltantes > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-700">
                Vas muy bien. Faltan <span className="font-semibold">{horasFaltantes} horas</span> por asignar.
              </span>
            </div>
          ) : horasFaltantes === 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium">
                ¡Perfecto! Has completado las {horasBase} horas.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700">
                Has asignado {Math.abs(horasFaltantes)} horas de más. Revisa tu distribución.
              </span>
            </div>
          )}
        </div>

        {/* Componentes Cards */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">COMPONENTES</h3>
            <button
              onClick={() => setModalAsignaturaAbierto(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#003DA5] hover:bg-[#002875] text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Docencia */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 cursor-pointer"
              onClick={() => setModalAsignaturaAbierto(true)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔵</span>
                <h4 className="font-semibold text-gray-900">DOCENCIA</h4>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {calcularHorasDocencia()}h
              </div>
              <div className="w-full h-2 bg-blue-200 rounded-full mb-2">
                <div
                  className="h-full bg-[#003DA5] rounded-full"
                  style={{ width: `${Math.min((calcularHorasDocencia() / horasBase) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {pta.asignaturas.length} {pta.asignaturas.length === 1 ? 'asignatura' : 'asignaturas'}
                </span>
                <button className="text-xs text-[#003DA5] font-medium hover:underline">
                  {pta.asignaturas.length > 0 ? 'Editar' : 'Agregar'}
                </button>
              </div>
            </motion.div>

            {/* Investigación */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟠</span>
                <h4 className="font-semibold text-gray-900">INVESTIG.</h4>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {calcularHorasInvestigacion()}h
              </div>
              <div className="w-full h-2 bg-orange-200 rounded-full mb-2">
                <div
                  className="h-full bg-[#FF6B35] rounded-full"
                  style={{ width: `${Math.min((calcularHorasInvestigacion() / (horasBase / 2)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {Math.round((calcularHorasInvestigacion() / (horasBase / 2)) * 100)}% usado
                </span>
                <button className="text-xs text-[#FF6B35] font-medium hover:underline">
                  Agregar
                </button>
              </div>
            </motion.div>

            {/* Extensión */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟣</span>
                <h4 className="font-semibold text-gray-900">EXTENSIÓN</h4>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {calcularHorasExtension()}h
              </div>
              <div className="w-full h-2 bg-purple-200 rounded-full mb-2">
                <div
                  className="h-full bg-[#8B5CF6] rounded-full"
                  style={{ width: `${Math.min((calcularHorasExtension() / (horasBase / 4)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {pta.actividadesExtension.length} actividades
                </span>
                <button className="text-xs text-[#8B5CF6] font-medium hover:underline">
                  Agregar
                </button>
              </div>
            </motion.div>

            {/* Complementarias */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-green-50 border-2 border-green-200 rounded-xl p-4 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟢</span>
                <h4 className="font-semibold text-gray-900">COMPLEM.</h4>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {calcularHorasComplementarias()}h
              </div>
              <div className="w-full h-2 bg-green-200 rounded-full mb-2">
                <div
                  className="h-full bg-[#10B981] rounded-full"
                  style={{ width: `${Math.min((calcularHorasComplementarias() / (horasBase / 4)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {pta.actividadesComplementarias.length} actividades
                </span>
                <button className="text-xs text-[#10B981] font-medium hover:underline">
                  Agregar
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Lista de Asignaturas */}
        {pta.asignaturas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              ASIGNATURAS ({pta.asignaturas.length})
            </h3>
            <div className="space-y-3">
              {pta.asignaturas.map((asignatura) => (
                <div
                  key={asignatura.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-[#003DA5] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {asignatura.asignaturaNombre}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {asignatura.programa} • {asignatura.territorial} • {asignatura.grupo}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {asignatura.creditos} créditos • {asignatura.horasCalculadas} horas
                      </p>
                      {asignatura.evidencias.length > 0 && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {asignatura.evidencias.length} {asignatura.evidencias.length === 1 ? 'evidencia' : 'evidencias'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        <Upload className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sugerencias Inteligentes */}
        {pta.asignaturas.length === 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  💡 SUGERENCIA INTELIGENTE
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Comienza agregando tus asignaturas. El sistema calculará automáticamente las horas según la Circular Dispositiva 003/2025.
                </p>
                <button
                  onClick={() => setModalAsignaturaAbierto(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar mi primera asignatura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">ACCIONES</h3>
          
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              <FileText className="w-4 h-4" />
              Ver resumen
            </button>
            
            <button 
              onClick={() => setModalEnvioAbierto(true)}
              disabled={horasFaltantes > 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${horasFaltantes <= 0
                  ? 'bg-[#003DA5] hover:bg-[#002875] text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Send className="w-4 h-4" />
              Enviar a aprobación
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>
          
          {horasFaltantes > 0 && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-900">
                <span className="font-medium">Antes de enviar:</span> Completa al menos {horasBase} horas totales
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
