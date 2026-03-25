/**
 * ============================================
 * SECCIÓN: TAREAS EN EXPEDIENTE
 * ============================================
 * 
 * Componente para gestionar tareas dentro del expediente de auditoría
 * 
 * FUNCIONALIDADES:
 * - Lista de tareas con progreso
 * - Marcar tareas como completadas
 * - Filtros por fase, estado, prioridad
 * - Crear nueva tarea
 * - CONECTADO AL BACKEND
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Enero 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, Clock, AlertCircle, Plus, CheckSquare, Square, 
  X, Loader2, RefreshCw, Trash2, Edit
} from 'lucide-react';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { 
  controlInternoService, 
  type TareaAuditoria, 
  type EstadoTarea, 
  type PrioridadTarea,
  type FaseTarea,
  type CreateTareaAuditoriaDto 
} from '../../../services/api/controlInternoService';
import { toast } from 'sonner';

// Usuario de ejemplo para responsable (en producción vendría del contexto de auth)
const EQUIPO_AUDITORES = [
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', nombre: 'Ana García López' },
  { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', nombre: 'Carlos Martínez' },
  { id: 'c3d4e5f6-a7b8-9012-cdef-012345678912', nombre: 'María Rodríguez' },
  { id: 'd4e5f6a7-b8c9-0123-def0-123456789023', nombre: 'Pedro Sánchez' },
];

interface Props {
  auditoriaId: string;
}

export function SeccionTareasExpediente({ auditoriaId }: Props) {
  // Estado de tareas
  const [tareas, setTareas] = useState<TareaAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de filtros
  const [filtroEstado, setFiltroEstado] = useState<EstadoTarea | 'Todas'>('Todas');
  const [filtroFase, setFiltroFase] = useState<FaseTarea | 'Todas'>('Todas');
  
  // Estado del modal de crear tarea
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateTareaAuditoriaDto>({
    auditoriaId: auditoriaId,
    titulo: '',
    descripcion: '',
    estado: 'Pendiente',
    prioridad: 'Media',
    fase: undefined,
    responsableId: EQUIPO_AUDITORES[0].id,
    responsableNombre: EQUIPO_AUDITORES[0].nombre,
    fechaVencimiento: '',
    progreso: 0,
    notas: ''
  });

  // ============ VALIDACIÓN UUID ============
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // ============ CARGAR TAREAS ============
  const cargarTareas = useCallback(async () => {
    // Solo cargar si el auditoriaId es un UUID válido
    if (!isValidUUID(auditoriaId)) {
      console.log('[SeccionTareasExpediente] ID de auditoría no es UUID válido, usando datos vacíos');
      setTareas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await controlInternoService.getTareasByAuditoria(auditoriaId);
      setTareas(data);
    } catch (err: any) {
      console.error('[SeccionTareasExpediente] Error cargando tareas:', err);
      setError(err.message || 'Error al cargar tareas');
      setTareas([]);
    } finally {
      setLoading(false);
    }
  }, [auditoriaId]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  // ============ CÁLCULOS ============
  const contarTareas = () => tareas.length;
  const contarTareasCompletadas = () => tareas.filter(t => t.estado === 'Completada').length;
  const contarTareasPendientes = () => tareas.filter(t => t.estado === 'Pendiente' || t.estado === 'En Progreso').length;
  const calcularProgresoTareas = () => {
    if (tareas.length === 0) return 0;
    const tareasActivas = tareas.filter(t => t.estado !== 'Cancelada');
    if (tareasActivas.length === 0) return 0;
    return Math.round(tareasActivas.reduce((sum, t) => sum + t.progreso, 0) / tareasActivas.length);
  };

  // ============ FILTRADO ============
  const tareasFiltradas = tareas.filter((tarea) => {
    if (filtroEstado !== 'Todas' && tarea.estado !== filtroEstado) return false;
    if (filtroFase !== 'Todas' && tarea.fase !== filtroFase) return false;
    return true;
  });

  // ============ HELPERS DE UI ============
  const getColorPrioridad = (prioridad: PrioridadTarea): string => {
    switch (prioridad) {
      case 'Urgente':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Alta':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Baja':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIconoEstado = (estado: EstadoTarea) => {
    switch (estado) {
      case 'Completada':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'En Progreso':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'Pendiente':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      case 'Cancelada':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // ============ HANDLERS ============
  const handleToggleCompletada = async (tarea: TareaAuditoria) => {
    if (tarea.estado === 'Completada') {
      toast.info('La tarea ya está completada');
      return;
    }
    
    try {
      await controlInternoService.completarTarea(tarea.id);
      toast.success('Tarea marcada como completada');
      cargarTareas();
    } catch (err: any) {
      toast.error(err.message || 'Error al completar tarea');
    }
  };

  const handleDeleteTarea = async (tareaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta tarea?')) return;
    
    try {
      await controlInternoService.deleteTarea(tareaId);
      toast.success('Tarea eliminada');
      cargarTareas();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar tarea');
    }
  };

  const handleCreateTarea = async () => {
    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    try {
      setSaving(true);
      await controlInternoService.createTarea({
        ...formData,
        auditoriaId,
        fechaVencimiento: formData.fechaVencimiento || undefined,
        fase: formData.fase || undefined,
      });
      toast.success('Tarea creada exitosamente');
      setShowModal(false);
      resetForm();
      cargarTareas();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear tarea');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      auditoriaId,
      titulo: '',
      descripcion: '',
      estado: 'Pendiente',
      prioridad: 'Media',
      fase: undefined,
      responsableId: EQUIPO_AUDITORES[0].id,
      responsableNombre: EQUIPO_AUDITORES[0].nombre,
      fechaVencimiento: '',
      progreso: 0,
      notas: ''
    });
  };

  const handleResponsableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAuditor = EQUIPO_AUDITORES.find(a => a.id === e.target.value);
    if (selectedAuditor) {
      setFormData(prev => ({
        ...prev,
        responsableId: selectedAuditor.id,
        responsableNombre: selectedAuditor.nombre
      }));
    }
  };

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando tareas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <CardSIGL variant="outlined">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <ButtonSIGL variant="secondary" onClick={cargarTareas}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </ButtonSIGL>
        </div>
      </CardSIGL>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Tareas y Actividades
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {contarTareasCompletadas()} de {contarTareas()} completadas
            <span className="ml-2 text-gray-500">
              • {calcularProgresoTareas()}% de progreso
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonSIGL
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={cargarTareas}
          >
            Refrescar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
            disabled={!isValidUUID(auditoriaId)}
          >
            Nueva Tarea
          </ButtonSIGL>
        </div>
      </div>

      {/* Mensaje si no es UUID válido */}
      {!isValidUUID(auditoriaId) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ⚠️ Esta auditoría usa un ID de demostración. Las tareas estarán disponibles cuando se conecte con una auditoría real del backend.
          </p>
        </div>
      )}

      {/* Barra de progreso general */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">
            Progreso General
          </span>
          <span className="text-sm font-bold" style={{ color: '#003DA5' }}>
            {calcularProgresoTareas()}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${calcularProgresoTareas()}%`,
              background: 'linear-gradient(90deg, #003DA5 0%, #2962FF 100%)'
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className="text-xs text-gray-500">Completadas</p>
            <p className="text-sm font-bold text-green-600">
              {contarTareasCompletadas()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-sm font-bold text-amber-600">
              {contarTareasPendientes()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-bold text-gray-900">
              {contarTareas()}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoTarea | 'Todas')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todas">Todas</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Fase
          </label>
          <select
            value={filtroFase}
            onChange={(e) => setFiltroFase(e.target.value as FaseTarea | 'Todas')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todas">Todas</option>
            <option value="Planeación">Planeación</option>
            <option value="Ejecución">Ejecución</option>
            <option value="Comunicación">Comunicación</option>
            <option value="Seguimiento">Seguimiento</option>
          </select>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-3">
        {tareasFiltradas.length === 0 ? (
          <CardSIGL variant="outlined">
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {contarTareas() === 0
                  ? 'No hay tareas registradas en esta auditoría'
                  : 'No se encontraron tareas con los filtros aplicados'}
              </p>
            </div>
          </CardSIGL>
        ) : (
          tareasFiltradas.map((tarea) => (
            <motion.div
              key={tarea.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardSIGL variant="outlined">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleCompletada(tarea)}
                      className="mt-0.5 shrink-0"
                      disabled={tarea.estado === 'Completada'}
                    >
                      {tarea.estado === 'Completada' ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
                      )}
                    </button>

                    {/* Contenido */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4
                            className={`font-bold text-sm mb-1 ${
                              tarea.estado === 'Completada'
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {tarea.titulo}
                          </h4>
                          {tarea.descripcion && (
                            <p className="text-xs text-gray-600 mb-2">
                              {tarea.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getIconoEstado(tarea.estado)}
                          <button
                            onClick={() => handleDeleteTarea(tarea.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded border font-semibold ${getColorPrioridad(tarea.prioridad)}`}>
                          {tarea.prioridad}
                        </span>
                        {tarea.fase && (
                          <span className="text-xs px-2 py-1 rounded border bg-purple-50 text-purple-700 border-purple-200 font-semibold">
                            {tarea.fase}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded border font-semibold ${
                          tarea.estado === 'Completada'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : tarea.estado === 'En Progreso'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {tarea.estado}
                        </span>
                      </div>

                      {/* Barra de progreso (solo si está en progreso) */}
                      {tarea.estado === 'En Progreso' && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Progreso</span>
                            <span className="text-xs font-semibold text-blue-600">
                              {tarea.progreso}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${tarea.progreso}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Responsable:</p>
                          <p className="font-semibold text-gray-900">
                            {tarea.responsableNombre}
                          </p>
                        </div>
                        {tarea.fechaVencimiento && (
                          <div>
                            <p className="text-gray-500">Vence:</p>
                            <p className="font-semibold text-gray-900">
                              {tarea.fechaVencimiento}
                            </p>
                          </div>
                        )}
                      </div>

                      {tarea.fechaCompletado && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-green-700">
                            ✅ Completada el {tarea.fechaCompletado}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardSIGL>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal para crear nueva tarea */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Nueva Tarea</h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Revisar documentación del proceso"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción detallada de la tarea..."
                />
              </div>

              {/* Prioridad y Fase */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as PrioridadTarea }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Fase
                  </label>
                  <select
                    value={formData.fase || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fase: e.target.value as FaseTarea || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin fase específica</option>
                    <option value="Planeación">Planeación</option>
                    <option value="Ejecución">Ejecución</option>
                    <option value="Comunicación">Comunicación</option>
                    <option value="Seguimiento">Seguimiento</option>
                  </select>
                </div>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Responsable *
                </label>
                <select
                  value={formData.responsableId}
                  onChange={handleResponsableChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EQUIPO_AUDITORES.map(auditor => (
                    <option key={auditor.id} value={auditor.id}>
                      {auditor.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={formData.fechaVencimiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas o comentarios..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <ButtonSIGL
                variant="secondary"
                onClick={() => { setShowModal(false); resetForm(); }}
              >
                Cancelar
              </ButtonSIGL>
              <ButtonSIGL
                variant="primary"
                onClick={handleCreateTarea}
                disabled={saving || !formData.titulo.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Crear Tarea'
                )}
              </ButtonSIGL>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
