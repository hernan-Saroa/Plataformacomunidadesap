/**
 * ============================================
 * WIZARD CREAR PAI - COMPONENTE PRINCIPAL
 * ============================================
 * 
 * Wizard de 6 pasos para crear el Plan Anual
 * de Auditoría cumpliendo con Decreto 648/2017
 * 
 * PASOS:
 * 1. Datos Generales
 * 2. Universo Auditable
 * 3. Evaluación Riesgos DAFP
 * 4. Recursos OCI
 * 5. Cronograma Auditorías
 * 6. Matriz Decreto 648
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

'use client';

import React, { useState, createContext, useContext } from 'react';
import { ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

// ✅ Importar pasos del wizard
import { Paso1DatosGenerales } from './Paso1DatosGenerales';
import { Paso2UniversoAuditable } from './Paso2UniversoAuditable';
import { Paso3EvaluacionRiesgos } from './Paso3EvaluacionRiesgos';
import { Paso4RecursosOCI } from './Paso4RecursosOCI';
import { Paso5CronogramaAuditorias } from './Paso5CronogramaAuditorias';
import { Paso6MatrizDecreto648 } from './Paso6MatrizDecreto648';

// ✅ Types oficiales
import type { 
  PlanAnualAuditoria,
  DatosGeneralesPAI,
  UnidadAuditable,
  EvaluacionRiesgoDAFP,
  RecursosOCI,
  AuditoriaProgramada,
  RolPAI
} from '../types';

/**
 * ============================================
 * CONTEXT DEL WIZARD
 * ============================================
 */
interface WizardPAIContextType {
  // Datos de cada paso
  datosGenerales: Partial<DatosGeneralesPAI>;
  universoAuditable: UnidadAuditable[];
  evaluacionesRiesgo: EvaluacionRiesgoDAFP[];
  recursosOCI: Partial<RecursosOCI>;
  cronogramaAuditorias: AuditoriaProgramada[];
  rolesDecreto648: RolPAI[];
  
  // Funciones de actualización
  setDatosGenerales: (datos: Partial<DatosGeneralesPAI>) => void;
  setUniversoAuditable: (unidades: UnidadAuditable[]) => void;
  setEvaluacionesRiesgo: (evaluaciones: EvaluacionRiesgoDAFP[]) => void;
  setRecursosOCI: (recursos: Partial<RecursosOCI>) => void;
  setCronogramaAuditorias: (cronograma: AuditoriaProgramada[]) => void;
  setRolesDecreto648: (roles: RolPAI[]) => void;
  
  // Estado del wizard
  pasoActual: number;
  validacionesPasos: { [paso: number]: boolean };
  erroresPasos: { [paso: number]: string[] };
}

const WizardPAIContext = createContext<WizardPAIContextType | undefined>(undefined);

export function useWizardPAI() {
  const context = useContext(WizardPAIContext);
  if (!context) {
    throw new Error('useWizardPAI debe usarse dentro de WizardPAIProvider');
  }
  return context;
}

/**
 * ============================================
 * PROPS DEL WIZARD
 * ============================================
 */
interface WizardCrearPAIProps {
  onCancelar: () => void;
  onGuardar: (plan: PlanAnualAuditoria) => void;
  onGuardarBorrador?: (datos: any) => void;
  planExistente?: Partial<PlanAnualAuditoria>;
}

/**
 * ============================================
 * COMPONENTE PRINCIPAL
 * ============================================
 */
