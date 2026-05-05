/**
 * HOOK PERSONALIZADO PARA GESTIÓN DE PTA
 * Implementa todas las reglas de negocio y cálculos del sistema
 */

import { useState, useEffect, useMemo } from 'react';
import { calcularHoras, calcularHorasTotalesDocencia, type AsignaturaInfo } from '../lib/pta/calculoHoras';
import { validarPTACompleto, obtenerTabsBloqueados, puedeEnviarseAAprobacion, type PTAData } from '../lib/pta/reglasNegocio';
import { aplicarProrrateo, formatearResultadoProrrateo, type ComponentesPTA, type ResultadoProrrateo } from '../lib/pta/prorrateo';
import type { 
  PlanTrabajoAcademico, 
  PTADocencia, 
  PTAInvestigacion, 
  PTAExtension, 
  PTAComplementarias,
  EstadoPTA
} from '../types/gestion-profesoral';

export interface UsePTAOptions {
  ptaId?: number;
  docenteId?: number;
  periodoId?: number;
  horasBase?: number; // 800 o 1600
  modoEdicion?: boolean;
}

export interface PTAState {
  // Datos principales
  pta?: PlanTrabajoAcademico;
  docencias: PTADocencia[];
  investigaciones: PTAInvestigacion[];
  extensiones: PTAExtension[];
  complementarias: PTAComplementarias[];
  
  // Cálculos
  totales: ComponentesPTA;
  totalesFinales: ComponentesPTA;
  prorrateo?: ResultadoProrrateo;
  
  // Estado
  horasBase: number;
  estado: EstadoPTA;
  tabsBloqueados: {
    investigacion: boolean;
    extension: boolean;
    complementarias: boolean;
  };
  
  // Validaciones
  validaciones: ReturnType<typeof validarPTACompleto>;
  puedeEnviar: boolean;
  errores: string[];
  
  // Loading
  loading: boolean;
  error?: string;
}

