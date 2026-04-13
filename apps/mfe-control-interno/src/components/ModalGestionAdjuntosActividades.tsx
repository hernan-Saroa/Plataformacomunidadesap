/**
 * MODAL DE GESTIÓN DE ARCHIVOS ADJUNTOS PARA ACTIVIDADES DEL PLAN ANUAL
 * Permite adjuntar evidencias de cumplimiento a las actividades
 * Respeta la configuración de evidencias para ocultar secciones no requeridas
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X, Paperclip, Upload, Trash2, Eye, FileText, CheckCircle2, Check, AlertCircle, Calendar, Clock
} from 'lucide-react';
import { toast } from 'sonner';

// Tipos
interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
  puntoControlId?: string; // 🔵 Asociar archivo a un corte específico
}

type RequisitoEvidencia = 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';

interface ConfiguracionEvidencias {
  // Formato del backend (booleans)
  observaciones?: boolean;
  documentos?: boolean;
  // Formato del frontend (strings)
  adjuntosRequeridos?: RequisitoEvidencia;
  observacionRequerida?: RequisitoEvidencia;
  minimoAdjuntos?: number;
  tiposAdjuntosPermitidos?: string[];
  longitudMinimaObservacion?: number;
}

// Observación individual (entrada del feed)
interface ObsLocal {
  id: string;
  texto: string;
  fechaRegistro: string;
  autor: string;
  puntoControlId?: string; // Asociar observación a un corte específico
}

// Flexibilidad para aceptar diferentes tipos de observaciones
interface ObservacionCumplimientoObj {
  texto?: string;
  fechaRegistro?: string;
  autor?: string;
  registradoPor?: string;
  id?: string;
  [key: string]: any;
}

/** Entrada de seguimiento por corte (fuente de verdad) */
interface EntradaSeguimiento {
  id: string;
  puntoControlId: string;
  fechaRegistro: string;
  registradoPor: string;
  texto?: string;
  archivos?: Array<{ nombre: string; url?: string; tipo?: string; tamanio?: number }>;
  tipo: 'seguimiento' | 'evidencia';
}

interface Actividad {
  id: number | string;
  nombre: string;
  adjuntos?: ArchivoAdjunto[];
  observacionesCumplimiento?: string | ObservacionCumplimientoObj[];
  observaciones?: string;
  configuracionEvidencias?: ConfiguracionEvidencias;
  puntosControl?: InfoPuntoControl[];
  entradasSeguimiento?: EntradaSeguimiento[];
}

/** Información del punto de control para mostrar contexto */
interface InfoPuntoControl {
  id: string;
  nombre: string;
  fechaProgramada: string;
  fechaSeguimiento: string | null;
  orden: number;
}

interface ModalGestionAdjuntosProps {
  actividad: Actividad;
  onCerrar: () => void;
  onActualizar: (adjuntos: ArchivoAdjunto[], observaciones: string) => void;
  /** Cuando se abre desde un corte: basta con al menos 1 observación nueva O 1 adjunto */
  modoEntradaCorte?: boolean;
  /** Información del punto de control actual (si aplica) */
  puntoControl?: InfoPuntoControl;
  /** Nombre del usuario que registra (para mostrar en observaciones) */
  autorNombre?: string;
}

