/**
 * ConfiguracionesSIGLContext - Context API para Configuraciones Centralizadas
 * Gestiona estados, columnas y configuraciones de todos los módulos de Gestión Legal
 * IMPACTO EN TODO EL SISTEMA: Todos los tableros Kanban leen desde aquí
 */

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
}

export interface ConfiguracionTiempo {
  id: string;
  tipo: string;
  dias: number;
  alertaDias: number;
  activo: boolean;
}

export interface TipoProcesoJudicial {
  id: string;
  nombre: string;
  descripcion: string;
  plazo: number;
  alertaDias: number;
  activo: boolean;
}

export interface TipoAuto {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface EjeEstrategico {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface TipoIndicador {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface TipoRequerimiento {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface ConfiguracionModulo {
  id: string;
  nombre: string;
  estados: EstadoKanban[];
  tiempos: ConfiguracionTiempo[];
  tiposProcesos?: TipoProcesoJudicial[];
  tiposAutos?: TipoAuto[];
}

// ============ DATOS MOCK DE CASOS POR ESTADO ============
export const casosPorEstado: Record<string, Record<string, number>> = {
  'defensa-judicial': {
    'radicado': 3,
    'en-estudio': 5,
    'contestacion': 0,
    'pruebas': 2,
    'alegatos': 1,
    'sentencia': 0,
    'archivo': 0,
  },
  'juzgamiento': {
    'queja': 2,
    'indagacion': 4,
    'formulacion-cargos': 0,
    'descargos': 1,
    'pruebas-juzgamiento': 3,
    'fallo': 0,
    'archivo-juzgamiento': 0,
  },
  'asesoria-juridica': {
    'solicitud': 6,
    'revision': 2,
    'concepto': 0,
    'aprobacion': 1,
    'entregado': 0,
  },
};

// ============ CONFIGURACIONES INICIALES ============

const configuracionesIniciales: ConfiguracionModulo[] = [
  {
    id: 'defensa-judicial',
    nombre: 'Defensa Judicial',
    estados: [
      { id: 'radicado', nombre: 'Radicado', color: '#3B82F6', orden: 1, activo: true },
      { id: 'en-estudio', nombre: 'En Estudio', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'contestacion', nombre: 'Contestación', color: '#F59E0B', orden: 3, activo: true },
      { id: 'pruebas', nombre: 'Pruebas', color: '#06B6D4', orden: 4, activo: true },
      { id: 'alegatos', nombre: 'Alegatos', color: '#EC4899', orden: 5, activo: true },
      { id: 'sentencia', nombre: 'Sentencia', color: '#10B981', orden: 6, activo: true },
      { id: 'archivo', nombre: 'Archivo', color: '#6B7280', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'estudio-inicial', tipo: 'Estudio Inicial', dias: 5, alertaDias: 2, activo: true },
      { id: 'contestacion-demanda', tipo: 'Contestación Demanda', dias: 30, alertaDias: 7, activo: true },
      { id: 'presentacion-pruebas', tipo: 'Presentación Pruebas', dias: 20, alertaDias: 5, activo: true },
      { id: 'alegatos-conclusion', tipo: 'Alegatos de Conclusión', dias: 15, alertaDias: 3, activo: true },
    ],
    tiposProcesos: [
      { id: 'reparacion-directa', nombre: 'Reparación Directa', descripcion: 'Acción para obtener indemnización de perjuicios causados por hecho, omisión, operación administrativa u ocupación temporal o permanente de inmueble.', plazo: 30, alertaDias: 7, activo: true },
      { id: 'nulidad-restablecimiento', nombre: 'Nulidad y Restablecimiento del Derecho', descripcion: 'Acción para declarar la nulidad de un acto administrativo y restablecer el derecho afectado.', plazo: 20, alertaDias: 5, activo: true },
      { id: 'accion-grupo', nombre: 'Acción de Grupo', descripcion: 'Acción interpuesta por un grupo de personas para obtener el reconocimiento y pago de indemnización de perjuicios.', plazo: 40, alertaDias: 10, activo: true },
      { id: 'accion-popular', nombre: 'Acción Popular', descripcion: 'Acción para la protección de los derechos e intereses colectivos.', plazo: 25, alertaDias: 5, activo: true },
      { id: 'controversias-contractuales', nombre: 'Controversias Contractuales', descripcion: 'Acción para resolver controversias surgidas de contratos estatales.', plazo: 35, alertaDias: 7, activo: true },
      { id: 'tutela', nombre: 'Tutela', descripcion: 'Acción para la protección inmediata de derechos fundamentales.', plazo: 10, alertaDias: 2, activo: true },
      { id: 'proceso-ejecutivo', nombre: 'Proceso Ejecutivo', descripcion: 'Proceso para el cobro de obligaciones claras, expresas y exigibles.', plazo: 20, alertaDias: 5, activo: true },
      { id: 'otro', nombre: 'Otro', descripcion: 'Otros tipos de procesos judiciales no categorizados.', plazo: 15, alertaDias: 3, activo: true },
    ],
    tiposAutos: [
      { id: 'auto-admisorio', nombre: 'Auto Admisorio', descripcion: 'Auto que admite la demanda y ordena correr traslado al demandado', activo: true },
      { id: 'auto-pruebas', nombre: 'Auto de Pruebas', descripcion: 'Auto que decreta o niega las pruebas solicitadas por las partes', activo: true },
      { id: 'auto-traslado', nombre: 'Auto de Traslado', descripcion: 'Auto que ordena dar traslado a la parte contraria', activo: true },
      { id: 'auto-archivo', nombre: 'Auto de Archivo', descripcion: 'Auto que ordena el archivo del proceso', activo: true },
      { id: 'auto-nulidad', nombre: 'Auto de Nulidad', descripcion: 'Auto que declara la nulidad de actuaciones procesales', activo: true },
      { id: 'auto-correccion', nombre: 'Auto de Corrección', descripcion: 'Auto que corrige errores aritméticos o de transcripción', activo: true },
      { id: 'auto-interlocutorio', nombre: 'Auto Interlocutorio', descripcion: 'Auto que resuelve incidentes o cuestiones de trámite', activo: true },
      { id: 'auto-sustanciacion', nombre: 'Auto de Sustanciación', descripcion: 'Auto que impulsa el proceso y ordena trámites', activo: true },
    ],
  },
  {
    id: 'juzgamiento',
    nombre: 'Juzgamiento Disciplinario',
    estados: [
      { id: 'queja', nombre: 'Queja', color: '#3B82F6', orden: 1, activo: true },
      { id: 'indagacion', nombre: 'Indagación', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'formulacion-cargos', nombre: 'Formulación de Cargos', color: '#F59E0B', orden: 3, activo: true },
      { id: 'descargos', nombre: 'Descargos', color: '#EC4899', orden: 4, activo: true },
      { id: 'pruebas-juzgamiento', nombre: 'Pruebas de Juzgamiento', color: '#06B6D4', orden: 5, activo: true },
      { id: 'fallo', nombre: 'Fallo', color: '#10B981', orden: 6, activo: true },
      { id: 'archivo-juzgamiento', nombre: 'Archivo', color: '#6B7280', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'indagacion-preliminar', tipo: 'Indagación Preliminar', dias: 6, alertaDias: 2, activo: true },
      { id: 'descargos-investigado', tipo: 'Descargos Investigado', dias: 10, alertaDias: 3, activo: true },
      { id: 'fallo-primera-instancia', tipo: 'Fallo Primera Instancia', dias: 30, alertaDias: 7, activo: true },
    ],
  },
  {
    id: 'asesoria-juridica',
    nombre: 'Asesoría Jurídica',
    estados: [
      { id: 'solicitud', nombre: 'Solicitud', color: '#3B82F6', orden: 1, activo: true },
      { id: 'revision', nombre: 'Revisión', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'concepto', nombre: 'Concepto', color: '#F59E0B', orden: 3, activo: true },
      { id: 'aprobacion', nombre: 'Aprobación', color: '#10B981', orden: 4, activo: true },
      { id: 'entregado', nombre: 'Entregado', color: '#6B7280', orden: 5, activo: true },
    ],
    tiempos: [
      { id: 'analisis-inicial', tipo: 'Análisis Inicial', dias: 3, alertaDias: 1, activo: true },
      { id: 'emision-concepto', tipo: 'Emisión Concepto', dias: 10, alertaDias: 3, activo: true },
      { id: 'revision-superior', tipo: 'Revisión Superior', dias: 5, alertaDias: 2, activo: true },
    ],
  },
];

// ============ EJES ESTRATÉGICOS INICIALES ============

const ejesEstrategicosIniciales: EjeEstrategico[] = [
  {
    id: 'GESTION_INSTITUCIONAL',
    nombre: 'Gestión Institucional',
    icono: '🏛️',
    descripcion: 'Procesos y acciones relacionadas con la administración y gestión institucional',
    color: '#003DA5',
    activo: true,
    orden: 1
  },
  {
    id: 'TALENTO_HUMANO',
    nombre: 'Talento Humano',
    icono: '👥',
    descripcion: 'Desarrollo, bienestar y gestión del talento humano',
    color: '#2962FF',
    activo: true,
    orden: 2
  },
  {
    id: 'TRANSPARENCIA',
    nombre: 'Transparencia',
    icono: '🔍',
    descripcion: 'Transparencia, acceso a la información y rendición de cuentas',
    color: '#10B981',
    activo: true,
    orden: 3
  },
  {
    id: 'TECNOLOGIA',
    nombre: 'Tecnología',
    icono: '💻',
    descripcion: 'Innovación tecnológica y transformación digital',
    color: '#7C3AED',
    activo: true,
    orden: 4
  }
];

// ============ TIPOS DE INDICADORES INICIALES ============

const tiposIndicadoresIniciales: TipoIndicador[] = [
  {
    id: 'EFICACIA',
    nombre: 'Eficacia',
    icono: '🎯',
    descripcion: 'Mide el grado de cumplimiento de los objetivos planteados',
    color: '#10B981',
    activo: true,
    orden: 1
  },
  {
    id: 'EFICIENCIA',
    nombre: 'Eficiencia',
    icono: '⚡',
    descripcion: 'Mide la relación entre los resultados obtenidos y los recursos utilizados',
    color: '#2962FF',
    activo: true,
    orden: 2
  },
  {
    id: 'EFECTIVIDAD',
    nombre: 'Efectividad',
    icono: '✅',
    descripcion: 'Mide el impacto o efecto de las acciones sobre la población objetivo',
    color: '#7C3AED',
    activo: true,
    orden: 3
  },
  {
    id: 'CALIDAD',
    nombre: 'Calidad',
    icono: '⭐',
    descripcion: 'Mide los atributos, propiedades o características de los servicios',
    color: '#F59E0B',
    activo: true,
    orden: 4
  }
];

// ============ TIPOS DE REQUERIMIENTOS INICIALES ============

const tiposRequerimientosIniciales: TipoRequerimiento[] = [
  {
    id: 'DOCUMENTOS',
    nombre: 'Documentos',
    icono: '📄',
    descripcion: 'Requerimientos relacionados con la entrega de documentos',
    color: '#3B82F6',
    activo: true,
    orden: 1
  },
  {
    id: 'INFORMES',
    nombre: 'Informes',
    icono: '📊',
    descripcion: 'Requerimientos relacionados con la entrega de informes',
    color: '#8B5CF6',
    activo: true,
    orden: 2
  },
  {
    id: 'CERTIFICADOS',
    nombre: 'Certificados',
    icono: '📜',
    descripcion: 'Requerimientos relacionados con la entrega de certificados',
    color: '#F59E0B',
    activo: true,
    orden: 3
  },
  {
    id: 'OTROS',
    nombre: 'Otros',
    icono: '📋',
    descripcion: 'Otros tipos de requerimientos',
    color: '#EC4899',
    activo: true,
    orden: 4
  }
];

// ============ CONTEXT TYPE ============

interface ConfiguracionesSIGLContextType {
  configuraciones: ConfiguracionModulo[];
  ejesEstrategicos: EjeEstrategico[];
  tiposIndicadores: TipoIndicador[];
  tiposRequerimientos: TipoRequerimiento[];
  cambiosPendientes: boolean;
}

// ============ CONTEXT ============

const ConfiguracionesSIGLContext = createContext<ConfiguracionesSIGLContextType | undefined>(undefined);

// ============ PROVIDER ============

export function ConfiguracionesSIGLProvider({ children }: { children: ReactNode }) {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionModulo[]>(configuracionesIniciales);
  const [ejesEstrategicos, setEjesEstrategicos] = useState<EjeEstrategico[]>(ejesEstrategicosIniciales);
  const [tiposIndicadores, setTiposIndicadores] = useState<TipoIndicador[]>(tiposIndicadoresIniciales);
  const [tiposRequerimientos, setTiposRequerimientos] = useState<TipoRequerimiento[]>(tiposRequerimientosIniciales);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Cargar configuraciones desde localStorage al iniciar
  useEffect(() => {
    const configGuardadas = localStorage.getItem('sigl-configuraciones');
    if (configGuardadas) {
      try {
        const parsed = JSON.parse(configGuardadas);
        setConfiguraciones(parsed);
        console.log('✅ Configuraciones SIGL cargadas desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar configuraciones:', error);
      }
    }

    const ejesGuardados = localStorage.getItem('sigl-ejes-estrategicos');
    if (ejesGuardados) {
      try {
        const parsed = JSON.parse(ejesGuardados);
        setEjesEstrategicos(parsed);
        console.log('✅ Ejes Estratégicos cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar ejes estratégicos:', error);
      }
    }

    const indicadoresGuardados = localStorage.getItem('sigl-tipos-indicadores');
    if (indicadoresGuardados) {
      try {
        const parsed = JSON.parse(indicadoresGuardados);
        setTiposIndicadores(parsed);
        console.log('✅ Tipos de Indicadores cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar tipos de indicadores:', error);
      }
    }

    const requerimientosGuardados = localStorage.getItem('sigl-tipos-requerimientos');
    if (requerimientosGuardados) {
      try {
        const parsed = JSON.parse(requerimientosGuardados);
        setTiposRequerimientos(parsed);
        console.log('✅ Tipos de Requerimientos cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar tipos de requerimientos:', error);
      }
    }
  }, []);

  // Obtener configuración de un módulo específico
  const getConfiguracionModulo = (moduloId: string): ConfiguracionModulo | undefined => {
    return configuraciones.find(m => m.id === moduloId);
  };

  // Obtener solo los estados activos de un módulo
  const getEstadosActivos = (moduloId: string): EstadoKanban[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.estados.filter(e => e.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // Obtener solo los tipos de procesos activos
  const getTiposProcesosActivos = (moduloId: string): TipoProcesoJudicial[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.tiposProcesos?.filter(t => t.activo) || [];
  };

  // Obtener solo los tipos de autos activos
  const getTiposAutosActivos = (moduloId: string): TipoAuto[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.tiposAutos?.filter(t => t.activo) || [];
  };

  // Obtener solo los ejes estratégicos activos
  const getEjesEstrategicosActivos = (): EjeEstrategico[] => {
    return ejesEstrategicos.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener solo los tipos de indicadores activos
  const getTiposIndicadoresActivos = (): TipoIndicador[] => {
    return tiposIndicadores.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener solo los tipos de requerimientos activos
  const getTiposRequerimientosActivos = (): TipoRequerimiento[] => {
    return tiposRequerimientos.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Actualizar configuraciones
  const actualizarConfiguraciones = (nuevasConfig: ConfiguracionModulo[]) => {
    setConfiguraciones(nuevasConfig);
    setCambiosPendientes(true);
  };

  // Actualizar ejes estratégicos
  const actualizarEjesEstrategicos = (nuevosEjes: EjeEstrategico[]) => {
    setEjesEstrategicos(nuevosEjes);
    setCambiosPendientes(true);
  };

  // Actualizar tipos de indicadores
  const actualizarTiposIndicadores = (nuevosIndicadores: TipoIndicador[]) => {
    setTiposIndicadores(nuevosIndicadores);
    setCambiosPendientes(true);
  };

  // Actualizar tipos de requerimientos
  const actualizarTiposRequerimientos = (nuevosRequerimientos: TipoRequerimiento[]) => {
    setTiposRequerimientos(nuevosRequerimientos);
    setCambiosPendientes(true);
  };

  // Guardar configuraciones
  const guardarConfiguraciones = async (): Promise<void> => {
    try {
      // Guardar en localStorage
      localStorage.setItem('sigl-configuraciones', JSON.stringify(configuraciones));
      localStorage.setItem('sigl-ejes-estrategicos', JSON.stringify(ejesEstrategicos));
      localStorage.setItem('sigl-tipos-indicadores', JSON.stringify(tiposIndicadores));
      localStorage.setItem('sigl-tipos-requerimientos', JSON.stringify(tiposRequerimientos));
      
      // Aquí se enviaría al backend en producción
      // await fetch('/api/sigl/configuraciones', { method: 'POST', body: JSON.stringify(configuraciones) });
      
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente', {
        description: 'Los cambios se han aplicado a todos los módulos de Gestión Legal',
        duration: 3000
      });
      
      console.log('✅ Configuraciones SIGL guardadas:', configuraciones);
    } catch (error) {
      console.error('❌ Error al guardar configuraciones:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  // Restablecer a valores por defecto
  const restablecerDefecto = () => {
    setConfiguraciones(configuracionesIniciales);
    localStorage.removeItem('sigl-configuraciones');
    setCambiosPendientes(false);
    toast.success('Configuraciones restablecidas', {
      description: 'Se han restaurado los valores por defecto',
      duration: 3000
    });
  };

  const value: ConfiguracionesSIGLContextType = {
    configuraciones,
    ejesEstrategicos,
    tiposIndicadores,
    tiposRequerimientos,
    cambiosPendientes,
    getConfiguracionModulo,
    getEstadosActivos,
    getTiposProcesosActivos,
    getTiposAutosActivos,
    getEjesEstrategicosActivos,
    getTiposIndicadoresActivos,
    getTiposRequerimientosActivos,
    actualizarConfiguraciones,
    actualizarEjesEstrategicos,
    actualizarTiposIndicadores,
    actualizarTiposRequerimientos,
    guardarConfiguraciones,
    restablecerDefecto,
    setCambiosPendientes,
  };

  return (
    <ConfiguracionesSIGLContext.Provider value={value}>
      {children}
    </ConfiguracionesSIGLContext.Provider>
  );
}

// ============ HOOK PERSONALIZADO ============

export function useConfiguracionesSIGL() {
  const context = useContext(ConfiguracionesSIGLContext);
  if (context === undefined) {
    throw new Error('useConfiguracionesSIGL debe ser usado dentro de ConfiguracionesSIGLProvider');
  }
  return context;
}

// ============ HOOK PARA MÓDULO ESPECÍFICO ============

export function useConfiguracionModulo(moduloId: string) {
  const { getConfiguracionModulo, getEstadosActivos, getTiposProcesosActivos, getTiposAutosActivos } = useConfiguracionesSIGL();
  
  return {
    configuracion: getConfiguracionModulo(moduloId),
    estadosActivos: getEstadosActivos(moduloId),
    tiposProcesosActivos: getTiposProcesosActivos(moduloId),
    tiposAutosActivos: getTiposAutosActivos(moduloId),
  };
}