/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useConfiguracionKanban
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para cargar y gestionar la configuración del tablero Kanban desde el backend.
 * Incluye:
 * - Carga del tablero de auditorías (tipo='auditorias')
 * - CRUD de etapas del Kanban
 * - Reordenamiento de etapas
 * 
 * Sigue el patrón de useConfiguracionAuditorias para consistencia.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Servicio de tableros Kanban
import {
  tablerosKanbanService,
  TipoTablero,
  EstadoEtapa,
  type TableroKanban,
  type EtapaKanban as EtapaKanbanBackend,
  type CreateEtapaKanbanDto,
  type UpdateEtapaKanbanDto,
} from '../../../../services/api/tablerosKanbanService';

export { TipoTablero };

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS Y DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS FRONTEND (para el componente)
// ═══════════════════════════════════════════════════════════════════════════

export interface EtapaKanbanFrontend {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  color: string;
  limiteWIP: number;
  slaDias: number;
  slaHoras: number;
  alertaPrevia: number;
  notificacionesActivas: boolean;
  esInicial: boolean;
  esFinal: boolean;
  reglaTransicionAutomatica: boolean;
  condicionTransicion?: string;
  visible: boolean;
}

export interface ConfiguracionGeneralKanban {
  mostrarContadores: boolean;
  mostrarTiempos: boolean;
  alertasSLA: boolean;
  alertasWIP: boolean;
  transicionesAutomaticas: boolean;
  compactarVista: boolean;
  mostrarAvatar: boolean;
  permitirDragDrop: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE MAPEO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapear etapa del backend al formato del frontend
 */
function mapearEtapaBackendAFrontend(etapa: EtapaKanbanBackend): EtapaKanbanFrontend {
  // Convertir tiempoSLA (en días) a días y horas
  const slaDias = Math.floor(etapa.tiempoSLA);
  const slaHoras = Math.round((etapa.tiempoSLA - slaDias) * 24);

  return {
    id: etapa.id,
    nombre: etapa.nombre,
    descripcion: etapa.descripcion || '',
    orden: etapa.orden,
    color: etapa.color,
    limiteWIP: etapa.limiteWIP || 999,
    slaDias,
    slaHoras,
    alertaPrevia: etapa.diasAnticipacionAlerta,
    notificacionesActivas: etapa.notificarVencimiento,
    esInicial: etapa.estado === EstadoEtapa.INICIAL,
    esFinal: etapa.estado === EstadoEtapa.FINAL,
    reglaTransicionAutomatica: !etapa.permitirRetroceso,
    condicionTransicion: undefined, // El backend no tiene este campo aún
    visible: etapa.visible,
  };
}

/**
 * Mapear etapa del frontend al formato del backend para creación
 */
function mapearEtapaFrontendABackendCreate(etapa: EtapaKanbanFrontend): CreateEtapaKanbanDto {
  // Convertir días y horas a tiempoSLA decimal (redondeado a entero)
  const tiempoSLA = Math.round(etapa.slaDias + (etapa.slaHoras / 24));

  // Determinar el estado
  let estado: EstadoEtapa;
  if (etapa.esInicial) {
    estado = EstadoEtapa.INICIAL;
  } else if (etapa.esFinal) {
    estado = EstadoEtapa.FINAL;
  } else {
    estado = EstadoEtapa.INTERMEDIA;
  }

  return {
    nombre: etapa.nombre,
    descripcion: etapa.descripcion || undefined,
    orden: etapa.orden,
    color: etapa.color,
    tiempoSLA,
    limiteWIP: etapa.limiteWIP < 999 ? etapa.limiteWIP : null,
    visible: true,
    notificarVencimiento: etapa.notificacionesActivas,
    diasAnticipacionAlerta: etapa.alertaPrevia,
    estado,
    permitirRetroceso: !etapa.reglaTransicionAutomatica,
  };
}

/**
 * Mapear etapa del frontend al formato del backend para actualización
 */
function mapearEtapaFrontendABackendUpdate(etapa: Partial<EtapaKanbanFrontend>): UpdateEtapaKanbanDto {
  const dto: UpdateEtapaKanbanDto = {};

  if (etapa.nombre !== undefined) dto.nombre = etapa.nombre;
  if (etapa.descripcion !== undefined) dto.descripcion = etapa.descripcion || undefined;
  if (etapa.color !== undefined) dto.color = etapa.color;
  
  // Convertir días y horas a tiempoSLA decimal (redondeado a entero)
  if (etapa.slaDias !== undefined || etapa.slaHoras !== undefined) {
    dto.tiempoSLA = Math.round((etapa.slaDias || 0) + ((etapa.slaHoras || 0) / 24));
  }
  
  if (etapa.limiteWIP !== undefined) {
    dto.limiteWIP = etapa.limiteWIP < 999 ? etapa.limiteWIP : null;
  }
  
  if (etapa.notificacionesActivas !== undefined) {
    dto.notificarVencimiento = etapa.notificacionesActivas;
  }
  
  if (etapa.alertaPrevia !== undefined) {
    dto.diasAnticipacionAlerta = etapa.alertaPrevia;
  }
  
  // Determinar el estado
  if (etapa.esInicial !== undefined || etapa.esFinal !== undefined) {
    if (etapa.esInicial) {
      dto.estado = EstadoEtapa.INICIAL;
    } else if (etapa.esFinal) {
      dto.estado = EstadoEtapa.FINAL;
    } else {
      dto.estado = EstadoEtapa.INTERMEDIA;
    }
  }
  
  if (etapa.reglaTransicionAutomatica !== undefined) {
    dto.permitirRetroceso = !etapa.reglaTransicionAutomatica;
  }

  if (etapa.visible !== undefined) {
    dto.visible = etapa.visible;
  }

  return dto;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE DEL HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseConfiguracionKanbanResult {
  // Estado
  tableroId: string | null;
  etapas: EtapaKanbanFrontend[];
  configGeneral: ConfiguracionGeneralKanban;
  loading: boolean;
  error: string | null;

  // Acciones para Etapas
  crearEtapa: (etapa: EtapaKanbanFrontend) => Promise<EtapaKanbanFrontend | null>;
  actualizarEtapa: (id: string, etapa: Partial<EtapaKanbanFrontend>) => Promise<EtapaKanbanFrontend | null>;
  eliminarEtapa: (id: string) => Promise<boolean>;
  moverEtapa: (id: string, direccion: 'arriba' | 'abajo') => Promise<boolean>;
  reordenarEtapas: (etapasOrdenadas: string[]) => Promise<boolean>;

  // Acciones para Configuración General
  actualizarConfigGeneral: (config: Partial<ConfiguracionGeneralKanban>) => void;

  // Utilidades
  recargarDatos: () => Promise<void>;
}

// Configuración general por defecto (se guarda localmente por ahora)
const CONFIG_GENERAL_DEFAULT: ConfiguracionGeneralKanban = {
  mostrarContadores: true,
  mostrarTiempos: true,
  alertasSLA: true,
  alertasWIP: true,
  transicionesAutomaticas: true,
  compactarVista: false,
  mostrarAvatar: true,
  permitirDragDrop: true
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function useConfiguracionKanban(
  tipo: TipoTablero = TipoTablero.AUDITORIAS
): UseConfiguracionKanbanResult {
  // Estado
  const [tableroId, setTableroId] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<EtapaKanbanFrontend[]>([]);
  const [configGeneral, setConfigGeneral] = useState<ConfiguracionGeneralKanban>(CONFIG_GENERAL_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARGA INICIAL DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`📥 [useConfiguracionKanban] Cargando tablero tipo: ${tipo}...`);

      const tablero = await tablerosKanbanService.getByTipo(tipo);

      if (tablero) {
        const etapasBrutas = tablero.etapas || [];
        console.log(`✅ [useConfiguracionKanban] Tablero listo: ${tablero.id} con ${etapasBrutas.length} etapas`);
        
        setTableroId(tablero.id);
        
        // Mapear etapas del backend al formato frontend
        const etapasMapeadas = etapasBrutas
          .sort((a, b) => a.orden - b.orden)
          .map(mapearEtapaBackendAFrontend);
        
        setEtapas(etapasMapeadas);

        // Cargar configuración visual desde la BD o usar default
        if (tablero.configuracionVisual) {
          setConfigGeneral({ ...CONFIG_GENERAL_DEFAULT, ...tablero.configuracionVisual });
        }
      } else {
        setTableroId(null);
        setEtapas([]);
      }

    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ [useConfiguracionKanban] Error cargando datos:', mensaje);
      setError(mensaje);
      toast.error('Error cargando configuración del Kanban', { description: mensaje });
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERACIONES PARA ETAPAS
  // ═══════════════════════════════════════════════════════════════════════════

  const crearEtapa = useCallback(async (
    etapa: EtapaKanbanFrontend
  ): Promise<EtapaKanbanFrontend | null> => {
    if (!tableroId) {
      toast.error('No hay tablero configurado');
      return null;
    }

    try {
      const datosBackend = mapearEtapaFrontendABackendCreate(etapa);
      const nuevaEtapa = await tablerosKanbanService.createEtapa(tableroId, datosBackend);

      const etapaMapeada = mapearEtapaBackendAFrontend(nuevaEtapa);
      setEtapas(prev => [...prev, etapaMapeada].sort((a, b) => a.orden - b.orden));
      
      toast.success('✅ Etapa creada exitosamente');
      return etapaMapeada;
    } catch (err) {
      console.error('Error creando etapa:', err);
      toast.error('Error al crear etapa', {
        description: err instanceof Error ? err.message : 'Error desconocido'
      });
      return null;
    }
  }, [tableroId]);

  const actualizarEtapa = useCallback(async (
    id: string,
    datos: Partial<EtapaKanbanFrontend>
  ): Promise<EtapaKanbanFrontend | null> => {
    if (!tableroId) {
      toast.error('No hay tablero configurado');
      return null;
    }

    try {
      const datosBackend = mapearEtapaFrontendABackendUpdate(datos);
      const etapaActualizada = await tablerosKanbanService.updateEtapa(tableroId, id, datosBackend);

      const etapaMapeada = mapearEtapaBackendAFrontend(etapaActualizada);
      setEtapas(prev =>
        prev.map(e => e.id === id ? etapaMapeada : e).sort((a, b) => a.orden - b.orden)
      );
      
      toast.success('✅ Etapa actualizada exitosamente');
      return etapaMapeada;
    } catch (err) {
      console.error('Error actualizando etapa:', err);
      toast.error('Error al actualizar etapa', {
        description: err instanceof Error ? err.message : 'Error desconocido'
      });
      return null;
    }
  }, [tableroId]);

  const eliminarEtapa = useCallback(async (id: string): Promise<boolean> => {
    if (!tableroId) {
      toast.error('No hay tablero configurado');
      return false;
    }

    // Verificar que no es inicial ni final
    const etapa = etapas.find(e => e.id === id);
    if (etapa?.esInicial || etapa?.esFinal) {
      toast.error('No se puede eliminar una etapa inicial o final');
      return false;
    }

    try {
      await tablerosKanbanService.deleteEtapa(tableroId, id);
      setEtapas(prev => prev.filter(e => e.id !== id));
      
      toast.success('✅ Etapa eliminada exitosamente');
      return true;
    } catch (err) {
      console.error('Error eliminando etapa:', err);
      toast.error('Error al eliminar etapa', {
        description: err instanceof Error ? err.message : 'Error desconocido'
      });
      return false;
    }
  }, [tableroId, etapas]);

  const moverEtapa = useCallback(async (
    id: string,
    direccion: 'arriba' | 'abajo'
  ): Promise<boolean> => {
    const index = etapas.findIndex(e => e.id === id);
    if (index === -1) return false;

    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= etapas.length) return false;

    // Crear nueva lista con el orden cambiado
    const nuevasEtapas = [...etapas];
    [nuevasEtapas[index], nuevasEtapas[nuevoIndex]] = [nuevasEtapas[nuevoIndex], nuevasEtapas[index]];

    // Actualizar órdenes
    nuevasEtapas.forEach((etapa, idx) => {
      etapa.orden = idx + 1;
    });

    // Actualizar estado local inmediatamente
    setEtapas(nuevasEtapas);

    // Enviar al backend si tenemos tableroId
    if (tableroId) {
      try {
        const etapasIds = nuevasEtapas.map(e => e.id);
        await tablerosKanbanService.reordenarEtapas(tableroId, etapasIds);
        toast.success('✅ Orden actualizado');
      } catch (err) {
        console.error('Error reordenando etapas:', err);
        // Revertir en caso de error
        await cargarDatos();
        toast.error('Error al reordenar etapas');
        return false;
      }
    }

    return true;
  }, [etapas, tableroId, cargarDatos]);

  const reordenarEtapas = useCallback(async (etapasIds: string[]): Promise<boolean> => {
    if (!tableroId) {
      toast.error('No hay tablero configurado');
      return false;
    }

    try {
      await tablerosKanbanService.reordenarEtapas(tableroId, etapasIds);
      await cargarDatos(); // Recargar para sincronizar
      toast.success('✅ Etapas reordenadas');
      return true;
    } catch (err) {
      console.error('Error reordenando etapas:', err);
      toast.error('Error al reordenar etapas');
      return false;
    }
  }, [tableroId, cargarDatos]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN GENERAL (Guardada en BD)
  // ═══════════════════════════════════════════════════════════════════════════

  const actualizarConfigGeneral = useCallback(async (config: Partial<ConfiguracionGeneralKanban>) => {
    let nuevaConfig: ConfiguracionGeneralKanban = {} as ConfiguracionGeneralKanban;
    
    setConfigGeneral(prev => {
      nuevaConfig = { ...prev, ...config };
      return nuevaConfig;
    });

    if (tableroId) {
      try {
        await tablerosKanbanService.update(tableroId, {
          configuracionVisual: nuevaConfig
        });
      } catch (error) {
        console.error('Error guardando configuración visual en backend:', error);
        toast.error('Error al guardar las preferencias visuales en la base de datos');
      }
    }
  }, [tableroId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNAR RESULTADO
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estado
    tableroId,
    etapas,
    configGeneral,
    loading,
    error,

    // Acciones para Etapas
    crearEtapa,
    actualizarEtapa,
    eliminarEtapa,
    moverEtapa,
    reordenarEtapas,

    // Acciones para Configuración General
    actualizarConfigGeneral,

    // Utilidades
    recargarDatos: cargarDatos,
  };
}

export default useConfiguracionKanban;
