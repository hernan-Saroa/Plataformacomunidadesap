/**
 * ModalCargarAvance - ESAP 2025 Standard
 * Modal para actualizar el avance de un indicador del Plan de Acción
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Upload, FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Progress } from '../../../ui/progress';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';

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
  onGuardar?: (data: any) => void;
}

export function ModalCargarAvance({ isOpen, onClose, indicador, onGuardar }: ModalCargarAvanceProps) {
  const [nuevoValor, setNuevoValor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [evidencias, setEvidencias] = useState('');
  const [avanceCalculado, setAvanceCalculado] = useState(0);
  const [estadoCalculado, setEstadoCalculado] = useState<'EN_TIEMPO' | 'EN_RIESGO' | 'VENCIDO' | 'COMPLETADO'>('EN_TIEMPO');

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

  const handleSubmit = (e: React.FormEvent) => {
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
      evidenciasAvance: evidencias
    };

    if (onGuardar) {
      onGuardar(actualizacion);
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

              <div className="space-y-2">
                <Label htmlFor="evidencias" className="text-sm font-semibold text-gray-700">
                  Evidencias o Documentos de Soporte <span className="text-gray-500">(Opcional)</span>
                </Label>
                <Input
                  id="evidencias"
                  placeholder="URL de documentos, informes, actas, etc."
                  value={evidencias}
                  onChange={(e) => setEvidencias(e.target.value)}
                  className="border-2 border-gray-300 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Puede incluir enlaces a Google Drive, SharePoint, o sistema documental
                </p>
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
                className="px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Guardar Avance
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}