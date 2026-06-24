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
import { configuracionesProfesionalesOCIApi } from './services/api';
import { 
  controlInternoService, 
  type TareaAuditoria, 
  type EstadoTarea, 
  type PrioridadTarea,
  type FaseTarea,
  type CreateTareaAuditoriaDto 
} from '../services/api/controlInternoService';
import { toast } from 'sonner';

// Tipo para profesionales OCI mapeados
interface ProfesionalOption {
  id: string;
  nombre: string;
}

interface Props {
  auditoriaId: string;
}

export function SeccionTareasExpediente({ auditoriaId }: Props) {
  // Estado de tareas
  const [tareas, setTareas] = useState<TareaAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de profesionales OCI (desde el backend)
  const [profesionalesOCI, setProfesionalesOCI] = useState<ProfesionalOption[]>([]);
  const [loadingProfesionales, setLoadingProfesionales] = useState(true);

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
    responsableId: '',
    responsableNombre: '',
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

  // Cargar profesionales OCI desde el backend
  useEffect(() => {
    const cargarProfesionales = async () => {
      try {
        setLoadingProfesionales(true);
        const response = await configuracionesProfesionalesOCIApi.getAll(true);
        const data = Array.isArray(response.data) ? response.data
          : Array.isArray(response) ? response : [];
        
        const mapeados: ProfesionalOption[] = data
          .filter((p: any) => {
            // Solo profesionales activos
            if (p.activo === false) return false;
            // Solo los que tienen nombre real (no genéricos ni vacíos)
            const nombre = (p.nombre || '').trim();
            if (!nombre || nombre.length < 3) return false;
            if (nombre.toLowerCase().includes('sin nombre')) return false;
            if (nombre.toLowerCase().startsWith('profesional ')) return false;
            if (nombre.toLowerCase().startsWith('usuario ')) return false;
            return true;
          })
          .map((p: any) => ({
            id: p.idTercero || p.id,
            nombre: p.nombre.trim(),
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        setProfesionalesOCI(mapeados);
        
        // Inicializar el responsable del form con el primer profesional
        if (mapeados.length > 0 && !formData.responsableId) {
          setFormData(prev => ({
            ...prev,
            responsableId: mapeados[0].id,
            responsableNombre: mapeados[0].nombre,
          }));
        }
      } catch (err) {
        console.error('[SeccionTareasExpediente] Error cargando profesionales OCI:', err);
      } finally {
        setLoadingProfesionales(false);
      }
    };
    cargarProfesionales();
  }, []); // Solo una vez al montar

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
      responsableId: profesionalesOCI.length > 0 ? profesionalesOCI[0].id : '',
      responsableNombre: profesionalesOCI.length > 0 ? profesionalesOCI[0].nombre : '',
      fechaVencimiento: '',
      progreso: 0,
      notas: ''
    });
  };

  const handleResponsableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProfesional = profesionalesOCI.find(p => p.id === e.target.value);
    if (selectedProfesional) {
      setFormData(prev => ({
        ...prev,
        responsableId: selectedProfesional.id,
        responsableNombre: selectedProfesional.nombre
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
    <div className="space-y-3">
      {/* Header compacto en una sola línea */}
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-gray-150">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700">
            Resumen de Tareas:
          </span>
          <span className="text-xs text-gray-600">
            {contarTareasCompletadas()} de {contarTareas()} completadas
          </span>
          <span className="text-xs text-gray-400 font-bold">•</span>
          <span className="text-xs text-gray-600">
            {calcularProgresoTareas()}% progreso
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ButtonSIGL
            variant="secondary"
            onClick={cargarTareas}
            style={{ minHeight: 0, height: '28px', padding: '0 8px', fontSize: '11px' }}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refrescar
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={() => setShowModal(true)}
            disabled={!isValidUUID(auditoriaId)}
            style={{ minHeight: 0, height: '28px', padding: '0 10px', fontSize: '11px', backgroundColor: '#003DA5', color: '#FFFFFF' }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Nueva Tarea
          </ButtonSIGL>
        </div>
      </div>

      {/* Mensaje si no es UUID válido */}
      {!isValidUUID(auditoriaId) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <p className="text-xs text-amber-800">
            ⚠️ Esta auditoría usa un ID de demostración. Las tareas estarán disponibles cuando se conecte con una auditoría real del backend.
          </p>
        </div>
      )}

      {/* Barra compacta: progreso + stats + filtros en una sola línea */}
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
        {/* Mini barra de progreso */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[50px]">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${calcularProgresoTareas()}%`,
                background: '#003DA5'
              }}
            />
          </div>
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap">{calcularProgresoTareas()}%</span>
        </div>

        {/* Separador */}
        <div className="w-px h-3.5 bg-gray-300" />

        {/* Stats inline como badges */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
            ✓ {contarTareasCompletadas()}
          </span>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            ◷ {contarTareasPendientes()}
          </span>
          <span className="text-[10px] font-semibold text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">
            Σ {contarTareas()}
          </span>
        </div>

        {/* Separador */}
        <div className="w-px h-3.5 bg-gray-300" />

        {/* Filtros inline */}
        <div className="flex items-center gap-1.5 ml-auto">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoTarea | 'Todas')}
            className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="Todas">Estado: Todas</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
          <select
            value={filtroFase}
            onChange={(e) => setFiltroFase(e.target.value as FaseTarea | 'Todas')}
            className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="Todas">Fase: Todas</option>
            <option value="Planeación">Planeación</option>
            <option value="Ejecución">Ejecución</option>
            <option value="Comunicación">Comunicación</option>
            <option value="Seguimiento">Seguimiento</option>
          </select>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-2">
        {tareasFiltradas.length === 0 ? (
          <CardSIGL variant="outlined" padding="none">
            <div className="text-center py-5">
              <CheckSquare className="w-8 h-8 text-gray-400 mx-auto mb-1.5" />
              <p className="text-xs text-gray-500 font-medium">
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
              <CardSIGL variant="outlined" padding="none">
                <div className="p-3">
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleCompletada(tarea)}
                      className="mt-0.5 shrink-0"
                      disabled={tarea.estado === 'Completada'}
                    >
                      {tarea.estado === 'Completada' ? (
                        <CheckSquare className="w-4 h-4 text-green-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors" />
                      )}
                    </button>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-bold text-xs mb-0.5 wrap-anywhere whitespace-pre-wrap ${
                              tarea.estado === 'Completada'
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {tarea.titulo}
                          </h4>
                          {tarea.descripcion && (
                            <p className="text-[11px] text-gray-600 mb-1.5 wrap-anywhere whitespace-pre-wrap leading-relaxed">
                              {tarea.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {getIconoEstado(tarea.estado)}
                          <button
                            onClick={() => handleDeleteTarea(tarea.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-0.5 hover:bg-gray-100 rounded"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getColorPrioridad(tarea.prioridad)}`}>
                          {tarea.prioridad}
                        </span>
                        {tarea.fase && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 font-semibold">
                            {tarea.fase}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
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
                        <div className="mb-2 bg-gray-50 p-1.5 rounded border border-gray-100">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-gray-600">Progreso</span>
                            <span className="text-[10px] font-semibold text-blue-600">
                              {tarea.progreso}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${tarea.progreso}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] pt-1.5 border-t border-gray-100 leading-none">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Resp:</span>
                          <span className="font-semibold text-gray-800 wrap-anywhere">
                            {tarea.responsableNombre}
                          </span>
                        </div>
                        {tarea.fechaVencimiento && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Vence:</span>
                            <span className="font-semibold text-gray-800">
                              {tarea.fechaVencimiento}
                            </span>
                          </div>
                        )}
                      </div>

                      {tarea.fechaCompletado && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                          <p className="text-[10px] text-green-700 font-semibold">
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

      {/* Modal para crear nueva tarea — World Class */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con gradiente premium */}
            <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Nueva Tarea</h3>
                  <p className="text-white/80 text-xs mt-0.5">Asignar tarea al expediente</p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  placeholder="Ej: Revisar documentación del proceso"
                />
                <div className="mt-1 flex items-center justify-end">
                  <span className="text-[10px] text-gray-400">{formData.titulo.length}/255</span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none"
                  placeholder="Descripción detallada de la tarea..."
                />
              </div>

              {/* Fila: Prioridad + Fase + Fecha */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as PrioridadTarea }))}
                    className="w-full px-2.5 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Fase
                  </label>
                  <select
                    value={formData.fase || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fase: e.target.value as FaseTarea || undefined }))}
                    className="w-full px-2.5 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Sin fase</option>
                    <option value="Planeación">Planeación</option>
                    <option value="Ejecución">Ejecución</option>
                    <option value="Comunicación">Comunicación</option>
                    <option value="Seguimiento">Seguimiento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.fechaVencimiento}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                    className="w-full px-2.5 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Responsable <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.responsableId}
                  onChange={handleResponsableChange}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                >
                  {loadingProfesionales ? (
                    <option value="">Cargando profesionales...</option>
                  ) : profesionalesOCI.length === 0 ? (
                    <option value="">No hay profesionales configurados</option>
                  ) : (
                    profesionalesOCI.map(prof => (
                      <option key={prof.id} value={prof.id}>
                        {prof.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Notas adicionales
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none"
                  placeholder="Notas o comentarios..."
                />
              </div>
            </div>

            {/* Footer premium */}
            <div className="border-t-2 border-gray-200 px-5 py-3 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTarea}
                disabled={saving || !formData.titulo.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#2962FF] to-[#003DA5] hover:from-[#1e50e0] hover:to-[#002d8a] text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Crear Tarea
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
