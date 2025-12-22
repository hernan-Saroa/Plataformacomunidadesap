/**
 * 🎯 Hook Personalizado para Gestión de Alertas
 * 
 * Proporciona funcionalidad centralizada para:
 * - Cargar/Guardar configuraciones
 * - Validar umbrales
 * - Calcular estados de alerta
 * - Exportar/Importar configuraciones
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';

export type Modulo = 
  | 'DEFENSA_JUDICIAL'
  | 'ORGANOS_CONTROL'
  | 'ASESORIA_JURIDICA'
  | 'JUZGAMIENTO_DISCIPLINARIO'
  | 'PROCESOS_COACTIVOS'
  | 'BUZON_NOTIFICACIONES'
  | 'BUZON_OFICINA'
  | 'PLAN_ACCION'
  | 'RIESGOS'
  | 'PLANES_MEJORAMIENTO'
  | 'TERMINOS_INFORMES';

export type CanalNotificacion = 'EMAIL' | 'TEAMS' | 'SMS' | 'IN_APP';
export type FrecuenciaAlerta = 'INMEDIATA' | 'DIARIA' | 'SEMANAL' | 'PERSONALIZADA';
export type NivelAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

export interface UmbralAlerta {
  verde: number;
  amarillo: number;
  rojo: number;
  vencido: number;
}

export interface ConfiguracionModulo {
  modulo: Modulo;
  nombre: string;
  icono: any;
  color: string;
  habilitado: boolean;
  umbral: UmbralAlerta;
  canales: CanalNotificacion[];
  frecuencia: FrecuenciaAlerta;
  destinatarios: string[];
  escalar: boolean;
  tiempoEscalamiento: number;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
}

const STORAGE_KEY = 'sigl_alertas_config';

/**
 * Calcula el nivel de alerta según días restantes
 */
export function calcularNivelAlerta(
  diasRestantes: number,
  umbral: UmbralAlerta
): NivelAlerta {
  if (diasRestantes <= 0) return 'VENCIDO';
  if (diasRestantes <= umbral.rojo) return 'ROJO';
  if (diasRestantes <= umbral.amarillo) return 'AMARILLO';
  return 'VERDE';
}

/**
 * Obtiene el color según el nivel de alerta
 */
export function getColorAlerta(nivel: NivelAlerta): string {
  switch (nivel) {
    case 'VERDE': return '#10B981';
    case 'AMARILLO': return '#EAB308';
    case 'ROJO': return '#EF4444';
    case 'VENCIDO': return '#1F2937';
    default: return '#6B7280';
  }
}

/**
 * Obtiene el color de fondo según el nivel de alerta
 */
