/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA DE EVIDENCIAS Y OBSERVACIONES PARA ACTIVIDADES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema flexible que permite configurar por actividad:
 * 1. Si requiere archivos adjuntos (obligatorio/opcional/no necesario)
 * 2. Si requiere observaciones de cumplimiento (obligatorio/opcional/no necesario)
 * 3. Bitácora de observaciones con fecha, hora y responsable
 * 4. Validación automática de completitud según requisitos
 * 
 * TIPOS DE REQUISITOS:
 * - OBLIGATORIO: No se puede marcar como completada sin esta evidencia
 * - OPCIONAL: Se puede agregar pero no es requerido para completar
 * - NO_REQUERIDO: No se solicita esta evidencia
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paperclip, MessageSquare, Clock, User, CheckCircle2,
  AlertCircle, Upload, X, Edit2, Save, FileText, Calendar,
  Plus, Trash2, Eye
} from 'lucide-react';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export type RequisitoEvidencia = 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';

export interface ConfiguracionEvidencias {
  adjuntosRequeridos: RequisitoEvidencia;
  observacionRequerida: RequisitoEvidencia;
  minimoAdjuntos?: number; // Si es obligatorio, cuántos mínimo
  tiposAdjuntosPermitidos?: string[]; // Ej: ['pdf', 'docx', 'xlsx']
  longitudMinimaObservacion?: number; // Caracteres mínimos para observación
}

export interface ObservacionHistorica {
  id: string;
  texto: string;
  fechaCreacion: string;
  horaCreacion: string;
  responsable: {
    nombre: string;
    cargo: string;
  };
  editada: boolean;
  fechaEdicion?: string;
  horaEdicion?: string;
}

export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  horaCarga: string;
  cargadoPor: {
    nombre: string;
    cargo: string;
  };
  url?: string;
}

