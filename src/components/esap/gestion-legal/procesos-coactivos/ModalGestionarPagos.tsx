/**
 * ModalGestionarPagos - Modal para registrar pagos y gestionar acuerdos de pago
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, DollarSign, Upload, CheckCircle, AlertCircle, FileText, Calculator, FileCheck, Trash2, RefreshCw, Eye, Download, FileType } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';
import { procesosCoactivosService, PagoCoactivo } from '../../../../services/api/legal.service';

interface ModalGestionarPagosProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: {
    id: string;
    radicado?: string;
    deudor: string;
    valorTotal: number;
    valorPagado: number;
  };
  onRegistrarPago?: (pago: any) => void;
}

export function ModalGestionarPagos({
  isOpen,
  onClose,
  proceso,
  onRegistrarPago
}: ModalGestionarPagosProps) {
  const [tipoPago, setTipoPago] = useState<'TOTAL' | 'PARCIAL'>('PARCIAL');
  const [valorPago, setValorPago] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'CONSIGNACION'>('TRANSFERENCIA');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para historial de pagos
  const [pagos, setPagos] = useState<PagoCoactivo[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);
  const [selectedPago, setSelectedPago] = useState<PagoCoactivo | null>(null);
  const [downloadingSoporte, setDownloadingSoporte] = useState(false);

  // Calcular saldo pendiente basado en pagos cargados
  const totalPagado = pagos.reduce((sum, p) => sum + Number(p.valor), 0);
  const saldoPendiente = proceso.valorTotal - totalPagado;

  // Cargar pagos al abrir el modal
  useEffect(() => {
    if (isOpen && proceso.id) {
      loadPagos();
    }
  }, [isOpen, proceso.id]);

  const loadPagos = async () => {
    setLoadingPagos(true);
    try {
      const data = await procesosCoactivosService.getPagos(proceso.id);
      setPagos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando pagos:', error);
      setPagos([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleDeletePago = async (pagoId: string) => {
    if (!confirm('¿Está seguro de eliminar este pago? El saldo pendiente se recalculará.')) return;

    setDeletingPagoId(pagoId);
    try {
      await procesosCoactivosService.deletePago(pagoId);
      toast.success('Pago eliminado correctamente');
      await loadPagos(); // Recargar pagos
      onRegistrarPago?.({}); // Notificar cambio para actualizar lista principal
    } catch (error) {
      console.error('Error eliminando pago:', error);
      toast.error('Error al eliminar el pago');
    } finally {
      setDeletingPagoId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const metodosPago = [
    { value: 'TRANSFERENCIA' as const, label: 'Transferencia Bancaria', icon: '🏦' },
    { value: 'EFECTIVO' as const, label: 'Efectivo', icon: '💵' },
    { value: 'CHEQUE' as const, label: 'Cheque', icon: '📝' },
    { value: 'CONSIGNACION' as const, label: 'Consignación', icon: '🏧' }
  ];

  const handleDownloadSoporte = async (pago: PagoCoactivo) => {
    if (!pago.soporteUrl) {
      toast.error('Este pago no tiene soporte adjunto');
      return;
    }

    try {
      setDownloadingSoporte(true);
      const url = await procesosCoactivosService.downloadPagoSoporte(pago.soporteUrl);

      // Crear link temporal
      const link = document.createElement('a');
      link.href = url;
      // Generar nombre descriptivo: soporte_pago_FECHA_VALOR
      const extension = pago.soporteUrl.split('.').pop() || 'pdf';
      const cleanDate = pago.fechaPago.split('T')[0].replace(/-/g, ''); // 20241231
      link.download = `soporte_pago_${cleanDate}_${pago.valor}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Error descargando soporte:', error);
      toast.error('Error al descargar el soporte');
    } finally {
      setDownloadingSoporte(false);
    }
  };

  const handleValorChange = (value: string) => {
    let filteredValue = value.replace(/[^0-9]/g, '');

    // Validación estricta de 0 (estilo Defensa Judicial)
    // Si el valor actual es "0", no permitir más dígitos
    if (valorPago === '0' && filteredValue.length > 1) {
      filteredValue = '0';
    }
    // Si empieza con 0 y tiene más de 1 dígito, forzar a '0'
    if (filteredValue.startsWith('0') && filteredValue.length > 1) {
      filteredValue = '0';
    }

    setValorPago(filteredValue);
  };

  const handleSelectArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo debe pesar menos de 10MB');
        return;
      }
      setArchivoSoporte(file);
      toast.success(`Archivo seleccionado: ${file.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de valor según tipo de pago
    if (tipoPago === 'PARCIAL') {
      // Solo para pago parcial verificamos el campo valorPago
      if (!valorPago || parseFloat(valorPago) <= 0) {
        toast.error('Ingrese un valor válido');
        return;
      }
      if (parseFloat(valorPago) > saldoPendiente) {
        toast.error('El valor no puede ser mayor al saldo pendiente');
        return;
      }
    }
    // Para TOTAL usamos saldoPendiente directamente, no necesita validación extra

    if (!numeroComprobante.trim()) {
      toast.error('Ingrese el número de comprobante');
      return;
    }

    if (!archivoSoporte) {
      toast.error('Debe adjuntar el soporte del pago');
      return;
    }

    setIsSubmitting(true);

    try {
      let soporteUrl = '';

      // 1. Subir archivo soporte si existe
      if (archivoSoporte) {
        try {
          const adjunto = await procesosCoactivosService.uploadAdjunto(proceso.id, archivoSoporte);
          soporteUrl = adjunto.nombreArchivo; // O la URL completa si preferimos
        } catch (uploadError) {
          console.error('Error subiendo soporte:', uploadError);
          toast.warning('No se pudo subir el archivo soporte, pero se intentará registrar el pago.');
        }
      }

      // 2. Registrar pago - Calcular valor según tipo
      const valorFinal = tipoPago === 'TOTAL'
        ? saldoPendiente
        : parseFloat(valorPago);

      const pagoData = {
        valor: valorFinal,
        fechaPago: new Date(fechaPago).toISOString(), // Importante formato ISO para backend
        origen: metodoPago,
        observaciones: observaciones + (tipoPago === 'TOTAL' ? ' [PAGO TOTAL]' : ''),
        soporteUrl: soporteUrl,
        comprobante: numeroComprobante // Aunque el backend no tiene columna comprobante explicita en el DTO simple, podriamos meterlo en observaciones o añadir columna
      };

      // Nota: El backend espera 'valor', 'fechaPago', 'origen', 'observaciones', 'soporteUrl'. 
      // Comprobante lo metemos en observaciones por ahora si no hay campo.
      pagoData.observaciones = `Comprobante: ${numeroComprobante}. ${pagoData.observaciones}`;

      await procesosCoactivosService.registrarPago(proceso.id, pagoData);

      toast.success('Pago registrado exitosamente');
      onRegistrarPago?.({});
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cuotasInfo = null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="pagos-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[102] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container - Centers content in entire viewport */}
          <div className="fixed inset-0 z-[103] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="pagos-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header Sticky on Mobile */}
              <div className="sticky top-0 z-10 bg-white">
                <ModalHeaderClean
                  titulo="Gestionar Pagos"
                  subtitulo={`${proceso.radicado || proceso.id.slice(0, 8)} • ${proceso.deudor}`}
                  icono={CreditCard}
                  colorIcono="green"
                  onClose={onClose}
                />
              </div>

              {/* Contenido Scrollable */}
              <div className="p-4 md:p-6 space-y-6 flex-1 overflow-y-auto">

                {/* Información de la Deuda - Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4 flex flex-col justify-center items-center md:items-start transition-colors hover:border-blue-200">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Valor Obligación</p>
                    <p className="text-2xl font-black text-blue-900 tracking-tight">
                      {formatCurrency(proceso.valorTotal)}
                    </p>
                  </div>
                  <div className={`border-2 rounded-xl p-4 flex flex-col justify-center items-center md:items-start transition-colors ${saldoPendiente <= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-100 hover:border-orange-200'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${saldoPendiente <= 0 ? 'text-green-600' : 'text-orange-600'}`}>Saldo Pendiente</p>
                    <p className={`text-2xl font-black tracking-tight ${saldoPendiente <= 0 ? 'text-green-700' : 'text-orange-900'}`}>
                      {formatCurrency(Math.max(0, saldoPendiente))}
                    </p>
                  </div>
                </div>

                {/* Historial de Pagos */}
                {pagos.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        Pagos Registrados ({pagos.length})
                      </h3>
                      <button
                        type="button"
                        onClick={loadPagos}
                        disabled={loadingPagos}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingPagos ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {pagos.map(pago => (
                        <div key={pago.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(Number(pago.valor))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(pago.fechaPago).toLocaleDateString('es-CO')} • {pago.origen}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedPago(pago)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                              title="Ver detalles y soporte"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePago(pago.id)}
                              disabled={deletingPagoId === pago.id}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                              title="Eliminar pago"
                            >
                              {deletingPagoId === pago.id ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensaje cuando el saldo es 0 */}
                {saldoPendiente <= 0 ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-green-800 mb-1">¡Obligación Pagada!</h3>
                    <p className="text-sm text-green-700">
                      El saldo de esta obligación ha sido cubierto completamente.
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Total pagado: {formatCurrency(totalPagado)}
                    </p>
                  </div>
                ) : (
                  /* Formulario de nuevo pago - solo si hay saldo pendiente */
                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Tipo de Pago - Responsive Config */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-3 ml-1">
                        Seleccione Tipo de Pago
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTipoPago('TOTAL')}
                          className={`p-4 rounded-xl border-2 transition-all group ${tipoPago === 'TOTAL'
                            ? 'border-green-600 bg-green-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30'
                            }`}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">💰</div>
                            <p className="text-sm font-bold text-gray-900">Pago Total</p>
                            <p className="text-xs text-gray-500 mt-1">Cancelar toda la deuda</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoPago('PARCIAL')}
                          className={`p-4 rounded-xl border-2 transition-all group ${tipoPago === 'PARCIAL'
                            ? 'border-blue-600 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                            }`}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">💳</div>
                            <p className="text-sm font-bold text-gray-900">Pago Parcial</p>
                            <p className="text-xs text-gray-500 mt-1">Abono a la deuda</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Valor del Pago (Solo para PARCIAL y TOTAL) */}
                    {(tipoPago === 'TOTAL' || tipoPago === 'PARCIAL') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                      >
                        <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                          Valor a Pagar {tipoPago === 'TOTAL' && '(Saldo Total)'}
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={tipoPago === 'TOTAL' ? saldoPendiente : valorPago}
                            onChange={(e) => handleValorChange(e.target.value)}
                            disabled={tipoPago === 'TOTAL'}
                            placeholder="Ingrese el valor del pago"
                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed font-medium text-lg"
                            required
                          />
                        </div>
                      </motion.div>
                    )}



                    {/* Información del Pago */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                          Fecha del Pago *
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-colors"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                          Método de Pago *
                        </label>
                        <select
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value as any)}
                          className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-colors appearance-none"
                        >
                          {metodosPago.map(metodo => (
                            <option key={metodo.value} value={metodo.value}>
                              {metodo.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Número de Comprobante */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                        Número de Comprobante / ID Transacción *
                      </label>
                      <input
                        type="text"
                        value={numeroComprobante}
                        onChange={(e) => setNumeroComprobante(e.target.value)}
                        placeholder="Ej: TRF-2025-001234"
                        className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none font-mono text-sm tracking-wide transition-colors"
                        required
                      />
                    </div>

                    {/* Archivo Soporte */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                        Soporte del Pago *
                      </label>
                      {archivoSoporte ? (
                        <div className="relative border-2 border-green-200 bg-green-50/50 rounded-xl p-4 flex items-center gap-4 group hover:border-green-300 transition-all">
                          <div className="p-3 bg-white rounded-lg shadow-sm">
                            <FileCheck className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {archivoSoporte.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(archivoSoporte.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setArchivoSoporte(null)}
                            className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar archivo"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 hover:bg-green-50/10 transition-all group cursor-pointer bg-gray-50/50">
                          <input
                            type="file"
                            onChange={handleSelectArchivo}
                            className="hidden"
                            id="file-upload-pago"
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                          <label
                            htmlFor="file-upload-pago"
                            className="cursor-pointer flex flex-col items-center gap-3 w-full h-full justify-center"
                          >
                            <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                              <Upload className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-700 group-hover:text-green-700 transition-colors">
                                Clic para seleccionar soporte
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                PDF, JPG, PNG (máx. 10MB)
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Observaciones */}
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2 ml-1">
                        Observaciones (Opcional)
                      </label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Observaciones adicionales sobre el pago..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none resize-none transition-colors text-sm"
                      />
                    </div>

                    {/* Alerta informativa */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 shadow-sm">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Información</p>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          El pago quedará registrado en el expediente y se actualizará el saldo del proceso coactivo automáticamente.
                        </p>
                      </div>
                    </div>

                    {/* Botones - Sticky Bottom on Mobile */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t mt-auto md:mt-0 bg-white sticky bottom-0 md:static pb-2 md:pb-0">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2 text-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            {tipoPago === 'TOTAL' ? 'Registrar Pago Total' : 'Registrar Pago'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )
      }

      {/* Modal Detalle de Pago */}
      {selectedPago && (
        <motion.div
          key="detalle-pago-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedPago(null)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detalle del Pago
              </h3>
              <button onClick={() => setSelectedPago(null)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Valor Pagado</p>
                <p className="text-3xl font-black text-blue-900 mt-1">
                  {formatCurrency(Number(selectedPago.valor))}
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                  Comprobante: {selectedPago.observaciones?.match(/Comprobante: ([^.]+)/)?.[1] || 'N/A'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs font-bold mb-1">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedPago.fechaPago).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-xs font-bold mb-1">Método</p>
                  <p className="font-semibold text-gray-900">{selectedPago.origen}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-500 text-xs font-bold mb-1">Observaciones Completas</p>
                <p className="text-sm text-gray-700 italic">
                  {selectedPago.observaciones || 'Sin observaciones'}
                </p>
              </div>

              {selectedPago.soporteUrl ? (
                <button
                  onClick={() => handleDownloadSoporte(selectedPago)}
                  disabled={downloadingSoporte}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-xl border border-blue-200 font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {downloadingSoporte ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingSoporte ? 'Descargando...' : 'Descargar Soporte Adjunto'}
                </button>
              ) : (
                <div className="text-center py-2 text-gray-400 text-sm flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Sin soporte adjunto
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
