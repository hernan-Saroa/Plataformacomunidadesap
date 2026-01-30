/**
 * ConfiguracionesSIGLContext - Context API para Configuraciones Centralizadas
 * Gestiona estados, columnas y configuraciones de todos los módulos de Gestión Legal
 * IMPACTO EN TODO EL SISTEMA: Todos los tableros Kanban leen desde aquí
 */

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';

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

// ============ DATOS DE CASOS POR ESTADO ============
// ⚠️ TODO: Implementar conteo dinámico desde API en lugar de datos estáticos
// Por ahora, inicializamos en 0 y esperamos que se actualice dinámicamente
// Los IDs deben coincidir con los estados definidos en configuracionesIniciales
export const casosPorEstado: Record<string, Record<string, number>> = {
  'defensa-judicial': {
    'NOTIFICADA': 0,
    'CONTESTACIÓN': 0,
    'PROBATORIA': 0,
    'ALEGATOS': 0,
    'SENTENCIA': 0,
    'APELACIÓN': 0,
    'CUMPLIMIENTO': 0,
  },
  'juzgamiento': {
    'E1_AVOCAMIENTO': 0,
    'E2_DESCARGOS': 0,
    'E3_PRUEBAS': 0,
    'E4_ALEGATOS': 0,
    'E5_FALLO_1I': 0,
    'E6_APELACIÓN': 0,
    'E7_FALLO_2I': 0,
  },
  'asesoria-juridica': {
    'RADICADA': 0,
    'ANÁLISIS': 0,
    'RESPUESTA': 0,
    'ENVIADA': 0,
  },
};

// ============ CONFIGURACIONES INICIALES ============

