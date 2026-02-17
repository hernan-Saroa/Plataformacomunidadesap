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
import { ModalNuevoTipoAuto } from './ModalNuevoTipoAuto';
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
      const tiposFromBD: any[] = autosFromBD.map(auto => ({
        id: auto.id,
        nombre: auto.nombre,
        descripcion: `Auto: ${auto.tipo}`,
        etapa: auto.stage || 'INDAGACION',
        plantilla: auto.plantilla ? {
          id: `plt-${auto.id}`,
          nombre: 'Plantilla configurada',
          nombreArchivo: 'plantilla.docx',
          descripcion: 'Plantilla almacenada en BD',
          tipoArchivo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          url: auto.plantilla,
          version: '1.0',
          fechaCreacion: auto.createdAt,
          activo: true
        } : null,
        activo: auto.estado === 'activo',
        orden: auto.orden,
        fechaCreacion: auto.createdAt,
        fechaModificacion: auto.updatedAt
      }));
      
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

  const guardarTipoAuto = async (nuevoTipo: any) => {
    // Si hay un tipo en edición, actualizar en BD
    if (tipoAutoEdicion) {
      try {
        const autoActual = tiposAutos.find(t => t.id === tipoAutoEdicion.id);
        if (autoActual && autoActual.id.startsWith('auto-')) {
          // Es un tipo local, guardar en localStorage
          setTiposAutos(tiposAutos.map(t => 
            t.id === tipoAutoEdicion.id 
              ? { ...t, ...nuevoTipo, fechaModificacion: new Date().toISOString() }
              : t
          ));
        } else {
          // Es un auto de la BD, actualizar en BD
          await disciplinaryService.updateAutosConfiguration(tipoAutoEdicion.id, {
            nombre: nuevoTipo.nombre,
            stage: nuevoTipo.etapa,
            estado: nuevoTipo.activo ? 'activo' : 'inactivo',
            orden: nuevoTipo.orden
          });
          await loadDatos(); // Recargar datos
        }
        toast.success('Tipo de auto actualizado correctamente');
      } catch (error) {
        console.error('Error actualizando:', error);
        toast.error('Error al actualizar');
      }
    } else {
      // Crear nuevo tipo
      try {
        await disciplinaryService.createAutosConfiguration({
          tipo: nuevoTipo.nombre.toUpperCase().replace(/ /g, '_'),
          nombre: nuevoTipo.nombre,
          estado: nuevoTipo.activo ? 'activo' : 'inactivo',
          stage: nuevoTipo.etapa,
          orden: nuevoTipo.orden || 1
        });
        await loadDatos(); // Recargar datos
        toast.success('Tipo de auto creado correctamente');
      } catch (error) {
        console.error('Error creando:', error);
        // Guardar localmente si falla
        const tipoCompleto: any = {
          id: `tipo-auto-${Date.now()}`,
          ...nuevoTipo,
          plantilla: null,
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString()
        };
        setTiposAutos([...tiposAutos, tipoCompleto]);
        toast.success('Tipo de auto creado (local)');
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

  const actualizarPlantillasTipoAuto = (tipoAutoId: string, plantillas: any) => {
    // Actualizar localmente
    setTiposAutos(tiposAutos.map(t => 
      t.id === tipoAutoId 
        ? { ...t, plantilla: plantillas[0] || null, fechaModificacion: new Date().toISOString() } 
        : t
    ));
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
