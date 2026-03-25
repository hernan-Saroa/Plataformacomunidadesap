/**
 * CONFIGURACIÓN DE PLANTILLAS DE ACTAS
 * Componente modular standalone para gestionar plantillas de actas
 * Control Interno Disciplinario
 * ✅ CONECTADO AL BACKEND API - ActasConfiguration
 * ✅ Sin datos quemados - Si no hay datos en BD, muestra estado vacío
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import disciplinaryService, { 
  ActaConfiguration, 
  CreateActaConfigurationDto, 
  UpdateActaConfigurationDto 
} from '../../../../services/api/disciplinary.service';
import { useActasConfiguration } from '../../../../hooks/useActasConfiguration';
import { SeccionPlantillasActasUnificada, type TipoActa, type PlantillaArchivo } from './SeccionPlantillasActasUnificada';
import { ModalNuevoTipoActa } from './ModalNuevoTipoActa';
import { ModalGestionarPlantillasActa } from './ModalGestionarPlantillasActa';

// Función para convertir ActaConfiguration del backend al formato TipoActa del frontend
const mapBackendToFrontend = (config: ActaConfiguration): TipoActa => {
  // Mapear el tipo del backend al tipo del frontend
  const tipoLower = config.tipo?.toLowerCase() || '';
  let tipo: TipoActa['tipo'] = 'INICIO';
  
  if (tipoLower.includes('indagacion') || tipoLower.includes('inicio')) {
    tipo = 'INICIO';
  } else if (tipoLower.includes('descargo')) {
    tipo = 'DESCARGOS';
  } else if (tipoLower.includes('version')) {
    tipo = 'VERSION';
  } else if (tipoLower.includes('prueba') || tipoLower.includes('testimonial')) {
    tipo = 'PRUEBAS';
  } else if (tipoLower.includes('audiencia')) {
    tipo = 'AUDIENCIA';
  } else if (tipoLower.includes('cierre')) {
    tipo = 'CIERRE';
  }
  
  return {
    id: config.id,
    nombre: config.nombre,
    descripcion: config.descripcion || '',
    tipo,
    plantillas: config.nombre_plantilla ? [{
      id: config.id,
      nombre: config.nombre_plantilla,
      nombreArchivo: config.nombre_plantilla,
      descripcion: config.descripcion_plantilla || '',
      url: config.plantilla || '',
      tamano: 0,
      version: config.version_plantilla || '1.0',
      fechaCreacion: config.createdAt,
      fechaModificacion: config.updatedAt,
      activo: config.estado_plantilla !== 'inactivo'
    }] : [],
    activo: config.estado === 'activo',
    orden: config.orden || 0,
    fechaCreacion: config.createdAt,
    fechaModificacion: config.updatedAt
  };
};

export function ConfiguracionPlantillasActas() {
  const [tiposActas, setTiposActas] = useState<TipoActa[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datosDesdeBackend, setDatosDesdeBackend] = useState(false);
  
  const [mostrarModalTipoActa, setMostrarModalTipoActa] = useState(false);
  const [tipoActaEdicion, setTipoActaEdicion] = useState<TipoActa | null>(null);
  const [tipoActaGestionando, setTipoActaGestionando] = useState<TipoActa | null>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] = useState(false);

  // Hook para usar el API de actas configuration
  const {
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    toggleEstado,
    uploadPlantilla
  } = useActasConfiguration();

  // Cargar datos del backend al iniciar
  const cargarConfiguracion = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔵 [ConfiguracionPlantillasActas] Cargando configuraciones del backend...');
      
      const configs = await disciplinaryService.getActasConfiguration();
      
      console.log('🔵 [ConfiguracionPlantillasActas] Configuraciones recibidas:', configs);
      
      if (configs && configs.length > 0) {
        const tiposMapeados = configs.map(mapBackendToFrontend);
        setTiposActas(tiposMapeados);
        setDatosDesdeBackend(true);
        console.log('✅ [ConfiguracionPlantillasActas] Datos cargados desde BD:', tiposMapeados.length);
      } else {
        console.log('⚠️ [ConfiguracionPlantillasActas] No hay datos en BD, mostrando estado vacío');
        setTiposActas([]);
        setDatosDesdeBackend(false);
      }
    } catch (error) {
      console.error('❌ [ConfiguracionPlantillasActas] Error cargando configuración:', error);
      setTiposActas([]);
      setDatosDesdeBackend(false);
      toast.error('Error al cargar configuración de actas', {
        description: 'No se pudieron cargar los datos del servidor'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  const abrirModalNuevoTipoActa = () => {
    setTipoActaEdicion(null);
    setMostrarModalTipoActa(true);
  };

  const abrirModalEditarTipoActa = (tipo: TipoActa) => {
    setTipoActaEdicion(tipo);
    setMostrarModalTipoActa(true);
  };

  const guardarTipoActa = (nuevoTipo: Omit<TipoActa, 'id' | 'plantillas' | 'fechaCreacion' | 'fechaModificacion'>) => {
    if (tipoActaEdicion) {
      if (datosDesdeBackend && tipoActaEdicion.id && !tipoActaEdicion.id.startsWith('tipo-acta-')) {
        const updateDto: UpdateActaConfigurationDto = {
          nombre: nuevoTipo.nombre,
          tipo: nuevoTipo.tipo,
          descripcion: nuevoTipo.descripcion,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          orden: nuevoTipo.orden
        };
        
        updateConfiguration(tipoActaEdicion.id, updateDto)
          .then(() => {
            setTiposActas(tiposActas.map(t => 
              t.id === tipoActaEdicion.id 
                ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
                : t
            ));
            toast.success('Tipo de acta actualizado correctamente');
          })
          .catch((err) => {
            console.error('Error actualizando en backend:', err);
            toast.error('Error al actualizar en el servidor');
          });
      } else {
        setTiposActas(tiposActas.map(t => 
          t.id === tipoActaEdicion.id 
            ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
            : t
        ));
        toast.success('Tipo de acta actualizado correctamente');
      }
    } else {
      const nuevoDto: CreateActaConfigurationDto = {
        nombre: nuevoTipo.nombre,
        tipo: nuevoTipo.tipo,
        codigo: `ACTA-${Date.now()}`,
        descripcion: nuevoTipo.descripcion,
        estado: nuevoTipo.activo ? 'activo' : 'inactivo',
        orden: nuevoTipo.orden || tiposActas.length + 1
      };

      if (datosDesdeBackend) {
        createConfiguration(nuevoDto)
          .then((nuevo) => {
            const tipoCompleto: TipoActa = mapBackendToFrontend(nuevo);
            setTiposActas([...tiposActas, tipoCompleto]);
            toast.success('Tipo de acta creado correctamente');
          })
          .catch((err) => {
            console.error('Error creando en backend:', err);
            toast.error('Error al crear en el servidor');
          });
      } else {
        const tipoCompleto: TipoActa = {
          id: `tipo-acta-${Date.now()}`,
          ...nuevoTipo,
          plantillas: [],
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString()
        };
        setTiposActas([...tiposActas, tipoCompleto]);
        toast.success('Tipo de acta creado correctamente');
      }
    }
    
    setCambiosPendientes(true);
    setMostrarModalTipoActa(false);
    setTipoActaEdicion(null);
  };

  const eliminarTipoActa = async (tipoId: string) => {
    if (window.confirm('¿Está seguro de eliminar este tipo de acta y todas sus plantillas?')) {
      if (datosDesdeBackend && !tipoId.startsWith('tipo-acta-')) {
        try {
          await deleteConfiguration(tipoId);
          toast.success('Tipo de acta eliminado correctamente');
        } catch (err) {
          console.error('Error eliminando en backend:', err);
          toast.error('Error al eliminar en el servidor');
        }
      }
      setTiposActas(tiposActas.filter(t => t.id !== tipoId));
      setCambiosPendientes(true);
    }
  };

  const toggleActivoTipoActa = async (tipoId: string, activo: boolean) => {
    if (datosDesdeBackend && !tipoId.startsWith('tipo-acta-')) {
      try {
        await toggleEstado(tipoId);
        toast.success(activo ? 'Tipo de acta activado' : 'Tipo de acta desactivado');
      } catch (err) {
        console.error('Error toggling estado:', err);
        toast.error('Error al cambiar estado');
      }
    }
    setTiposActas(tiposActas.map(t => 
      t.id === tipoId ? { ...t, activo } : t
    ));
    setCambiosPendientes(true);
  };

  const abrirGestionPlantillas = (tipo: TipoActa) => {
    setTipoActaGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoActa = async (tipoActaId: string, plantillas: PlantillaArchivo[]) => {
    const plantilla = plantillas[0];
    const esArchivoNuevo = plantilla?.url?.startsWith('blob:') || false;
    
    if (datosDesdeBackend && plantilla) {
      if (esArchivoNuevo) {
        try {
          const response = await fetch(plantilla.url);
          const blob = await response.blob();
          const file = new globalThis.File([blob], plantilla.nombreArchivo, { 
            type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
          });
          
          await uploadPlantilla(
            tipoActaId,
            file,
            plantilla.nombre,
            plantilla.descripcion,
            plantilla.version,
            plantilla.activo ? 'activo' : 'inactivo'
          );
          toast.success('Plantilla actualizada correctamente');
        } catch (error) {
          console.error('Error subiendo plantilla:', error);
          toast.error('Error al subir la plantilla');
        }
      } else {
        try {
          const updateDto: UpdateActaConfigurationDto = {
            nombre_plantilla: plantilla.nombre,
            descripcion_plantilla: plantilla.descripcion,
            version_plantilla: plantilla.version,
            estado_plantilla: plantilla.activo ? 'activo' : 'inactivo'
          };
          
          await updateConfiguration(tipoActaId, updateDto);
          toast.success('Plantilla actualizada correctamente');
        } catch (error) {
          console.error('Error actualizando plantilla:', error);
          toast.error('Error al actualizar la plantilla');
        }
      }
    }
    
    try {
      const configs = await disciplinaryService.getActasConfiguration();
      if (configs && configs.length > 0) {
        const tiposMapeados = configs.map(mapBackendToFrontend);
        setTiposActas(tiposMapeados);
      }
    } catch (error) {
      console.error('Error recargando configuración:', error);
    }
    
    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoActaGestionando(null);
  };

  const guardarConfiguraciones = async () => {
    try {
      const currentConfig = await disciplinaryService.getGlobalConfig();
      const documentTemplates = {
        ...currentConfig?.documentTemplates,
        actas: tiposActas
      };

      const globalPayload = {
        roleCapacities: currentConfig?.roleCapacities || {},
        notificationSettings: currentConfig?.notificationSettings || {},
        alertSettings: currentConfig?.alertSettings || {},
        securitySettings: currentConfig?.securitySettings || { auditEnabled: true, digitalSignature: true, backupEnabled: true },
        documentTemplates
      };

      await disciplinaryService.updateGlobalConfig(globalPayload);
      setCambiosPendientes(false);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar configuración');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de limpiar la configuración?')) {
      setTiposActas([]);
      setCambiosPendientes(true);
      toast.success('Configuración limpiada');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tipos de Actas y Plantillas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tipos de actas procesales y sus plantillas Word/PDF asociadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin guardar
            </span>
          )}
          <button
            onClick={restablecerDefecto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: cambiosPendientes ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Componente de gestión unificada */}
      <SeccionPlantillasActasUnificada
        tiposActas={tiposActas}
        onAgregarTipo={abrirModalNuevoTipoActa}
        onEditarTipo={abrirModalEditarTipoActa}
        onEliminarTipo={eliminarTipoActa}
        onToggleActivoTipo={toggleActivoTipoActa}
        onGestionarPlantillas={abrirGestionPlantillas}
      />

      {/* Modal para crear/editar tipo de acta */}
      {mostrarModalTipoActa && (
        <ModalNuevoTipoActa
          tipoActaEdicion={tipoActaEdicion}
          onGuardar={guardarTipoActa}
          onCerrar={() => {
            setMostrarModalTipoActa(false);
            setTipoActaEdicion(null);
          }}
        />
      )}

      {/* Modal para gestionar plantillas */}
      {mostrarModalGestionarPlantillas && tipoActaGestionando && (
        <ModalGestionarPlantillasActa
          tipoActa={tipoActaGestionando}
          onGuardar={(plantillas) => actualizarPlantillasTipoActa(tipoActaGestionando.id, plantillas)}
          onCerrar={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoActaGestionando(null);
          }}
        />
      )}
    </div>
  );
}
