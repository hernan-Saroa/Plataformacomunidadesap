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
import { toast } from 'sonner';

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

function generarPuntosControlAutomaticos(
  frecuencia: FrecuenciaPuntoControl,
  fechaInicio: string,
  fechaFin: string,
  nombreActividad: string
): PuntoControl[] {
  if (frecuencia === 'personalizada') return [];

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const puntos: PuntoControl[] = [];

  let cantidadPuntos: number;
  let nombreFrecuencia: string;

  switch (frecuencia) {
    case 'anual':
      cantidadPuntos = 1;
      nombreFrecuencia = 'Anual';
      break;
    case 'semestral':
      cantidadPuntos = 2;
      nombreFrecuencia = 'Semestral';
      break;
    case 'trimestral':
      cantidadPuntos = 4;
      nombreFrecuencia = 'Trimestral';
      break;
    case 'mensual':
      cantidadPuntos = 12;
      nombreFrecuencia = 'Mensual';
      break;
    case 'semanal':
      cantidadPuntos = 52;
      nombreFrecuencia = 'Semanal';
      break;
    default:
      return [];
  }

  const duracionTotal = fin.getTime() - inicio.getTime();
  const intervalo = duracionTotal / cantidadPuntos;

  for (let i = 0; i < cantidadPuntos; i++) {
    const fechaPunto = new Date(inicio.getTime() + (intervalo * (i + 1)));
    
    puntos.push({
      id: `pc-auto-${i + 1}`,
      orden: i + 1,
      nombre: `${nombreFrecuencia} #${i + 1}`,
      descripcion: `Punto de control ${nombreFrecuencia.toLowerCase()} para ${nombreActividad}`,
      fechaProgramada: fechaPunto.toISOString().split('T')[0],
      fechaReal: null,
      responsable: '',
      estado: 'pendiente',
      observaciones: '',
      evidencias: []
    });
  }

  return puntos;
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
  puntosControlExistentes?: PuntoControl[];
  frecuenciaActual?: FrecuenciaPuntoControl;
  onGuardar: (puntos: PuntoControl[], frecuencia: FrecuenciaPuntoControl) => void;
}

