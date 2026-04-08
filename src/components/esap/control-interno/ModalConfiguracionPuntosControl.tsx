/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL DE CONFIGURACIÓN DE PUNTOS DE CONTROL - REDISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Permite configurar puntos de control de una actividad con frecuencias:
 * - Personalizada: Fechas manuales
 * - Anual: 1 punto de control al año
 * - Semestral: 2 puntos de control al año
 * - Trimestral: 4 puntos de control al año
 * - Mensual: 12 puntos de control al año
 * - Semanal: 52 puntos de control al año
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Clock, Plus, Trash2, Save, AlertCircle,
  CheckCircle2, CalendarClock, BarChart3, Zap, TrendingUp, Edit2, Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export type FrecuenciaPuntoControl = 
  | 'personalizada' 
  | 'anual' 
  | 'semestral' 
  | 'trimestral' 
  | 'mensual' 
  | 'semanal';

export type EstadoPuntoControl = 'pendiente' | 'en-revision' | 'completado' | 'atrasado';

export interface PuntoControl {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
  fechaProgramada: string;
  fechaReal: string | null;
  responsable: string;
  estado: EstadoPuntoControl;
  observaciones: string;
  evidencias: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

/** Devuelve el último día del mes dado */
function finDeMes(año: number, mes: number): Date {
  return new Date(año, mes + 1, 0);
}

/** Genera fechas de corte reales basadas en el calendario, no en intervalos iguales */
function generarPuntosControlAutomaticos(
  frecuencia: FrecuenciaPuntoControl,
  fechaInicio: string,
  fechaFin: string,
  nombreActividad: string
): PuntoControl[] {
  if (frecuencia === 'personalizada') return [];

  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');
  const mesesAbrev = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Generar candidatos de fechas de corte según el calendario real
  const candidatos: { fecha: Date; label: string }[] = [];

  if (frecuencia === 'trimestral') {
    // Cortes trimestrales: 31 Mar, 30 Jun, 30 Sep, 31 Dic
    const mesesCorteQ = [2, 5, 8, 11]; // 0-indexed
    const labelsQ = ['Q1', 'Q2', 'Q3', 'Q4'];
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      mesesCorteQ.forEach((mes, idx) => {
        const f = finDeMes(año, mes);
        if (f > inicio && f <= fin) {
          candidatos.push({ fecha: f, label: `Corte ${labelsQ[idx]} ${año}` });
        }
      });
    }
  } else if (frecuencia === 'semestral') {
    // Cortes semestrales: 30 Jun, 31 Dic
    const mesesCorteS = [5, 11];
    const labelsS = ['Semestre 1', 'Semestre 2'];
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      mesesCorteS.forEach((mes, idx) => {
        const f = finDeMes(año, mes);
        if (f > inicio && f <= fin) {
          candidatos.push({ fecha: f, label: `Corte ${labelsS[idx]} ${año}` });
        }
      });
    }
  } else if (frecuencia === 'mensual') {
    // Último día de cada mes dentro del rango
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (cursor <= fin) {
      const f = finDeMes(cursor.getFullYear(), cursor.getMonth());
      if (f > inicio && f <= fin) {
        candidatos.push({
          fecha: f,
          label: `Corte ${mesesAbrev[f.getMonth()]} ${f.getFullYear()}`
        });
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else if (frecuencia === 'anual') {
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      const f = finDeMes(año, 11); // 31 Dic
      if (f > inicio && f <= fin) {
        candidatos.push({ fecha: f, label: `Corte Anual ${año}` });
      }
    }
  } else if (frecuencia === 'semanal') {
    // Cada 7 días a partir del inicio
    const cursor = new Date(inicio);
    cursor.setDate(cursor.getDate() + 7);
    let semana = 1;
    while (cursor <= fin) {
      candidatos.push({
        fecha: new Date(cursor),
        label: `Corte Semana ${semana}`
      });
      cursor.setDate(cursor.getDate() + 7);
      semana++;
    }
  }

  // Si no hay candidatos dentro del rango (periodo muy corto), caer en 1 corte al final
  if (candidatos.length === 0) {
    candidatos.push({ fecha: fin, label: 'Corte Final' });
  }

  return candidatos.map((c, i) => ({
    id: `pc-auto-${i + 1}`,
    orden: i + 1,
    nombre: c.label,
    descripcion: '',
    fechaProgramada: c.fecha.toISOString().split('T')[0],
    fechaReal: null,
    responsable: '',
    estado: 'pendiente',
    observaciones: '',
    evidencias: []
  }));
}

function formatearFecha(fecha: string): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const f = new Date(fecha + 'T00:00:00');
  return `${f.getDate()} ${meses[f.getMonth()]} ${f.getFullYear()}`;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface ModalConfiguracionPuntosControlProps {
  isOpen: boolean;
  onClose: () => void;
  nombreActividad: string;
  fechaInicioActividad: string;
  fechaFinActividad: string;
  fechaCorte?: string;
  puntosControlExistentes?: PuntoControl[];
  frecuenciaActual?: FrecuenciaPuntoControl;
  onGuardar: (puntos: PuntoControl[], frecuencia: FrecuenciaPuntoControl, fechaCorte: string) => void;
}

export function ModalConfiguracionPuntosControl({
  isOpen,
  onClose,
  nombreActividad,
  fechaInicioActividad,
  fechaFinActividad,
  fechaCorte,
  puntosControlExistentes = [],
  frecuenciaActual,
  onGuardar
}: ModalConfiguracionPuntosControlProps) {
  const [frecuenciaSeleccionada, setFrecuenciaSeleccionada] = useState<FrecuenciaPuntoControl>(
    frecuenciaActual || 'trimestral'
  );
  const [fechaCorteLocal, setFechaCorteLocal] = useState<string>(fechaCorte || fechaFinActividad);
  const [puntosControl, setPuntosControl] = useState<PuntoControl[]>(puntosControlExistentes);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [puntoEditando, setPuntoEditando] = useState<string | null>(null);
  // Confirmación inline al cambiar frecuencia
  const [frecuenciaPendiente, setFrecuenciaPendiente] = useState<FrecuenciaPuntoControl | null>(null);
  
  // Form para nuevo punto personalizado
  const [nuevoPunto, setNuevoPunto] = useState({
    nombre: '',
    descripcion: '',
    fechaProgramada: ''
  });

  // Form para editar punto existente
  const [puntoEditandoData, setPuntoEditandoData] = useState({
    nombre: '',
    descripcion: '',
    fechaProgramada: ''
  });

  // Regenerar puntos cuando cambia la frecuencia o la fecha de corte
  useEffect(() => {
    if (frecuenciaSeleccionada !== 'personalizada') {
      const puntosGenerados = generarPuntosControlAutomaticos(
        frecuenciaSeleccionada,
        fechaInicioActividad,
        fechaCorteLocal || fechaFinActividad,
        nombreActividad
      );
      setPuntosControl(puntosGenerados);
    } else {
      // Mantener existentes o limpiar
      setPuntosControl(puntosControlExistentes.length > 0 ? puntosControlExistentes : []);
    }
  }, [frecuenciaSeleccionada, fechaInicioActividad, fechaCorteLocal]);

  const handleAgregarPunto = () => {
    if (!nuevoPunto.nombre.trim()) {
      toast.error('El nombre del período es obligatorio');
      return;
    }
    if (!nuevoPunto.fechaProgramada) {
      toast.error('La fecha de corte es obligatoria');
      return;
    }

    const nuevo: PuntoControl = {
      id: `pc-${Date.now()}`,
      orden: puntosControl.length + 1,
      nombre: nuevoPunto.nombre,
      descripcion: nuevoPunto.descripcion,
      fechaProgramada: nuevoPunto.fechaProgramada,
      fechaReal: null,
      responsable: '',
      estado: 'pendiente',
      observaciones: '',
      evidencias: []
    };

    setPuntosControl([...puntosControl, nuevo].sort((a, b) => 
      new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime()
    ));

    // Reset form
    setNuevoPunto({ nombre: '', descripcion: '', fechaProgramada: '' });
    setMostrarFormNuevo(false);
    toast.success('Fecha de corte agregada');
  };

  const handleEliminarPunto = (id: string) => {
    setPuntosControl(puntosControl.filter(p => p.id !== id));
    toast.success('Fecha de corte eliminada');
  };

  const handleIniciarEdicion = (punto: PuntoControl) => {
    setPuntoEditando(punto.id);
    setPuntoEditandoData({
      nombre: punto.nombre,
      descripcion: punto.descripcion,
      fechaProgramada: punto.fechaProgramada
    });
  };

  const handleCancelarEdicion = () => {
    setPuntoEditando(null);
    setPuntoEditandoData({ nombre: '', descripcion: '', fechaProgramada: '' });
  };

  const handleGuardarEdicion = (id: string) => {
    if (!puntoEditandoData.nombre.trim()) {
      toast.error('El nombre del período es obligatorio');
      return;
    }
    if (!puntoEditandoData.fechaProgramada) {
      toast.error('La fecha de corte es obligatoria');
      return;
    }

    setPuntosControl(
      puntosControl.map(p => 
        p.id === id 
          ? { ...p, nombre: puntoEditandoData.nombre, descripcion: puntoEditandoData.descripcion, fechaProgramada: puntoEditandoData.fechaProgramada }
          : p
      ).sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())
    );

    setPuntoEditando(null);
    setPuntoEditandoData({ nombre: '', descripcion: '', fechaProgramada: '' });
    toast.success('Fecha de corte actualizada');
  };

  const handleCambiarFrecuencia = (nuevaFrecuencia: FrecuenciaPuntoControl) => {
    if (nuevaFrecuencia === frecuenciaSeleccionada) return;
    // Si ya hay puntos, mostrar confirmación inline
    if (puntosControl.length > 0) {
      setFrecuenciaPendiente(nuevaFrecuencia);
      return;
    }
    setFrecuenciaSeleccionada(nuevaFrecuencia);
  };

  const confirmarCambioFrecuencia = () => {
    if (frecuenciaPendiente) {
      setFrecuenciaSeleccionada(frecuenciaPendiente);
      setFrecuenciaPendiente(null);
    }
  };

  const cancelarCambioFrecuencia = () => {
    setFrecuenciaPendiente(null);
  };

  const handleGuardar = () => {
    if (puntosControl.length === 0) {
      toast.error('Debe configurar al menos una fecha de corte');
      return;
    }

    onGuardar(puntosControl, frecuenciaSeleccionada, fechaCorteLocal);
    toast.success(`${puntosControl.length} fecha${puntosControl.length !== 1 ? 's' : ''} de corte configurada${puntosControl.length !== 1 ? 's' : ''}`);
    onClose();
  };

  const frecuenciasDisponibles: { 
    value: FrecuenciaPuntoControl; 
    label: string; 
    descripcion: string; 
    color: string;
    cantidad: number;
  }[] = [
    { value: 'mensual', label: 'Mensual', descripcion: '12 checkpoints', color: 'bg-blue-500', cantidad: 12 },
    { value: 'trimestral', label: 'Trimestral', descripcion: '4 checkpoints', color: 'bg-purple-500', cantidad: 4 },
    { value: 'semestral', label: 'Semestral', descripcion: '2 checkpoints', color: 'bg-green-500', cantidad: 2 },
    { value: 'anual', label: 'Anual', descripcion: '1 checkpoint', color: 'bg-orange-500', cantidad: 1 },
    { value: 'semanal', label: 'Semanal', descripcion: '52 checkpoints', color: 'bg-red-500', cantidad: 52 },
    { value: 'personalizada', label: 'Personalizada', descripcion: 'Fechas manuales', color: 'bg-gray-500', cantidad: 0 }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] px-6 py-5 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configurar Fechas de Corte</h2>
                  <p className="text-white/90 text-sm mt-0.5">{nombreActividad}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Periodo de la actividad */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Periodo de seguimiento</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Fecha inicio: referencia fija del plan */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                      Inicio del plan
                      <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Fijo</span>
                    </label>
                    <input
                      type="date"
                      value={fechaInicioActividad}
                      readOnly
                      className="w-full px-3 py-2 bg-blue-100/50 border-2 border-blue-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  {/* Fecha de corte: editable */}
                  <div>
                    <label className="block text-xs font-semibold text-orange-700 mb-1.5 flex items-center gap-1">
                      📅 Fecha de corte
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">Editable</span>
                    </label>
                    <input
                      type="date"
                      value={fechaCorteLocal}
                      min={fechaInicioActividad}
                      onChange={(e) => setFechaCorteLocal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-orange-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  La fecha de inicio es fija (viene del plan). La fecha de corte define hasta cuándo se programan los checkpoints.
                </p>
              </div>

              {/* Selector de frecuencia */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Frecuencia de seguimiento</h3>
                </div>
                
                {/* Mensaje informativo sobre edición */}
                {frecuenciaSeleccionada !== 'personalizada' && puntosControl.length > 0 && (
                  <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      <span className="font-semibold">Modo automático:</span> Las fechas de corte se generan según la frecuencia seleccionada. Puedes ajustar cada fecha individualmente, o cambiar a <span className="font-bold">modo Personalizada</span> para control total.
                    </p>
                  </div>
                )}
                
                {/* Confirmación inline al cambiar frecuencia */}
                {frecuenciaPendiente && (() => {
                  const frecInfo = frecuenciasDisponibles.find(f => f.value === frecuenciaPendiente);
                  return (
                    <div className="mb-3 bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-amber-900">¿Cambiar a frecuencia {frecInfo?.label}?</p>
                          <p className="text-xs text-amber-700 mt-1">
                            {frecuenciaPendiente === 'personalizada'
                              ? `Las ${puntosControl.length} fechas actuales se mantendrán y podrás editarlas manualmente.`
                              : `Las ${puntosControl.length} fechas actuales serán reemplazadas por ${frecInfo?.cantidad} nuevas fechas de corte auto-generadas.`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button
                          onClick={cancelarCambioFrecuencia}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={confirmarCambioFrecuencia}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                        >
                          Sí, cambiar
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {frecuenciasDisponibles.map((frec) => (
                    <button
                      key={frec.value}
                      onClick={() => handleCambiarFrecuencia(frec.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        frecuenciaSeleccionada === frec.value
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${frec.color}`} />
                        <span className="font-semibold text-gray-900 text-sm">{frec.label}</span>
                      </div>
                      <p className="text-xs text-gray-600">{frec.descripcion}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de puntos de control generados */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">
                      Fechas de corte ({puntosControl.length})
                    </h3>
                  </div>
                  {frecuenciaSeleccionada === 'personalizada' && (
                    <button
                      onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  )}
                </div>

                {/* Formulario nuevo período (solo personalizada) */}
                {frecuenciaSeleccionada === 'personalizada' && mostrarFormNuevo && (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-3 space-y-3">
                    <input
                      type="text"
                      placeholder="Nombre del período / corte"
                      value={nuevoPunto.nombre}
                      onChange={(e) => setNuevoPunto({ ...nuevoPunto, nombre: e.target.value })}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Fecha de corte</label>
                        <input
                          type="date"
                          value={nuevoPunto.fechaProgramada}
                          onChange={(e) => setNuevoPunto({ ...nuevoPunto, fechaProgramada: e.target.value })}
                          className="w-full px-3 py-2 bg-white border-2 border-orange-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        onClick={handleAgregarPunto}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Agregar
                      </button>
                      <button
                        onClick={() => {
                          setMostrarFormNuevo(false);
                          setNuevoPunto({ nombre: '', descripcion: '', fechaProgramada: '' });
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de fechas de corte */}
                {puntosControl.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium mb-1">No hay fechas de corte configuradas</p>
                    <p className="text-sm text-gray-500">
                      {frecuenciaSeleccionada === 'personalizada'
                        ? 'Haz clic en "Agregar" para añadir una fecha de corte manualmente'
                        : 'Selecciona una frecuencia para generar fechas automáticamente'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {puntosControl.map((punto, index) => (
                      puntoEditando === punto.id ? (
                        // MODO EDICIÓN INLINE (solo personalizada)
                        <div key={punto.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={puntoEditandoData.nombre}
                              onChange={(e) => setPuntoEditandoData({ ...puntoEditandoData, nombre: e.target.value })}
                              placeholder="Nombre del período"
                              className="w-full px-3 py-2 bg-white border-2 border-yellow-400 rounded-lg text-sm font-medium focus:outline-none focus:border-yellow-600"
                            />
                            <div className="flex gap-2 items-center">
                              <label className="text-xs text-gray-600 whitespace-nowrap">Fecha de corte:</label>
                              <input
                                type="date"
                                value={puntoEditandoData.fechaProgramada}
                                onChange={(e) => setPuntoEditandoData({ ...puntoEditandoData, fechaProgramada: e.target.value })}
                                className="flex-1 px-3 py-2 bg-white border-2 border-yellow-400 rounded-lg text-sm focus:outline-none focus:border-yellow-600"
                              />
                              <button
                                onClick={() => handleGuardarEdicion(punto.id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelarEdicion}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // VISTA NORMAL
                        <div
                          key={punto.id}
                          className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 hover:border-blue-200 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="flex-1 font-semibold text-sm text-gray-800">{punto.nombre}</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <input
                              type="date"
                              value={punto.fechaProgramada}
                              onChange={(e) => setPuntosControl(prev =>
                                prev.map(p => p.id === punto.id ? { ...p, fechaProgramada: e.target.value } : p)
                              )}
                              className="px-3 py-1.5 border-2 border-orange-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          {frecuenciaSeleccionada === 'personalizada' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleIniciarEdicion(punto)}
                                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                                title="Editar nombre"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEliminarPunto(punto.id)}
                                className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Información */}
              {puntosControl.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 text-sm">
                        {puntosControl.length} fecha{puntosControl.length !== 1 ? 's' : ''} de corte configurada{puntosControl.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Los auditores podrán registrar el seguimiento en cada fecha de corte programada
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-600/30"
              >
                <Save className="w-4 h-4" />
                Guardar Configuración
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}