export function getBgColorAlerta(nivel: NivelAlerta): string {
  switch (nivel) {
    case 'VERDE': return 'bg-green-100 text-green-800 border-green-300';
    case 'AMARILLO': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ROJO': return 'bg-red-100 text-red-800 border-red-300';
    case 'VENCIDO': return 'bg-gray-900 text-white border-gray-700';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Valida que los umbrales sean coherentes
 */
export function validarUmbrales(umbral: UmbralAlerta): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  
  if (umbral.verde <= umbral.amarillo) {
    errores.push('El umbral verde debe ser mayor que el amarillo');
  }
  
  if (umbral.amarillo <= umbral.rojo) {
    errores.push('El umbral amarillo debe ser mayor que el rojo');
  }
  
  if (umbral.rojo < 0) {
    errores.push('El umbral rojo debe ser mayor o igual a 0');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Hook principal para gestión de alertas
 */
export function useAlertasConfig(configuracionInicial: ConfiguracionModulo[]) {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionModulo[]>(() => {
    // Intentar cargar configuración guardada
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Error al cargar configuración guardada:', error);
        }
      }
    }
    return configuracionInicial;
  });

  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Guardar en localStorage cuando cambian las configuraciones
  useEffect(() => {
    if (typeof window !== 'undefined' && cambiosPendientes) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configuraciones));
    }
  }, [configuraciones, cambiosPendientes]);

  /**
   * Actualizar umbral de un módulo con validación
   */
  const actualizarUmbral = useCallback((
    modulo: Modulo,
    campo: keyof UmbralAlerta,
    valor: number
  ) => {
    setConfiguraciones(prev => prev.map(config => {
      if (config.modulo === modulo) {
        const nuevoUmbral = { ...config.umbral, [campo]: valor };
        const validacion = validarUmbrales(nuevoUmbral);
        
        if (!validacion.valido) {
          validacion.errores.forEach(error => {
            toast.warning(`⚠️ ${error}`);
          });
        }
        
        return { ...config, umbral: nuevoUmbral };
      }
      return config;
    }));
    setCambiosPendientes(true);
  }, []);

  /**
   * Toggle de canal de notificación
   */
  const toggleCanal = useCallback((
    modulo: Modulo,
    canal: CanalNotificacion
  ) => {
    setConfiguraciones(prev => prev.map(config => {
      if (config.modulo === modulo) {
        const canales = config.canales.includes(canal)
          ? config.canales.filter(c => c !== canal)
          : [...config.canales, canal];
        
        if (canales.length === 0 && config.habilitado) {
          toast.warning('⚠️ Debe mantener al menos un canal activo');
          return config;
        }
        
        return { ...config, canales };
      }
      return config;
    }));
    setCambiosPendientes(true);
  }, []);

  /**
   * Toggle habilitado/deshabilitado
   */
  const toggleHabilitado = useCallback((modulo: Modulo) => {
    setConfiguraciones(prev => prev.map(config => {
      if (config.modulo === modulo) {
        const nuevoEstado = !config.habilitado;
        
        if (nuevoEstado && config.canales.length === 0) {
          toast.error('❌ Configure al menos un canal antes de habilitar');
          return config;
        }
        
        return { ...config, habilitado: nuevoEstado };
      }
      return config;
    }));
    setCambiosPendientes(true);
  }, []);

  /**
   * Actualizar frecuencia
   */
  const actualizarFrecuencia = useCallback((
    modulo: Modulo,
    frecuencia: FrecuenciaAlerta
  ) => {
    setConfiguraciones(prev => prev.map(config =>
      config.modulo === modulo ? { ...config, frecuencia } : config
    ));
    setCambiosPendientes(true);
  }, []);

  /**
   * Toggle escalamiento
   */
  const toggleEscalamiento = useCallback((modulo: Modulo) => {
    setConfiguraciones(prev => prev.map(config =>
      config.modulo === modulo ? { ...config, escalar: !config.escalar } : config
    ));
    setCambiosPendientes(true);
  }, []);

  /**
   * Actualizar tiempo de escalamiento
   */
  const actualizarTiempoEscalamiento = useCallback((
    modulo: Modulo,
    tiempo: number
  ) => {
    setConfiguraciones(prev => prev.map(config =>
      config.modulo === modulo ? { ...config, tiempoEscalamiento: Math.max(1, tiempo) } : config
    ));
    setCambiosPendientes(true);
  }, []);

  /**
   * Guardar cambios
   */
  const guardarCambios = useCallback(() => {
    // Validar todas las configuraciones
    let hayErrores = false;
    
    configuraciones.forEach(config => {
      if (config.habilitado && config.canales.length === 0) {
        toast.error(`❌ ${config.nombre}: Debe tener al menos un canal activo`);
        hayErrores = true;
      }
      
      const validacion = validarUmbrales(config.umbral);
      if (!validacion.valido) {
        validacion.errores.forEach(error => {
          toast.error(`❌ ${config.nombre}: ${error}`);
        });
        hayErrores = true;
      }
    });

    if (hayErrores) return false;

    // Guardar en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configuraciones));
    }

    toast.success('✅ Configuración guardada exitosamente', {
      description: 'Los cambios se han aplicado a todos los módulos SIGL',
      duration: 5000,
    });
    
    setCambiosPendientes(false);
    return true;
  }, [configuraciones]);

  /**
   * Restaurar valores por defecto
   */
  const restaurarDefecto = useCallback(() => {
    setConfiguraciones(configuracionInicial);
    setCambiosPendientes(false);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    toast.info('🔄 Configuración restaurada', {
      description: 'Se han aplicado los valores predeterminados del sistema'
    });
  }, [configuracionInicial]);

  /**
   * Exportar configuración
   */
  const exportarConfiguracion = useCallback(() => {
    const dataStr = JSON.stringify(configuraciones, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas-sigl-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('📥 Configuración exportada', {
      description: 'El archivo ha sido descargado'
    });
  }, [configuraciones]);

  /**
   * Importar configuración
   */
  const importarConfiguracion = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        
        // Validar estructura básica
        if (!Array.isArray(config)) {
          throw new Error('Formato inválido');
        }
        
        setConfiguraciones(config);
        setCambiosPendientes(true);
        
        toast.success('📤 Configuración importada', {
          description: 'Los cambios se aplicarán al guardar'
        });
      } catch (error) {
        toast.error('❌ Error al importar configuración', {
          description: 'El archivo no tiene un formato válido'
        });
      }
    };
    
    reader.readAsText(file);
  }, []);

  /**
   * Obtener configuración de un módulo específico
   */
  const obtenerConfigModulo = useCallback((modulo: Modulo) => {
    return configuraciones.find(c => c.modulo === modulo);
  }, [configuraciones]);

  /**
   * Verificar si un módulo debe enviar alerta
   */
  const debeEnviarAlerta = useCallback((
    modulo: Modulo,
    diasRestantes: number
  ): boolean => {
    const config = obtenerConfigModulo(modulo);
    if (!config || !config.habilitado) return false;
    
    const nivel = calcularNivelAlerta(diasRestantes, config.umbral);
    return nivel !== 'VERDE'; // Enviar alerta si no está en verde
  }, [obtenerConfigModulo]);

  /**
   * Obtener estadísticas
   */
  const obtenerEstadisticas = useCallback(() => {
    return {
      total: configuraciones.length,
      activos: configuraciones.filter(c => c.habilitado).length,
      inactivos: configuraciones.filter(c => !c.habilitado).length,
      conEscalamiento: configuraciones.filter(c => c.escalar).length,
      inmediatas: configuraciones.filter(c => c.frecuencia === 'INMEDIATA').length,
      diarias: configuraciones.filter(c => c.frecuencia === 'DIARIA').length,
      semanales: configuraciones.filter(c => c.frecuencia === 'SEMANAL').length,
      prioridadAlta: configuraciones.filter(c => c.prioridad === 'ALTA').length,
      prioridadMedia: configuraciones.filter(c => c.prioridad === 'MEDIA').length,
      prioridadBaja: configuraciones.filter(c => c.prioridad === 'BAJA').length,
    };
  }, [configuraciones]);

  return {
    // Estado
    configuraciones,
    cambiosPendientes,
    
    // Acciones
    actualizarUmbral,
    toggleCanal,
    toggleHabilitado,
    actualizarFrecuencia,
    toggleEscalamiento,
    actualizarTiempoEscalamiento,
    guardarCambios,
    restaurarDefecto,
    exportarConfiguracion,
    importarConfiguracion,
    
    // Utilidades
    obtenerConfigModulo,
    debeEnviarAlerta,
    obtenerEstadisticas,
  };
}
