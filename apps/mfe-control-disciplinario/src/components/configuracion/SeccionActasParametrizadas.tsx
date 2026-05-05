/**
 * Sección de Configuración de Actas Parametrizadas
 * Lista las actas configuradas en la tabla actas_configuration de la BD
 * Permite cambiar estado, editar y gestionar plantillas Word
 * Se integra en el wizard de configuraciones del módulo disciplinario
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, Edit2, Trash2, Upload, X, Download, Eye, Save, RefreshCw,
  ToggleLeft, ToggleRight, CheckCircle, AlertCircle, File
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ActaConfiguration,
  CreateActaConfigurationDto,
  UpdateActaConfigurationDto,
  disciplinaryService
} from '../../../services/api/disciplinary.service';
import { authService } from '../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

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

interface SeccionActasParametrizadasProps {
  // No requiere props externas, carga datos del backend
}

export function SeccionActasParametrizadas() {
  const [actas, setActas] = useState<ActaConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para modales
  const [showModalAgregar, setShowModalAgregar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalPlantilla, setShowModalPlantilla] = useState(false);
  const [actaSeleccionada, setActaSeleccionada] = useState<ActaConfiguration | null>(null);

  // Estados para formularios
  const [formData, setFormData] = useState<CreateActaConfigurationDto>({
    tipo: '',
    nombre: '',
    estado: 'activo',
    plantilla: '',
    stage: '',
    orden: 0
  });

  const [loadingAccion, setLoadingAccion] = useState<string | null>(null);
  const [archivoPlantilla, setArchivoPlantilla] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar actas al iniciar
  useEffect(() => {
    loadActas();
  }, []);

  const loadActas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await disciplinaryService.getActasConfiguration();
      setActas(data);
    } catch (err: any) {
      console.error('Error cargando actas configuration:', err);
      setError('Error al cargar la configuración de actas');
      toast.error('Error al cargar la configuración de actas');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado (activo/inactivo)
  const handleToggleEstado = async (acta: ActaConfiguration) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    try {
      setLoadingAccion(acta.id);
      const actualizada = await disciplinaryService.toggleActaConfigurationEstado(acta.id);
      setActas(prev => prev.map(a => a.id === acta.id ? actualizada : a));
      toast.success(`Acta ${actualizada.estado === 'activo' ? 'activada' : 'desactivada'} exitosamente`);
    } catch (err: any) {
      console.error('Error toggling estado:', err);
      toast.error('Error al cambiar el estado del acta');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Abrir modal para agregar nueva acta
  const handleAgregar = () => {
    setFormData({
      tipo: '',
      nombre: '',
      estado: 'activo',
      plantilla: '',
      stage: '',
      orden: actas.length + 1
    });
    setShowModalAgregar(true);
  };

  // Guardar nueva acta
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
      const response = await disciplinaryService.createActaConfiguration(formData);
      setActas(prev => [...prev, response]);
      setShowModalAgregar(false);
      toast.success(response.message || 'Acta creada exitosamente');
    } catch (err: any) {
      console.error('Error creando acta:', err);
      toast.error(err.message || 'Error al crear el acta');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Abrir modal para editar acta
  const handleEditar = (acta: ActaConfiguration) => {
    setActaSeleccionada(acta);
    setFormData({
      tipo: acta.tipo,
      nombre: acta.nombre,
      estado: acta.estado as 'activo' | 'inactivo',
      plantilla: acta.plantilla || '',
      stage: acta.stage || '',
      orden: acta.orden
    });
    setShowModalEditar(true);
  };

  // Guardar cambios del acta editada
  const handleGuardarEdicion = async () => {
    if (!actaSeleccionada) return;

    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    try {
      setLoadingAccion(actaSeleccionada.id);
      const actualizada = await disciplinaryService.updateActaConfiguration(
        actaSeleccionada.id,
        formData as UpdateActaConfigurationDto
      );
      setActas(prev => prev.map(a => a.id === actaSeleccionada.id ? actualizada : a));
      setShowModalEditar(false);
      setActaSeleccionada(null);
      toast.success('Acta actualizada exitosamente');
    } catch (err: any) {
      console.error('Error actualizando acta:', err);
      toast.error(err.message || 'Error al actualizar el acta');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Abrir modal para gestionar plantilla
  const handleGestionarPlantilla = (acta: ActaConfiguration) => {
    setActaSeleccionada(acta);
    setFormData({
      ...formData,
      plantilla: acta.plantilla || ''
    });
    setShowModalPlantilla(true);
  };

  // Guardar plantilla
  const handleGuardarPlantilla = async () => {
    if (!actaSeleccionada) return;

    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para modificar la configuración');
      return;
    }

    try {
      setLoadingAccion(actaSeleccionada.id + '_plantilla');

      let actualizada: ActaConfiguration;

      if (archivoPlantilla) {
        // Subir archivo real
        actualizada = await disciplinaryService.uploadActaPlantilla(
          actaSeleccionada.id,
          archivoPlantilla,
          archivoPlantilla.name,
          'Plantilla Word para acta',
          '1.0',
          'activo'
        );
      } else {
        // Guardar texto/URL
        actualizada = await disciplinaryService.updateActaConfiguration(
          actaSeleccionada.id,
          { plantilla: formData.plantilla }
        );
      }

      setActas(prev => prev.map(a => a.id === actaSeleccionada.id ? actualizada : a));
      setShowModalPlantilla(false);
      setActaSeleccionada(null);
      setArchivoPlantilla(null);
      setFormData({ ...formData, plantilla: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Plantilla guardada exitosamente');
    } catch (err: any) {
      console.error('Error guardando plantilla:', err);
      toast.error(err.message || 'Error al guardar la plantilla');
    } finally {
      setLoadingAccion(null);
    }
  };

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no permitido', {
          description: 'Solo se permiten archivos Word (.doc, .docx) y PDF'
        });
        return;
      }

      setArchivoPlantilla(file);
      setFormData({ ...formData, plantilla: file.name });
      toast.success('Archivo seleccionado', {
        description: file.name
      });
    }
  };

  // Eliminar acta
  const handleEliminar = async (acta: ActaConfiguration) => {
    if (!authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_EDIT)) {
      toast.error('No tiene permisos para eliminar');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el acta "${acta.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setLoadingAccion(acta.id);
      await disciplinaryService.deleteActaConfiguration(acta.id);
      setActas(prev => prev.filter(a => a.id !== acta.id));
      toast.success('Acta eliminada exitosamente');
    } catch (err: any) {
      console.error('Error eliminando acta:', err);
      toast.error(err.message || 'Error al eliminar el acta');
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
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-gray-600">Cargando actas parametrizadas...</span>
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
            onClick={loadActas}
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Actas Parametrizadas
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Gestión de tipos de actas disciplinarias configuradas en la base de datos
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadActas}
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
                    background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nueva Acta
                </button>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="mt-4 bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900">
                <p className="font-semibold">Actas almacenadas en base de datos</p>
                <p className="text-xs mt-1">
                  Esta lista muestra los tipos de actas configurados en la tabla <code>actas_configuration</code>.
                  Cada acta puede tener una plantilla Word asociada para facilitar su creación.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Actas */}
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
              {actas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-600 mb-2">
                      No hay actas parametrizadas en la base de datos
                    </p>
                    <button
                      onClick={handleAgregar}
                      className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                    >
                      Crear primera acta
                    </button>
                  </td>
                </tr>
              ) : (
                actas
                  .sort((a, b) => a.orden - b.orden)
                  .map((acta) => (
                    <tr key={acta.id} className="hover:bg-gray-50 transition-colors">
                      {/* Estado */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleEstado(acta)}
                          disabled={loadingAccion === acta.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            acta.estado === 'activo' ? 'bg-green-500' : 'bg-gray-300'
                          } ${(loadingAccion === acta.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={acta.estado === 'activo' ? 'Activo - Click para desactivar' : 'Inactivo - Click para activar'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              acta.estado === 'activo' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3">
                        <div className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {acta.tipo}
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="px-5 py-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {acta.nombre}
                        </div>
                      </td>

                      {/* Etapa */}
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getEtapaColor(acta.stage)}`}>
                          {getEtapaLabel(acta.stage)}
                        </span>
                      </td>

                      {/* Plantilla */}
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {acta.plantilla ? (
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
                            onClick={() => handleGestionarPlantilla(acta)}
                            disabled={loadingAccion === acta.id + '_plantilla'}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors font-semibold text-xs"
                            title="Gestionar plantilla Word"
                          >
                            <File className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Plantilla</span>
                          </button>

                          <button
                            onClick={() => handleEditar(acta)}
                            disabled={loadingAccion === acta.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors font-semibold text-xs"
                            title="Editar acta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          <button
                            onClick={() => handleEliminar(acta)}
                            disabled={loadingAccion === acta.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors font-semibold text-xs"
                            title="Eliminar acta"
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

      {/* Modal: Agregar Acta */}
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
                    <h3 className="text-lg font-bold text-gray-900">Nueva Acta Parametrizada</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Agregar un nuevo tipo de acta a la base de datos
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      placeholder="ACTA_AUDIENCIA"
                    />
                    <p className="text-xs text-gray-500 mt-1">Código único del tipo de acta</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Acta de Audiencia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Etapa asociada
                    </label>
                    <select
                      value={formData.stage || ''}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
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

      {/* Modal: Editar Acta */}
      <AnimatePresence>
        {showModalEditar && actaSeleccionada && (
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
                    <h3 className="text-lg font-bold text-gray-900">Editar Acta</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Modificar el acta: {actaSeleccionada.nombre}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowModalEditar(false); setActaSeleccionada(null); }}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm bg-gray-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Etapa asociada
                    </label>
                    <select
                      value={formData.stage || ''}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => { setShowModalEditar(false); setActaSeleccionada(null); }}
                    className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarEdicion}
                    disabled={loadingAccion === actaSeleccionada.id}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                    }}
                  >
                    {loadingAccion === actaSeleccionada.id ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Gestionar Plantilla */}
      <AnimatePresence>
        {showModalPlantilla && actaSeleccionada && (
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
                      Acta: {actaSeleccionada.nombre}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowModalPlantilla(false);
                      setActaSeleccionada(null);
                      setArchivoPlantilla(null);
                      setFormData({ ...formData, plantilla: '' });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
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
                          Suba un archivo Word (.doc, .docx) o PDF, o pegue una URL de descarga.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subir archivo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subir archivo de plantilla
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Seleccionar archivo
                      </button>
                      {archivoPlantilla && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">{archivoPlantilla.name}</span>
                          <button
                            onClick={() => {
                              setArchivoPlantilla(null);
                              setFormData({ ...formData, plantilla: '' });
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="ml-2 p-1 hover:bg-red-100 rounded"
                          >
                            <X className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* O pegar URL/texto */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white text-sm text-gray-500">O</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      URL de descarga o contenido
                    </label>
                    <textarea
                      value={archivoPlantilla ? '' : formData.plantilla}
                      onChange={(e) => setFormData({ ...formData, plantilla: e.target.value })}
                      disabled={!!archivoPlantilla}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] disabled:bg-gray-100"
                      placeholder={archivoPlantilla ? 'Archivo seleccionado' : 'Pegue aquí una URL de descarga...'}
                    />
                  </div>

                  {(formData.plantilla || archivoPlantilla) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">
                          {archivoPlantilla
                            ? `Archivo seleccionado: ${archivoPlantilla.name}`
                            : `Plantilla configurada (${formData.plantilla.length} caracteres)`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => { setShowModalPlantilla(false); setActaSeleccionada(null); }}
                    className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarPlantilla}
                    disabled={loadingAccion === actaSeleccionada.id + '_plantilla' || (!archivoPlantilla && !formData.plantilla.trim())}
                    className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                    style={{
                      background: (!archivoPlantilla && !formData.plantilla.trim()) || loadingAccion === actaSeleccionada.id + '_plantilla'
                        ? '#9CA3AF'
                        : 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                    }}
                  >
                    <Save className="w-4 h-4" />
                    {loadingAccion === actaSeleccionada.id + '_plantilla' ? 'Guardando...' : 'Guardar Plantilla'}
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

export default SeccionActasParametrizadas;