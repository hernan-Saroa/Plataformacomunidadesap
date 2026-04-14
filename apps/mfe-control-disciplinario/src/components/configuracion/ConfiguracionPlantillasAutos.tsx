/**
 * CONFIGURACIÓN DE PLANTILLAS DE AUTOS
 * Componente modular standalone para gestionar plantillas de autos
 * Control Interno Disciplinario
 * 
 * DATOS CARGADOS DESDE LA BD (autos_configuration)
 */

import { useState, useEffect } from 'react';
import { Plus, AlertCircle, Save, RotateCcw, Edit2, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { SeccionPlantillasAutosUnificada, type TipoAuto } from './SeccionPlantillasAutosUnificada';
import { ModalNuevoTipoAuto, type NuevoTipoAutoData } from './ModalNuevoTipoAuto';
import { ModalGestionarPlantillas } from './ModalGestionarPlantillas';
import { disciplinaryService, AutoConfiguration } from '../../../../services/api/disciplinary.service';

// Tipos de autos por defecto (solo se usa si no hay datos en BD)
const TIPOS_AUTOS_DEFECTO: any[] = [
  {
    id: 'auto-apertura-indagacion',
    nombre: 'Auto de Apertura de Indagación',
    descripcion: 'Inicia la indagación preliminar para determinar si hay mérito para abrir investigación formal',
    etapa: 'INDAGACION',
    plantilla: null,
    activo: true,
    orden: 1,
    fechaCreacion: new Date().toISOString(),
    fechaModificacion: new Date().toISOString()
  }
];

// Etapas del proceso
const ETAPAS_PROCESO = [
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'INDAGACION_PREVIA', label: 'Indagación Previa' },
  { value: 'INDAGACION', label: 'Indagación' },
  { value: 'INVESTIGACION', label: 'Investigación' },
  { value: 'EVALUACION', label: 'Evaluación' },
  { value: 'JUZGAMIENTO', label: 'Juzgamiento' },
  { value: 'FALLO', label: 'Fallo' },
  { value: 'SEGUNDA_INSTANCIA', label: 'Segunda Instancia' },
];

// Mapea el tipoAccion del formulario al valor `tipo` que espera el backend
const mapTipoAccionToBackend = (tipoAccion: string, etapa: string): string => {
  switch (tipoAccion) {
    case 'APERTURA':
      if (etapa === 'INVESTIGACION') return 'AUTO_APERTURA_INVESTIGACION';
      if (etapa === 'INDAGACION' || etapa === 'INDAGACION_PREVIA') return 'AUTO_APERTURA_INDAGACION';
      return 'AUTO_APERTURA';
    case 'ARCHIVO':
      return 'AUTO_ARCHIVO';
    case 'PRORROGA':
      return 'AUTO_PRORROGA';
    case 'PLIEGO':
      return 'PLIEGO_CARGOS';
    default:
      return 'AUTO_NO_PREVISTO';
  }
};

