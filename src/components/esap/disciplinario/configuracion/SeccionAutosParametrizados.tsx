/**
 * Sección de Configuración de Autos Parametrizados
 * Lista los autos configurados en la tabla autos_configuration de la BD
 * Permite cambiar estado, editar y gestionar plantillas Word
 * 
 * Se integra en el wizard de configuraciones del módulo disciplinario
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, Edit2, Trash2, Upload, X, Download, 
  ToggleLeft, ToggleRight, CheckCircle, AlertCircle, 
  Folder, File, Eye, Save, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AutoConfiguration, 
  CreateAutoConfigurationDto, 
  UpdateAutoConfigurationDto,
  disciplinaryService 
} from '../../../../services/api/disciplinary.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';

// Etapas del proceso disciplinario
const ETAPAS_STAGE = [
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'INDAGACION_PREVIA', label: 'Indagación Previa' },
  { value: 'INDAGACION', label: 'Indagación' },
  { value: 'INVESTIGACION', label: 'Investigación' },
  { value: 'EVALUACION', label: 'Evaluación' },
  { value: 'JUZGAMIENTO', label: 'Juzgamiento' },
  { value: 'FALLO', label: 'Fallo' },
  { value: 'SEGUNDA_INSTANCIA', label: 'Segunda Instancia' },
];

interface SeccionAutosParametrizadosProps {
  // No requiere props externas, carga datos del backend
}

export function SeccionAutosParametrizados() {
  const [autos, setAutos] = useState<AutoConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para modales
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalPlantilla, setShowModalPlantilla] = useState(false);
  const [autoSeleccionado, setAutoSeleccionado] = useState<AutoConfiguration | null>(null);
  
  // Estados para formularios
  const [formData, setFormData] = useState<CreateAutoConfigurationDto>({
    tipo: '',
    nombre: '',
    estado: 'activo',
    plantilla: '',
    stage: '',
    orden: 0
  });
  
  const [loadingAccion, setLoadingAccion] = useState<string | null>(null);

  // Cargar autos al iniciar
  useEffect(() => {
    loadAutos();
  }, []);

  const loadAutos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await disciplinaryService.getAutosConfiguration();
      setAutos(data);
    } catch (err: any) {
      console.error('Error cargando autos configuration:', err);
      setError('Error al cargar los autos parametrizados');
      toast.error('Error al cargar la configuración de autos');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado (activo/inactivo)
  const handleToggleEstado = async (auto: AutoConfiguration) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    try {
      setLoadingAccion(auto.id);
      const actualizado = await disciplinaryService.toggleAutosConfigurationEstado(auto.id);
      setAutos(prev => prev.map(a => a.id === auto.id ? actualizado : a));
      toast.success(`Auto ${actualizado.estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`);
    } catch (err: any) {
      console.error('Error toggling estado:', err);
      toast.error('Error al cambiar el estado del auto');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Abrir modal para agregar nuevo auto
  const handleAgregar = () => {
    setFormData({
      tipo: '',
      nombre: '',
      estado: 'activo',
      plantilla: '',
      stage: '',
      orden: autos.length + 1
    });
    setShowModalAgregar(true);
  };

  // Guardar nuevo auto
  const handleGuardarNuevo = async () => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    if (!formData.tipo || !formData.nombre) {
      toast.error('El tipo y nombre son obligatorios');
      return;
    }

    try {
      setLoadingAccion('creando');
      const nuevo = await disciplinaryService.createAutosConfiguration(formData);
      setAutos(prev => [...prev, nuevo]);
      setShowModalAgregar(false);
      toast.success('Auto creado exitosamente');
    } catch (err: any) {
      console.error('Error creando auto:', err);
      toast.error(err.message || 'Error al crear el auto');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Abrir modal para editar auto
  const handleEditar = (auto: AutoConfiguration) => {
    setAutoSeleccionado(auto);
    setFormData({
      tipo: auto.tipo,
      nombre: auto.nombre,
      estado: auto.estado as 'activo' | 'inactivo',
      plantilla: auto.plantilla || '',
      stage: auto.stage || '',
      orden: auto.orden
    });
    setShowModalEditar(true);
  };

  // Guardar cambios del auto editado
  const handleGuardarEdicion = async () => {
    if (!autoSeleccionado) return;
    
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    try {
      setLoadingAccion(autoSeleccionado.id);
      const actualizado = await disciplinaryService.updateAutosConfiguration(
        autoSeleccionado.id, 
        formData as UpdateAutoConfigurationDto
      );
      setAutos(prev => prev.map(a => a.id === autoSeleccionado.id ? actualizado : a));
      setShowModalEditar(false);
      setAutoSeleccionado(null);
      toast.success('Auto actualizado exitosamente');
    } catch (err: any) {
      console.error('Error actualizando auto:', err);
      toast.error(err.message || 'Error al actualizar el auto');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Abrir modal para gestionar plantilla
  const handleGestionarPlantilla = (auto: AutoConfiguration) => {
    setAutoSeleccionado(auto);
    setFormData({
      ...formData,
      plantilla: auto.plantilla || ''
    });
    setShowModalPlantilla(true);
  };

  // Guardar plantilla
  const handleGuardarPlantilla = async () => {
    if (!autoSeleccionado) return;
    
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    try {
      setLoadingAccion(autoSeleccionado.id + '_plantilla');
      const actualizado = await disciplinaryService.updateAutosConfiguration(
        autoSeleccionado.id, 
        { plantilla: formData.plantilla }
      );
      setAutos(prev => prev.map(a => a.id === autoSeleccionado.id ? actualizado : a));
      setShowModalPlantilla(false);
      setAutoSeleccionado(null);
      toast.success('Plantilla guardada exitosamente');
    } catch (err: any) {
      console.error('Error guardando plantilla:', err);
      toast.error(err.message || 'Error al guardar la plantilla');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Eliminar auto
  const handleEliminar = async (auto: AutoConfiguration) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para eliminar');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el auto "${auto.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setLoadingAccion(auto.id);
      await disciplinaryService.deleteAutosConfiguration(auto.id);
      setAutos(prev => prev.filter(a => a.id !== auto.id));
      toast.success('Auto eliminado exitosamente');
    } catch (err: any) {
      console.error('Error eliminando auto:', err);
      toast.error(err.message || 'Error al eliminar el auto');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Obtener nombre de etapa
  const getEtapaLabel = (stage: string | null) => {
    if (!stage) return 'Todas las etapas';
    const etapa = ETAPAS_STAGE.find(e => e.value === stage);
    return etapa ? etapa.label : stage;
  };

  // Obtener color de estado
  const getEstadoColor = (estado: string) => {
    return estado === 'activo' 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-gray-100 text-gray-600 border-gray-200';
  };

  // Obtener color de etapa
  const getEtapaColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      'RECEPCION': 'bg-blue-100 text-blue-700 border-blue-200',
      'INDAGACION_PREVIA': 'bg-purple-100 text-purple-700 border-purple-200',
      'INVESTIGACION': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'EVALUACION': 'bg-amber-100 text-amber-700 border-amber-200',
      'JUZGAMIENTO': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'SEGUNDA_INSTANCIA': 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return colors[stage || ''] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-gray-600">Cargando autos parametrizados...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
        <div className="flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={loadAutos}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Autos Parametrizados
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Gestión de tipos de autos disciplinarios configurados en la base de datos
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={loadAutos}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                title="Actualizar lista"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              
              {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT) && (
                <button
                  onClick={handleAgregar}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Auto
                </button>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="mt-4 bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-indigo-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900">
                <p className="font-semibold">Autos almacenados en base de datos</p>
                <p className="text-xs mt-1">
                  Esta lista muestra los tipos de autos configurados en la tabla <code>autos_configuration</code>. 
                  Cada auto puede tener una plantilla Word asociada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Autos */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Etapa
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Plantilla
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {autos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600 mb-2">
                      No hay autos parametrizados en la base de datos
                    </p>
                    <button
                      onClick={handleAgregar}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Crear primer auto
                    </button>
                  </td>
                </tr>
              ) : (
                autos
                  .sort((a, b) => a.orden - b.orden)
                  .map((auto) => (
                    <tr key={auto.id} className="hover:bg-gray-50 transition-colors">
                      {/* Estado */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleEstado(auto)}
                          disabled={loadingAccion === auto.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            auto.estado === 'activo' ? 'bg-green-500' : 'bg-gray-300'
                          } ${loadingAccion === auto.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          title={auto.estado === 'activo' ? 'Activo - Click para desactivar' : 'Inactivo - Click para activar'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              auto.estado === 'activo' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3">
                        <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {auto.tipo}
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="px-5 py-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {auto.nombre}
                        </div>
                      </td>

                      {/* Etapa */}
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getEtapaColor(auto.stage)}`}>
                          {getEtapaLabel(auto.stage)}
                        </span>
                      </td>

                      {/* Plantilla */}
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {auto.plantilla ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <File className="w-4 h-4" />
                            <span>Configurada</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <File className="w-4 h-4" />
                            <span>Sin plantilla</span>
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleGestionarPlantilla(auto)}
                            disabled={loadingAccion === auto.id + '_plantilla'}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors font-semibold text-xs"
                            title="Gestionar plantilla Word"
                          >
                            <File className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Plantilla</span>
                          </button>
                          
                          <button
                            onClick={() => handleEditar(auto)}
                            disabled={loadingAccion === auto.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors font-semibold text-xs"
                            title="Editar auto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>
                          
                          <button
                            onClick={() => handleEliminar(auto)}
                            disabled={loadingAccion === auto.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors font-semibold text-xs"
                            title="Eliminar auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Agregar Auto */}
      <AnimatePresence>
        {showModalAgregar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-lg w-full"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Nuevo Auto Parametrizado</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Agregar un nuevo tipo de auto a la base de datos
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModalAgregar(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tipo (código) *
                    </label>
                    <input
                      type="text"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      placeholder="AUTO_NUEVO"
                    />
                    <p className="text-xs text-gray-500 mt-1">Código único del tipo de auto</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Auto de Ejemplo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Etapa asociada
                    </label>
                    <select
                      value={formData.stage || ''}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Todas las etapas</option>
                      {ETAPAS_STAGE.map(etapa => (
                        <option key={etapa.value} value={etapa.value}>{etapa.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Orden de visualización
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.orden}
                      onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => setShowModalAgregar(false)}
                    className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarNuevo}
                    disabled={loadingAccion === 'creando'}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    }}
                  >
                    {loadingAccion === 'creando' ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Auto */}
      <AnimatePresence>
        {showModalEditar && autoSeleccionado && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-lg w-full"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Editar Auto</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Modificar el auto: {autoSeleccionado.nombre}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowModalEditar(false); setAutoSeleccionado(null); }}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tipo (código)
                    </label>
                    <input
                      type="text"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm bg-gray-50"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Etapa asociada
                    </label>
                    <select
                      value={formData.stage || ''}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Todas las etapas</option>
                      {ETAPAS_STAGE.map(etapa => (
                        <option key={etapa.value} value={etapa.value}>{etapa.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Orden de visualización
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.orden}
                      onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => { setShowModalEditar(false); setAutoSeleccionado(null); }}
                    className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarEdicion}
                    disabled={loadingAccion === autoSeleccionado.id}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    }}
                  >
                    {loadingAccion === autoSeleccionado.id ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Gestionar Plantilla */}
      <AnimatePresence>
        {showModalPlantilla && autoSeleccionado && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Gestionar Plantilla Word</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Auto: {autoSeleccionado.nombre}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowModalPlantilla(false); setAutoSeleccionado(null); }}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <File className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-purple-900">
                        <p className="font-semibold">Plantilla en formato Word</p>
                        <p className="text-xs mt-1">
                          Puede pegar el contenido de la plantilla Word (texto), 
                          una URL a la plantilla, o código base64 del archivo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Contenido de la plantilla
                    </label>
                    <textarea
                      value={formData.plantilla}
                      onChange={(e) => setFormData({ ...formData, plantilla: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[200px]"
                      placeholder="Pegue aquí el contenido de la plantilla Word o una URL..."
                    />
                  </div>

                  {formData.plantilla && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">
                          Plantilla configurada ({formData.plantilla.length} caracteres)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => { setShowModalPlantilla(false); setAutoSeleccionado(null); }}
                    className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarPlantilla}
                    disabled={loadingAccion === autoSeleccionado.id + '_plantilla'}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    }}
                  >
                    <Save className="w-4 h-4" />
                    {loadingAccion === autoSeleccionado.id + '_plantilla' ? 'Guardando...' : 'Guardar Plantilla'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SeccionAutosParametrizados;