export function ModalGestionAdjuntos({ actividad, onCerrar, onActualizar, modoEntradaCorte = false, puntoControl, autorNombre = 'Usuario' }: ModalGestionAdjuntosProps) {
  
  // Extraer adjuntos de entradasSeguimiento para asociarlos con su puntoControlId
  const adjuntosDesdeEntradas: ArchivoAdjunto[] = (actividad.entradasSeguimiento || []).flatMap(ent =>
    (ent.archivos || []).map((arch, i) => ({
      id: `ent-adj-${ent.id}-${i}`,
      nombre: arch.nombre,
      tipo: arch.tipo || 'application/octet-stream',
      tamaño: arch.tamanio || 0,
      fechaCarga: ent.fechaRegistro,
      cargadoPor: ent.registradoPor || autorNombre,
      url: arch.url,
      puntoControlId: ent.puntoControlId,
    }))
  );

  // Merge: adjuntos de entradas (con puntoControlId) tienen prioridad sobre adjuntos directos (sin puntoControlId)
  const adjuntosIniciales = (() => {
    const base = adjuntosDesdeEntradas; // Estos YA tienen puntoControlId correcto
    const existingKeys = new Set(base.map(a => `${a.nombre}|${a.url || ''}`));
    const extras = (actividad.adjuntos || []).filter(a => !existingKeys.has(`${a.nombre}|${a.url || ''}`));
    return [...base, ...extras];
  })();

  const [adjuntos, setAdjuntos] = useState<ArchivoAdjunto[]>(adjuntosIniciales);
  
  // 🔵 Sistema de tabs para navegar entre cortes
  const puntosControl = actividad.puntosControl || [];
  const [tabActivo, setTabActivo] = useState<string>(puntoControl?.id || 'general');

  // Parsear observaciones: entradasSeguimiento es la ÚNICA fuente de verdad
  const obtenerObsIniciales = (): ObsLocal[] => {
    const hoy = new Date().toISOString().split('T')[0];

    // entradasSeguimiento = fuente de verdad (cada entrada tiene puntoControlId)
    const entradas = actividad.entradasSeguimiento || [];
    return entradas
      .filter(ent => (ent.texto || '').trim().length > 0)
      .map(ent => ({
        id: ent.id,
        texto: (ent.texto || '').trim(),
        fechaRegistro: ent.fechaRegistro || hoy,
        autor: ent.registradoPor || autorNombre,
        puntoControlId: ent.puntoControlId,
      }));
  };

  const [obsList, setObsList] = useState<ObsLocal[]>(obtenerObsIniciales());
  const [nuevaObsTexto, setNuevaObsTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Configuración de evidencias (usa valores por defecto si no está definida)
  // Acepta tanto el formato nuevo (adjuntosRequeridos/observacionRequerida) como el del backend (documentos/observaciones booleans)
  const rawConfig = actividad.configuracionEvidencias || {};
  const config = {
    // Si tiene el formato del backend (booleans), convertir a strings
    adjuntosRequeridos: rawConfig.adjuntosRequeridos || 
      (rawConfig.documentos === true ? 'OBLIGATORIO' : rawConfig.documentos === false ? 'NO_REQUERIDO' : 'OPCIONAL'),
    observacionRequerida: rawConfig.observacionRequerida || 
      (rawConfig.observaciones === true ? 'OBLIGATORIO' : rawConfig.observaciones === false ? 'NO_REQUERIDO' : 'OPCIONAL'),
    minimoAdjuntos: rawConfig.minimoAdjuntos || 1,
    longitudMinimaObservacion: rawConfig.longitudMinimaObservacion || 10
  };

  // Determinar qué secciones mostrar
  const mostrarAdjuntos = config.adjuntosRequeridos !== 'NO_REQUERIDO';
  const mostrarObservaciones = config.observacionRequerida !== 'NO_REQUERIDO';
  
  // Si ninguna sección se muestra, mostrar ambas por defecto (fallback)
  const mostrarAmbas = !mostrarAdjuntos && !mostrarObservaciones;

  // Validar requisitos
  const validarRequisitos = (): { valido: boolean; errores: string[] } => {
    const errores: string[] = [];

    // En modo entrada de corte: basta con tener al menos 1 observación (nueva o pendiente en textarea) O 1 adjunto
    if (modoEntradaCorte) {
      const nuevasObs = obsList.filter(o => o.id.startsWith('obs-'));
      const tieneTextoPendiente = nuevaObsTexto.trim().length > 0;
      if (nuevasObs.length === 0 && !tieneTextoPendiente && adjuntos.length === 0) {
        errores.push('Agrega al menos una observación o un archivo para registrar la entrada');
      }
      return { valido: errores.length === 0, errores };
    }
    
    if (config.adjuntosRequeridos === 'OBLIGATORIO') {
      const minimo = config.minimoAdjuntos || 1;
      if (adjuntos.length < minimo) {
        errores.push(`Se requieren al menos ${minimo} archivo(s) adjunto(s)`);
      }
    }
    
    if (config.observacionRequerida === 'OBLIGATORIO') {
      if (obsList.length === 0 && !nuevaObsTexto.trim()) {
        errores.push('Se requiere al menos una observación');
      }
    }
    
    return { valido: errores.length === 0, errores };
  };

  // Calcular si cumple requisitos (para deshabilitar botón)
  const { valido: cumpleRequisitos, errores: erroresRequisitos } = validarRequisitos();
  
  // Calcular estado de cada requisito
  const adjuntosCumplen = config.adjuntosRequeridos !== 'OBLIGATORIO' || 
    adjuntos.length >= (config.minimoAdjuntos || 1);
  const observacionesCumplen = config.observacionRequerida !== 'OBLIGATORIO' || obsList.length > 0 || nuevaObsTexto.trim().length > 0;

  const formatearTamaño = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleAgregarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) return;

    setCargando(true);

    // Simular carga de archivos (en producción, aquí se subirían al servidor)
    const nuevosAdjuntos: ArchivoAdjunto[] = Array.from(archivos).map(archivo => ({
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre: archivo.name,
      tipo: archivo.type || 'application/octet-stream',
      tamaño: archivo.size,
      fechaCarga: new Date().toISOString(),
      cargadoPor: 'Usuario Actual',
      url: URL.createObjectURL(archivo), // En producción, esto vendría del backend
      puntoControlId: tabActivo !== 'general' ? tabActivo : undefined // 🔵 Asociar al tab activo
    }));

    setTimeout(() => {
      setAdjuntos([...adjuntos, ...nuevosAdjuntos]);
      setCargando(false);
      toast.success(`${nuevosAdjuntos.length} archivo(s) agregado(s)`);
    }, 800);
  };

  const handleEliminarArchivo = (id: string) => {
    setAdjuntos(adjuntos.filter(adj => adj.id !== id));
    toast.success('Archivo eliminado');
  };

  const handleGuardar = () => {
    // Si hay texto pendiente en el textarea, auto-agregarlo como observación
    if (nuevaObsTexto.trim()) {
      const nueva: ObsLocal = {
        id: `obs-${Date.now()}`,
        texto: nuevaObsTexto.trim(),
        fechaRegistro: new Date().toISOString().split('T')[0],
        autor: autorNombre,
        puntoControlId: tabActivo !== 'general' ? tabActivo : undefined,
      };
      const listaFinal = [...obsList, nueva];
      setObsList(listaFinal);
      setNuevaObsTexto('');

      // Validar con la lista actualizada
      const nuevasObs = listaFinal.filter(o => o.id.startsWith('obs-'));
      if (modoEntradaCorte && nuevasObs.length === 0 && adjuntos.length === 0) {
        toast.error('Agrega al menos una observación o un archivo para registrar la entrada');
        return;
      }
      onActualizar(adjuntos, JSON.stringify(listaFinal));
      onCerrar();
      return;
    }

    // Validar requisitos antes de guardar
    const { valido, errores } = validarRequisitos();
    if (!valido) {
      errores.forEach(error => toast.error(error));
      return;
    }
    
    onActualizar(adjuntos, JSON.stringify(obsList));
    onCerrar();
  };

  // Si no hay nada que mostrar (ambas NO_REQUERIDO), cerrar el modal
  if (!mostrarAdjuntos && !mostrarObservaciones && !mostrarAmbas) {
    toast.info('Esta actividad no requiere evidencias');
    onCerrar();
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* ═══ HEADER ═══ */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {modoEntradaCorte ? 'Registrar evidencia' : 'Gestión de evidencias'}
              </h2>
              <p className="text-xs text-gray-500 truncate mt-0.5">{actividad.nombre}</p>
            </div>
            <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg ml-3">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Contexto del corte - compacto en una línea */}
          {puntoControl && (
            <div className="mt-3 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded bg-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {puntoControl.orden}
              </div>
              <p className="text-xs font-semibold text-orange-800 flex-1 truncate">{puntoControl.nombre}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-orange-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatFecha(puntoControl.fechaProgramada)}
                </span>
                {puntoControl.fechaSeguimiento && (
                  <span className="text-[10px] text-purple-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatFecha(puntoControl.fechaSeguimiento)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto">

          {/* ── TABS DE CORTES (compartidos para archivos y observaciones) ── */}
          {puntosControl.length > 0 && (
            <div className="px-5 pt-4 pb-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Filtrar por corte</p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setTabActivo('general')}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-semibold whitespace-nowrap transition-all border ${
                    tabActivo === 'general'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  Todos
                  {(() => {
                    const total = adjuntos.length + obsList.length;
                    return total > 0 ? (
                      <span className={`ml-1 px-1 rounded text-[9px] ${
                        tabActivo === 'general' ? 'bg-blue-500' : 'bg-gray-200 text-gray-700'
                      }`}>{total}</span>
                    ) : null;
                  })()}
                </button>
                {[...puntosControl].sort((a, b) => a.orden - b.orden).map((pc) => {
                  const countDoc = adjuntos.filter(a => a.puntoControlId === pc.id).length;
                  const countObs = obsList.filter(o => o.puntoControlId === pc.id).length;
                  const total = countDoc + countObs;
                  return (
                    <button
                      key={pc.id}
                      onClick={() => setTabActivo(pc.id)}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-semibold whitespace-nowrap transition-all border flex items-center gap-1 ${
                        tabActivo === pc.id
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold ${
                        tabActivo === pc.id ? 'bg-orange-500' : 'bg-orange-100 text-orange-700'
                      }`}>{pc.orden}</span>
                      {pc.nombre}
                      {total > 0 && (
                        <span className={`px-1 rounded text-[9px] ${
                          tabActivo === pc.id ? 'bg-orange-500' : 'bg-gray-200 text-gray-700'
                        }`}>{total}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SECCIÓN 1: ARCHIVOS ADJUNTOS ── */}
          {(mostrarAdjuntos || mostrarAmbas || modoEntradaCorte) && (
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  Archivos adjuntos
                  {config.adjuntosRequeridos === 'OBLIGATORIO' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      adjuntosCumplen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {adjuntosCumplen ? '✓ Cumple' : `Mín. ${config.minimoAdjuntos || 1}`}
                    </span>
                  )}
                </h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleAgregarArchivo}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={cargando}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {cargando ? 'Subiendo...' : 'Subir archivos'}
                </button>
              </div>

              {/* Lista de archivos filtrados por tab */}
              {(() => {
                const archivosFiltrados = puntosControl.length > 0
                  ? (tabActivo === 'general' ? adjuntos : adjuntos.filter(a => a.puntoControlId === tabActivo))
                  : adjuntos;

                if (archivosFiltrados.length === 0) {
                  return (
                    <div className="py-4 text-center border-2 border-dashed border-gray-200 rounded-lg">
                      <Paperclip className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">
                        {puntosControl.length > 0
                          ? `Sin archivos en ${tabActivo === 'general' ? 'General' : puntosControl.find(p => p.id === tabActivo)?.nombre || 'este corte'}`
                          : 'Sin archivos adjuntos'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {archivosFiltrados.map((archivo) => (
                      <div
                        key={archivo.id}
                        className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{archivo.nombre}</p>
                          <p className="text-[10px] text-gray-500">{formatearTamaño(archivo.tamaño)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {archivo.url && (
                            <button
                              onClick={() => window.open(archivo.url, '_blank')}
                              className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                              title="Ver"
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminarArchivo(archivo.id)}
                            className="p-1.5 hover:bg-red-100 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── SECCIÓN 2: OBSERVACIONES (filtradas por tab activo) ── */}
          {(mostrarObservaciones || mostrarAmbas || modoEntradaCorte) && (
            <div className="px-5 py-4">
              {(() => {
                const obsFiltradas = puntosControl.length > 0
                  ? (tabActivo === 'general' ? obsList : obsList.filter(o => o.puntoControlId === tabActivo))
                  : obsList;

                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-700" />
                        Observaciones
                        {config.observacionRequerida === 'OBLIGATORIO' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            observacionesCumplen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {observacionesCumplen ? '✓ Cumple' : 'Obligatoria'}
                          </span>
                        )}
                      </h3>
                      {obsFiltradas.length > 0 && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                          {obsFiltradas.length} {obsFiltradas.length === 1 ? 'registro' : 'registros'}
                        </span>
                      )}
                    </div>

                    {/* Lista de observaciones filtradas */}
                    {obsFiltradas.length > 0 && (
                      <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                        {obsFiltradas.map(obs => (
                          <div key={obs.id} className="flex items-start gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded-lg group">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-blue-600">{obs.fechaRegistro} · {obs.autor}</p>
                              <p className="text-xs text-gray-800 mt-0.5 leading-relaxed">{obs.texto}</p>
                            </div>
                            <button
                              onClick={() => setObsList(prev => prev.filter(o => o.id !== obs.id))}
                              className="p-1 hover:bg-red-100 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nueva observación — se asocia al corte activo */}
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={nuevaObsTexto}
                        onChange={e => setNuevaObsTexto(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && nuevaObsTexto.trim()) {
                            e.preventDefault();
                            const nueva: ObsLocal = {
                              id: `obs-${Date.now()}`,
                              texto: nuevaObsTexto.trim(),
                              fechaRegistro: new Date().toISOString().split('T')[0],
                              autor: autorNombre,
                              puntoControlId: tabActivo !== 'general' ? tabActivo : undefined,
                            };
                            setObsList(prev => [...prev, nueva]);
                            setNuevaObsTexto('');
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder={puntosControl.length > 0 && tabActivo !== 'general'
                          ? `Observación para ${puntosControl.find(p => p.id === tabActivo)?.nombre || 'este corte'}...`
                          : 'Escribe una observación...'
                        }
                        rows={2}
                      />
                      <button
                        onClick={() => {
                          if (!nuevaObsTexto.trim()) return;
                          const nueva: ObsLocal = {
                            id: `obs-${Date.now()}`,
                            texto: nuevaObsTexto.trim(),
                            fechaRegistro: new Date().toISOString().split('T')[0],
                            autor: autorNombre,
                            puntoControlId: tabActivo !== 'general' ? tabActivo : undefined,
                          };
                          setObsList(prev => [...prev, nueva]);
                          setNuevaObsTexto('');
                        }}
                        disabled={!nuevaObsTexto.trim()}
                        className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border-2 ${
                          nuevaObsTexto.trim()
                            ? 'text-white border-transparent'
                            : 'bg-blue-50 text-blue-300 border-blue-200 cursor-not-allowed'
                        }`}
                        style={nuevaObsTexto.trim() ? { background: '#003DA5', borderColor: '#003DA5' } : undefined}
                      >
                        + Agregar
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Enter para agregar rápido · Shift+Enter para salto de línea</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {adjuntos.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {adjuntos.length} archivo{adjuntos.length !== 1 ? 's' : ''}
              </span>
            )}
            {obsList.filter(o => o.id.startsWith('obs-')).length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {obsList.filter(o => o.id.startsWith('obs-')).length} nueva{obsList.filter(o => o.id.startsWith('obs-')).length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCerrar}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-semibold text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!cumpleRequisitos}
              className={`px-5 py-2 rounded-lg text-sm font-bold text-white transition-all flex items-center gap-1.5 ${
                cumpleRequisitos
                  ? modoEntradaCorte
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              {modoEntradaCorte ? 'Registrar entrada' : 'Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}