export interface EstadoEvidencias {
  adjuntos: ArchivoAdjunto[];
  observaciones: ObservacionHistorica[];
  cumpleRequisitos: boolean;
  mensajesValidacion: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIONES PREDEFINIDAS POR TIPO DE ACTIVIDAD
// ════════════════════════════════════════════════════════════════════════════

export const CONFIGURACIONES_PREDEFINIDAS = {
  // Para actividades de auditorías e informes de ley
  INFORME_LEY: {
    adjuntosRequeridos: 'OBLIGATORIO' as RequisitoEvidencia,
    observacionRequerida: 'OBLIGATORIO' as RequisitoEvidencia,
    minimoAdjuntos: 1,
    tiposAdjuntosPermitidos: ['pdf', 'docx', 'xlsx'],
    longitudMinimaObservacion: 50
  },
  
  // Para actividades de seguimiento y evaluación
  SEGUIMIENTO: {
    adjuntosRequeridos: 'OPCIONAL' as RequisitoEvidencia,
    observacionRequerida: 'OBLIGATORIO' as RequisitoEvidencia,
    minimoAdjuntos: 0,
    longitudMinimaObservacion: 30
  },
  
  // Para actividades de asesoría y capacitación
  ASESORIA: {
    adjuntosRequeridos: 'OPCIONAL' as RequisitoEvidencia,
    observacionRequerida: 'OPCIONAL' as RequisitoEvidencia,
    minimoAdjuntos: 0,
    longitudMinimaObservacion: 20
  },
  
  // Para actividades que no requieren evidencia documental
  SIN_EVIDENCIA: {
    adjuntosRequeridos: 'NO_REQUERIDO' as RequisitoEvidencia,
    observacionRequerida: 'NO_REQUERIDO' as RequisitoEvidencia,
    minimoAdjuntos: 0,
    longitudMinimaObservacion: 0
  },
  
  // Configuración flexible (todo opcional)
  FLEXIBLE: {
    adjuntosRequeridos: 'OPCIONAL' as RequisitoEvidencia,
    observacionRequerida: 'OPCIONAL' as RequisitoEvidencia,
    minimoAdjuntos: 0,
    longitudMinimaObservacion: 0
  }
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

export function validarEvidencias(
  estado: EstadoEvidencias,
  config: ConfiguracionEvidencias
): { valido: boolean; mensajes: string[] } {
  const mensajes: string[] = [];

  // Validar adjuntos
  if (config.adjuntosRequeridos === 'OBLIGATORIO') {
    const minimo = config.minimoAdjuntos || 1;
    if (estado.adjuntos.length < minimo) {
      mensajes.push(
        `Se requieren al menos ${minimo} archivo(s) adjunto(s). Actualmente hay ${estado.adjuntos.length}.`
      );
    }
  }

  // Validar tipos de archivo
  if (config.tiposAdjuntosPermitidos && estado.adjuntos.length > 0) {
    const archivosInvalidos = estado.adjuntos.filter(
      adj => !config.tiposAdjuntosPermitidos?.includes(adj.tipo.toLowerCase())
    );
    if (archivosInvalidos.length > 0) {
      mensajes.push(
        `Tipos de archivo permitidos: ${config.tiposAdjuntosPermitidos.join(', ')}. ` +
        `Archivos inválidos: ${archivosInvalidos.map(a => a.nombre).join(', ')}`
      );
    }
  }

  // Validar observaciones
  if (config.observacionRequerida === 'OBLIGATORIO') {
    if (estado.observaciones.length === 0) {
      mensajes.push('Se requiere al menos una observación de cumplimiento.');
    } else {
      const longitudMinima = config.longitudMinimaObservacion || 0;
      const observacionesCortas = estado.observaciones.filter(
        obs => obs.texto.length < longitudMinima
      );
      if (observacionesCortas.length > 0) {
        mensajes.push(
          `Las observaciones deben tener al menos ${longitudMinima} caracteres.`
        );
      }
    }
  }

  return {
    valido: mensajes.length === 0,
    mensajes
  };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SELECTOR DE CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface SelectorConfiguracionProps {
  configuracionActual: ConfiguracionEvidencias;
  onChange: (config: ConfiguracionEvidencias) => void;
}

export function SelectorConfiguracion({ configuracionActual, onChange }: SelectorConfiguracionProps) {
  const [modoPersonalizado, setModoPersonalizado] = useState(false);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Configuración de evidencias
      </h3>

      {/* Configuraciones predefinidas */}
      {!modoPersonalizado && (
        <div className="space-y-3 mb-4">
          <label className="text-sm font-medium text-gray-700">
            Seleccionar configuración predefinida:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(CONFIGURACIONES_PREDEFINIDAS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => onChange(config)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  JSON.stringify(config) === JSON.stringify(configuracionActual)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-bold text-sm text-gray-900 mb-1">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-600">
                  Adjuntos: {config.adjuntosRequeridos.toLowerCase()}
                  <br />
                  Observaciones: {config.observacionRequerida.toLowerCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botón para modo personalizado */}
      <button
        onClick={() => setModoPersonalizado(!modoPersonalizado)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        {modoPersonalizado ? '← Volver a predefinidos' : '⚙️ Configuración personalizada'}
      </button>

      {/* Configuración personalizada */}
      {modoPersonalizado && (
        <div className="mt-4 space-y-4 pt-4 border-t-2 border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjuntos:
            </label>
            <select
              value={configuracionActual.adjuntosRequeridos}
              onChange={(e) =>
                onChange({
                  ...configuracionActual,
                  adjuntosRequeridos: e.target.value as RequisitoEvidencia
                })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="OBLIGATORIO">Obligatorio</option>
              <option value="OPCIONAL">Opcional</option>
              <option value="NO_REQUERIDO">No requerido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones:
            </label>
            <select
              value={configuracionActual.observacionRequerida}
              onChange={(e) =>
                onChange({
                  ...configuracionActual,
                  observacionRequerida: e.target.value as RequisitoEvidencia
                })
              }
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
            >
              <option value="OBLIGATORIO">Obligatorio</option>
              <option value="OPCIONAL">Opcional</option>
              <option value="NO_REQUERIDO">No requerido</option>
            </select>
          </div>

          {configuracionActual.adjuntosRequeridos === 'OBLIGATORIO' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mínimo de adjuntos:
              </label>
              <input
                type="number"
                min="1"
                value={configuracionActual.minimoAdjuntos || 1}
                onChange={(e) =>
                  onChange({
                    ...configuracionActual,
                    minimoAdjuntos: parseInt(e.target.value)
                  })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
          )}

          {configuracionActual.observacionRequerida === 'OBLIGATORIO' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitud mínima de observación (caracteres):
              </label>
              <input
                type="number"
                min="0"
                value={configuracionActual.longitudMinimaObservacion || 0}
                onChange={(e) =>
                  onChange({
                    ...configuracionActual,
                    longitudMinimaObservacion: parseInt(e.target.value)
                  })
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: BITÁCORA DE OBSERVACIONES
// ════════════════════════════════════════════════════════════════════════════

interface BitacoraObservacionesProps {
  observaciones: ObservacionHistorica[];
  onAgregar: (texto: string) => void;
  onEditar: (id: string, texto: string) => void;
  onEliminar: (id: string) => void;
  configuracion: ConfiguracionEvidencias;
}

export function BitacoraObservaciones({
  observaciones,
  onAgregar,
  onEditar,
  onEliminar,
  configuracion
}: BitacoraObservacionesProps) {
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEditado, setTextoEditado] = useState('');

  const handleAgregar = () => {
    if (!nuevaObservacion.trim()) {
      toast.error('La observación no puede estar vacía');
      return;
    }

    if (
      configuracion.observacionRequerida === 'OBLIGATORIO' &&
      configuracion.longitudMinimaObservacion &&
      nuevaObservacion.length < configuracion.longitudMinimaObservacion
    ) {
      toast.error(
        `La observación debe tener al menos ${configuracion.longitudMinimaObservacion} caracteres`
      );
      return;
    }

    onAgregar(nuevaObservacion);
    setNuevaObservacion('');
    toast.success('Observación agregada correctamente');
  };

  const handleGuardarEdicion = (id: string) => {
    if (!textoEditado.trim()) {
      toast.error('La observación no puede estar vacía');
      return;
    }
    onEditar(id, textoEditado);
    setEditandoId(null);
    setTextoEditado('');
    toast.success('Observación actualizada');
  };

  const iniciarEdicion = (obs: ObservacionHistorica) => {
    setEditandoId(obs.id);
    setTextoEditado(obs.texto);
  };

  if (configuracion.observacionRequerida === 'NO_REQUERIDO') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Bitácora de observaciones
          {configuracion.observacionRequerida === 'OBLIGATORIO' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
              OBLIGATORIO
            </span>
          )}
        </h3>
        <span className="text-sm text-gray-600">
          {observaciones.length} registro(s)
        </span>
      </div>

      {/* Nueva observación */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nueva observación:
        </label>
        <textarea
          value={nuevaObservacion}
          onChange={(e) => setNuevaObservacion(e.target.value)}
          placeholder="Escribir observación sobre el cumplimiento de la actividad..."
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg resize-none focus:border-blue-500 focus:outline-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {nuevaObservacion.length} caracteres
            {configuracion.longitudMinimaObservacion &&
              configuracion.observacionRequerida === 'OBLIGATORIO' &&
              ` (mínimo ${configuracion.longitudMinimaObservacion})`}
          </span>
          <button
            onClick={handleAgregar}
            disabled={!nuevaObservacion.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar observación
          </button>
        </div>
      </div>

      {/* Lista de observaciones */}
      <div className="space-y-3">
        {observaciones.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay observaciones registradas</p>
          </div>
        ) : (
          observaciones.map((obs) => (
            <motion.div
              key={obs.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User className="w-3 h-3" />
                  <span className="font-medium">{obs.responsable.nombre}</span>
                  <span className="text-gray-400">•</span>
                  <span>{obs.responsable.cargo}</span>
                </div>
                <div className="flex items-center gap-2">
                  {editandoId !== obs.id && (
                    <>
                      <button
                        onClick={() => iniciarEdicion(obs)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta observación?')) {
                            onEliminar(obs.id);
                          }
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editandoId === obs.id ? (
                <div>
                  <textarea
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGuardarEdicion(obs.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded font-medium text-sm flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditandoId(null);
                        setTextoEditado('');
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded font-medium text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
                  {obs.texto}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(obs.fechaCreacion).toLocaleDateString('es-CO')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {obs.horaCreacion}
                </div>
                {obs.editada && (
                  <span className="text-orange-600">
                    (Editada el {new Date(obs.fechaEdicion!).toLocaleDateString('es-CO')} a las{' '}
                    {obs.horaEdicion})
                  </span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: GESTIÓN DE ADJUNTOS
// ════════════════════════════════════════════════════════════════════════════

interface GestionAdjuntosProps {
  adjuntos: ArchivoAdjunto[];
  onAgregar: (archivo: Omit<ArchivoAdjunto, 'id'>) => void;
  onEliminar: (id: string) => void;
  configuracion: ConfiguracionEvidencias;
}

export function GestionAdjuntos({
  adjuntos,
  onAgregar,
  onEliminar,
  configuracion
}: GestionAdjuntosProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      
      // Validar tipo de archivo
      if (
        configuracion.tiposAdjuntosPermitidos &&
        !configuracion.tiposAdjuntosPermitidos.includes(extension)
      ) {
        toast.error(
          `Tipo de archivo no permitido: .${extension}. ` +
          `Permitidos: ${configuracion.tiposAdjuntosPermitidos.join(', ')}`
        );
        return;
      }

      const now = new Date();
      onAgregar({
        nombre: file.name,
        tipo: extension,
        tamaño: file.size,
        fechaCarga: now.toISOString(),
        horaCarga: now.toLocaleTimeString('es-CO', { hour12: false }),
        cargadoPor: {
          nombre: 'Usuario Actual', // TODO: Obtener del contexto de autenticación
          cargo: 'Auditor'
        }
      });
      toast.success(`Archivo "${file.name}" cargado correctamente`);
    });

    e.target.value = '';
  };

  if (configuracion.adjuntosRequeridos === 'NO_REQUERIDO') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-blue-600" />
          Archivos adjuntos
          {configuracion.adjuntosRequeridos === 'OBLIGATORIO' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
              OBLIGATORIO (mín. {configuracion.minimoAdjuntos || 1})
            </span>
          )}
        </h3>
        <span className="text-sm text-gray-600">
          {adjuntos.length} archivo(s)
        </span>
      </div>

      {/* Botón de carga */}
      <label className="block w-full mb-4">
        <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium mb-1">
            Haz clic para cargar archivos
          </p>
          {configuracion.tiposAdjuntosPermitidos && (
            <p className="text-xs text-gray-500">
              Formatos permitidos: {configuracion.tiposAdjuntosPermitidos.join(', ')}
            </p>
          )}
        </div>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept={
            configuracion.tiposAdjuntosPermitidos
              ? configuracion.tiposAdjuntosPermitidos.map((t) => `.${t}`).join(',')
              : undefined
          }
        />
      </label>

      {/* Lista de archivos */}
      <div className="space-y-2">
        {adjuntos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay archivos adjuntos</p>
          </div>
        ) : (
          adjuntos.map((archivo) => (
            <motion.div
              key={archivo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{archivo.nombre}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{(archivo.tamaño / 1024).toFixed(2)} KB</span>
                    <span>•</span>
                    <span>{archivo.cargadoPor.nombre}</span>
                    <span>•</span>
                    <span>
                      {new Date(archivo.fechaCarga).toLocaleDateString('es-CO')} {archivo.horaCarga}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${archivo.nombre}"?`)) {
                    onEliminar(archivo.id);
                    toast.info('Archivo eliminado');
                  }
                }}
                className="p-2 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: INDICADOR DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface IndicadorValidacionProps {
  estado: EstadoEvidencias;
  configuracion: ConfiguracionEvidencias;
}

export function IndicadorValidacion({ estado, configuracion }: IndicadorValidacionProps) {
  const validacion = validarEvidencias(estado, configuracion);

  if (validacion.valido) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-green-900 mb-1">Evidencias completas</h4>
          <p className="text-sm text-green-700">
            Esta actividad cumple con todos los requisitos de evidencia y puede marcarse como completada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-red-900 mb-1">Evidencias incompletas</h4>
          <p className="text-sm text-red-700 mb-3">
            Esta actividad no puede marcarse como completada hasta cumplir con los siguientes requisitos:
          </p>
        </div>
      </div>
      <ul className="space-y-2 ml-8">
        {validacion.mensajes.map((mensaje, index) => (
          <li key={index} className="text-sm text-red-800 flex items-start gap-2">
            <span className="text-red-600">•</span>
            <span>{mensaje}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
