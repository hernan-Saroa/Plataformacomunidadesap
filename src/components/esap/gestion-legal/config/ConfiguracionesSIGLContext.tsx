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

export interface ConfiguracionModulo {
  id: string;
  nombre: string;
  estados: EstadoKanban[];
  tiempos: ConfiguracionTiempo[];
  tiposProcesos?: TipoProcesoJudicial[];
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

// ============ CONTEXT TYPE ============

interface ConfiguracionesSIGLContextType {
  configuraciones: ConfiguracionModulo[];
  cambiosPendientes: boolean;
  getConfiguracionModulo: (moduloId: string) => ConfiguracionModulo | undefined;
  getEstadosActivos: (moduloId: string) => EstadoKanban[];
  getTiposProcesosActivos: (moduloId: string) => TipoProcesoJudicial[];
  actualizarConfiguraciones: (nuevasConfig: ConfiguracionModulo[]) => void;
  guardarConfiguraciones: () => Promise<void>;
  restablecerDefecto: () => void;
  setCambiosPendientes: (value: boolean) => void;
}

// ============ CONTEXT ============

const ConfiguracionesSIGLContext = createContext<ConfiguracionesSIGLContextType | undefined>(undefined);

// ============ PROVIDER ============

export function ConfiguracionesSIGLProvider({ children }: { children: ReactNode }) {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionModulo[]>(configuracionesIniciales);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Cargar configuraciones desde API
  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('🔄 Cargando configuraciones desde API...');
        const keys = ['defensa-judicial', 'juzgamiento', 'asesoria-juridica'];

        // Cargar todas las configuraciones en paralelo
        const responses = await Promise.all(
          keys.map(key =>
            legalService.getConfiguration(key)
              .then(res => res?.value || null) // Asegurar que devolvemos null si no hay valor
              .catch(err => {
                console.warn(`⚠️ Config no encontrada para ${key}, usando defecto.`, err);
                return null;
              })
          )
        );

        // Mapear respuestas a ConfiguracionModulo: filtrar null Y undefined
        const configsCargadas = responses.filter(c => c !== null && c !== undefined) as ConfiguracionModulo[];

        if (configsCargadas.length > 0) {
          // Fusionar con las iniciales para asegurar que existen todos los módulos
          const mergedConfigs = configuracionesIniciales.map(inicial => {
            // Buscar si existe configuración cargada para este módulo
            const cargada = configsCargadas.find(c => c && c.id === inicial.id);
            if (cargada) {
              return { ...inicial, ...cargada };
            }
            return inicial;
          });

          setConfiguraciones(mergedConfigs);
          console.log('✅ Configuraciones mezcladas exitosamente (Backend + Defaults):', mergedConfigs.length);
        } else {
          console.log('⚠️ No se encontraron configuraciones en backend, usando defaults completos.');
          // No necesitamos hacer setConfiguraciones porque ya inicia con configuracionesIniciales
        }
      } catch (error) {
        console.error('❌ Error general al cargar configuraciones:', error);
        // No mostrar toast de error para no alarmar al usuario en primera carga si falla
        console.warn('Usando configuraciones por defecto debido a error de conexión.');
      }
    };
    loadConfig();
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

  // Actualizar configuraciones
  const actualizarConfiguraciones = (nuevasConfig: ConfiguracionModulo[]) => {
    setConfiguraciones(nuevasConfig);
    setCambiosPendientes(true);
  };

  // Guardar configuraciones
  const guardarConfiguraciones = async (): Promise<void> => {
    try {
      console.log('💾 Guardando configuraciones en backend...');

      // Guardar cada módulo individualmente en el backend
      await Promise.all(
        configuraciones.map(config =>
          legalService.saveConfiguration(config.id, config)
        )
      );

      // Guardar en localStorage como backup
      localStorage.setItem('sigl-configuraciones', JSON.stringify(configuraciones));

      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente', {
        description: 'Los cambios se han aplicado a todos los módulos',
        duration: 3000
      });

      console.log('✅ Configuraciones sincronizadas con servidor');
    } catch (error) {
      console.error('❌ Error al guardar configuraciones:', error);
      toast.error('Error al guardar configuraciones en el servidor');
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
    cambiosPendientes,
    getConfiguracionModulo,
    getEstadosActivos,
    getTiposProcesosActivos,
    actualizarConfiguraciones,
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
  const { getConfiguracionModulo, getEstadosActivos, getTiposProcesosActivos } = useConfiguracionesSIGL();

  return {
    configuracion: getConfiguracionModulo(moduloId),
    estadosActivos: getEstadosActivos(moduloId),
    tiposProcesosActivos: getTiposProcesosActivos(moduloId),
    tiempos: getConfiguracionModulo(moduloId)?.tiempos || []
  };
}
