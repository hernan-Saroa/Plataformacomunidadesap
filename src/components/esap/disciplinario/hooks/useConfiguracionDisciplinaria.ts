/**
 * Hook personalizado para acceder a las configuraciones del Control Interno Disciplinario
 * Permite leer los tipos de oficios, plantillas de actas y otras configuraciones desde localStorage
 */

import { useState, useEffect } from 'react';
import type { TipoOficio, PlantillaActa, EntidadRemision, TipoCarpeta } from '../ModuloConfiguracionRelacionado';

interface ConfiguracionDisciplinaria {
  tiposOficio: TipoOficio[];
  plantillasActa: PlantillaActa[];
  entidadesRemision: EntidadRemision[];
  tiposCarpeta: TipoCarpeta[];
}

export function useConfiguracionDisciplinaria() {
  const [configuracion, setConfiguracion] = useState<ConfiguracionDisciplinaria>({
    tiposOficio: [],
    plantillasActa: [],
    entidadesRemision: [],
    tiposCarpeta: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const configString = localStorage.getItem('disciplinario-configuracion');
      if (configString) {
        const config = JSON.parse(configString);
        setConfiguracion({
          tiposOficio: config.tiposOficio || [],
          plantillasActa: config.plantillasActa || [],
          entidadesRemision: config.entidadesRemision || [],
          tiposCarpeta: config.tiposCarpeta || []
        });
      }
    } catch (error) {
      console.error('Error al cargar configuración disciplinaria:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Funciones de utilidad
  const getTiposOficioActivos = () => {
    return configuracion.tiposOficio.filter(t => t.activo);
  };

  const getPlantillasActaActivas = () => {
    return configuracion.plantillasActa.filter(p => p.activo);
  };

  const getPlantillasPorTipo = (tipo: string) => {
    return configuracion.plantillasActa.filter(p => p.activo && p.tipo === tipo);
  };

  const getEntidadesRemisionActivas = () => {
    return configuracion.entidadesRemision.filter(e => e.activo);
  };

  const getTiposCarpetaActivos = () => {
    return configuracion.tiposCarpeta.filter(t => t.activo).sort((a, b) => a.orden - b.orden);
  };

  return {
    ...configuracion,
    loading,
    getTiposOficioActivos,
    getPlantillasActaActivas,
    getPlantillasPorTipo,
    getEntidadesRemisionActivas,
    getTiposCarpetaActivos
  };
}