export function WizardCrearPAI({
  onCancelar,
  onGuardar,
  onGuardarBorrador,
  planExistente
}: WizardCrearPAIProps) {
  
  // ============================================
  // ESTADO
  // ============================================
  const [pasoActual, setPasoActual] = useState(1);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  
  // Datos de cada paso
  const [datosGenerales, setDatosGenerales] = useState<Partial<DatosGeneralesPAI>>(
    planExistente?.datosGenerales || {}
  );
  const [universoAuditable, setUniversoAuditable] = useState<UnidadAuditable[]>([]);
  const [evaluacionesRiesgo, setEvaluacionesRiesgo] = useState<EvaluacionRiesgoDAFP[]>([]);
  const [recursosOCI, setRecursosOCI] = useState<Partial<RecursosOCI>>({});
  const [cronogramaAuditorias, setCronogramaAuditorias] = useState<AuditoriaProgramada[]>([]);
  const [rolesDecreto648, setRolesDecreto648] = useState<RolPAI[]>([]);
  
  // Validaciones
  const [validacionesPasos, setValidacionesPasos] = useState<{ [paso: number]: boolean }>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false
  });
  
  const [erroresPasos, setErroresPasos] = useState<{ [paso: number]: string[] }>({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
  });

  // ============================================
  // DEFINICIÓN DE PASOS
  // ============================================
  const pasos = [
    {
      numero: 1,
      titulo: 'Datos Generales',
      icono: '📋',
      descripcion: 'Vigencia, Jefe OCI y Objetivos',
      componente: Paso1DatosGenerales
    },
    {
      numero: 2,
      titulo: 'Universo Auditable',
      icono: '🏢',
      descripcion: 'Unidades y procesos a auditar',
      componente: Paso2UniversoAuditable
    },
    {
      numero: 3,
      titulo: 'Evaluación de Riesgos',
      icono: '⚠️',
      descripcion: 'Metodología DAFP y priorización',
      componente: Paso3EvaluacionRiesgos
    },
    {
      numero: 4,
      titulo: 'Recursos OCI',
      icono: '👥',
      descripcion: 'Personal, presupuesto y horas',
      componente: Paso4RecursosOCI
    },
    {
      numero: 5,
      titulo: 'Cronograma Auditorías',
      icono: '📅',
      descripcion: 'Programación anual de auditorías',
      componente: Paso5CronogramaAuditorias
    },
    {
      numero: 6,
      titulo: 'Matriz Decreto 648',
      icono: '✅',
      descripcion: '5 roles y 22 actividades',
      componente: Paso6MatrizDecreto648
    }
  ];

  // ============================================
  // FUNCIONES
  // ============================================
  
  /**
   * Validar paso actual antes de avanzar
   */
  const validarPasoActual = (): boolean => {
    const errores: string[] = [];
    
    switch (pasoActual) {
      case 1:
        if (!datosGenerales.vigencia) errores.push('Vigencia es obligatoria');
        if (!datosGenerales.jefeOCI?.nombreCompleto) errores.push('Jefe OCI es obligatorio');
        if (!datosGenerales.objetivoGeneral) errores.push('Objetivo general es obligatorio');
        break;
        
      case 2:
        if (universoAuditable.length === 0) errores.push('Debe agregar al menos una unidad auditable');
        break;
        
      case 3:
        if (evaluacionesRiesgo.length === 0) errores.push('Debe evaluar al menos una unidad');
        break;
        
      case 4:
        if (!recursosOCI.totalAuditores || recursosOCI.totalAuditores === 0) {
          errores.push('Debe configurar los recursos OCI');
        }
        break;
        
      case 5:
        if (cronogramaAuditorias.length === 0) errores.push('Debe programar al menos una auditoría');
        break;
        
      case 6:
        if (rolesDecreto648.length !== 5) errores.push('Debe completar los 5 roles del Decreto 648/2017');
        break;
    }
    
    // Actualizar validaciones
    setValidacionesPasos(prev => ({
      ...prev,
      [pasoActual]: errores.length === 0
    }));
    
    setErroresPasos(prev => ({
      ...prev,
      [pasoActual]: errores
    }));
    
    return errores.length === 0;
  };

  /**
   * Ir al siguiente paso
   */
  const handleSiguiente = () => {
    if (validarPasoActual()) {
      if (pasoActual < 6) {
        setPasoActual(pasoActual + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  /**
   * Ir al paso anterior
   */
  const handleAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Guardar borrador
   */
  const handleGuardarBorrador = async () => {
    setGuardandoBorrador(true);
    
    const borrador = {
      datosGenerales,
      universoAuditable,
      evaluacionesRiesgo,
      recursosOCI,
      cronogramaAuditorias,
      rolesDecreto648,
      pasoActual,
      fechaGuardado: new Date().toISOString()
    };
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onGuardarBorrador?.(borrador);
      alert('Borrador guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar borrador:', error);
      alert('Error al guardar borrador');
    } finally {
      setGuardandoBorrador(false);
    }
  };

  /**
   * Finalizar y guardar PAI
   */
  const handleFinalizar = () => {
    if (!validarPasoActual()) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    // Validar todos los pasos
    const todosValidos = Object.values(validacionesPasos).every(v => v);
    if (!todosValidos) {
      alert('Por favor complete todos los pasos del wizard');
      return;
    }
    
    // Construir el plan completo
    const planCompleto: PlanAnualAuditoria = {
      id: `PAI-${datosGenerales.vigencia}-${Date.now()}`,
      codigo: `PAI-${datosGenerales.vigencia}-V1`,
      estado: 'Borrador',
      datosGenerales: datosGenerales as DatosGeneralesPAI,
      rolesDecreto648,
      validacionDecreto648: {
        cumpleDecretoCompleto: rolesDecreto648.length === 5,
        puntajeTotal: 100,
        tieneCincoRoles: true,
        todosRolesTienenActividades: true,
        actividadesCumplenMinimo: true,
        fechasEstanCompletas: true,
        responsablesAsignados: true,
        seguimientosDefinidos: true,
        errores: [],
        advertencias: [],
        recomendaciones: []
      },
      estadisticas: {
        totalRoles: 5,
        rolesCompletados: 0,
        rolesEnProgreso: 5,
        totalActividades: 22,
        actividadesCompletadas: 0,
        actividadesEnEjecucion: 0,
        actividadesNoIniciadas: 22,
        actividadesRetrasadas: 0,
        totalHorasEstimadas: recursosOCI.horasTotalesDisponibles || 0,
        totalHorasEjecutadas: 0,
        porcentajeHorasUtilizadas: 0,
        porcentajeAvanceGeneral: 0,
        porcentajeCumplimientoDecretoDecreto648: 100,
        estadisticasPorRol: [],
        actividadesCompletadasPorMes: [],
        distribucionEstados: []
      },
      modificaciones: [],
      historialEstados: [{
        estado: 'Borrador',
        fecha: new Date().toISOString(),
        responsable: datosGenerales.jefeOCI?.nombreCompleto || '',
        observaciones: 'Plan creado mediante wizard'
      }],
      creadoPor: datosGenerales.jefeOCI?.email || '',
      fechaCreacion: new Date().toISOString(),
      metadata: {
        formatoOficial: 'EMFO001 PAI 2025 V.6',
        versionFormato: '6.0',
        publicadoEnWeb: false,
        decretosCumplidos: ['Decreto 648/2017'],
        guiasAplicadas: ['Guía DAFP - Rol OCI', 'Guía DAFP - Riesgos']
      }
    };
    
    onGuardar(planCompleto);
  };

  // ============================================
  // CONTEXT PROVIDER VALUE
  // ============================================
  const contextValue: WizardPAIContextType = {
    datosGenerales,
    universoAuditable,
    evaluacionesRiesgo,
    recursosOCI,
    cronogramaAuditorias,
    rolesDecreto648,
    setDatosGenerales,
    setUniversoAuditable,
    setEvaluacionesRiesgo,
    setRecursosOCI,
    setCronogramaAuditorias,
    setRolesDecreto648,
    pasoActual,
    validacionesPasos,
    erroresPasos
  };

  // ============================================
  // RENDER
  // ============================================
  const PasoActualComponente = pasos[pasoActual - 1].componente;

  return (
    <WizardPAIContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#E0EDFF] py-8">
        <div className="max-w-6xl mx-auto px-6">
          
          {/* ============================================
              HEADER
              ============================================ */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#003DA5] flex items-center">
                <FileText className="w-8 h-8 mr-3" />
                🧙‍♂️ Wizard de Creación PAI
              </h1>
              <p className="text-gray-600 mt-1">
                Plan Anual de Auditoría Interna {datosGenerales.vigencia || new Date().getFullYear()}
              </p>
            </div>
            
            <button
              onClick={handleGuardarBorrador}
              disabled={guardandoBorrador}
              className="px-4 py-2 bg-white border-2 border-[#003DA5] text-[#003DA5] rounded-xl font-semibold hover:bg-[#003DA5] hover:text-white transition-all flex items-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{guardandoBorrador ? 'Guardando...' : 'Guardar Borrador'}</span>
            </button>
          </div>

          {/* ============================================
              BARRA DE PROGRESO
              ============================================ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              {pasos.map((paso, index) => (
                <React.Fragment key={paso.numero}>
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${
                        paso.numero === pasoActual
                          ? 'bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white ring-4 ring-[#003DA5] ring-opacity-20'
                          : paso.numero < pasoActual || validacionesPasos[paso.numero]
                          ? 'bg-[#10B981] text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {validacionesPasos[paso.numero] ? <CheckCircle2 className="w-6 h-6" /> : paso.icono}
                    </div>
                    <div className="text-center mt-2">
                      <div className={`text-sm font-semibold ${
                        paso.numero === pasoActual ? 'text-[#003DA5]' : 'text-gray-600'
                      }`}>
                        {paso.titulo}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">{paso.descripcion}</div>
                    </div>
                  </div>
                  
                  {index < pasos.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      paso.numero < pasoActual || validacionesPasos[paso.numero]
                        ? 'bg-[#10B981]'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Indicador de progreso general */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progreso general</span>
                <span className="font-semibold">
                  {Math.round((Object.values(validacionesPasos).filter(v => v).length / 6) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#003DA5] to-[#10B981] transition-all duration-500"
                  style={{ 
                    width: `${(Object.values(validacionesPasos).filter(v => v).length / 6) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* ============================================
              CONTENIDO DEL PASO ACTUAL
              ============================================ */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            {/* Errores del paso actual */}
            {erroresPasos[pasoActual].length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-2 text-red-700 font-semibold mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Complete los siguientes campos:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  {erroresPasos[pasoActual].map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Componente del paso actual */}
            <PasoActualComponente />
          </div>

          {/* ============================================
              BOTONES DE NAVEGACIÓN
              ============================================ */}
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-6">
            <button
              onClick={handleAnterior}
              disabled={pasoActual === 1}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${
                pasoActual === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <div className="text-center">
              <div className="text-sm text-gray-600">Paso {pasoActual} de 6</div>
              <div className="text-lg font-bold text-[#003DA5]">{pasos[pasoActual - 1].titulo}</div>
            </div>

            {pasoActual < 6 ? (
              <button
                onClick={handleSiguiente}
                className="px-6 py-3 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleFinalizar}
                className="px-6 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Finalizar y Guardar</span>
              </button>
            )}
          </div>

          {/* Botón cancelar */}
          <div className="text-center mt-6">
            <button
              onClick={onCancelar}
              className="text-gray-600 hover:text-[#003DA5] font-semibold transition-colors"
            >
              Cancelar y volver al dashboard
            </button>
          </div>

        </div>
      </div>
    </WizardPAIContext.Provider>
  );
}
