/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL DE CONFIGURACIÓN DE PUNTOS DE CONTROL - REDISEÑO WORLD CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Permite configurar puntos de control de una actividad con frecuencias:
 * - Personalizada: Fechas manuales
 * - Anual: 1 punto de control al año
 * - Semestral: 2 puntos de control al año
 * - Trimestral: 3 puntos de control al año (Mar, Jun, Sep)
 * - Mensual: 12 puntos de control al año
 * - Semanal: 52 puntos de control al año
 * 
 * SEGUIMIENTO: Cada corte tiene su fecha de seguimiento (+2 meses), 
 * independiente de la fecha de fin de la actividad.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Clock, Plus, Trash2, Save, AlertCircle,
  CheckCircle2, CalendarClock, BarChart3, Zap, Edit2, Check
} from 'lucide-react';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export type FrecuenciaPuntoControl = 
  | 'personalizada' 
  | 'anual' 
  | 'semestral' 
  | 'trimestral' 
  | 'bimensual'
  | 'mensual' 
  | 'semanal';

export type EstadoPuntoControl = 'pendiente' | 'en-revision' | 'completado' | 'atrasado';

export interface PuntoControl {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
  fechaProgramada: string;
  fechaSeguimiento: string | null;
  fechaReal: string | null;
  responsable: string;
  estado: EstadoPuntoControl;
  observaciones: string;
  evidencias: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

function finDeMes(año: number, mes: number): Date {
  return new Date(año, mes + 1, 0);
}

function sumarMeses(fechaStr: string, meses: number): string {
  const d = new Date(`${fechaStr}T00:00:00`);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split('T')[0];
}

function generarPuntosControlAutomaticos(
  frecuencia: FrecuenciaPuntoControl,
  fechaInicio: string,
  fechaFin: string,
  _nombreActividad: string
): PuntoControl[] {
  if (frecuencia === 'personalizada') return [];

  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  const candidatos: Date[] = [];

  if (frecuencia === 'trimestral') {
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      [2, 5, 8].forEach((mes) => {
        const f = finDeMes(año, mes);
        if (f > inicio && f <= fin) candidatos.push(f);
      });
    }
  } else if (frecuencia === 'semestral') {
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      [5, 11].forEach((mes) => {
        const f = finDeMes(año, mes);
        if (f > inicio && f <= fin) candidatos.push(f);
      });
    }
  } else if (frecuencia === 'bimensual') {
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      [1, 3, 5, 7, 9, 11].forEach((mes) => {
        const f = finDeMes(año, mes);
        if (f > inicio && f <= fin) candidatos.push(f);
      });
    }
  } else if (frecuencia === 'mensual') {
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (cursor <= fin) {
      const f = finDeMes(cursor.getFullYear(), cursor.getMonth());
      if (f > inicio && f <= fin) candidatos.push(f);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else if (frecuencia === 'anual') {
    for (let año = inicio.getFullYear(); año <= fin.getFullYear(); año++) {
      const f = finDeMes(año, 11);
      if (f > inicio && f <= fin) candidatos.push(f);
    }
  } else if (frecuencia === 'semanal') {
    const cursor = new Date(inicio);
    cursor.setDate(cursor.getDate() + 7);
    while (cursor <= fin) {
      candidatos.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  if (candidatos.length === 0) candidatos.push(fin);

  return candidatos.map((fecha, i) => {
    const fechaProgramada = fecha.toISOString().split('T')[0];
    return {
      id: `pc-auto-${i + 1}`,
      orden: i + 1,
      nombre: `Corte ${i + 1}`,
      descripcion: '',
      fechaProgramada,
      fechaSeguimiento: sumarMeses(fechaProgramada, 2),
      fechaReal: null,
      responsable: '',
      estado: 'pendiente',
      observaciones: '',
      evidencias: []
    };
  });
}

function formatearFecha(fecha: string): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const f = new Date(fecha + 'T00:00:00');
  return `${f.getDate()} ${meses[f.getMonth()]} ${f.getFullYear()}`;
}

/** Determina el badge de estado visual de un checkpoint */
function getEstadoBadge(punto: PuntoControl, esActivo: boolean): { label: string; classes: string } {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(punto.fechaProgramada + 'T00:00:00');

  if (punto.estado === 'completado') {
    return { label: '✅ Completado', classes: 'bg-green-100 text-green-700 border border-green-200' };
  }
  if (fecha < hoy) {
    return { label: '⚠️ Vencido', classes: 'bg-red-100 text-red-700 border border-red-200' };
  }
  if (esActivo) {
    return { label: '🔵 Activo', classes: 'bg-blue-100 text-blue-700 border border-blue-200' };
  }
  return { label: '⏳ Futuro', classes: 'bg-gray-100 text-gray-500 border border-gray-200' };
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
  const [fechaCorteLocal, setFechaCorteLocal] = useState<string>(() => fechaCorte || fechaFinActividad);
  const [puntosControl, setPuntosControl] = useState<PuntoControl[]>(puntosControlExistentes);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [puntoEditando, setPuntoEditando] = useState<string | null>(null);
  const initialized = useRef(false);
  const manualmenteEditado = useRef(false);
  const prevFrecuencia = useRef<FrecuenciaPuntoControl>(frecuenciaActual || 'trimestral');
  
  // Form para nuevo punto personalizado
  const [nuevoPunto, setNuevoPunto] = useState({
    nombre: '',
    descripcion: '',
    fechaProgramada: '',
    fechaSeguimiento: ''
  });

  // Form para editar punto existente
  const [puntoEditandoData, setPuntoEditandoData] = useState({
    nombre: '',
    descripcion: '',
    fechaProgramada: '',
    fechaSeguimiento: ''
  });

  useEffect(() => {
    setFechaCorteLocal(fechaCorte || fechaFinActividad);
  }, [fechaCorte, fechaFinActividad]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      prevFrecuencia.current = frecuenciaSeleccionada;
      if (puntosControlExistentes.length === 0 && frecuenciaSeleccionada !== 'personalizada') {
        setPuntosControl(
          generarPuntosControlAutomaticos(
            frecuenciaSeleccionada,
            fechaInicioActividad,
            fechaCorteLocal || fechaFinActividad,
            nombreActividad
          )
        );
      }
      return;
    }

    const frecuenciaCambio = prevFrecuencia.current !== frecuenciaSeleccionada;
    prevFrecuencia.current = frecuenciaSeleccionada;

    if (frecuenciaSeleccionada !== 'personalizada') {
      if (frecuenciaCambio || !manualmenteEditado.current) {
        setPuntosControl(
          generarPuntosControlAutomaticos(
            frecuenciaSeleccionada,
            fechaInicioActividad,
            fechaCorteLocal || fechaFinActividad,
            nombreActividad
          )
        );
      }
      if (frecuenciaCambio) manualmenteEditado.current = false;
    } else {
      setPuntosControl(puntosControlExistentes.length > 0 ? puntosControlExistentes : []);
      manualmenteEditado.current = false;
    }
  }, [frecuenciaSeleccionada, fechaInicioActividad, fechaCorteLocal, fechaFinActividad, nombreActividad, puntosControlExistentes]);

  const handleAgregarPunto = () => {
    if (!nuevoPunto.nombre.trim()) {
      toast.error('El nombre del punto de control es obligatorio');
      return;
    }
    if (!nuevoPunto.fechaProgramada) {
      toast.error('La fecha programada es obligatoria');
      return;
    }

    const nuevo: PuntoControl = {
      id: `pc-${Date.now()}`,
      orden: puntosControl.length + 1,
      nombre: nuevoPunto.nombre,
      descripcion: nuevoPunto.descripcion,
      fechaProgramada: nuevoPunto.fechaProgramada,
      fechaSeguimiento: nuevoPunto.fechaSeguimiento || null,
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
    setNuevoPunto({ nombre: '', descripcion: '', fechaProgramada: '', fechaSeguimiento: '' });
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
      fechaProgramada: punto.fechaProgramada,
      fechaSeguimiento: punto.fechaSeguimiento || ''
    });
  };

  const handleCancelarEdicion = () => {
    setPuntoEditando(null);
    setPuntoEditandoData({ nombre: '', descripcion: '', fechaProgramada: '', fechaSeguimiento: '' });
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
          ? { ...p, nombre: puntoEditandoData.nombre, descripcion: puntoEditandoData.descripcion, fechaProgramada: puntoEditandoData.fechaProgramada, fechaSeguimiento: puntoEditandoData.fechaSeguimiento || null }
          : p
      ).sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())
    );
    manualmenteEditado.current = true;

    setPuntoEditando(null);
    setPuntoEditandoData({ nombre: '', descripcion: '', fechaProgramada: '', fechaSeguimiento: '' });
    toast.success('Fecha de corte actualizada');
  };

  const handleCambiarFrecuencia = (nuevaFrecuencia: FrecuenciaPuntoControl) => {
    if (nuevaFrecuencia === frecuenciaSeleccionada) return;
    setFrecuenciaSeleccionada(nuevaFrecuencia);
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
  }[] = [
    { value: 'mensual', label: 'Mensual', descripcion: 'Fin de cada mes', color: 'bg-blue-500' },
    { value: 'bimensual', label: 'Bimensual', descripcion: '6 cortes/año', color: 'bg-teal-500' },
    { value: 'trimestral', label: 'Trimestral', descripcion: '3 cortes/año', color: 'bg-purple-500' },
    { value: 'semestral', label: 'Semestral', descripcion: '2 cortes/año', color: 'bg-green-500' },
    { value: 'anual', label: 'Anual', descripcion: 'Una vez al año', color: 'bg-orange-500' },
    { value: 'semanal', label: 'Semanal', descripcion: 'Cada 7 días', color: 'bg-red-500' },
    { value: 'personalizada', label: 'Personalizada', descripcion: 'Fechas manuales', color: 'bg-gray-500' }
  ];

  // Detectar el checkpoint "activo": el primero cuya fecha sea >= hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const activoId = [...puntosControl]
    .filter(p => new Date(p.fechaProgramada + 'T00:00:00') >= hoy)
    .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())[0]?.id ?? null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] px-4 py-4 sm:px-6 sm:py-5 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold">Configurar Fechas de Corte</h2>
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              
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
                  La fecha de inicio es fija (del plan). La fecha de corte define hasta cuándo se programan los checkpoints. El seguimiento se calcula +2 meses después de cada corte.
                </p>
              </div>

              {/* Selector de frecuencia */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Periodicidad de seguimiento</h3>
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

              {/* Lista de fechas de corte */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">
                      Fechas de corte ({puntosControl.length})
                    </h3>
                    {puntosControl.length > 6 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                        Scroll ↓
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>

                {/* Formulario nuevo período (solo personalizada) */}
                {mostrarFormNuevo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3 space-y-3">
                    <input
                      type="text"
                      placeholder="Nombre del corte (ej: Corte 1)"
                      value={nuevoPunto.nombre}
                      onChange={(e) => setNuevoPunto({ ...nuevoPunto, nombre: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-orange-50 border border-orange-100 rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1.5">
                          <Calendar className="w-3 h-3 text-orange-500" />
                          <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Fecha de corte</span>
                        </div>
                        <input
                          type="date"
                          value={nuevoPunto.fechaProgramada}
                          onChange={(e) => setNuevoPunto({ ...nuevoPunto, fechaProgramada: e.target.value, fechaSeguimiento: sumarMeses(e.target.value, 2) })}
                          className="w-full px-2 py-1 bg-white border border-orange-200 rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:border-orange-400"
                        />
                      </div>
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1.5">
                          <Clock className="w-3 h-3 text-purple-500" />
                          <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Seguimiento</span>
                        </div>
                        <input
                          type="date"
                          value={nuevoPunto.fechaSeguimiento}
                          onChange={(e) => setNuevoPunto({ ...nuevoPunto, fechaSeguimiento: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAgregarPunto}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Agregar
                      </button>
                      <button
                        onClick={() => {
                          setMostrarFormNuevo(false);
                          setNuevoPunto({ nombre: '', descripcion: '', fechaProgramada: '', fechaSeguimiento: '' });
                        }}
                        className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-medium transition-colors"
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
                  <div className={`space-y-2 ${puntosControl.length > 6 ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Fecha de corte</label>
                                <input
                                  type="date"
                                  value={puntoEditandoData.fechaProgramada}
                                  min={index === 0 ? fechaInicioActividad : puntosControl[index - 1].fechaProgramada}
                                  max={index === puntosControl.length - 1 ? fechaCorteLocal : puntosControl[index + 1].fechaProgramada}
                                  onChange={(e) => setPuntoEditandoData({ ...puntoEditandoData, fechaProgramada: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border-2 border-orange-400 rounded-lg text-sm focus:outline-none focus:border-orange-600"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Fecha de seguimiento</label>
                                <input
                                  type="date"
                                  value={puntoEditandoData.fechaSeguimiento}
                                  onChange={(e) => setPuntoEditandoData({ ...puntoEditandoData, fechaSeguimiento: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border-2 border-purple-400 rounded-lg text-sm focus:outline-none focus:border-purple-600"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
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
                        // VISTA NORMAL - diseño card con stripe de color
                        <div
                          key={punto.id}
                          className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-all hover:shadow-md ${
                            punto.id === activoId
                              ? 'border-blue-300 ring-1 ring-blue-200'
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Stripe de color según estado */}
                          <div className={`h-1 w-full ${
                            punto.estado === 'completado' ? 'bg-green-500' :
                            new Date(punto.fechaProgramada + 'T00:00:00') < hoy ? 'bg-red-400' :
                            punto.id === activoId ? 'bg-blue-500' : 'bg-gray-200'
                          }`} />

                          <div className="px-4 py-3">
                            {/* Fila: número + nombre + badge + acciones */}
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                punto.id === activoId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="font-semibold text-sm text-gray-800 flex-1 truncate">{punto.nombre}</span>
                              {(() => {
                                const badge = getEstadoBadge(punto, punto.id === activoId);
                                return (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.classes}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => handleIniciarEdicion(punto)}
                                    className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEliminarPunto(punto.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-all"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                            </div>

                            {/* Fechas: dos columnas con fondo de color */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-orange-50 border border-orange-100 rounded-lg p-2">
                                <div className="flex items-center gap-1 mb-1.5">
                                  <Calendar className="w-3 h-3 text-orange-500" />
                                  <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Fecha de corte</span>
                                </div>
                                <input
                                  type="date"
                                  value={punto.fechaProgramada}
                                  min={index === 0 ? fechaInicioActividad : puntosControl[index - 1].fechaProgramada}
                                  max={index === puntosControl.length - 1 ? fechaCorteLocal : puntosControl[index + 1].fechaProgramada}
                                  onChange={(e) => {
                                    manualmenteEditado.current = true;
                                    const nuevaFecha = e.target.value;
                                    const nuevaFechaSeguimiento = sumarMeses(nuevaFecha, 2);
                                    setPuntosControl(prev =>
                                      prev.map(p => p.id === punto.id
                                        ? { ...p, fechaProgramada: nuevaFecha, fechaSeguimiento: nuevaFechaSeguimiento }
                                        : p)
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-orange-200 rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:border-orange-400"
                                />
                              </div>
                              <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
                                <div className="flex items-center gap-1 mb-1.5">
                                  <Clock className="w-3 h-3 text-purple-500" />
                                  <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Seguimiento</span>
                                </div>
                                <input
                                  type="date"
                                  value={punto.fechaSeguimiento || ''}
                                  onChange={(e) => {
                                    manualmenteEditado.current = true;
                                    setPuntosControl(prev =>
                                      prev.map(p => p.id === punto.id ? { ...p, fechaSeguimiento: e.target.value || null } : p)
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-purple-200 rounded-md text-xs font-medium text-gray-700 focus:outline-none focus:border-purple-400"
                                />
                              </div>
                            </div>
                          </div>
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
            <div className="border-t-2 border-gray-200 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 flex items-center justify-between flex-shrink-0">
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
