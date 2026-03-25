/**
 * ModalCambiarEtapaProcesoDisciplinario - Modal para cambiar la etapa de un proceso disciplinario
 * ✅ Muestra etapa actual
 * ✅ Permite seleccionar nueva etapa con restricciones
 * ✅ Modal de confirmación antes de aplicar cambios
 * ✅ Diseño limpio ESAP 2025
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, AlertTriangle, CheckCircle,
  FileCheck, Edit, Search, Gavel, X
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { toast } from 'sonner';
import { ConfirmationModal } from '../ConfirmationModal';
import { useConfiguration } from '../../../hooks/useConfiguration';

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
  
  // Usar etapas configuradas desde el backend
  const { etapas: etapasConfiguradas } = useConfiguration();
  
  // Helper para normalizar nombres de etapas
  // IMPORTANTE: Conservamos los guiones bajos para distinguir INDAGACION_PREVIA de INDAGACION
  // También normalizamos variantes como "INDAGACION PREVIA" -> "INDAGACION_PREVIA"
  const normalizeEtapa = (valor: string) => {
    return valor
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/\s+/g, '_') // Convertir espacios a guiones bajos
      .replace(/[^a-zA-Z0-9_]/g, '') // Eliminar caracteres especiales excepto guiones bajos
      .toUpperCase();
  };

  // Helper para obtener icono según la etapa
  const getStageIcon = (nombre: string) => {
    const n = normalizeEtapa(nombre);
    if (n.includes('RECEPCION')) return <FileCheck className="w-4 h-4" />;
    if (n.includes('VALORACION') || n.includes('EVALUACION')) return <Edit className="w-4 h-4" />;
    if (n.includes('INDAGACION')) return <Search className="w-4 h-4" />;
    if (n.includes('INVESTIGACION')) return <Search className="w-4 h-4" />;
    if (n.includes('JUZGAMIENTO')) return <Gavel className="w-4 h-4" />;
    if (n.includes('FALLO')) return <Gavel className="w-4 h-4" />;
    if (n.includes('SEGUNDAINSTANCIA')) return <FileCheck className="w-4 h-4" />;
    return <FileCheck className="w-4 h-4" />;
  };

  // Helper para obtener color según la etapa
  const getStageColor = (nombre: string) => {
    const n = normalizeEtapa(nombre);
    if (n.includes('RECEPCION')) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (n.includes('VALORACION') || n.includes('EVALUACION')) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (n.includes('INDAGACIONPREVIA')) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (n.includes('INDAGACION') && !n.includes('PREVIA')) return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    if (n.includes('INVESTIGACION')) return 'bg-purple-100 text-purple-700 border-purple-300';
    if (n.includes('JUZGAMIENTO')) return 'bg-green-100 text-green-700 border-green-300';
    if (n.includes('FALLO')) return 'bg-red-100 text-red-700 border-red-300';
    if (n.includes('SEGUNDAINSTANCIA')) return 'bg-teal-100 text-teal-700 border-teal-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // Convertir etapas del hook al formato del modal
  const etapas = useMemo(() => {
    // Si hay etapas configuradas, usarlas; si no, usar las etapas por defecto
    const sourceEtapas = etapasConfiguradas.length > 0 ? etapasConfiguradas : [
      { id: '1', nombre: 'RECEPCION', dias: 3, orden: 1 },
      { id: '2', nombre: 'VALORACION', dias: 10, orden: 2 },
      { id: '3', nombre: 'INDAGACION PREVIA', dias: 40, orden: 3 },
      { id: '4', nombre: 'INVESTIGACION', dias: 60, orden: 4 },
      { id: '5', nombre: 'EVALUACION', dias: 10, orden: 5 },
      { id: '6', nombre: 'JUZGAMIENTO', dias: 50, orden: 6 },
      { id: '7', nombre: 'INDAGACION', dias: 30, orden: 7 },
      { id: '8', nombre: 'FALLO', dias: 10, orden: 8 },
      { id: '9', nombre: 'SEGUNDA INSTANCIA', dias: 10, orden: 9 }
    ];

    console.log('=== DEPURACIÓN ETAPAS ===');
    console.log('Etapas crudas del backend:', sourceEtapas.map(e => `${e.nombre} (orden: ${e.orden})`));
    
    // Normalizar y deduplicar etapas
    // Mapeo de variantes a nombres normalizados
    const normalizacionEquivalencias: Record<string, string> = {
      'INDAGACION': 'INDAGACION',  // SIN PREVIA
      'INDAGACIONPREVIA': 'INDAGACION_PREVIA',
      'INDAGACION_PREVIA': 'INDAGACION_PREVIA',
      'SEGUNDAINSTANCIA': 'SEGUNDA_INSTANCIA',
      'SEGUNDA_INSTANCIA': 'SEGUNDA_INSTANCIA',
    };

    // Deduplicar etapas por nombre normalizado
    const etapasMap = new Map<string, typeof sourceEtapas[0]>();
    
    sourceEtapas.forEach(etapa => {
      const normalized = normalizeEtapa(etapa.nombre);
      
      // Verificar si hay equivalencias conocidas
      let key = normalized;
      if (normalizacionEquivalencias[normalized]) {
        key = normalizacionEquivalencias[normalized];
      }
      
      // Si la clave ya existe, verificar si la nueva etapa tiene mejor orden
      if (etapasMap.has(key)) {
        const existing = etapasMap.get(key)!;
        if (etapa.orden < existing.orden) {
          console.log(`  Reemplazando etapa: ${etapa.nombre} (orden ${etapa.orden}) por mejor orden`);
          etapasMap.set(key, etapa);
        }
      } else {
        etapasMap.set(key, etapa);
      }
    });

    console.log('Etapas después de deduplicación:', Array.from(etapasMap.keys()));
    console.log('========================');

    // Ordenar por orden y mapear al formato del modal
    const etapasOrdenadas = Array.from(etapasMap.values())
      .sort((a, b) => a.orden - b.orden);

    return etapasOrdenadas.map(etapa => ({
      valor: etapa.nombre,
      label: etapa.nombre,
      descripcion: `Etapa de ${etapa.nombre}`,
      orden: etapa.orden,
      icono: getStageIcon(etapa.nombre),
      color: getStageColor(etapa.nombre)
    }));
  }, [etapasConfiguradas]);

  // Obtener etapa actual usando normalización
  const etapaActual = etapas.find(e => normalizeEtapa(e.valor) === normalizeEtapa(proceso!.etapaActual));

  // Determinar etapas permitidas según el flujo ESPECÍFICO:
  // RECEPCION → INDAGACION PREVIA / INVESTIGACION
  // VALORACION → INDAGACION PREVIA / INVESTIGACION
  // INDAGACION PREVIA / INVESTIGACION → EVALUACION / JUZGAMIENTO / FALLO
  // EVALUACION → JUZGAMIENTO / FALLO
  // JUZGAMIENTO → solo INDAGACION
  // INDAGACION → solo FALLO
  // FALLO → solo SEGUNDA INSTANCIA
  // SEGUNDA INSTANCIA → etapa final
  //
  // NOTA: El modal SOLO muestra transiciones hacia adelante (siguiente etapa).
  // Las devoluciones (movimientos hacia atrás) se hacen desde el arrastre del Kanban.
  
  const etapasPermitidas = etapas.filter((etapa, index) => {
    const etapaActualStr = proceso!.etapaActual;
    const etapaNormalizada = normalizeEtapa(etapaActualStr);
    const etapaDestinoNormalizada = normalizeEtapa(etapa.valor);
    
    let permitir = false;
    
    // SEGUNDA INSTANCIA es etapa final, no puede ir a otras etapas
    if (etapaNormalizada === 'SEGUNDA_INSTANCIA') {
      permitir = false;
    } else if (etapaNormalizada === 'RECEPCION') {
      // RECEPCION → VALORACION
      permitir = etapaDestinoNormalizada === 'VALORACION';
    } else if (etapaNormalizada === 'VALORACION') {
      // VALORACION → INDAGACION PREVIA / INVESTIGACION
      permitir = etapaDestinoNormalizada === 'INDAGACION_PREVIA';
    } else if (etapaNormalizada === 'INDAGACION_PREVIA') {
      // INDAGACION PREVIA  → INVESTIGACION
      permitir = etapaDestinoNormalizada === 'INVESTIGACION';
    } else if (etapaNormalizada === 'INVESTIGACION') {
      // INDAGACION PREVIA / INVESTIGACION → EVALUACION / JUZGAMIENTO / FALLO
      permitir = etapaDestinoNormalizada === 'EVALUACION';
    } else if (etapaNormalizada === 'EVALUACION') {
      // EVALUACION → JUZGAMIENTO / FALLO
      permitir = etapaDestinoNormalizada === 'JUZGAMIENTO';
    } else if (etapaNormalizada === 'JUZGAMIENTO') {
      // JUZGAMIENTO → solo INDAGACION
      permitir = etapaDestinoNormalizada === 'INDAGACION';
    } else if (etapaNormalizada === 'INDAGACION') {
      // INDAGACION → solo FALLO
      permitir = etapaDestinoNormalizada === 'FALLO';
    } else if (etapaNormalizada === 'FALLO') {
      // FALLO → solo SEGUNDA INSTANCIA
      permitir = etapaDestinoNormalizada === 'SEGUNDA_INSTANCIA';
    }
    
    return permitir;
  }).sort((a, b) => {
    // Ordenar por índice (menor índice primero)
    const ordenEtapas: Record<string, number> = {
      'RECEPCION': 1,
      'VALORACION': 2,
      'INDAGACION_PREVIA': 3,
      'INVESTIGACION': 4,
      'EVALUACION': 5,
      'JUZGAMIENTO': 6,
      'INDAGACION': 7,
      'FALLO': 8,
      'SEGUNDA_INSTANCIA': 9,
    };
    
    const indiceA = ordenEtapas[normalizeEtapa(a.valor)] || 0;
    const indiceB = ordenEtapas[normalizeEtapa(b.valor)] || 0;
    
    return indiceA - indiceB;
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowRight className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Cambiar Etapa del Proceso</h2>
                  <p className="text-blue-100 text-sm">
                    Proceso {proceso!.numeroProceso} - {proceso!.denunciado?.nombre || 'Sin nombre'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCerrar}
                className="text-white hover:text-blue-200 transition-colors p-1"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6" />
              </button>
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
        description={`¿Estás seguro de cambiar la etapa del proceso de "${etapaActual?.label}" a "${etapas.find(e => e.valor === etapaSeleccionada)?.label}"?`}
        type="warning"
        confirmText="Sí, cambiar etapa"
        cancelText="No, cancelar"
        icon={<AlertTriangle className="w-5 h-5" />}
      />
    </>
  );
}
