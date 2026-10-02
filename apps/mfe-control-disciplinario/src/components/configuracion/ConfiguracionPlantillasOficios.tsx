/**
 * CONFIGURACIÓN DE PLANTILLAS DE OFICIOS
 * Componente modular standalone para gestionar plantillas de oficios
 * Control Interno Disciplinario
 * ✅ CONECTADO AL BACKEND API - OficiosConfiguration
 * ✅ Sin datos quemados - Si no hay datos en BD, muestra estado vacío
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertCircle, Save, RotateCcw, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import disciplinaryService, { 
  OficioConfiguration, 
  CreateOficioConfigurationDto, 
  UpdateOficioConfigurationDto 
} from '../../../../services/api/disciplinary.service';
import { useOficiosConfiguration } from '../../../../hooks/useOficiosConfiguration';
import { SeccionPlantillasOficiosUnificada, type TipoOficio, type PlantillaArchivo, CATEGORIAS_OFICIOS, type CategoriaOficioId, type NuevoTipoOficioData } from './SeccionPlantillasOficiosUnificada';
import { ModalNuevoTipoOficio } from './ModalNuevoTipoOficio';
import { ModalGestionarPlantillasOficio } from './ModalGestionarPlantillasOficio';
import { ModalConfirmacion } from './ModalConfirmacion';

// Función para convertir OficioConfiguration del backend al formato TipoOficio del frontend
const mapBackendToFrontend = (config: OficioConfiguration): TipoOficio => {
  // Mapear el tipo del backend a la categoría del frontend
  // Backend: OFICIO_SOLICITUD_INFORMACION -> Frontend: TRAMITE
  // Backend: OFICIO_CITACION -> Frontend: CITACION
  // Backend: OFICIO_NOTIFICACION -> Frontend: NOTIFICACION
  const tipoLower = config.tipo?.toLowerCase() || '';
  let categoria: CategoriaOficioId = 'TRAMITE'; // Valor por defecto
  
  if (tipoLower.includes('notificacion')) {
    categoria = 'NOTIFICACION';
  } else if (tipoLower.includes('citacion')) {
    categoria = 'CITACION';
  } else if (tipoLower.includes('remision') || tipoLower.includes('remitir')) {
    categoria = 'REMISION';
  } else if (tipoLower.includes('requerimiento')) {
    categoria = 'REQUERIMIENTO';
  } else if (tipoLower.includes('comunicacion')) {
    categoria = 'COMUNICACION_EXTERNA';
  } else if (tipoLower.includes('tramite')) {
    categoria = 'TRAMITE';
  }
  
  return {
    id: config.id,
    nombre: config.nombre,
    descripcion: config.descripcion || '',
    categoria,
    plantilla: config.nombre_plantilla ? {
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
    } : null,
    activo: config.estado === 'activo',
    orden: config.orden || 0,
    fechaCreacion: config.createdAt,
    fechaModificacion: config.updatedAt
  };
};

// Función para convertir TipoOficio del frontend al formato DTO del backend
const mapFrontendToDto = (tipo: TipoOficio): CreateOficioConfigurationDto => {
  return {
    tipo: tipo.categoria,
    nombre: tipo.nombre,
    codigo: tipo.id.replace('tipo-oficio-', ''),
    descripcion: tipo.descripcion,
    estado: tipo.activo ? 'activo' : 'inactivo',
    plantilla: tipo.plantilla?.url,
    orden: tipo.orden
  };
};

export function ConfiguracionPlantillasOficios() {
  const [tiposOficios, setTiposOficios] = useState<TipoOficio[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [datosDesdeBackend, setDatosDesdeBackend] = useState(false);

  const [mostrarModalTipoOficio, setMostrarModalTipoOficio] = useState(false);
  const [tipoOficioEdicion, setTipoOficioEdicion] = useState<TipoOficio | null>(null);
  const [tipoOficioGestionando, setTipoOficioGestionando] = useState<TipoOficio | null>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] = useState(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [tipoOficioAEliminar, setTipoOficioAEliminar] = useState<TipoOficio | null>(null);

  // Hook para usar el API de oficios configuration
  const {
    configurations: configsFromBackend,
    loading: loadingFromHook,
    error: errorFromHook,
    fetchConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    toggleEstado,
    uploadPlantilla
  } = useOficiosConfiguration();

  // Cargar datos del backend al iniciar
  const cargarConfiguracion = useCallback(async () => {
    try {
      setCargandoDatos(true);
      console.log('🔵 [ConfiguracionPlantillasOficios] Cargando configuraciones del backend...');
      
      const configs = await disciplinaryService.getOficiosConfiguration();
      console.log('🔵 [ConfiguracionPlantillasOficios] Configuraciones recibidas:', configs);
      
      if (configs && Array.isArray(configs)) {
        setDatosDesdeBackend(true);
        if (configs.length > 0) {
          const tiposMapeados = configs.map(mapBackendToFrontend);
          setTiposOficios(tiposMapeados);
          console.log('✅ [ConfiguracionPlantillasOficios] Datos cargados desde BD:', tiposMapeados.length);
        } else {
          setTiposOficios([]);
          console.log('⚠️ [ConfiguracionPlantillasOficios] BD vacía, esperando registros');
        }
      } else {
        setTiposOficios([]);
        setDatosDesdeBackend(false);
      }
    } catch (error) {
      console.error('❌ [ConfiguracionPlantillasOficios] Error cargando configuración:', error);
      setTiposOficios([]);
      setDatosDesdeBackend(false);
      toast.error('Error al cargar configuración de oficios', {
        description: 'No se pudieron cargar los datos del servidor'
      });
    } finally {
      setLoading(false);
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  const abrirModalNuevoTipoOficio = () => {
    setTipoOficioEdicion(null);
    setMostrarModalTipoOficio(true);
  };

  const abrirModalEditarTipoOficio = (tipo: TipoOficio) => {
    setTipoOficioEdicion(tipo);
    setMostrarModalTipoOficio(true);
  };

  const guardarTipoOficio = async (nuevoTipo: NuevoTipoOficioData) => {
    try {
      if (tipoOficioEdicion) {
        const targetId = tipoOficioEdicion.id;
        const updateDto: UpdateOficioConfigurationDto = {
          nombre: nuevoTipo.nombre,
          tipo: nuevoTipo.categoria,
          descripcion: nuevoTipo.descripcion,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          orden: nuevoTipo.orden
        };

        if (datosDesdeBackend && targetId && !targetId.startsWith('tipo-oficio-')) {
          await updateConfiguration(targetId, updateDto);

          if (nuevoTipo.plantillaFile) {
            await disciplinaryService.uploadOficioPlantilla(
              targetId,
              nuevoTipo.plantillaFile,
              nuevoTipo.nombre,
              nuevoTipo.descripcion,
              tipoOficioEdicion.plantilla?.version || '1.0',
              nuevoTipo.activo ? 'activo' : 'inactivo'
            );
          }
          await cargarConfiguracion();
          toast.success('Tipo de oficio actualizado correctamente');
        } else {
          setTiposOficios(tiposOficios.map(t => 
            t.id === targetId 
              ? { 
                  ...t, 
                  ...nuevoTipo, 
                  plantilla: nuevoTipo.plantillaFile ? {
                    id: t.plantilla?.id || `plantilla-${Date.now()}`,
                    nombre: nuevoTipo.nombre,
                    nombreArchivo: nuevoTipo.plantillaFile.name,
                    descripcion: nuevoTipo.descripcion,
                    url: URL.createObjectURL(nuevoTipo.plantillaFile),
                    tamano: nuevoTipo.plantillaFile.size,
                    version: t.plantilla?.version || '1.0',
                    fechaCreacion: t.plantilla?.fechaCreacion || new Date().toISOString(),
                    fechaModificacion: new Date().toISOString(),
                    activo: true,
                    file: nuevoTipo.plantillaFile
                  } : t.plantilla,
                  fechaModificacion: new Date().toISOString() 
                }
              : t
          ));
          toast.success('Tipo de oficio actualizado correctamente');
        }
      } else {
        const nuevoDto: CreateOficioConfigurationDto = {
          nombre: nuevoTipo.nombre,
          tipo: nuevoTipo.categoria,
          codigo: `OFIC-${Date.now()}`,
          descripcion: nuevoTipo.descripcion,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          orden: nuevoTipo.orden || tiposOficios.length + 1
        };

        if (datosDesdeBackend) {
          const nuevo = await disciplinaryService.createOficioConfiguration(nuevoDto);
          const createdId = nuevo?.id || (nuevo as any)?.data?.id;

          if (createdId && nuevoTipo.plantillaFile) {
            try {
              await disciplinaryService.uploadOficioPlantilla(
                createdId,
                nuevoTipo.plantillaFile,
                nuevoTipo.nombre,
                nuevoTipo.descripcion,
                '1.0',
                nuevoTipo.activo ? 'activo' : 'inactivo'
              );
            } catch (errUpload) {
              console.error('Error subiendo plantilla tras crear oficio:', errUpload);
              toast.error('Oficio creado, pero falló la carga de la plantilla');
            }
          }
          await cargarConfiguracion();
          toast.success('Tipo de oficio creado correctamente');
        } else {
          const tipoCompleto: TipoOficio = {
            id: `tipo-oficio-${Date.now()}`,
            ...nuevoTipo,
            plantilla: nuevoTipo.plantillaFile ? {
              id: `plantilla-${Date.now()}`,
              nombre: nuevoTipo.nombre,
              nombreArchivo: nuevoTipo.plantillaFile.name,
              descripcion: nuevoTipo.descripcion,
              url: URL.createObjectURL(nuevoTipo.plantillaFile),
              tamano: nuevoTipo.plantillaFile.size,
              version: '1.0',
              fechaCreacion: new Date().toISOString(),
              fechaModificacion: new Date().toISOString(),
              activo: true,
              file: nuevoTipo.plantillaFile
            } : null,
            fechaCreacion: new Date().toISOString(),
            fechaModificacion: new Date().toISOString()
          };
          setTiposOficios([...tiposOficios, tipoCompleto]);
          toast.success('Tipo de oficio creado correctamente');
        }
      }
      setCambiosPendientes(true);
      setMostrarModalTipoOficio(false);
      setTipoOficioEdicion(null);
    } catch (error) {
      console.error('Error en guardarTipoOficio:', error);
      toast.error('Error al guardar el tipo de oficio');
    }
  };

  const eliminarTipoOficio = async (tipoId: string) => {
    const tipo = tiposOficios.find(t => t.id === tipoId);
    if (tipo) {
      setTipoOficioAEliminar(tipo);
      setMostrarModalConfirmacion(true);
    }
  };

  const confirmarEliminacionTipoOficio = async () => {
    if (!tipoOficioAEliminar) return;

    if (datosDesdeBackend && !tipoOficioAEliminar.id.startsWith('tipo-oficio-')) {
      try {
        await deleteConfiguration(tipoOficioAEliminar.id);
        toast.success('Tipo de oficio eliminado correctamente');
      } catch (err) {
        console.error('Error eliminando en backend:', err);
        toast.error('Error al eliminar en el servidor');
        return;
      }
    }
    setTiposOficios(tiposOficios.filter(t => t.id !== tipoOficioAEliminar.id));
    setCambiosPendientes(true);
    setMostrarModalConfirmacion(false);
    setTipoOficioAEliminar(null);
  };

  const toggleActivoTipoOficio = async (tipoId: string, activo: boolean) => {
    if (datosDesdeBackend && !tipoId.startsWith('tipo-oficio-')) {
      try {
        await toggleEstado(tipoId);
        toast.success(activo ? 'Tipo de oficio activado' : 'Tipo de oficio desactivado');
      } catch (err) {
        console.error('Error toggling estado:', err);
        toast.error('Error al cambiar estado');
      }
    }
    setTiposOficios(tiposOficios.map(t => 
      t.id === tipoId ? { ...t, activo } : t
    ));
    setCambiosPendientes(true);
  };

  const abrirGestionPlantillas = (tipo: TipoOficio) => {
    setTipoOficioGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoOficio = async (tipoOficioId: string, plantillas: PlantillaArchivo[]) => {
    const plantilla = plantillas[0];
    
    if (datosDesdeBackend && tipoOficioId && !tipoOficioId.startsWith('tipo-oficio-')) {
      if (plantilla) {
        if (plantilla.file) {
          try {
            await disciplinaryService.uploadOficioPlantilla(
              tipoOficioId,
              plantilla.file,
              plantilla.nombre,
              plantilla.descripcion,
              plantilla.version,
              plantilla.activo ? 'activo' : 'inactivo'
            );
            toast.success('Plantilla actualizada correctamente');
          } catch (error) {
            console.error('❌ Error subiendo plantilla:', error);
            toast.error('Error al subir la plantilla');
          }
        } else if (!plantilla.url?.startsWith('blob:')) {
          try {
            const updateDto: UpdateOficioConfigurationDto = {
              nombre_plantilla: plantilla.nombre,
              descripcion_plantilla: plantilla.descripcion,
              version_plantilla: plantilla.version,
              estado_plantilla: plantilla.activo ? 'activo' : 'inactivo'
            };
            await updateConfiguration(tipoOficioId, updateDto);
            toast.success('Plantilla actualizada correctamente');
          } catch (error) {
            console.error('❌ Error actualizando metadatos de plantilla:', error);
            toast.error('Error al actualizar la plantilla');
          }
        }
      }
      await cargarConfiguracion();
    } else {
      setTiposOficios(tiposOficios.map(t => 
        t.id === tipoOficioId ? { ...t, plantilla: plantilla || null } : t
      ));
    }
    
    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoOficioGestionando(null);
  };

  const guardarConfiguraciones = async () => {
    console.log('🔵 Guardando configuración de plantillas de oficios...');
    console.log('🔵 Total de tipos de oficios a guardar:', tiposOficios.length);

    try {
      // 1. Cargar configuración actual para no sobrescribir otras secciones
      const currentConfig = await disciplinaryService.getGlobalConfig();
      console.log('🔵 Configuración actual del backend:', currentConfig);

      // 2. Preparar documentTemplates con los tipos de oficios
      const documentTemplates = {
        ...currentConfig?.documentTemplates,
        oficios: tiposOficios
      };

      console.log('🔵 documentTemplates preparado:', documentTemplates);

      // 3. Mantener las configuraciones existentes de otras secciones
      const globalPayload = {
        roleCapacities: currentConfig?.roleCapacities || {},
        notificationSettings: currentConfig?.notificationSettings || {},
        alertSettings: currentConfig?.alertSettings || {},
        securitySettings: currentConfig?.securitySettings || { auditEnabled: true, digitalSignature: true, backupEnabled: true },
        documentTemplates
      };

      console.log('🔵 Payload COMPLETO para backend:', globalPayload);

      await disciplinaryService.updateGlobalConfig(globalPayload);

      console.log('✅ Configuración guardada en el backend');
      setCambiosPendientes(false);
      toast.success('Configuración guardada exitosamente', {
        description: 'Los cambios se han guardado en el servidor'
      });
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      toast.error('Error al guardar configuración', {
        description: 'No se pudieron guardar los cambios en el servidor'
      });
    }
  };

  const restablecerDefecto = () => {
    // Ya no usamos datos quemados, vaciamos la lista
    if (window.confirm('¿Está seguro de limpiar la configuración?')) {
      setTiposOficios([]);
      setCambiosPendientes(true);
      toast.success('Configuración limpiada');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <h3 className="text-lg font-bold text-gray-900">Tipos de Oficios y Plantillas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tipos de oficios y sus plantillas Word/PDF asociadas
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
              background: cambiosPendientes ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Componente de gestión unificada */}
      <SeccionPlantillasOficiosUnificada
        tiposOficios={tiposOficios}
        onAgregarTipo={abrirModalNuevoTipoOficio}
        onEditarTipo={abrirModalEditarTipoOficio}
        onEliminarTipo={eliminarTipoOficio}
        onToggleActivoTipo={toggleActivoTipoOficio}
        onGestionarPlantilla={abrirGestionPlantillas}
      />

      {/* Modal para crear/editar tipo de oficio */}
      {mostrarModalTipoOficio && (
        <ModalNuevoTipoOficio
          tipoOficioEdicion={tipoOficioEdicion}
          onGuardar={guardarTipoOficio}
          onCerrar={() => {
            setMostrarModalTipoOficio(false);
            setTipoOficioEdicion(null);
          }}
        />
      )}

      {/* Modal para gestionar plantillas */}
      {mostrarModalGestionarPlantillas && tipoOficioGestionando && (
        <ModalGestionarPlantillasOficio
          tipoOficio={tipoOficioGestionando}
          onGuardar={(plantillas) => actualizarPlantillasTipoOficio(tipoOficioGestionando.id, plantillas)}
          onCerrar={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoOficioGestionando(null);
          }}
        />
      )}

      {/* Modal de confirmación para eliminar tipo de oficio */}
      {mostrarModalConfirmacion && tipoOficioAEliminar && (
        <ModalConfirmacion
          titulo="Eliminar Tipo de Oficio"
          mensaje={`¿Está seguro de eliminar "${tipoOficioAEliminar.nombre}"?`}
          detalle="Se eliminará el tipo de oficio y todas sus plantillas asociadas. Esta acción no se puede deshacer."
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          onConfirmar={confirmarEliminacionTipoOficio}
          onCancelar={() => {
            setMostrarModalConfirmacion(false);
            setTipoOficioAEliminar(null);
          }}
          tipo="peligro"
        />
      )}
    </div>
  );
}