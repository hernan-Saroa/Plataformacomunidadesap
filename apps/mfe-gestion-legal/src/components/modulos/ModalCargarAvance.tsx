/**
 * ModalCargarAvance - ESAP 2025 Standard
 * Modal para actualizar el avance de un indicador del Plan de Acción
 */

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Upload, FileText, Calendar, AlertCircle, CheckCircle, Paperclip, X as XIcon } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Progress } from '@esap-mfe/shared-ui/progress';
import { toast } from 'sonner';
import { ModalHeaderClean } from './ModalHeaderClean';
import confetti from 'canvas-confetti';

interface Indicador {
  id: string;
  codigo: string;
  nombre: string;
  meta: number;
  valorActual: number;
  avance: number;
  unidadMedida: string;
  ejeEstrategico: string;
}

interface ModalCargarAvanceProps {
  isOpen: boolean;
  onClose: () => void;
  indicador: Indicador | null;
  onGuardar?: (data: any) => void | Promise<void>;
}

export function ModalCargarAvance({ isOpen, onClose, indicador, onGuardar }: ModalCargarAvanceProps) {
  const [nuevoValor, setNuevoValor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  // Bug 6a: evidencia es un archivo (no URL). Igual que el resto del módulo.
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const evidenciaInputRef = useRef<HTMLInputElement>(null);
  const [avanceCalculado, setAvanceCalculado] = useState(0);
  const [estadoCalculado, setEstadoCalculado] = useState<'EN_TIEMPO' | 'EN_RIESGO' | 'VENCIDO' | 'COMPLETADO'>('EN_TIEMPO');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (indicador) {
      setNuevoValor(indicador.valorActual.toString());
    }
  }, [indicador]);

  useEffect(() => {
    if (nuevoValor && indicador) {
      const valor = parseFloat(nuevoValor);
      if (!isNaN(valor) && indicador.meta > 0) {
        const avance = Math.min(Math.round((valor / indicador.meta) * 100), 100);
        setAvanceCalculado(avance);

        // Calcular estado automáticamente
        if (avance >= 100) {
          setEstadoCalculado('COMPLETADO');
        } else if (avance >= 90) {
          setEstadoCalculado('EN_TIEMPO');
        } else if (avance >= 50) {
          setEstadoCalculado('EN_RIESGO');
        } else {
          setEstadoCalculado('VENCIDO');
        }
      }
    }
  }, [nuevoValor, indicador]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevoValor || parseFloat(nuevoValor) < 0) {
      toast.error('El valor actual debe ser mayor o igual a cero');
      return;
    }

    if (!observaciones.trim()) {
      toast.warning('Se recomienda agregar observaciones sobre el avance');
    }

    const actualizacion = {
      ...indicador,
      valorActual: parseFloat(nuevoValor),
      avance: avanceCalculado,
      estado: estadoCalculado,
      ultimaActualizacion: new Date(),
      observacionesAvance: observaciones,
      // Bug 6a: la evidencia ahora es un File real
      evidenciaFile: evidenciaFile,
    };

    if (onGuardar) {
      try {
        setGuardando(true);
        await onGuardar(actualizacion);
      } catch {
        // El error ya se notifica en el llamador; dejamos el modal abierto para reintentar.
        return;
      } finally {
        setGuardando(false);
      }
    }

    // Check for Celebration 🎉
    if (avanceCalculado >= 100) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#003DA5', '#ffffff', '#10B981'] // ESAP colors
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#003DA5', '#ffffff', '#10B981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    toast.success('Avance actualizado exitosamente', {
      description: `${indicador?.codigo}: ${avanceCalculado}% de cumplimiento`
    });

    onClose();
  };

  const getSemaforoColor = (avance: number) => {
    if (avance >= 90) return '#10B981'; // Verde
    if (avance >= 50) return '#F59E0B'; // Amarillo
    return '#DC2626'; // Rojo
  };

  const getSemaforoIcon = () => {
    if (avanceCalculado >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (avanceCalculado >= 50) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  if (!isOpen || !indicador) return null;

  const ejeColors = {
    GESTION_INSTITUCIONAL: { bg: '#E3F2FD', text: '#2962FF', label: 'Gestión Institucional' },
    TALENTO_HUMANO: { bg: '#FFF3E0', text: '#F57C00', label: 'Talento Humano' },
    TRANSPARENCIA: { bg: '#E8F5E9', text: '#00C853', label: 'Transparencia' },
    TECNOLOGIA: { bg: '#F3E5F5', text: '#9C27B0', label: 'Tecnología' }
  };

  const colorEje = ejeColors[indicador.ejeEstrategico as keyof typeof ejeColors] || ejeColors.GESTION_INSTITUCIONAL;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen md:min-h-0 flex items-start md:items-center justify-center p-0 md:p-4 md:py-8">
        <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col my-0 md:my-4">
          {/* Header con ModalHeaderClean */}
          <ModalHeaderClean
            titulo="Actualizar Avance"
            subtitulo={indicador.nombre}
            icono={TrendingUp}
            colorIcono="green"
            badges={
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-300">
                  {indicador.codigo}
                </span>
                <span
                  className="px-3 py-1 text-xs font-bold rounded-full border"
                  style={{
                    backgroundColor: colorEje.bg,
                    color: colorEje.text,
                    borderColor: colorEje.text
                  }}
                >
                  {colorEje.label}
                </span>
              </div>
            }
            onClose={onClose}
          />

          {/* Contenido del Modal */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Estado Actual */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Estado Actual</h3>
                <span className="text-xs text-gray-600">
                  Última actualización: {new Date().toLocaleDateString('es-CO')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Meta</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {indicador.meta}{indicador.unidadMedida}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Valor Actual</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {indicador.valorActual}{indicador.unidadMedida}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">% Cumplimiento</p>
                  <p className="text-2xl font-bold" style={{ color: getSemaforoColor(indicador.avance) }}>
                    {indicador.avance}%
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <Progress value={indicador.avance} className="h-3" />
              </div>
            </div>

            {/* Formulario de Actualización */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-green-100">
                <Upload className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-gray-900">Nueva Medición</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nuevoValor" className="text-sm font-semibold text-gray-700">
                  Nuevo Valor Alcanzado <span className="text-red-600">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="nuevoValor"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Ej: ${indicador.meta}`}
                    value={nuevoValor}
                    onChange={(e) => setNuevoValor(e.target.value)}
                    className="border-2 border-gray-300 focus:border-green-500"
                    required
                  />
                  <span className="text-sm font-bold text-gray-700 min-w-[50px]">
                    {indicador.unidadMedida}
                  </span>
                </div>
              </div>

              {/* Vista Previa del Cálculo */}
              {nuevoValor && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getSemaforoIcon()}
                    <h4 className="font-bold text-gray-900">Vista Previa del Avance</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Nuevo % de Cumplimiento:</span>
                      <span
                        className="text-2xl font-bold"
                        style={{ color: getSemaforoColor(avanceCalculado) }}
                      >
                        {avanceCalculado}%
                      </span>
                    </div>

                    <Progress value={avanceCalculado} className="h-3" />

                    <div className="flex items-center justify-between pt-2 border-t border-green-200">
                      <span className="text-sm text-gray-700">Estado Calculado:</span>
                      <span
                        className="px-3 py-1 text-xs font-bold rounded-full"
                        style={{
                          backgroundColor: estadoCalculado === 'COMPLETADO'
                            ? '#D1FAE5'
                            : estadoCalculado === 'EN_TIEMPO'
                              ? '#D1FAE5'
                              : estadoCalculado === 'EN_RIESGO'
                                ? '#FEF3C7'
                                : '#FEE2E2',
                          color: estadoCalculado === 'COMPLETADO'
                            ? '#059669'
                            : estadoCalculado === 'EN_TIEMPO'
                              ? '#10B981'
                              : estadoCalculado === 'EN_RIESGO'
                                ? '#F59E0B'
                                : '#DC2626'
                        }}
                      >
                        {estadoCalculado === 'COMPLETADO'
                          ? '✅ Completado'
                          : estadoCalculado === 'EN_TIEMPO'
                            ? '🟢 En Tiempo'
                            : estadoCalculado === 'EN_RIESGO'
                              ? '🟡 En Riesgo'
                              : '🔴 Vencido'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-blue-100">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Observaciones y Evidencias</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones" className="text-sm font-semibold text-gray-700">
                  Observaciones del Avance <span className="text-orange-600">(Recomendado)</span>
                </Label>
                <Textarea
                  id="observaciones"
                  placeholder="Describa los logros, dificultades o acciones realizadas para alcanzar este avance..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  className="border-2 border-gray-300 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Bug 6a: Evidencia como archivo (no URL) — patrón estándar del módulo */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  Evidencia o Documento de Soporte <span className="text-gray-500">(Opcional)</span>
                </Label>
                {!evidenciaFile ? (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer transition-colors bg-gray-50"
                    onClick={() => evidenciaInputRef.current?.click()}
                  >
                    <Upload className="w-7 h-7 mx-auto mb-1 text-gray-400" />
                    <p className="text-sm text-gray-600 font-medium">Adjuntar evidencia</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PDF, Word, Excel, imágenes · Máx. 200 MB
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                    <FileText className="w-7 h-7 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{evidenciaFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(evidenciaFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenciaFile(null);
                        if (evidenciaInputRef.current) evidenciaInputRef.current.value = '';
                      }}
                      className="p-1 hover:bg-white rounded"
                      aria-label="Quitar evidencia"
                    >
                      <XIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
                <input
                  ref={evidenciaInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size / (1024 * 1024) > 200) {
                      toast.error('El archivo supera el límite de 200 MB');
                      e.target.value = '';
                      return;
                    }
                    setEvidenciaFile(f);
                  }}
                />
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-6 border-2 border-gray-300 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando}
                className="px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold disabled:opacity-60"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {guardando ? 'Guardando...' : 'Guardar Avance'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