export function ModalConfiguracionPuntosControl({
  isOpen,
  onClose,
  nombreActividad,
  fechaInicioActividad,
  fechaFinActividad,
  puntosControlExistentes = [],
  frecuenciaActual,
  onGuardar
}: ModalConfiguracionPuntosControlProps) {
  const [frecuenciaSeleccionada, setFrecuenciaSeleccionada] = useState<FrecuenciaPuntoControl>(
    frecuenciaActual || 'mensual'
  );
  const [puntosControl, setPuntosControl] = useState<PuntoControl[]>(puntosControlExistentes);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [puntoEditando, setPuntoEditando] = useState<string | null>(null);
  
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

  // Regenerar puntos cuando cambia la frecuencia
  useEffect(() => {
    if (frecuenciaSeleccionada !== 'personalizada') {
      const puntosGenerados = generarPuntosControlAutomaticos(
        frecuenciaSeleccionada,
        fechaInicioActividad,
        fechaFinActividad,
        nombreActividad
      );
      setPuntosControl(puntosGenerados);
    } else {
      // Mantener existentes o limpiar
      setPuntosControl(puntosControlExistentes.length > 0 ? puntosControlExistentes : []);
    }
  }, [frecuenciaSeleccionada, fechaInicioActividad, fechaFinActividad]);

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
    toast.success('Punto de control agregado');
  };

  const handleEliminarPunto = (id: string) => {
    setPuntosControl(puntosControl.filter(p => p.id !== id));
    toast.success('Punto de control eliminado');
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
      toast.error('El nombre del punto de control es obligatorio');
      return;
    }
    if (!puntoEditandoData.fechaProgramada) {
      toast.error('La fecha programada es obligatoria');
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
    toast.success('Punto de control actualizado');
  };

  const handleCambiarFrecuencia = (nuevaFrecuencia: FrecuenciaPuntoControl) => {
    // Si ya hay puntos configurados, confirmar antes de cambiar
    if (puntosControl.length > 0 && nuevaFrecuencia !== frecuenciaSeleccionada) {
      const confirmar = window.confirm(
        `⚠️ ADVERTENCIA: Al cambiar la frecuencia se ${nuevaFrecuencia === 'personalizada' ? 'mantendrán' : 'regenerarán'} los puntos de control existentes.\n\n` +
        `Tienes ${puntosControl.length} punto${puntosControl.length !== 1 ? 's' : ''} configurado${puntosControl.length !== 1 ? 's' : ''}.\n\n` +
        `¿Estás seguro de continuar?`
      );
      
      if (!confirmar) return;
    }
    
    setFrecuenciaSeleccionada(nuevaFrecuencia);
  };

  const handleGuardar = () => {
    if (puntosControl.length === 0) {
      toast.error('Debe configurar al menos un punto de control');
      return;
    }

    onGuardar(puntosControl, frecuenciaSeleccionada);
    toast.success(`${puntosControl.length} punto${puntosControl.length !== 1 ? 's' : ''} de control configurado${puntosControl.length !== 1 ? 's' : ''}`);
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
                  <h2 className="text-xl font-bold">Configurar Puntos de Control</h2>
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
              
              {/* Periodo de la actividad (solo lectura) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Periodo de la actividad</h3>
                  <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-md font-medium">Automático</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha inicio</label>
                    <input
                      type="date"
                      value={fechaInicioActividad}
                      readOnly
                      className="w-full px-3 py-2 bg-blue-100/50 border-2 border-blue-300 rounded-lg text-sm font-medium text-gray-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha fin</label>
                    <input
                      type="date"
                      value={fechaFinActividad}
                      readOnly
                      className="w-full px-3 py-2 bg-blue-100/50 border-2 border-blue-300 rounded-lg text-sm font-medium text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Este periodo se hereda del Plan Anual y no puede ser modificado
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
                      <span className="font-semibold">Modo automático:</span> Los puntos se generan según la frecuencia. 
                      Para editar o eliminar puntos individualmente, cambia a <span className="font-bold">modo Personalizada</span>.
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

              {/* Lista de puntos de control generados */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">
                      Puntos de control ({puntosControl.length})
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

                {/* Formulario nuevo punto (solo personalizada) */}
                {frecuenciaSeleccionada === 'personalizada' && mostrarFormNuevo && (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-3 space-y-3">
                    <input
                      type="text"
                      placeholder="Nombre del punto de control"
                      value={nuevoPunto.nombre}
                      onChange={(e) => setNuevoPunto({ ...nuevoPunto, nombre: e.target.value })}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <textarea
                      placeholder="Descripción (opcional)"
                      value={nuevoPunto.descripcion}
                      onChange={(e) => setNuevoPunto({ ...nuevoPunto, descripcion: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={nuevoPunto.fechaProgramada}
                        onChange={(e) => setNuevoPunto({ ...nuevoPunto, fechaProgramada: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
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

                {/* Lista de puntos */}
                {puntosControl.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium mb-1">No hay puntos de control</p>
                    <p className="text-sm text-gray-500">
                      {frecuenciaSeleccionada === 'personalizada' 
                        ? 'Haz clic en "Agregar" para crear un punto de control manual'
                        : 'Selecciona una frecuencia para generar puntos automáticamente'}
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-xl overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Header de la tabla */}
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 grid grid-cols-12 gap-3 text-white text-xs font-semibold">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-5">Punto de control</div>
                        <div className="col-span-3 text-center">Fecha programada</div>
                        <div className="col-span-2 text-center">Frecuencia</div>
                        <div className="col-span-1 text-center">Acciones</div>
                      </div>
                      
                      {/* Filas de puntos de control */}
                      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {puntosControl.map((punto, index) => (
                          puntoEditando === punto.id ? (
                            // MODO EDICIÓN INLINE
                            <div key={punto.id} className="px-4 py-3 bg-yellow-50 border-l-4 border-yellow-400">
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={puntoEditandoData.nombre}
                                  onChange={(e) => setPuntoEditandoData({ ...puntoEditandoData, nombre: e.target.value })}
                                  placeholder="Nombre del punto"
                                  className="w-full px-3 py-2 bg-white border-2 border-yellow-400 rounded-lg text-sm font-medium focus:outline-none focus:border-yellow-600"
                                />
                                <textarea
                                  value={puntoEditandoData.descripcion}
                                  onChange={(e) => setPuntoEditandoData({ ...puntoEditandoData, descripcion: e.target.value })}
                                  placeholder="Descripción (opcional)"
                                  rows={2}
                                  className="w-full px-3 py-2 bg-white border-2 border-yellow-400 rounded-lg text-sm focus:outline-none focus:border-yellow-600 resize-none"
                                />
                                <div className="flex gap-2">
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
                            // MODO VISUALIZACIÓN NORMAL
                            <div
                              key={punto.id}
                              className="px-4 py-3 grid grid-cols-12 gap-3 items-center hover:bg-blue-50 transition-colors group"
                            >
                              {/* Número */}
                              <div className="col-span-1 flex justify-center">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                                  {index + 1}
                                </div>
                              </div>
                              
                              {/* Nombre y descripción */}
                              <div className="col-span-5">
                                <p className="font-semibold text-gray-900 text-sm">{punto.nombre}</p>
                                {punto.descripcion && (
                                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{punto.descripcion}</p>
                                )}
                              </div>
                              
                              {/* Fecha */}
                              <div className="col-span-3 text-center">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="text-xs font-semibold">
                                    {formatearFecha(punto.fechaProgramada)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Frecuencia */}
                              <div className="col-span-2 text-center">
                                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium">
                                  {frecuenciaSeleccionada === 'personalizada' ? 'Manual' : frecuenciaSeleccionada.charAt(0).toUpperCase() + frecuenciaSeleccionada.slice(1)}
                                </span>
                              </div>
                              
                              {/* Acciones */}
                              <div className="col-span-1 flex justify-center gap-1">
                                <button
                                  onClick={() => handleIniciarEdicion(punto)}
                                  className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                                  title="Editar punto de control"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEliminarPunto(punto.id)}
                                  className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                                  title="Eliminar punto de control"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                      
                      {/* Footer de resumen */}
                      <div className="bg-gray-50 px-4 py-2.5 border-t-2 border-gray-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            Total de checkpoints configurados
                          </span>
                          <span className="font-bold text-gray-900 bg-blue-100 px-3 py-1 rounded-full">
                            {puntosControl.length} punto{puntosControl.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
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
                        {puntosControl.length} punto{puntosControl.length !== 1 ? 's' : ''} de control configurado{puntosControl.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Los auditores podrán registrar el cumplimiento de cada checkpoint en las fechas programadas
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