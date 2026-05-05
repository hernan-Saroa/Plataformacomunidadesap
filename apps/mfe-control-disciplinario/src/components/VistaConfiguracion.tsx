/**
 * VISTA CONFIGURACIÓN - TÉRMINOS Y ALERTAS ✨
 * Gestión de reglas de alerta y días festivos
 * Diseño corporativo ESAP (SIGL v5.0)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Bell, Calendar, Plus, Edit2, Trash2, Save, X,
  Mail, Eye, Clock, CheckCircle, AlertCircle, Zap, Target
} from 'lucide-react';
import { toast } from 'sonner';
import terminosAlertasService from '../../../services/api/terminosAlertas.service';
import type { DiaFestivo as DiaFestivoAPI, ReglaAlerta as ReglaAlertaAPI } from '../../../services/api/terminosAlertas.service';

interface ReglaAlerta {
  id: string;
  nombre: string;
  diasAnticipacion: number;
  activa: boolean;
  enviarEmail: boolean;
  mostrarPanel: boolean;
  descripcion: string;
  color?: string;
}

interface DiaFestivo {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
}

interface VistaConfiguracionProps {
  reglasAlerta?: ReglaAlerta[];
  diasFestivos?: DiaFestivo[];
  onActualizarReglas?: (reglas: ReglaAlerta[]) => void;
  onActualizarFestivos?: (festivos: DiaFestivo[]) => void;
}

export function VistaConfiguracion({
  reglasAlerta: reglasInicial = [],
  diasFestivos: festivosInicial = [],
  onActualizarReglas,
  onActualizarFestivos
}: VistaConfiguracionProps) {
  const [seccionActiva, setSeccionActiva] = useState<'reglas' | 'festivos'>('reglas');
  const [reglas, setReglas] = useState<ReglaAlerta[]>([]);
  const [festivos, setFestivos] = useState<DiaFestivo[]>([]);
  const [loading, setLoading] = useState(true);

  const [editandoRegla, setEditandoRegla] = useState<ReglaAlerta | null>(null);
  const [mostrarModalRegla, setMostrarModalRegla] = useState(false);
  const [mostrarModalFestivo, setMostrarModalFestivo] = useState(false);
  const [editandoFestivo, setEditandoFestivo] = useState<DiaFestivo | null>(null);

  // Estados del formulario de regla
  const [nombreRegla, setNombreRegla] = useState('');
  const [diasAnticipacion, setDiasAnticipacion] = useState(5);
  const [enviarEmail, setEnviarEmail] = useState(true);
  const [mostrarPanel, setMostrarPanel] = useState(true);
  const [descripcionRegla, setDescripcionRegla] = useState('');
  const [colorRegla, setColorRegla] = useState('#F59E0B');

  // Estados del formulario de festivo
  const [fechaFestivo, setFechaFestivo] = useState('');
  const [descripcionFestivo, setDescripcionFestivo] = useState('');
  const [tipoFestivo, setTipoFestivo] = useState<'nacional' | 'regional' | 'institucional'>('nacional');
  const [territorioFestivo, setTerritorioFestivo] = useState('');

  // Cargar datos del backend al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar reglas de alerta
      const reglasResponse = await terminosAlertasService.listarReglasAlerta();
      const reglasApi = reglasResponse.reglas || [];
      setReglas(reglasApi.map(r => ({
        ...r,
        color: '#F59E0B' // Color por defecto si no viene del backend
      })));

      // Cargar días festivos
      const festivosResponse = await terminosAlertasService.listarFestivos();
      const festivosApi = (festivosResponse.festivos || []).filter(f => f.activo !== false);
      setFestivos(festivosApi);

    } catch (error: any) {
      console.error('Error cargando configuración:', error);
      toast.error('Error al cargar configuración', {
        description: error.message || 'No se pudieron cargar los datos'
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS - REGLAS
  // ============================================================================

  const handleNuevaRegla = () => {
    setEditandoRegla(null);
    setNombreRegla('');
    setDiasAnticipacion(5);
    setEnviarEmail(true);
    setMostrarPanel(true);
    setDescripcionRegla('');
    setColorRegla('#F59E0B');
    setMostrarModalRegla(true);
  };

  const handleEditarRegla = (regla: ReglaAlerta) => {
    setEditandoRegla(regla);
    setNombreRegla(regla.nombre);
    setDiasAnticipacion(regla.diasAnticipacion);
    setEnviarEmail(regla.enviarEmail);
    setMostrarPanel(regla.mostrarPanel);
    setDescripcionRegla(regla.descripcion);
    setColorRegla(regla.color || '#F59E0B');
    setMostrarModalRegla(true);
  };

  const handleGuardarRegla = async () => {
    if (!nombreRegla.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      if (editandoRegla) {
        // Editar existente
        const reglaActualizada = await terminosAlertasService.actualizarReglaAlerta(
          editandoRegla.id,
          {
            nombre: nombreRegla,
            diasAnticipacion,
            enviarEmail,
            mostrarPanel,
            descripcion: descripcionRegla,
            activa: editandoRegla.activa
          }
        );

        const nuevasReglas = reglas.map(r =>
          r.id === editandoRegla.id
            ? { ...reglaActualizada, color: colorRegla }
            : r
        );
        setReglas(nuevasReglas);
        onActualizarReglas?.(nuevasReglas);
        toast.success('Regla actualizada', {
          description: 'Los cambios han sido guardados en el servidor'
        });
      } else {
        // Crear nueva
        const nuevaRegla = await terminosAlertasService.crearReglaAlerta({
          nombre: nombreRegla,
          diasAnticipacion,
          activa: true,
          enviarEmail,
          mostrarPanel,
          descripcion: descripcionRegla
        });

        const nuevasReglas = [...reglas, { ...nuevaRegla, color: colorRegla }];
        setReglas(nuevasReglas);
        onActualizarReglas?.(nuevasReglas);
        toast.success('Regla creada', {
          description: 'La nueva regla ha sido guardada en el servidor'
        });
      }

      setMostrarModalRegla(false);
    } catch (error: any) {
      console.error('Error al guardar regla:', error);
      toast.error('Error al guardar', {
        description: error.message || 'No se pudo guardar la regla'
      });
    }
  };

  const handleEliminarRegla = async (id: string) => {
    try {
      await terminosAlertasService.eliminarReglaAlerta(id);
      const nuevasReglas = reglas.filter(r => r.id !== id);
      setReglas(nuevasReglas);
      onActualizarReglas?.(nuevasReglas);
      toast.success('Regla eliminada', {
        description: 'La regla ha sido eliminada del servidor'
      });
    } catch (error: any) {
      console.error('Error al eliminar regla:', error);
      toast.error('Error al eliminar', {
        description: error.message || 'No se pudo eliminar la regla'
      });
    }
  };

  const handleToggleRegla = async (id: string) => {
    try {
      const reglaActualizada = await terminosAlertasService.toggleReglaAlerta(id);
      const nuevasReglas = reglas.map(r =>
        r.id === id ? { ...r, activa: reglaActualizada.activa } : r
      );
      setReglas(nuevasReglas);
      onActualizarReglas?.(nuevasReglas);

      const regla = nuevasReglas.find(r => r.id === id);
      toast.success(regla?.activa ? 'Regla activada' : 'Regla desactivada');
    } catch (error: any) {
      console.error('Error al cambiar estado de regla:', error);
      toast.error('Error', {
        description: error.message || 'No se pudo cambiar el estado'
      });
    }
  };

  // ============================================================================
  // HANDLERS - FESTIVOS
  // ============================================================================

  const handleNuevoFestivo = () => {
    setEditandoFestivo(null);
    setFechaFestivo('');
    setDescripcionFestivo('');
    setTipoFestivo('nacional');
    setTerritorioFestivo('');
    setMostrarModalFestivo(true);
  };

  const handleEditarFestivo = (festivo: DiaFestivo) => {
    setEditandoFestivo(festivo);
    setFechaFestivo(festivo.fecha);
    setDescripcionFestivo(festivo.descripcion);
    setTipoFestivo(festivo.tipo);
    setTerritorioFestivo(festivo.territorio || '');
    setMostrarModalFestivo(true);
  };

  const handleGuardarFestivo = async () => {
    if (!fechaFestivo) {
      toast.error('La fecha es requerida');
      return;
    }
    if (!descripcionFestivo.trim()) {
      toast.error('La descripción es requerida');
      return;
    }

    try {
      if (editandoFestivo) {
        // Editar existente
        const festivoActualizado = await terminosAlertasService.actualizarFestivo(
          editandoFestivo.id,
          {
            fecha: fechaFestivo,
            descripcion: descripcionFestivo,
            tipo: tipoFestivo,
            territorio: territorioFestivo || undefined
          }
        );

        const nuevosFestivos = festivos.map(f =>
          f.id === editandoFestivo.id ? festivoActualizado : f
        );
        setFestivos(nuevosFestivos);
        onActualizarFestivos?.(nuevosFestivos);
        toast.success('Festivo actualizado en el servidor');
      } else {
        // Crear nuevo
        const nuevoFestivo = await terminosAlertasService.crearFestivo({
          fecha: fechaFestivo,
          descripcion: descripcionFestivo,
          tipo: tipoFestivo,
          territorio: territorioFestivo || undefined
        });

        const nuevosFestivos = [...festivos, nuevoFestivo].sort((a, b) =>
          a.fecha.localeCompare(b.fecha)
        );
        setFestivos(nuevosFestivos);
        onActualizarFestivos?.(nuevosFestivos);
        toast.success('Festivo creado en el servidor');
      }

      setMostrarModalFestivo(false);
    } catch (error: any) {
      console.error('Error al guardar festivo:', error);
      toast.error('Error al guardar', {
        description: error.message || 'No se pudo guardar el festivo'
      });
    }
  };

  const handleEliminarFestivo = async (id: string) => {
    try {
      await terminosAlertasService.eliminarFestivo(id);
      const nuevosFestivos = festivos.filter(f => f.id !== id);
      setFestivos(nuevosFestivos);
      onActualizarFestivos?.(nuevosFestivos);
      toast.success('Festivo eliminado del servidor');
    } catch (error: any) {
      console.error('Error al eliminar festivo:', error);
      toast.error('Error al eliminar', {
        description: error.message || 'No se pudo eliminar el festivo'
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="mb-6 border-b-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex gap-1">
          <button
            onClick={() => setSeccionActiva('reglas')}
            className="px-4 py-3 font-semibold text-sm flex items-center gap-2 transition-all border-b-2"
            style={{
              color: seccionActiva === 'reglas' ? '#003DA5' : '#6B7280',
              borderColor: seccionActiva === 'reglas' ? '#003DA5' : 'transparent',
              background: seccionActiva === 'reglas' ? '#EFF6FF' : 'transparent'
            }}
          >
            <Bell className="w-4 h-4" />
            Reglas de Alerta
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{
              background: seccionActiva === 'reglas' ? '#003DA5' : '#E5E7EB',
              color: seccionActiva === 'reglas' ? 'white' : '#6B7280'
            }}>
              {reglas.filter(r => r.activa).length}
            </div>
          </button>

          <button
            onClick={() => setSeccionActiva('festivos')}
            className="px-4 py-3 font-semibold text-sm flex items-center gap-2 transition-all border-b-2"
            style={{
              color: seccionActiva === 'festivos' ? '#003DA5' : '#6B7280',
              borderColor: seccionActiva === 'festivos' ? '#003DA5' : 'transparent',
              background: seccionActiva === 'festivos' ? '#EFF6FF' : 'transparent'
            }}
          >
            <Calendar className="w-4 h-4" />
            Días Festivos
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{
              background: seccionActiva === 'festivos' ? '#003DA5' : '#E5E7EB',
              color: seccionActiva === 'festivos' ? 'white' : '#6B7280'
            }}>
              {festivos.length}
            </div>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {seccionActiva === 'reglas' && (
          <motion.div
            key="reglas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                  Reglas de Alerta
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Configura cuándo y cómo se envían las alertas de términos
                </p>
              </div>
              <button
                onClick={handleNuevaRegla}
                className="px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
              >
                <Plus className="w-4 h-4" />
                Nueva Regla
              </button>
            </div>

            {/* Listado de reglas */}
            <div className="space-y-3">
              {reglas.map(regla => (
                <div
                  key={regla.id}
                  className="p-4 rounded-xl border-2"
                  style={{
                    borderColor: regla.activa ? (regla.color || '#F59E0B') : '#E5E7EB',
                    background: regla.activa ? `${regla.color || '#F59E0B'}10` : '#F9FAFB'
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: regla.color || '#F59E0B' }}
                        />
                        <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>
                          {regla.nombre}
                        </h4>
                        <div
                          className="px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            background: regla.activa ? '#ECFDF5' : '#F3F4F6',
                            color: regla.activa ? '#065F46' : '#6B7280',
                            border: `1px solid ${regla.activa ? '#10B981' : '#E5E7EB'}`
                          }}
                        >
                          {regla.activa ? '✓ Activa' : '✗ Inactiva'}
                        </div>
                      </div>

                      <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                        {regla.descripcion}
                      </p>

                      <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{regla.diasAnticipacion} días de anticipación</span>
                        </div>
                        {regla.enviarEmail && (
                          <div className="flex items-center gap-1" style={{ color: '#2563EB' }}>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </div>
                        )}
                        {regla.mostrarPanel && (
                          <div className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Panel visual</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRegla(regla.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/50 transition-colors"
                        title={regla.activa ? 'Desactivar' : 'Activar'}
                      >
                        <Zap className="w-4 h-4" style={{ color: regla.activa ? '#10B981' : '#9CA3AF' }} />
                      </button>
                      <button
                        onClick={() => handleEditarRegla(regla)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" style={{ color: '#2563EB' }} />
                      </button>
                      <button
                        onClick={() => handleEliminarRegla(regla.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {seccionActiva === 'festivos' && (
          <motion.div
            key="festivos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
                  Días Festivos
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Gestiona los días no hábiles para el cálculo de términos
                </p>
              </div>
              <button
                onClick={handleNuevoFestivo}
                className="px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
              >
                <Plus className="w-4 h-4" />
                Nuevo Festivo
              </button>
            </div>

            {/* Listado de festivos */}
            <div className="space-y-3">
              {festivos.map(festivo => (
                <div
                  key={festivo.id}
                  className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                  style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center">
                        <div className="text-3xl mb-1">🎉</div>
                        <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                          {new Date(festivo.fecha).toLocaleDateString('es-CO', { day: '2-digit' })}
                        </p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>
                          {new Date(festivo.fecha).toLocaleDateString('es-CO', { month: 'short' })}
                        </p>
                      </div>

                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>
                          {festivo.descripcion}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div
                            className="px-2 py-0.5 rounded-md text-xs font-semibold"
                            style={{
                              background: festivo.tipo === 'nacional' ? '#EFF6FF' :
                                         festivo.tipo === 'regional' ? '#FEF3C7' : '#F3F4F6',
                              color: festivo.tipo === 'nacional' ? '#1E40AF' :
                                     festivo.tipo === 'regional' ? '#92400E' : '#6B7280'
                            }}
                          >
                            {festivo.tipo === 'nacional' ? 'Nacional' :
                             festivo.tipo === 'regional' ? 'Regional' : 'Institucional'}
                          </div>
                          {festivo.territorio && (
                            <span className="text-xs" style={{ color: '#6B7280' }}>
                              {festivo.territorio}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditarFestivo(festivo)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" style={{ color: '#2563EB' }} />
                      </button>
                      <button
                        onClick={() => handleEliminarFestivo(festivo.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Regla */}
      <AnimatePresence>
        {mostrarModalRegla && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: '#FFFFFF' }}
            >
              {/* Header */}
              <div className="p-6 border-b-2" style={{ borderColor: '#E5E7EB', background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                    {editandoRegla ? 'Editar Regla de Alerta' : 'Nueva Regla de Alerta'}
                  </h3>
                  <button
                    onClick={() => setMostrarModalRegla(false)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" style={{ color: 'white' }} />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Nombre de la Regla *
                  </label>
                  <input
                    type="text"
                    value={nombreRegla}
                    onChange={(e) => setNombreRegla(e.target.value)}
                    placeholder="Ej: Alerta Crítica"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Descripción
                  </label>
                  <textarea
                    value={descripcionRegla}
                    onChange={(e) => setDescripcionRegla(e.target.value)}
                    placeholder="Describe cuándo se activa esta regla..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Días de Anticipación *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={diasAnticipacion}
                      onChange={(e) => setDiasAnticipacion(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Color
                    </label>
                    <input
                      type="color"
                      value={colorRegla}
                      onChange={(e) => setColorRegla(e.target.value)}
                      className="w-full h-12 rounded-xl border-2 cursor-pointer"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      checked={enviarEmail}
                      onChange={(e) => setEnviarEmail(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Mail className="w-5 h-5" style={{ color: '#2563EB' }} />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>Enviar Email</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Notificar por correo electrónico</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      checked={mostrarPanel}
                      onChange={(e) => setMostrarPanel(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Eye className="w-5 h-5" style={{ color: '#F59E0B' }} />
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>Mostrar en Panel</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Mostrar alerta visual en el dashboard</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t-2 flex items-center justify-end gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                <button
                  onClick={() => setMostrarModalRegla(false)}
                  className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarRegla}
                  className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Festivo */}
      <AnimatePresence>
        {mostrarModalFestivo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: '#FFFFFF' }}
            >
              {/* Header */}
              <div className="p-6 border-b-2" style={{ borderColor: '#E5E7EB', background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold" style={{ color: 'white' }}>
                    {editandoFestivo ? 'Editar Día Festivo' : 'Nuevo Día Festivo'}
                  </h3>
                  <button
                    onClick={() => setMostrarModalFestivo(false)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" style={{ color: 'white' }} />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={fechaFestivo}
                    onChange={(e) => setFechaFestivo(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Descripción *
                  </label>
                  <input
                    type="text"
                    value={descripcionFestivo}
                    onChange={(e) => setDescripcionFestivo(e.target.value)}
                    placeholder="Ej: Día de la Independencia"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Tipo *
                  </label>
                  <select
                    value={tipoFestivo}
                    onChange={(e) => setTipoFestivo(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <option value="nacional">Nacional</option>
                    <option value="regional">Regional</option>
                    <option value="institucional">Institucional</option>
                  </select>
                </div>

                {(tipoFestivo === 'regional' || tipoFestivo === 'institucional') && (
                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Territorio / Ámbito
                    </label>
                    <input
                      type="text"
                      value={territorioFestivo}
                      onChange={(e) => setTerritorioFestivo(e.target.value)}
                      placeholder="Ej: Bogotá D.C."
                      className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t-2 flex items-center justify-end gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                <button
                  onClick={() => setMostrarModalFestivo(false)}
                  className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarFestivo}
                  className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
