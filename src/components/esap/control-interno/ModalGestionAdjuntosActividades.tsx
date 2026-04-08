/**
 * MODAL DE GESTIÓN DE ARCHIVOS ADJUNTOS PARA ACTIVIDADES DEL PLAN ANUAL
 * Permite adjuntar evidencias de cumplimiento a las actividades
 * Respeta la configuración de evidencias para ocultar secciones no requeridas
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, Paperclip, Upload, Trash2, Eye, FileText, CheckCircle2, Check, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Tipos
interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
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

interface Actividad {
  id: number | string;
  nombre: string;
  adjuntos?: ArchivoAdjunto[];
  observacionesCumplimiento?: string | ObservacionCumplimientoObj[];
  observaciones?: string;
  configuracionEvidencias?: ConfiguracionEvidencias;
}

interface ModalGestionAdjuntosProps {
  actividad: Actividad;
  onCerrar: () => void;
  onActualizar: (adjuntos: ArchivoAdjunto[], observaciones: string) => void;
  /** Cuando se abre desde un corte: basta con al menos 1 observación nueva O 1 adjunto */
  modoEntradaCorte?: boolean;
}

export function ModalGestionAdjuntos({ actividad, onCerrar, onActualizar, modoEntradaCorte = false }: ModalGestionAdjuntosProps) {
  const [adjuntos, setAdjuntos] = useState<ArchivoAdjunto[]>(actividad.adjuntos || []);

  // Parsear observaciones existentes en formato feed
  const obtenerObsIniciales = (): ObsLocal[] => {
    const hoy = new Date().toISOString().split('T')[0];

    // 1. Campo del backend (observaciones como string — puede ser JSON)
    if (actividad.observaciones && typeof actividad.observaciones === 'string') {
      try {
        const parsed = JSON.parse(actividad.observaciones);
        if (Array.isArray(parsed)) return parsed as ObsLocal[];
      } catch {}
      // Es texto plano → convertir en una sola entrada
      return [{ id: 'init-1', texto: actividad.observaciones.trim(), fechaRegistro: hoy, autor: 'Registro previo' }];
    }

    // 2. observacionesCumplimiento del frontend
    if (actividad.observacionesCumplimiento) {
      if (typeof actividad.observacionesCumplimiento === 'string') {
        try {
          const parsed = JSON.parse(actividad.observacionesCumplimiento);
          if (Array.isArray(parsed)) return parsed as ObsLocal[];
        } catch {}
        return actividad.observacionesCumplimiento.trim()
          ? [{ id: 'init-2', texto: actividad.observacionesCumplimiento.trim(), fechaRegistro: hoy, autor: 'Registro previo' }]
          : [];
      }
      if (Array.isArray(actividad.observacionesCumplimiento)) {
        return (actividad.observacionesCumplimiento as ObservacionCumplimientoObj[])
          .filter(o => (o.texto || '').trim().length > 0)
          .map((o, i) => ({
            id: o.id || `init-${i}`,
            texto: (o.texto || '').trim(),
            fechaRegistro: o.fechaRegistro || hoy,
            autor: o.registradoPor || o.autor || 'Usuario',
          }));
      }
    }

    return [];
  };

  const [obsList, setObsList] = useState<ObsLocal[]>(obtenerObsIniciales());
  const [nuevaObsTexto, setNuevaObsTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  let fileInputRef: HTMLInputElement | null = null;

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

    // En modo entrada de corte: basta con tener al menos 1 observación nueva O 1 adjunto
    if (modoEntradaCorte) {
      const nuevasObs = obsList.filter(o => o.id.startsWith('obs-'));
      if (nuevasObs.length === 0 && adjuntos.length === 0) {
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
      if (obsList.length === 0) {
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
  const observacionesCumplen = config.observacionRequerida !== 'OBLIGATORIO' || obsList.length > 0;

  const formatearTamaño = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
      url: URL.createObjectURL(archivo) // En producción, esto vendría del backend
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
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#DBEAFE' }}>
                <Paperclip className="w-6 h-6" style={{ color: '#2962FF' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Archivos adjuntos
                </h2>
                <p className="text-sm text-gray-600 mt-1 max-w-lg truncate">
                  {actividad.nombre}
                </p>
              </div>
            </div>
            <button onClick={onCerrar} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {/* Banner modo entrada de corte */}
          {modoEntradaCorte && (
            <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-3">
              <span className="text-xl">📝</span>
              <div>
                <p className="font-bold text-orange-800 text-sm">Registrar entrada de corte</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Puedes adjuntar un archivo, escribir una observación, o ambas cosas. Al menos una es requerida.
                </p>
              </div>
            </div>
          )}
          {/* Indicador de requisitos (se oculta en modo corte para simplificar) */}
          {!modoEntradaCorte && <div className="mb-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
            <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Configuración de evidencias
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Estado de Adjuntos */}
              {(mostrarAdjuntos || mostrarAmbas) && (
                <div className={`p-3 rounded-lg border-2 ${
                  config.adjuntosRequeridos === 'OBLIGATORIO'
                    ? adjuntosCumplen 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Paperclip className={`w-4 h-4 ${
                      config.adjuntosRequeridos === 'OBLIGATORIO'
                        ? adjuntosCumplen ? 'text-green-600' : 'text-red-600'
                        : 'text-blue-600'
                    }`} />
                    <span className="font-semibold text-sm">Adjuntos</span>
                    {config.adjuntosRequeridos === 'OBLIGATORIO' && (
                      adjuntosCumplen 
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className={`text-xs font-bold ${
                    config.adjuntosRequeridos === 'OBLIGATORIO'
                      ? adjuntosCumplen ? 'text-green-700' : 'text-red-700'
                      : 'text-blue-700'
                  }`}>
                    {config.adjuntosRequeridos === 'OBLIGATORIO' 
                      ? `🔴 OBLIGATORIO (${adjuntos.length}/${config.minimoAdjuntos || 1})`
                      : '🟢 OPCIONAL'}
                  </p>
                </div>
              )}
              
              {/* Estado de Observaciones */}
              {(mostrarObservaciones || mostrarAmbas) && (
                <div className={`p-3 rounded-lg border-2 ${
                  config.observacionRequerida === 'OBLIGATORIO'
                    ? observacionesCumplen 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className={`w-4 h-4 ${
                      config.observacionRequerida === 'OBLIGATORIO'
                        ? observacionesCumplen ? 'text-green-600' : 'text-red-600'
                        : 'text-blue-600'
                    }`} />
                    <span className="font-semibold text-sm">Observaciones</span>
                    {config.observacionRequerida === 'OBLIGATORIO' && (
                      observacionesCumplen 
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className={`text-xs font-bold ${
                    config.observacionRequerida === 'OBLIGATORIO'
                      ? observacionesCumplen ? 'text-green-700' : 'text-red-700'
                      : 'text-blue-700'
                  }`}>
                    {config.observacionRequerida === 'OBLIGATORIO' 
                      ? `🔴 OBLIGATORIO (${obsList.length} entrada${obsList.length !== 1 ? 's' : ''})`
                      : '🟢 OPCIONAL'}
                  </p>
                </div>
              )}
            </div>
            
            {/* Mensaje si hay requisitos obligatorios no cumplidos */}
            {!cumpleRequisitos && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-xs text-red-800 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Debes cumplir los requisitos obligatorios para poder guardar
                </p>
              </div>
            )}
          </div>}

          {/* Zona de carga - Solo si adjuntos están habilitados */}
          {(mostrarAdjuntos || mostrarAmbas || modoEntradaCorte) && (
            <>
              <div className="mb-6">
                <input
                  ref={(ref) => { fileInputRef = ref; }}
                  type="file"
                  multiple
                  onChange={handleAgregarArchivo}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                />
                <button
                  onClick={() => fileInputRef?.click()}
                  disabled={cargando}
                  className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 mb-1">
                        {cargando ? 'Cargando archivos...' : 'Haz clic para seleccionar archivos'}
                      </p>
                      <p className="text-sm text-gray-600">
                        PDF, Word, Excel, imágenes, ZIP (máx. 10 MB por archivo)
                      </p>
                      {config.adjuntosRequeridos === 'OBLIGATORIO' && (
                        <p className="text-xs text-amber-600 mt-1 font-semibold">
                          * Obligatorio: mínimo {config.minimoAdjuntos || 1} archivo(s)
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Lista de archivos */}
              {adjuntos.length > 0 ? (
                <div className="space-y-3 mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Archivos adjuntos ({adjuntos.length})
                    {config.adjuntosRequeridos === 'OBLIGATORIO' && adjuntos.length >= (config.minimoAdjuntos || 1) && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </h3>
                  {adjuntos.map((archivo) => (
                    <div
                      key={archivo.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{archivo.nombre}</p>
                          <p className="text-xs text-gray-600">
                            {formatearTamaño(archivo.tamaño)} • {new Date(archivo.fechaCarga).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {archivo.url && (
                          <button
                            onClick={() => window.open(archivo.url, '_blank')}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Ver archivo"
                          >
                            <Eye className="w-5 h-5 text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminarArchivo(archivo.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Paperclip className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">Sin archivos adjuntos</p>
                  <p className="text-sm text-gray-600">
                    Adjunta evidencias de cumplimiento de esta actividad
                  </p>
                </div>
              )}
            </>
          )}

          {/* Observaciones de Cumplimiento - Feed de múltiples entradas */}
          {(mostrarObservaciones || mostrarAmbas || modoEntradaCorte) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  Observaciones
                  {config.observacionRequerida === 'OBLIGATORIO' && (
                    <span className="text-xs text-amber-600 font-normal">* Obligatoria</span>
                  )}
                  {observacionesCumplen && config.observacionRequerida === 'OBLIGATORIO' && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </label>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                  {obsList.length} entrada{obsList.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Lista de observaciones existentes */}
              {obsList.length > 0 && (
                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                  {obsList.map(obs => (
                    <div key={obs.id} className="bg-white rounded-lg border border-blue-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 font-medium mb-1">
                            {obs.fechaRegistro} · {obs.autor}
                          </p>
                          <p className="text-sm text-gray-800 leading-relaxed">{obs.texto}</p>
                        </div>
                        <button
                          onClick={() => setObsList(prev => prev.filter(o => o.id !== obs.id))}
                          className="p-1 hover:bg-red-100 rounded transition-colors shrink-0"
                          title="Eliminar observación"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario: nueva observación */}
              <div className="space-y-2">
                <textarea
                  value={nuevaObsTexto}
                  onChange={e => setNuevaObsTexto(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Escribe una observación y presiona Agregar..."
                  rows={3}
                />
                <button
                  onClick={() => {
                    if (!nuevaObsTexto.trim()) {
                      toast.error('Escribe una observación primero');
                      return;
                    }
                    const nueva: ObsLocal = {
                      id: `obs-${Date.now()}`,
                      texto: nuevaObsTexto.trim(),
                      fechaRegistro: new Date().toISOString().split('T')[0],
                      autor: 'Usuario',
                    };
                    setObsList(prev => [...prev, nueva]);
                    setNuevaObsTexto('');
                    toast.success('Observación agregada');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  + Agregar observación
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {(mostrarAdjuntos || mostrarAmbas || modoEntradaCorte) && adjuntos.length > 0 && (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <strong>{adjuntos.length} archivo(s)</strong> listo(s) para guardar
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!cumpleRequisitos}
              className={`px-6 py-2.5 rounded-lg font-bold text-white transition-colors ${
                cumpleRequisitos 
                  ? 'hover:opacity-90' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ background: cumpleRequisitos ? (modoEntradaCorte ? '#D97706' : '#003DA5') : '#9CA3AF' }}
              title={!cumpleRequisitos ? 'Agrega una observación o un archivo para registrar' : ''}
            >
              <Check className="w-4 h-4 inline mr-2" />
              {modoEntradaCorte ? 'Registrar entrada' : 'Guardar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}