const configuracionesIniciales: ConfiguracionModulo[] = [
  {
    id: 'defensa-judicial',
    nombre: 'Defensa Judicial',
    estados: [
      { id: 'NOTIFICADA', nombre: 'Notificada', color: '#3B82F6', orden: 1, activo: true },
      { id: 'CONTESTACIÓN', nombre: 'Contestación', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'PROBATORIA', nombre: 'Probatoria', color: '#06B6D4', orden: 3, activo: true },
      { id: 'ALEGATOS', nombre: 'Alegatos', color: '#EC4899', orden: 4, activo: true },
      { id: 'SENTENCIA', nombre: 'Sentencia', color: '#10B981', orden: 5, activo: true },
      { id: 'APELACIÓN', nombre: 'Apelación', color: '#F59E0B', orden: 6, activo: true },
      { id: 'CUMPLIMIENTO', nombre: 'Cumplimiento', color: '#6B7280', orden: 7, activo: true },
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
      { id: 'E1_AVOCAMIENTO', nombre: 'Avocamiento', color: '#3B82F6', orden: 1, activo: true },
      { id: 'E2_DESCARGOS', nombre: 'Descargos', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'E3_PRUEBAS', nombre: 'Pruebas', color: '#06B6D4', orden: 3, activo: true },
      { id: 'E4_ALEGATOS', nombre: 'Alegatos', color: '#EC4899', orden: 4, activo: true },
      { id: 'E5_FALLO_1I', nombre: 'Fallo 1ª Instancia', color: '#10B981', orden: 5, activo: true },
      { id: 'E6_APELACIÓN', nombre: 'Apelación', color: '#F59E0B', orden: 6, activo: true },
      { id: 'E7_FALLO_2I', nombre: 'Fallo 2ª Instancia', color: '#6B7280', orden: 7, activo: true },
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
      { id: 'RADICADA', nombre: 'Radicada', color: '#3B82F6', orden: 1, activo: true },
      { id: 'ANÁLISIS', nombre: 'En Análisis', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'RESPUESTA', nombre: 'En Respuesta', color: '#F59E0B', orden: 3, activo: true },
      { id: 'ENVIADA', nombre: 'Enviada', color: '#10B981', orden: 4, activo: true },
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

export interface EntesControl {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface ConfiguracionesSIGLContextType {
  // ... existing code ...
}

// ============ ENTES DE CONTROL INICIALES ============

const entesControlIniciales: EntesControl[] = [
  {
    id: 'CONTRALORIA',
    nombre: 'Contraloría General',
    descripcion: 'Control fiscal a la gestión pública',
    color: '#003DA5',
    activo: true,
    orden: 1
  },
  {
    id: 'PROCURADURIA_GENERAL',
    nombre: 'Procuraduría General',
    descripcion: 'Control disciplinario y defensa del orden jurídico',
    color: '#2962FF',
    activo: true,
    orden: 2
  },
  {
    id: 'OFICINA_CONTROL_INTERNO',
    nombre: 'Oficina Control Interno',
    descripcion: 'Control interno y auditoría',
    color: '#10B981',
    activo: true,
    orden: 3
  },
  {
    id: 'AUDITORIA_EXTERNA',
    nombre: 'Auditoría Externa',
    descripcion: 'Auditoría externa y revisoría fiscal',
    color: '#7C3AED',
    activo: true,
    orden: 4
  }
];

// ============ CONTEXT ============

const ConfiguracionesSIGLContext = createContext<ConfiguracionesSIGLContextType | undefined>(undefined);

// ============ PROVIDER ============

export function ConfiguracionesSIGLProvider({ children }: { children: ReactNode }) {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionModulo[]>(configuracionesIniciales);
  const [ejesEstrategicos, setEjesEstrategicos] = useState<EjeEstrategico[]>(ejesEstrategicosIniciales);
  const [tiposIndicadores, setTiposIndicadores] = useState<TipoIndicador[]>(tiposIndicadoresIniciales);
  const [tiposRequerimientos, setTiposRequerimientos] = useState<TipoRequerimiento[]>(tiposRequerimientosIniciales);
  const [entesControl, setEntesControl] = useState<EntesControl[]>(entesControlIniciales);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Cargar configuraciones desde API
  useEffect(() => {
    // ... existing initialization ...
    const entesGuardados = localStorage.getItem('sigl-entes-control');
    if (entesGuardados) {
      try {
        const parsed = JSON.parse(entesGuardados);
        setEntesControl(parsed);
        console.log('✅ Entes de Control cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar entes de control:', error);
      }
    }
  }, []);

  // ... existing Config getter functions ...

  // Obtener solo los entes de control activos
  const getEntesControlActivos = (): EntesControl[] => {
    return entesControl.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener configuración global de un módulo
  const getConfiguracionModulo = (moduloId: string): ConfiguracionModulo | undefined => {
    return configuraciones.find(c => c.id === moduloId);
  };

  // Obtener solo los estados activos de un módulo
  const getEstadosActivos = (moduloId: string): EstadoKanban[] => {
    const config = configuraciones.find(c => c.id === moduloId);
    return config?.estados.filter(e => e.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // Obtener tipos de procesos judiciales activos
  const getTiposProcesosActivos = (): TipoProcesoJudicial[] => {
    const config = configuraciones.find(c => c.id === 'defensa-judicial');
    return config?.tiposProcesos?.filter(t => t.activo) || [];
  };

  // Obtener tipos de autos activos
  const getTiposAutosActivos = (): TipoAuto[] => {
    const config = configuraciones.find(c => c.id === 'juzgamiento'); // Los autos suelen estar en juzgamiento
    return config?.tiposAutos?.filter(t => t.activo) || [];
  };

  // Obtener ejes estratégicos activos
  const getEjesEstrategicosActivos = (): EjeEstrategico[] => {
    return ejesEstrategicos.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener tipos de indicadores activos
  const getTiposIndicadoresActivos = (): TipoIndicador[] => {
    return tiposIndicadores.filter(t => t.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener tipos de requerimientos activos
  const getTiposRequerimientosActivos = (): TipoRequerimiento[] => {
    return tiposRequerimientos.filter(t => t.activo).sort((a, b) => a.orden - b.orden);
  };

  // ... Update functions ...

  // Actualizar configuraciones generales
  const actualizarConfiguraciones = (nuevasConfiguraciones: ConfiguracionModulo[]) => {
    setConfiguraciones(nuevasConfiguraciones);
    setCambiosPendientes(true);
  };

  // Actualizar ejes estratégicos
  const actualizarEjesEstrategicos = (nuevosEjes: EjeEstrategico[]) => {
    setEjesEstrategicos(nuevosEjes);
    setCambiosPendientes(true);
  };

  // Actualizar tipos de indicadores
  const actualizarTiposIndicadores = (nuevosTipos: TipoIndicador[]) => {
    setTiposIndicadores(nuevosTipos);
    setCambiosPendientes(true);
  };

  // Actualizar tipos de requerimientos
  const actualizarTiposRequerimientos = (nuevosTipos: TipoRequerimiento[]) => {
    setTiposRequerimientos(nuevosTipos);
    setCambiosPendientes(true);
  };

  // Actualizar entes de control
  const actualizarEntesControl = (nuevosEntes: EntesControl[]) => {
    setEntesControl(nuevosEntes);
    setCambiosPendientes(true);
  };

  // Guardar configuraciones
  const guardarConfiguraciones = async (): Promise<void> => {
    try {
      console.log('💾 Guardando configuraciones en backend...');

      await Promise.all(
        configuraciones.map(config =>
          legalService.saveConfiguration(config.id, config)
        )
      );

      localStorage.setItem('sigl-configuraciones', JSON.stringify(configuraciones));
      localStorage.setItem('sigl-ejes-estrategicos', JSON.stringify(ejesEstrategicos));
      localStorage.setItem('sigl-tipos-indicadores', JSON.stringify(tiposIndicadores));
      localStorage.setItem('sigl-tipos-requerimientos', JSON.stringify(tiposRequerimientos));
      localStorage.setItem('sigl-entes-control', JSON.stringify(entesControl));

      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente', {
        description: 'Los cambios se han aplicado a todos los módulos',
        duration: 3000
      });
    } catch (error) {
      console.error('❌ Error al guardar configuraciones:', error);
      toast.error('Error al guardar configuraciones en el servidor');
    }
  };

  // Restablecer a valores por defecto
  const restablecerDefecto = () => {
    setConfiguraciones(configuracionesIniciales);
    setEjesEstrategicos(ejesEstrategicosIniciales);
    setTiposIndicadores(tiposIndicadoresIniciales);
    setTiposRequerimientos(tiposRequerimientosIniciales);
    setEntesControl(entesControlIniciales);

    localStorage.removeItem('sigl-configuraciones');
    localStorage.removeItem('sigl-ejes-estrategicos');
    localStorage.removeItem('sigl-tipos-indicadores');
    localStorage.removeItem('sigl-tipos-requerimientos');
    localStorage.removeItem('sigl-entes-control');

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
    entesControl,
    cambiosPendientes,
    getConfiguracionModulo,
    getEstadosActivos,
    getTiposProcesosActivos,
    getTiposAutosActivos,
    getEjesEstrategicosActivos,
    getTiposIndicadoresActivos,
    getTiposRequerimientosActivos,
    getEntesControlActivos,
    actualizarConfiguraciones,
    actualizarEjesEstrategicos,
    actualizarTiposIndicadores,
    actualizarTiposRequerimientos,
    actualizarEntesControl,
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
  // Debug log
  if (context === undefined) {
    console.error('❌ useConfiguracionesSIGL: Context is undefined. Provider missing or module mismatch?');
  }
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
    tiempos: getConfiguracionModulo(moduloId)?.tiempos || [],
    tiposAutosActivos: getTiposAutosActivos(moduloId),
  };
}