export function ConfiguracionPlantillasAutos() {
  const [tiposAutos, setTiposAutos] = useState<any[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales
  const [mostrarModalTipoAuto, setMostrarModalTipoAuto] = useState(false);
  const [tipoAutoEdicion, setTipoAutoEdicion] = useState<TipoAuto | null>(null);
  const [tipoAutoGestionando, setTipoAutoGestionando] = useState<any>(null);
  const [mostrarModalGestionarPlantillas, setMostrarModalGestionarPlantillas] = useState(false);

  // Cargar datos al iniciar
  useEffect(() => {
    loadDatos();
  }, []);

  const loadDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar autos desde la BD
      const autosFromBD = await disciplinaryService.getAutosConfiguration();
      
      // Mapear autos de BD al formato del componente
      const tiposFromBD: any[] = autosFromBD.map(auto => {
        // Construir URL completa para la plantilla si existe
        const plantillaUrl = auto.plantilla 
          ? disciplinaryService.getFileUrl(auto.plantilla) 
          : '';
        
        return {
          id: auto.id,
          nombre: auto.nombre,
          descripcion: `Auto: ${auto.tipo}`,
          etapa: auto.stage || 'INDAGACION',
          plantilla: auto.plantilla || auto.nombre_plantilla ? {
            id: `plt-${auto.id}`,
            nombre: auto.nombre_plantilla || 'Plantilla configurada',
            nombreArchivo: 'plantilla.docx',
            descripcion: auto.descripcion_plantilla || 'Plantilla almacenada en BD',
            tipoArchivo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            url: plantillaUrl,
            tamano: 0,
            version: auto.version_plantilla || '1.0',
            fechaCreacion: auto.createdAt,
            activo: auto.estado_plantilla === 'activo'
          } : null,
          activo: auto.estado === 'activo',
          orden: auto.orden,
          fechaCreacion: auto.createdAt,
          fechaModificacion: auto.updatedAt,
          // Campos adicionales para la plantilla
          nombre_plantilla: auto.nombre_plantilla,
          descripcion_plantilla: auto.descripcion_plantilla,
          version_plantilla: auto.version_plantilla,
          estado_plantilla: auto.estado_plantilla
        };
      });
      
      setTiposAutos(tiposFromBD);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setTiposAutos(TIPOS_AUTOS_DEFECTO);
      toast.error('Error al cargar datos, usando configuración por defecto');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNuevoTipoAuto = () => {
    setTipoAutoEdicion(null);
    setMostrarModalTipoAuto(true);
  };

  const abrirModalEditarTipoAuto = (tipo: TipoAuto) => {
    setTipoAutoEdicion(tipo);
    setMostrarModalTipoAuto(true);
  };

  const guardarTipoAuto = async (nuevoTipo: NuevoTipoAutoData) => {
    // Si hay un tipo en edición, actualizar en BD
    if (tipoAutoEdicion) {
      try {
        const autoActual = tiposAutos.find(t => t.id === tipoAutoEdicion.id);
        if (autoActual && (autoActual.id.startsWith('tipo-auto-') || autoActual.id === 'auto-apertura-indagacion')) {
          // Es un tipo local
          setTiposAutos(tiposAutos.map(t =>
            t.id === tipoAutoEdicion.id
              ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
              : t
          ));
        } else {
          // Es un auto de la BD
          await disciplinaryService.updateAutosConfiguration(tipoAutoEdicion.id, {
            nombre: nuevoTipo.nombre,
            stage: nuevoTipo.etapa,
            estado: nuevoTipo.activo ? 'activo' : 'inactivo',
            orden: nuevoTipo.orden
          });
          // Si viene nueva plantilla, subirla
          if (nuevoTipo.plantillaFile) {
            await disciplinaryService.uploadAutoPlantilla(tipoAutoEdicion.id, nuevoTipo.plantillaFile);
          }
          await loadDatos();
        }
        toast.success('Tipo de auto actualizado correctamente');
      } catch (error) {
        console.error('Error actualizando:', error);
        toast.error('Error al actualizar');
      }
    } else {
      // Crear nuevo tipo
      try {
        const tipoBackend = mapTipoAccionToBackend(nuevoTipo.tipoAccion, nuevoTipo.etapa);
        const autoCreado = await disciplinaryService.createAutosConfiguration({
          tipo: tipoBackend,
          nombre: nuevoTipo.nombre,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          stage: nuevoTipo.etapa,
          orden: nuevoTipo.orden || 1
        });
        // Subir plantilla obligatoria
        if (nuevoTipo.plantillaFile) {
          await disciplinaryService.uploadAutoPlantilla(autoCreado.id, nuevoTipo.plantillaFile);
        }
        await loadDatos();
        toast.success('Tipo de auto creado correctamente');
      } catch (error) {
        console.error('Error creando:', error);
        toast.error('Error al crear el tipo de auto');
      }
    }

    setCambiosPendientes(true);
    setMostrarModalTipoAuto(false);
    setTipoAutoEdicion(null);
  };

  const eliminarTipoAuto = async (tipoId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este tipo de auto y todas sus plantillas?')) return;
    
    // Verificar si es un auto de la BD
    const auto = tiposAutos.find(t => t.id === tipoId);
    if (auto && !tipoId.startsWith('tipo-auto-')) {
      // Es un auto de la BD
      try {
        await disciplinaryService.deleteAutosConfiguration(tipoId);
        await loadDatos();
        toast.success('Auto eliminado correctamente');
      } catch (error) {
        console.error('Error eliminando:', error);
        toast.error('Error al eliminar');
      }
    } else {
      // Es local
      setTiposAutos(tiposAutos.filter(t => t.id !== tipoId));
      setCambiosPendientes(true);
      toast.success('Tipo de auto eliminado correctamente');
    }
  };

  const toggleActivoTipoAuto = async (tipoId: string, activo: boolean) => {
    // Verificar si es un auto de la BD
    const auto = tiposAutos.find(t => t.id === tipoId);
    if (auto && !tipoId.startsWith('tipo-auto-')) {
      // Es un auto de la BD
      try {
        await disciplinaryService.toggleAutosConfigurationEstado(tipoId);
        await loadDatos();
        toast.success(activo ? 'Auto activado' : 'Auto desactivado');
      } catch (error) {
        console.error('Error toggling:', error);
        toast.error('Error al cambiar estado');
      }
    } else {
      // Es local
      setTiposAutos(tiposAutos.map(t => 
        t.id === tipoId ? { ...t, activo } : t
      ));
      setCambiosPendientes(true);
      toast.success(activo ? 'Tipo de auto activado' : 'Tipo de auto desactivado');
    }
  };

  const abrirGestionPlantillas = (tipo: any) => {
    setTipoAutoGestionando(tipo);
    setMostrarModalGestionarPlantillas(true);
  };

  const actualizarPlantillasTipoAuto = async (tipoAutoId: string, plantillas: any) => {
    const plantilla = plantillas[0];
    
    // Verificar si es un auto de la BD
    const auto = tiposAutos.find(t => t.id === tipoAutoId);
    if (auto && !tipoAutoId.startsWith('tipo-auto-')) {
      // Es un auto de la BD - actualizar en backend
      try {
        await disciplinaryService.updateAutosConfiguration(tipoAutoId, {
          nombre: auto.nombre,
          stage: auto.etapa,
          estado: auto.activo ? 'activo' : 'inactivo',
          orden: auto.orden,
          // Guardar datos de la plantilla
          nombre_plantilla: plantilla?.nombre || null,
          descripcion_plantilla: plantilla?.descripcion || null,
          version_plantilla: plantilla?.version || '1.0',
          estado_plantilla: plantilla?.activo !== false ? 'activo' : 'inactivo'
        });
        await loadDatos();
        toast.success('Plantillas actualizadas correctamente');
      } catch (error) {
        console.error('Error actualizando plantillas en BD:', error);
        // Actualizar localmente si falla
        setTiposAutos(tiposAutos.map(t => 
          t.id === tipoAutoId 
            ? { ...t, plantilla, fechaModificacion: new Date().toISOString() } 
            : t
        ));
        toast.warning('Plantilla actualizada localmente');
      }
    } else {
      // Es local - solo actualizar
      setTiposAutos(tiposAutos.map(t => 
        t.id === tipoAutoId 
          ? { ...t, plantilla, fechaModificacion: new Date().toISOString() } 
          : t
      ));
    }
    setCambiosPendientes(true);
    setMostrarModalGestionarPlantillas(false);
    setTipoAutoGestionando(null);
    toast.success('Plantillas actualizadas');
  };

  const guardarConfiguraciones = () => {
    try {
      localStorage.setItem('disciplinario-tipos-autos', JSON.stringify(tiposAutos));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setTiposAutos(TIPOS_AUTOS_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <h3 className="text-lg font-bold text-gray-900">Tipos de Autos y Plantillas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tipos de autos y sus plantillas Word/PDF asociadas
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
              background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Componente de gestión unificada - recibe los datos de la BD */}
      <SeccionPlantillasAutosUnificada
        tiposAutos={tiposAutos}
        onAgregarTipo={abrirModalNuevoTipoAuto}
        onEditarTipo={abrirModalEditarTipoAuto}
        onEliminarTipo={eliminarTipoAuto}
        onToggleActivoTipo={toggleActivoTipoAuto}
        onGestionarPlantilla={abrirGestionPlantillas}
      />

      {/* Modal para crear/editar tipo de auto */}
      {mostrarModalTipoAuto && (
        <ModalNuevoTipoAuto
          isOpen={mostrarModalTipoAuto}
          tipoEdicion={tipoAutoEdicion}
          onGuardar={guardarTipoAuto}
          onClose={() => {
            setMostrarModalTipoAuto(false);
            setTipoAutoEdicion(null);
          }}
        />
      )}

      {/* Modal para gestionar plantillas */}
      {mostrarModalGestionarPlantillas && tipoAutoGestionando && (
        <ModalGestionarPlantillas
          isOpen={mostrarModalGestionarPlantillas}
          tipoAuto={tipoAutoGestionando}
          onActualizarPlantillas={actualizarPlantillasTipoAuto}
          onClose={() => {
            setMostrarModalGestionarPlantillas(false);
            setTipoAutoGestionando(null);
          }}
        />
      )}
    </div>
  );
}
