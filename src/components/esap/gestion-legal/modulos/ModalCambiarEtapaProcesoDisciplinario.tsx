/**
 * ModalCambiarEtapaProcesoDisciplinario - Modal para cambiar la etapa de un proceso disciplinario
 * ✅ Muestra etapa actual
 * ✅ Permite seleccionar nueva etapa con restricciones
 * ✅ Modal de confirmación antes de aplicar cambios
 * ✅ Diseño limpio ESAP 2025
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, AlertTriangle, CheckCircle,
  FileCheck, Edit, Search, Gavel
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';
import { toast } from 'sonner';
import type { ProcesoDisciplinario } from '../core/types';
import { ConfirmationModal } from '../../ConfirmationModal';

interface Proceso {
  id: string;
  numeroProceso: string;
  etapaActual: string;
  denunciado: any; // Persona
  denunciante: any; // Persona
  profesionalAsignado: any; // Persona
  estadoActual: string;
}

interface ModalCambiarEtapaProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso?: Proceso;
  onConfirmarCambio: (nuevaEtapa: string) => void;
}

export function ModalCambiarEtapaProcesoDisciplinario({
  isOpen,
  onClose,
  proceso,
  onConfirmarCambio
}: ModalCambiarEtapaProcesoDisciplinarioProps) {
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string>('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Definir etapas disponibles - Usando los valores exactos que vienen del backend
  const etapas = [
    {
      valor: 'RECEPCION',
      label: 'Recepción',
      descripcion: 'Inicio del proceso disciplinario',
      icono: <FileCheck className="w-4 h-4" />,
      color: 'bg-orange-100 text-orange-700 border-orange-300'
    },
    {
      valor: 'VALORACION',
      label: 'Valoración',
      descripcion: 'Evaluación inicial del caso',
      icono: <Edit className="w-4 h-4" />,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    },
    {
      valor: 'INDAGACION_PREVIA',
      label: 'Indagación Previa',
      descripcion: 'Investigación preliminar',
      icono: <Search className="w-4 h-4" />,
      color: 'bg-blue-100 text-blue-700 border-blue-300'
    },
    {
      valor: 'INVESTIGACION',
      label: 'Investigación',
      descripcion: 'Investigación completa del caso',
      icono: <Search className="w-4 h-4" />,
      color: 'bg-purple-100 text-purple-700 border-purple-300'
    },
    {
      valor: 'JUZGAMIENTO',
      label: 'Juzgamiento',
      descripcion: 'Proceso de juzgamiento',
      icono: <Gavel className="w-4 h-4" />,
      color: 'bg-green-100 text-green-700 border-green-300'
    },
    {
      valor: 'FALLO',
      label: 'Fallo',
      descripcion: 'Emisión del fallo final',
      icono: <Gavel className="w-4 h-4" />,
      color: 'bg-red-100 text-red-700 border-red-300'
    }
  ];

  // Obtener configuración de etapa actual
  const etapaActual = etapas.find(e => e.valor === proceso!.etapaActual);

  // Determinar etapas permitidas (no se puede volver a recepción si ya pasó)
  const etapasPermitidas = etapas.filter(etapa => {
    if (proceso!.etapaActual === 'RECEPCION') {
      // Desde recepción puede ir a cualquier etapa
      return true;
    } else if (proceso!.etapaActual === 'VALORACION') {
      // Desde valoración puede ir a indagación previa, investigación, juzgamiento o fallo, pero no volver a recepción
      return etapa.valor !== 'RECEPCION';
    } else if (proceso!.etapaActual === 'INDAGACION_PREVIA') {
      // Desde indagación previa puede ir a investigación, juzgamiento o fallo
      return ['INVESTIGACION', 'JUZGAMIENTO', 'FALLO'].includes(etapa.valor);
    } else if (proceso!.etapaActual === 'INVESTIGACION') {
      // Desde investigación puede ir a juzgamiento o fallo
      return ['JUZGAMIENTO', 'FALLO'].includes(etapa.valor);
    } else if (proceso!.etapaActual === 'JUZGAMIENTO') {
      // Desde juzgamiento solo puede ir a fallo
      return etapa.valor === 'FALLO';
    } else {
      // Desde fallo no puede cambiar (etapa final)
      return false;
    }
  });

  const handleSeleccionarEtapa = (etapa: string) => {
    setEtapaSeleccionada(etapa);
  };

  const handleContinuar = () => {
    if (!etapaSeleccionada) {
      toast.error('Selecciona una etapa', {
        description: 'Debes seleccionar la nueva etapa del proceso'
      });
      return;
    }

    setMostrarConfirmacion(true);
  };

  const handleConfirmarCambio = () => {
    onConfirmarCambio(etapaSeleccionada);
    setMostrarConfirmacion(false);
    setEtapaSeleccionada('');
    onClose();
  };

  const handleCerrar = () => {
    setEtapaSeleccionada('');
    setMostrarConfirmacion(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Cambiar Etapa del Proceso</h2>
                <p className="text-blue-100 text-sm">
                  Proceso {proceso!.numeroProceso} - {proceso!.denunciado?.nombre || 'Sin nombre'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Etapa Actual */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Etapa Actual
              </h3>
              <div className="flex items-center gap-3">
                {etapaActual?.icono}
                <div>
                  <Badge className={`${etapaActual?.color} border font-semibold`}>
                    {etapaActual?.label}
                  </Badge>
                  <p className="text-sm text-blue-700 mt-1">
                    {etapaActual?.descripcion}
                  </p>
                </div>
              </div>
            </div>

            {/* Seleccionar Nueva Etapa */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Seleccionar Nueva Etapa
              </h3>

              {etapasPermitidas.length === 0 ? (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">No hay etapas disponibles</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    El proceso se encuentra en su etapa final y no puede cambiar de etapa.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {etapasPermitidas.map((etapa) => (
                    <Card
                      key={etapa.valor}
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        etapaSeleccionada === etapa.valor
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSeleccionarEtapa(etapa.valor)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          etapaSeleccionada === etapa.valor ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {etapa.icono}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`${etapa.color} border font-semibold`}>
                              {etapa.label}
                            </Badge>
                            {etapaSeleccionada === etapa.valor && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {etapa.descripcion}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex gap-3">
            <Button
              onClick={handleCerrar}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            {etapasPermitidas.length > 0 && (
              <Button
                onClick={handleContinuar}
                disabled={!etapaSeleccionada}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continuar
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal de Confirmación */}
      <ConfirmationModal
        isOpen={mostrarConfirmacion}
        onClose={() => setMostrarConfirmacion(false)}
        onConfirm={handleConfirmarCambio}
        title="Confirmar Cambio de Etapa"
        description={`¿Estás seguro de cambiar la etapa del proceso ${proceso!.id} de "${etapaActual?.label}" a "${etapas.find(e => e.valor === etapaSeleccionada)?.label}"?`}
        type="warning"
        confirmText="Sí, cambiar etapa"
        cancelText="No, cancelar"
        icon={<AlertTriangle className="w-5 h-5" />}
      />
    </>
  );
}