export function usePTA(options: UsePTAOptions = {}) {
  const { horasBase = 1600, modoEdicion = true } = options;
  
  // Estado del PTA
  const [state, setState] = useState<PTAState>({
    docencias: [],
    investigaciones: [],
    extensiones: [],
    complementarias: [],
    totales: {
      docencia: 0,
      investigacion: 0,
      extension: 0,
      complementarias: 0
    },
    totalesFinales: {
      docencia: 0,
      investigacion: 0,
      extension: 0,
      complementarias: 0
    },
    horasBase,
    estado: 'EN_CONSTRUCCION',
    tabsBloqueados: {
      investigacion: false,
      extension: false,
      complementarias: false
    },
    validaciones: [],
    puedeEnviar: false,
    errores: [],
    loading: false
  });

  // ============================================================================
  // CÁLCULOS AUTOMÁTICOS
  // ============================================================================

  // Calcular totales cada vez que cambian los componentes
  useEffect(() => {
    calcularTotales();
  }, [
    state.docencias,
    state.investigaciones,
    state.extensiones,
    state.complementarias,
    horasBase
  ]);

  function calcularTotales() {
    // Calcular total de cada componente
    const totalDocencia = state.docencias.reduce((sum, d) => sum + d.horas_totales, 0);
    const totalInvestigacion = state.investigaciones.reduce((sum, i) => sum + i.horas_asignadas, 0);
    const totalExtension = state.extensiones.reduce((sum, e) => sum + e.horas_totales, 0);
    const totalComplementarias = state.complementarias.reduce((sum, c) => sum + c.horas_totales, 0);

    const totales: ComponentesPTA = {
      docencia: totalDocencia,
      investigacion: totalInvestigacion,
      extension: totalExtension,
      complementarias: totalComplementarias
    };

    // Aplicar prorrateo si es necesario
    const resultadoProrrateo = aplicarProrrateo(horasBase, totales);

    // Preparar datos para validación
    const ptaData: PTAData = {
      horasBase,
      totalDocencia,
      totalInvestigacion,
      totalExtension,
      totalComplementarias,
      asignaturas: state.docencias.map(d => ({
        creditos: d.creditos,
        nombre: d.programa // Usar programa como nombre por ahora
      })),
      tieneProyectoFormal: state.investigaciones.some(i => i.tipo === 'PROYECTO_FORMAL'),
      tieneActividadesServicio: state.investigaciones.some(i => i.tipo === 'NECESIDAD_SERVICIO')
    };

    // Validar reglas de negocio
    const validaciones = validarPTACompleto(ptaData);
    const tabsBloqueados = obtenerTabsBloqueados(ptaData);
    const { puede, errores } = puedeEnviarseAAprobacion(ptaData);

    // Actualizar estado
    setState(prev => ({
      ...prev,
      totales,
      totalesFinales: resultadoProrrateo.prorrateado,
      prorrateo: resultadoProrrateo,
      validaciones,
      tabsBloqueados,
      puedeEnviar: puede,
      errores
    }));
  }

  // ============================================================================
  // ACCIONES - DOCENCIA
  // ============================================================================

  function agregarDocencia(asignaturaInfo: AsignaturaInfo & {
    territorial_id: number;
    cetap_id?: number;
    asignatura_id: number;
    periodo: string;
  }) {
    // Calcular horas usando el motor de cálculo
    const calculo = calcularHoras({
      nombre: asignaturaInfo.nombre,
      tipoPrograma: asignaturaInfo.tipoPrograma,
      creditos: asignaturaInfo.creditos,
      numeroGrupos: asignaturaInfo.numeroGrupos || 1
    });

    const nuevaDocencia: PTADocencia = {
      id: Date.now(), // ID temporal
      pta_id: 0, // Se asignará al guardar
      orden: state.docencias.length + 1,
      territorial_id: asignaturaInfo.territorial_id,
      cetap_id: asignaturaInfo.cetap_id,
      asignatura_id: asignaturaInfo.asignatura_id,
      periodo: asignaturaInfo.periodo,
      programa: asignaturaInfo.nombre,
      creditos: asignaturaInfo.creditos,
      numero_grupos: asignaturaInfo.numeroGrupos || 1,
      horas_clase: calculo.horasClase,
      horas_totales: calculo.horasTotales,
      created_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      docencias: [...prev.docencias, nuevaDocencia]
    }));

    return nuevaDocencia;
  }

  function editarDocencia(id: number, datos: Partial<PTADocencia>) {
    setState(prev => ({
      ...prev,
      docencias: prev.docencias.map(d => 
        d.id === id ? { ...d, ...datos } : d
      )
    }));
  }

  function eliminarDocencia(id: number) {
    setState(prev => ({
      ...prev,
      docencias: prev.docencias.filter(d => d.id !== id)
    }));
  }

  // ============================================================================
  // ACCIONES - INVESTIGACIÓN
  // ============================================================================

  function agregarInvestigacion(datos: Omit<PTAInvestigacion, 'id' | 'pta_id' | 'created_at'>) {
    // Validar exclusión mutua
    if (datos.tipo === 'PROYECTO_FORMAL' && state.investigaciones.some(i => i.tipo === 'NECESIDAD_SERVICIO')) {
      throw new Error('No puede agregar un Proyecto Formal si ya tiene actividades de Necesidad del Servicio');
    }
    if (datos.tipo === 'NECESIDAD_SERVICIO' && state.investigaciones.some(i => i.tipo === 'PROYECTO_FORMAL')) {
      throw new Error('No puede agregar actividades de Necesidad del Servicio si ya tiene un Proyecto Formal');
    }

    const nuevaInvestigacion: PTAInvestigacion = {
      id: Date.now(),
      pta_id: 0,
      created_at: new Date().toISOString(),
      ...datos
    };

    setState(prev => ({
      ...prev,
      investigaciones: [...prev.investigaciones, nuevaInvestigacion]
    }));

    return nuevaInvestigacion;
  }

  function eliminarInvestigacion(id: number) {
    setState(prev => ({
      ...prev,
      investigaciones: prev.investigaciones.filter(i => i.id !== id)
    }));
  }

  // ============================================================================
  // ACCIONES - EXTENSIÓN
  // ============================================================================

  function agregarExtension(datos: Omit<PTAExtension, 'id' | 'pta_id' | 'created_at'>) {
    const nuevaExtension: PTAExtension = {
      id: Date.now(),
      pta_id: 0,
      created_at: new Date().toISOString(),
      ...datos
    };

    setState(prev => ({
      ...prev,
      extensiones: [...prev.extensiones, nuevaExtension]
    }));

    return nuevaExtension;
  }

  function eliminarExtension(id: number) {
    setState(prev => ({
      ...prev,
      extensiones: prev.extensiones.filter(e => e.id !== id)
    }));
  }

  // ============================================================================
  // ACCIONES - COMPLEMENTARIAS
  // ============================================================================

  function agregarComplementaria(datos: Omit<PTAComplementarias, 'id' | 'pta_id' | 'created_at'>) {
    const nuevaComplementaria: PTAComplementarias = {
      id: Date.now(),
      pta_id: 0,
      created_at: new Date().toISOString(),
      ...datos
    };

    setState(prev => ({
      ...prev,
      complementarias: [...prev.complementarias, nuevaComplementaria]
    }));

    return nuevaComplementaria;
  }

  function eliminarComplementaria(id: number) {
    setState(prev => ({
      ...prev,
      complementarias: prev.complementarias.filter(c => c.id !== id)
    }));
  }

  // ============================================================================
  // ACCIONES - FLUJO DE APROBACIÓN
  // ============================================================================

  async function enviarAAprobacion() {
    if (!state.puedeEnviar) {
      throw new Error('El PTA tiene errores que deben corregirse antes de enviar');
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // TODO: Llamar al API para enviar
      // await api.pta.enviarAAprobacion(ptaId);
      
      setState(prev => ({
        ...prev,
        estado: 'EN_APROBACION',
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error al enviar'
      }));
      throw error;
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  function obtenerResumenProrrateo(): string {
    if (!state.prorrateo) return '';
    return formatearResultadoProrrateo(state.prorrateo);
  }

  function obtenerPorcentajeUso(): number {
    const total = state.totales.docencia + state.totales.investigacion + 
                  state.totales.extension + state.totales.complementarias;
    return (total / horasBase) * 100;
  }

  // ============================================================================
  // VALORES COMPUTADOS
  // ============================================================================

  const resumen = useMemo(() => ({
    totalOriginal: state.totales.docencia + state.totales.investigacion + 
                   state.totales.extension + state.totales.complementarias,
    totalFinal: state.totalesFinales.docencia + state.totalesFinales.investigacion + 
                state.totalesFinales.extension + state.totalesFinales.complementarias,
    porcentajeUso: obtenerPorcentajeUso(),
    seAplicoProrrateo: state.prorrateo?.seAplicoProrrateo || false,
    factorProrrateo: state.prorrateo?.factorProrrateo || 1.0,
    erroresDuros: state.validaciones.filter(v => !v.valida && v.tipo === 'DURO'),
    advertencias: state.validaciones.filter(v => v.tipo === 'ADVERTENCIA'),
    cumplePrerequisito: !state.tabsBloqueados.investigacion
  }), [state.totales, state.totalesFinales, state.prorrateo, state.validaciones, state.tabsBloqueados]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Estado
    ...state,
    resumen,
    
    // Acciones - Docencia
    agregarDocencia,
    editarDocencia,
    eliminarDocencia,
    
    // Acciones - Investigación
    agregarInvestigacion,
    eliminarInvestigacion,
    
    // Acciones - Extensión
    agregarExtension,
    eliminarExtension,
    
    // Acciones - Complementarias
    agregarComplementaria,
    eliminarComplementaria,
    
    // Acciones - Flujo
    enviarAAprobacion,
    
    // Utilidades
    obtenerResumenProrrateo,
    obtenerPorcentajeUso
  };
}
