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
import { SeccionPlantillasActasUnificada, type TipoActa, type PlantillaArchivo, type NuevoTipoActaData } from './SeccionPlantillasActasUnificada';
import { ModalNuevoTipoActa } from './ModalNuevoTipoActa';
import { ModalGestionarPlantillasActa } from './ModalGestionarPlantillasActa';
import { ModalConfirmacion } from './ModalConfirmacion';

// Función para resolver el nombre real del archivo de plantilla
export const resolverNombreArchivo = (url?: string, nombrePlantilla?: string): string => {
  if (url) {
    const raw = url.split(/[/\\]/).pop()?.split('?')[0] || '';
    if (raw) {
      const match = raw.match(/^plantilla-(?:oficio|acta|auto)-[^-]+-\d+-(.+)$/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return raw;
    }
  }
  if (nombrePlantilla) {
    return /\.(docx|doc|pdf|rtf)$/i.test(nombrePlantilla)
      ? nombrePlantilla
      : `${nombrePlantilla}.docx`;
  }
  return 'plantilla.docx';
};

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
  
  const tienePlantilla = Boolean(config.plantilla || config.nombre_plantilla);
  const nombreArchivo = resolverNombreArchivo(config.plantilla, config.nombre_plantilla);

  const plantillaData: PlantillaArchivo | null = tienePlantilla ? {
    id: `plt-${config.id}`,
    nombre: config.nombre_plantilla || nombreArchivo,
    nombreArchivo: nombreArchivo,
    descripcion: config.descripcion_plantilla || '',
    url: config.plantilla || '',
    tamano: 0,
    version: config.version_plantilla || '1.0',
    fechaCreacion: config.createdAt,
    fechaModificacion: config.updatedAt,
    activo: config.estado_plantilla !== 'inactivo'
  } : null;

  return {
    id: config.id,
    nombre: config.nombre,
    descripcion: config.descripcion || '',
    tipo,
    tipoBackend: config.tipo,
    codigo: config.codigo,
    plantilla: plantillaData,
    plantillas: plantillaData ? [plantillaData] : [],
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
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
  const [tipoActaAEliminar, setTipoActaAEliminar] = useState<TipoActa | null>(null);

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
      
      if (configs && Array.isArray(configs)) {
        setDatosDesdeBackend(true);
        if (configs.length > 0) {
          const tiposMapeados = configs.map(mapBackendToFrontend);
          setTiposActas(tiposMapeados);
          console.log('✅ [ConfiguracionPlantillasActas] Datos cargados desde BD:', tiposMapeados.length);
        } else {
          setTiposActas([]);
          console.log('⚠️ [ConfiguracionPlantillasActas] BD vacía, esperando registros');
        }
      } else {
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

  const guardarTipoActa = async (nuevoTipo: NuevoTipoActaData) => {
    try {
      if (tipoActaEdicion) {
        const targetId = tipoActaEdicion.id;
        const updateDto: UpdateActaConfigurationDto = {
          nombre: nuevoTipo.nombre,
          descripcion: nuevoTipo.descripcion,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          orden: nuevoTipo.orden
        };

        if (datosDesdeBackend && targetId && !targetId.startsWith('tipo-acta-')) {
          await updateConfiguration(targetId, updateDto);

          if (nuevoTipo.plantillaFile) {
            await disciplinaryService.uploadActaPlantilla(
              targetId,
              nuevoTipo.plantillaFile,
              nuevoTipo.nombre,
              nuevoTipo.descripcion,
              tipoActaEdicion.plantilla?.version || tipoActaEdicion.plantillas?.[0]?.version || '1.0',
              nuevoTipo.activo ? 'activo' : 'inactivo'
            );
          }
          await cargarConfiguracion();
          toast.success('Tipo de acta actualizado correctamente');
        } else {
          setTiposActas(tiposActas.map(t => 
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
                  plantillas: nuevoTipo.plantillaFile ? [{
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
                  }] : t.plantillas,
                  fechaModificacion: new Date().toISOString() 
                }
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
          const nuevo = await disciplinaryService.createActaConfiguration(nuevoDto);
          const createdId = nuevo?.id || (nuevo as any)?.data?.id;

          if (createdId && nuevoTipo.plantillaFile) {
            try {
              await disciplinaryService.uploadActaPlantilla(
                createdId,
                nuevoTipo.plantillaFile,
                nuevoTipo.nombre,
                nuevoTipo.descripcion,
                '1.0',
                nuevoTipo.activo ? 'activo' : 'inactivo'
              );
            } catch (errUpload) {
              console.error('Error subiendo plantilla tras crear acta:', errUpload);
              toast.error('Acta creada, pero falló la carga de la plantilla');
            }
          }
          await cargarConfiguracion();
          toast.success('Tipo de acta creado correctamente');
        } else {
          const nuevaPlantilla: PlantillaArchivo | null = nuevoTipo.plantillaFile ? {
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
          } : null;

          const tipoCompleto: TipoActa = {
            id: `tipo-acta-${Date.now()}`,
            ...nuevoTipo,
            plantilla: nuevaPlantilla,
            plantillas: nuevaPlantilla ? [nuevaPlantilla] : [],
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
    } catch (error) {
      console.error('Error en guardarTipoActa:', error);
      toast.error('Error al guardar el tipo de acta');
    }
  };

  const eliminarTipoActa = async (tipoId: string) => {
    const tipo = tiposActas.find(t => t.id === tipoId);
    if (tipo) {
      setTipoActaAEliminar(tipo);
      setMostrarModalConfirmacion(true);
    }
  };

  const confirmarEliminacionTipoActa = async () => {
    if (!tipoActaAEliminar) return;

    if (datosDesdeBackend && !tipoActaAEliminar.id.startsWith('tipo-acta-')) {
      try {
        await deleteConfiguration(tipoActaAEliminar.id);
        toast.success('Tipo de acta eliminado correctamente');
      } catch (err) {
        console.error('Error eliminando en backend:', err);
        toast.error('Error al eliminar en el servidor');
        return;
      }
    }
    setTiposActas(tiposActas.filter(t => t.id !== tipoActaAEliminar.id));
    setCambiosPendientes(true);
    setMostrarModalConfirmacion(false);
    setTipoActaAEliminar(null);
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
    
    if (datosDesdeBackend && tipoActaId && !tipoActaId.startsWith('tipo-acta-')) {
      if (plantilla) {
        if (plantilla.file) {
          try {
            await disciplinaryService.uploadActaPlantilla(
              tipoActaId,
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
        } else if (!(plantilla as any)?.yaSincronizado && !plantilla.url?.startsWith('blob:')) {
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
            console.error('❌ Error actualizando metadatos de plantilla:', error);
            toast.error('Error al actualizar la plantilla');
          }
        }
      }
      await cargarConfiguracion();
    } else {
      setTiposActas(tiposActas.map(t => 
        t.id === tipoActaId ? { ...t, plantilla: plantilla || null, plantillas } : t
      ));
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

      {/* Modal de confirmación para eliminar tipo de acta */}
      {mostrarModalConfirmacion && tipoActaAEliminar && (
        <ModalConfirmacion
          titulo="Eliminar Tipo de Acta"
          mensaje={`¿Está seguro de eliminar "${tipoActaAEliminar.nombre}"?`}
          detalle="Se eliminará el tipo de acta y todas sus plantillas asociadas. Esta acción no se puede deshacer."
          textoConfirmar="Eliminar"
          textoCancelar="Cancelar"
          onConfirmar={confirmarEliminacionTipoActa}
          onCancelar={() => {
            setMostrarModalConfirmacion(false);
            setTipoActaAEliminar(null);
          }}
          tipo="peligro"
        />
      )}
    </div>
  );
}
