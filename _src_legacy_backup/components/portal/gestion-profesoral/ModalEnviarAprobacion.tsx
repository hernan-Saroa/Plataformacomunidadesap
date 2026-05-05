/**
 * Modal Enviar a Aprobación - UX Clase Mundial
 * Resumen completo + confirmación + celebración
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Clock,
  Sparkles,
  Download,
  ChevronRight
} from 'lucide-react';

interface ComponentePTA {
  nombre: string;
  emoji: string;
  color: string;
  horas: number;
  porcentaje: number;
  actividades: number;
  completado: boolean;
}

interface Aprobador {
  nivel: number;
  rol: string;
  nombre: string;
  descripcion: string;
}

interface ModalEnviarAprobacionProps {
  isOpen: boolean;
  onClose: () => void;
  onEnviar: () => void;
  pta: {
    periodo: string;
    horasBase: number;
    horasAsignadas: number;
    componentes: ComponentePTA[];
    evidenciasCompletas: number;
    evidenciasTotales: number;
    fechaLimite: string;
  };
  aprobadores: Aprobador[];
}

export function ModalEnviarAprobacion({
  isOpen,
  onClose,
  onEnviar,
  pta,
  aprobadores
}: ModalEnviarAprobacionProps) {
  const [confirmado, setConfirmado] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [radicado] = useState(`PTA-${pta.periodo}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`);

  const porcentajeTotal = Math.round((pta.horasAsignadas / pta.horasBase) * 100);
  const horasFaltantes = pta.horasBase - pta.horasAsignadas;
  const puedeEnviar = pta.horasAsignadas >= pta.horasBase && pta.evidenciasCompletas === pta.evidenciasTotales;

  const handleEnviar = () => {
    setEnviado(true);
    setTimeout(() => {
      onEnviar();
    }, 3000);
  };

  if (!isOpen) return null;

  // Pantalla de éxito
  if (enviado) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center"
        >
          {/* Animación de éxito */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2
            }}
            className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </motion.div>
          </motion.div>

          {/* Confetti effect (emoji) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            ¡PTA enviado exitosamente!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-lg text-gray-600 mb-8"
          >
            Tu Plan de Trabajo Académico ha sido enviado para revisión.
            <br />
            Te notificaremos cuando haya novedades.
          </motion.p>

          {/* Info del radicado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Número de radicado:</span>
                <span className="font-mono font-bold text-[#003DA5]">{radicado}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Fecha de envío:</span>
                <span className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                  En revisión
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="flex gap-3 justify-center"
          >
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Ver estado
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#003DA5] hover:bg-[#002875] text-white rounded-lg font-medium transition-colors"
            >
              Ir al inicio
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Pantalla de revisión
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#0052d4] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Revisar y Enviar a Aprobación</h2>
              <p className="text-xs text-blue-100">Verifica que todo esté correcto antes de enviar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Resumen General */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">
                📋 RESUMEN DE TU PTA {pta.periodo}
              </h3>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {pta.horasAsignadas}/{pta.horasBase}h
                </span>
                <span className={`
                  text-xl font-bold
                  ${porcentajeTotal === 100 ? 'text-green-600' : 'text-amber-600'}
                `}>
                  {porcentajeTotal}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentajeTotal}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`
                    h-full
                    ${porcentajeTotal === 100
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600'
                    }
                  `}
                />
              </div>
              {porcentajeTotal === 100 && (
                <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  ¡Perfecto! Has completado las {pta.horasBase} horas requeridas.
                </p>
              )}
            </div>
          </div>

          {/* Distribución por Componentes */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">DISTRIBUCIÓN</h4>
            <div className="space-y-3">
              {pta.componentes.map((comp, index) => (
                <motion.div
                  key={comp.nombre}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{comp.emoji}</span>
                      <div>
                        <h5 className="font-semibold text-gray-900">{comp.nombre}</h5>
                        <p className="text-sm text-gray-600">
                          {comp.actividades} {comp.actividades === 1 ? 'actividad' : 'actividades'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{comp.horas}h</p>
                      <p className="text-sm text-gray-600">{comp.porcentaje}%</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${comp.porcentaje}%`,
                        backgroundColor: comp.color
                      }}
                    />
                  </div>
                  {comp.completado && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completo
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Evidencias */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">EVIDENCIAS</h4>
              </div>
              <div className={`
                flex items-center gap-2 text-sm font-medium
                ${pta.evidenciasCompletas === pta.evidenciasTotales
                  ? 'text-green-600'
                  : 'text-amber-600'
                }
              `}>
                {pta.evidenciasCompletas === pta.evidenciasTotales ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>
                  {pta.evidenciasCompletas}/{pta.evidenciasTotales}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {pta.evidenciasCompletas === pta.evidenciasTotales
                ? 'Todas las actividades tienen evidencia completa'
                : `Faltan evidencias en ${pta.evidenciasTotales - pta.evidenciasCompletas} actividades`
              }
            </p>
          </div>

          {/* Aprobadores */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">APROBADORES</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Tu PTA será revisado por:
            </p>
            <div className="space-y-3">
              {aprobadores.map((aprobador, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">{aprobador.nivel}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{aprobador.rol}</p>
                    <p className="text-sm text-gray-600">{aprobador.descripcion}</p>
                    {aprobador.nombre && (
                      <p className="text-xs text-gray-500 mt-1">{aprobador.nombre}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Tiempo estimado de respuesta: 5-7 días hábiles</span>
            </div>
          </div>

          {/* Fecha límite */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-900">Fecha límite de envío</p>
                <p className="text-sm text-amber-800 mt-1">
                  Tienes hasta el <span className="font-semibold">{pta.fechaLimite}</span> para enviar tu PTA.
                </p>
              </div>
            </div>
          </div>

          {/* Validaciones */}
          {!puedeEnviar && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900 mb-2">
                    No puedes enviar todavía. Completa lo siguiente:
                  </p>
                  <ul className="space-y-1 text-sm text-red-800">
                    {horasFaltantes > 0 && (
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        Faltan {horasFaltantes} horas por asignar
                      </li>
                    )}
                    {pta.evidenciasCompletas < pta.evidenciasTotales && (
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        Faltan evidencias en {pta.evidenciasTotales - pta.evidenciasCompletas} actividades
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Confirmación */}
          {puedeEnviar && (
            <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  className="mt-1 w-5 h-5 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-[#003DA5] transition-colors">
                    Confirmo que la información registrada es correcta
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    y cuento con los soportes documentales de las actividades.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Volver a editar
          </button>

          <button
            onClick={handleEnviar}
            disabled={!puedeEnviar || !confirmado}
            className={`
              px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2
              ${puedeEnviar && confirmado
                ? 'bg-[#003DA5] hover:bg-[#002875] text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
            Enviar a aprobación
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
