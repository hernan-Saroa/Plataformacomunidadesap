/**
 * ModalGenerarActoAdministrativo - Modal para generar actos administrativos en procesos coactivos
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, FileCheck, Calendar, User, AlertCircle, CheckCircle, Download, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';

interface ModalGenerarActoAdministrativoProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: {
    id: string;
    deudor: string;
    valorTotal: number;
    etapa: string;
  };
  onGenerar?: (acto: any) => void;
}

export function ModalGenerarActoAdministrativo({
  isOpen,
  onClose,
  proceso,
  onGenerar
}: ModalGenerarActoAdministrativoProps) {
  const [tipoActo, setTipoActo] = useState<string>('');
  const [numeroActo, setNumeroActo] = useState('');
  const [fechaActo, setFechaActo] = useState(new Date().toISOString().split('T')[0]);
  const [fundamentacion, setFundamentacion] = useState('');
  const [incluirNotificacion, setIncluirNotificacion] = useState(true);
  const [incluirTerminos, setIncluirTerminos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVistaPrevia, setShowVistaPrevia] = useState(false);

  const actosDisponibles = [
    {
      value: 'MANDAMIENTO_PAGO',
      label: 'Mandamiento de Pago',
      descripcion: 'Acto que ordena el pago de la obligación',
      icon: '⚖️',
      etapaRequerida: ['PREJUDICIAL', 'MANDAMIENTO'],
      articulos: ['Art. 826-828 del Estatuto Tributario']
    },
    {
      value: 'RESOLUCION_EMBARGO',
      label: 'Resolución de Embargo',
      descripcion: 'Ordena embargo de bienes del deudor',
      icon: '🔒',
      etapaRequerida: ['MANDAMIENTO'],
      articulos: ['Art. 836-837 del Estatuto Tributario']
    },
    {
      value: 'RESOLUCION_REMATE',
      label: 'Resolución de Remate',
      descripcion: 'Autoriza el remate de bienes embargados',
      icon: '🔨',
      etapaRequerida: ['MANDAMIENTO'],
      articulos: ['Art. 842-843 del Estatuto Tributario']
    },
    {
      value: 'AUTO_ARCHIVO',
      label: 'Auto de Archivo',
      descripcion: 'Archiva el proceso coactivo',
      icon: '📦',
      etapaRequerida: ['IDENTIFICADO', 'PERSUASIVO', 'PREJUDICIAL', 'MANDAMIENTO'],
      articulos: ['Art. 825 del Estatuto Tributario']
    },
    {
      value: 'RESOLUCION_TERMINACION',
      label: 'Resolución de Terminación',
      descripcion: 'Termina el proceso por pago total',
      icon: '✅',
      etapaRequerida: ['MANDAMIENTO'],
      articulos: ['Art. 825 del Estatuto Tributario']
    },
    {
      value: 'AUTO_SUSPENSION',
      label: 'Auto de Suspensión',
      descripcion: 'Suspende temporalmente el proceso',
      icon: '⏸️',
      etapaRequerida: ['PERSUASIVO', 'PREJUDICIAL', 'MANDAMIENTO'],
      articulos: ['Art. 825-3 del Estatuto Tributario']
    }
  ];

  const actosPermitidos = actosDisponibles.filter(acto =>
    acto.etapaRequerida.includes(proceso.etapa)
  );

  const actoSeleccionado = actosDisponibles.find(a => a.value === tipoActo);

  const handleGenerarVistaPrevia = () => {
    if (!tipoActo || !numeroActo.trim()) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    setShowVistaPrevia(true);
    toast.info('📄 Generando vista previa del documento...');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoActo) {
      toast.error('Seleccione el tipo de acto administrativo');
      return;
    }

    if (!numeroActo.trim()) {
      toast.error('Ingrese el número del acto');
      return;
    }

    if (!fundamentacion.trim()) {
      toast.error('Ingrese la fundamentación jurídica');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const acto = {
        tipo: tipoActo,
        numero: numeroActo,
        fecha: new Date(fechaActo),
        fundamentacion,
        incluirNotificacion,
        incluirTerminos,
        procesoId: proceso.id
      };

      toast.success(`✅ ${actoSeleccionado?.label} generado exitosamente`, {
        description: `Número: ${numeroActo}`
      });

      onGenerar?.(acto);
      onClose();
    } catch (error) {
      toast.error('Error al generar el acto administrativo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[104]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-2xl shadow-2xl z-[105] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <ModalHeaderClean
              titulo="Generar Acto Administrativo"
              subtitulo={`${proceso.id} • ${proceso.deudor}`}
              icono={FileCheck}
              colorIcono="indigo"
              onClose={onClose}
            />

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Información del Proceso */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 font-bold">Proceso</p>
                    <p className="text-gray-900 font-mono mt-1">{proceso.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-bold">Etapa Actual</p>
                    <p className="text-gray-900 mt-1">{proceso.etapa}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-bold">Valor Total</p>
                    <p className="text-red-600 font-bold mt-1">{formatCurrency(proceso.valorTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Tipo de Acto Administrativo */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Tipo de Acto Administrativo *
                </label>
                
                {actosPermitidos.length === 0 ? (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-yellow-900">
                        No hay actos disponibles para esta etapa
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        El proceso debe estar en una etapa específica para generar ciertos actos administrativos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {actosPermitidos.map((acto) => (
                      <button
                        key={acto.value}
                        type="button"
                        onClick={() => {
                          setTipoActo(acto.value);
                          // Auto-generar número
                          const prefix = acto.value.split('_')[0];
                          setNumeroActo(`${prefix}-${new Date().getFullYear()}-`);
                        }}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          tipoActo === acto.value
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{acto.icon}</div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{acto.label}</p>
                            <p className="text-xs text-gray-600 mt-1">{acto.descripcion}</p>
                            <p className="text-xs text-indigo-600 mt-2 font-semibold">
                              {acto.articulos.join(', ')}
                            </p>
                          </div>
                          {tipoActo === acto.value && (
                            <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Datos del Acto */}
              {tipoActo && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Número del Acto *
                      </label>
                      <input
                        type="text"
                        value={numeroActo}
                        onChange={(e) => setNumeroActo(e.target.value)}
                        placeholder="Ej: MANDAMIENTO-2025-001"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Fecha del Acto *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={fechaActo}
                          onChange={(e) => setFechaActo(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fundamentación Jurídica */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Fundamentación Jurídica *
                    </label>
                    <textarea
                      value={fundamentacion}
                      onChange={(e) => setFundamentacion(e.target.value)}
                      placeholder={`Ingrese la fundamentación legal y fáctica del ${actoSeleccionado?.label}...`}
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none resize-none"
                      required
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      💡 Sugerencia: Base normativa - {actoSeleccionado?.articulos.join(', ')}
                    </p>
                  </div>

                  {/* Opciones Adicionales */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">
                      Opciones del Documento
                    </h3>
                    
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incluirNotificacion}
                        onChange={(e) => setIncluirNotificacion(e.target.checked)}
                        className="mt-1 w-5 h-5 border-2 border-gray-400 rounded"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Incluir Constancia de Notificación
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Agrega la sección de notificación personal y por edicto al documento
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={incluirTerminos}
                        onChange={(e) => setIncluirTerminos(e.target.checked)}
                        className="mt-1 w-5 h-5 border-2 border-gray-400 rounded"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          Incluir Términos y Recursos
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Agrega la sección de términos procesales y recursos disponibles
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Alerta Informativa */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Importante</p>
                      <p className="text-xs text-blue-700 mt-1">
                        El acto administrativo se generará con el membrete oficial de la ESAP y quedará registrado 
                        en el expediente del proceso coactivo. Se recomienda revisar la vista previa antes de generar.
                      </p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerarVistaPrevia}
                        disabled={isSubmitting || !tipoActo || !numeroActo.trim()}
                        className="px-4 py-2.5 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Vista Previa
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !tipoActo || !numeroActo.trim() || !fundamentacion.trim()}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <FileCheck className="w-4 h-4" />
                            Generar Acto
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}