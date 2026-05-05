import { useState, useEffect } from 'react';
import {
  CreditCard, Calendar, DollarSign, Upload, CheckCircle,
  AlertCircle, FileText, Trash2, RefreshCw, Eye, Download,
  X, FileCheck, Banknote, Building2, Wallet
} from 'lucide-react';
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
  canRegistrarPago?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const METODOS_PAGO = [
  { value: 'TRANSFERENCIA' as const, label: 'Transferencia', icon: Building2 },
  { value: 'EFECTIVO' as const, label: 'Efectivo', icon: Banknote },
  { value: 'CHEQUE' as const, label: 'Cheque', icon: FileText },
  { value: 'CONSIGNACION' as const, label: 'Consignación', icon: Wallet },
];

export function ModalGestionarPagos({
  isOpen,
  onClose,
  proceso,
  onRegistrarPago,
  canRegistrarPago = true
}: ModalGestionarPagosProps) {
  const [tipoPago, setTipoPago] = useState<'TOTAL' | 'PARCIAL'>('PARCIAL');
  const [valorPago, setValorPago] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'CONSIGNACION'>('TRANSFERENCIA');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pagos, setPagos] = useState<PagoCoactivo[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedPago, setSelectedPago] = useState<PagoCoactivo | null>(null);
  const [downloadingSoporte, setDownloadingSoporte] = useState(false);

  const totalPagado = pagos.reduce((sum, p) => sum + Number(p.valor), 0);
  const saldoPendiente = proceso.valorTotal - totalPagado;
  const porcentajePagado = proceso.valorTotal > 0 ? Math.min(100, (totalPagado / proceso.valorTotal) * 100) : 0;

  const resetForm = () => {
    setTipoPago('PARCIAL');
    setValorPago('');
    setFechaPago(new Date().toISOString().split('T')[0]);
    setMetodoPago('TRANSFERENCIA');
    setNumeroComprobante('');
    setObservaciones('');
    setArchivoSoporte(null);
  };

  useEffect(() => {
    if (isOpen && proceso.id) {
      resetForm();
      loadPagos();
    }
    if (!isOpen) {
      resetForm();
      setPagos([]);
    }
  }, [isOpen, proceso.id]);

  const loadPagos = async () => {
    setLoadingPagos(true);
    try {
      const data = await procesosCoactivosService.getPagos(proceso.id);
      setPagos(Array.isArray(data) ? data : []);
    } catch {
      setPagos([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleDeletePago = async () => {
    if (!confirmDeleteId) return;
    setDeletingPagoId(confirmDeleteId);
    setConfirmDeleteId(null);
    try {
      await procesosCoactivosService.deletePago(confirmDeleteId);
      toast.success('Pago eliminado correctamente');
      await loadPagos();
      onRegistrarPago?.({});
    } catch {
      toast.error('Error al eliminar el pago');
    } finally {
      setDeletingPagoId(null);
    }
  };

  const handleDownloadSoporte = async (pago: PagoCoactivo) => {
    if (!pago.soporteUrl) { toast.error('Este pago no tiene soporte adjunto'); return; }
    setDownloadingSoporte(true);
    try {
      const url = await procesosCoactivosService.downloadPagoSoporte(pago.soporteUrl);
      const link = document.createElement('a');
      link.href = url;
      const ext = pago.soporteUrl.split('.').pop() || 'pdf';
      const cleanDate = pago.fechaPago.split('T')[0].replace(/-/g, '');
      link.download = `soporte_pago_${cleanDate}_${pago.valor}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error al descargar el soporte');
    } finally {
      setDownloadingSoporte(false);
    }
  };

  const handleValorChange = (value: string) => {
    let filtered = value.replace(/[^0-9]/g, '');
    if (filtered.startsWith('0') && filtered.length > 1) filtered = '0';
    const numeric = parseInt(filtered || '0', 10);
    if (numeric > saldoPendiente) {
      filtered = Math.floor(saldoPendiente).toString();
      toast.warning('El valor no puede exceder el saldo pendiente');
    }
    setValorPago(filtered);
  };

  const handleSelectArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('El archivo debe pesar menos de 10MB'); return; }
    setArchivoSoporte(file);
    toast.success(`Archivo seleccionado: ${file.name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tipoPago === 'PARCIAL' && (!valorPago || parseFloat(valorPago) <= 0)) {
      toast.error('Ingrese un valor válido'); return;
    }
    if (!numeroComprobante.trim()) { toast.error('Ingrese el número de comprobante'); return; }
    if (!archivoSoporte) { toast.error('Debe adjuntar el soporte del pago'); return; }

    setIsSubmitting(true);
    try {
      let soporteUrl = '';
      try {
        const adjunto = await procesosCoactivosService.uploadAdjunto(proceso.id, archivoSoporte);
        soporteUrl = adjunto.nombreArchivo;
      } catch {
        toast.warning('No se pudo subir el archivo soporte, pero se intentará registrar el pago.');
      }

      const valorFinal = tipoPago === 'TOTAL' ? saldoPendiente : parseFloat(valorPago);
      await procesosCoactivosService.registrarPago(proceso.id, {
        valor: valorFinal,
        fechaPago: new Date(fechaPago).toISOString(),
        origen: metodoPago,
        observaciones: `Comprobante: ${numeroComprobante}. ${observaciones}${tipoPago === 'TOTAL' ? ' [PAGO TOTAL]' : ''}`,
        soporteUrl,
      });

      toast.success('Pago registrado exitosamente');
      onRegistrarPago?.({});
      onClose();
    } catch {
      toast.error('Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[102]"
            onClick={onClose}
          />
          {/* Wrapper de centrado — div simple, no motion */}
          <div className="fixed inset-0 z-[103] flex items-center justify-center p-4">
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <ModalHeaderClean
              titulo="Gestionar Pagos"
              subtitulo={`${proceso.radicado || proceso.id.slice(0, 8)} • ${proceso.deudor}`}
              icono={CreditCard}
              colorIcono="green"
              onClose={onClose}
            />

            {/* Resumen financiero — compacto */}
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 border-b flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Deuda:</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(proceso.valorTotal)}</span>
              </div>
              <div className="w-px h-4 bg-gray-300 flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Pendiente:</span>
                <span className={`text-sm font-bold ${saldoPendiente <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(Math.max(0, saldoPendiente))}
                </span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${porcentajePagado}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600">{porcentajePagado.toFixed(0)}%</span>
              </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">

              {/* Historial de pagos */}
              {pagos.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border">
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
                      <div key={pago.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(pago.valor))}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {new Date(pago.fechaPago).toLocaleDateString('es-CO')} • {pago.origen}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <button type="button" onClick={() => setSelectedPago(pago)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Ver detalles">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canRegistrarPago && (
                            <button type="button" onClick={() => setConfirmDeleteId(pago.id)}
                              disabled={deletingPagoId === pago.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50" title="Eliminar">
                              {deletingPagoId === pago.id
                                ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state solo lectura */}
              {pagos.length === 0 && !canRegistrarPago && (
                <div className="text-center py-8 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium text-gray-500">Aún no hay pagos registrados</p>
                </div>
              )}

              {/* Obligación pagada */}
              {saldoPendiente <= 0 ? (
                <div className="bg-green-50 rounded-lg p-5 border-2 border-green-200 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-base font-bold text-green-800">Obligación Completamente Pagada</p>
                  <p className="text-sm text-green-700 mt-1">Total abonado: {formatCurrency(totalPagado)}</p>
                </div>
              ) : canRegistrarPago ? (
                <form id="pago-form" onSubmit={handleSubmit} className="space-y-4">

                  {/* Tipo de pago */}
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Tipo de Pago
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        {
                          value: 'TOTAL' as const,
                          icon: Banknote,
                          label: 'Pago Total',
                          desc: 'Cancela el 100% del saldo pendiente',
                          monto: formatCurrency(saldoPendiente),
                          border: 'border-green-600',
                          bg: 'bg-green-50',
                          iconBg: 'bg-green-100',
                          iconColor: 'text-green-600',
                          checkColor: 'text-green-600',
                          montoColor: 'text-green-700',
                        },
                        {
                          value: 'PARCIAL' as const,
                          icon: CreditCard,
                          label: 'Pago Parcial',
                          desc: 'Abono a la deuda — ingrese el monto',
                          monto: null,
                          border: 'border-blue-600',
                          bg: 'bg-blue-50',
                          iconBg: 'bg-blue-100',
                          iconColor: 'text-blue-600',
                          checkColor: 'text-blue-600',
                          montoColor: 'text-blue-700',
                        },
                      ]).map(opt => {
                        const sel = tipoPago === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setTipoPago(opt.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${sel ? `${opt.border} ${opt.bg}` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${sel ? opt.iconBg : 'bg-gray-100'}`}>
                              <opt.icon className={`w-5 h-5 ${sel ? opt.iconColor : 'text-gray-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                                {sel && <CheckCircle className={`w-3.5 h-3.5 ${opt.checkColor}`} />}
                              </div>
                              <p className="text-xs text-gray-500">{opt.desc}</p>
                            </div>
                            {sel && opt.monto && (
                              <span className={`text-sm font-black flex-shrink-0 ${opt.montoColor}`}>{opt.monto}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Valor (solo parcial) */}
                  <AnimatePresence>
                    {tipoPago === 'PARCIAL' && (
                      <motion.div key="valor" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Valor del Abono *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input type="text" value={valorPago} onChange={(e) => handleValorChange(e.target.value)}
                            placeholder="Ingrese el valor a pagar"
                            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm font-medium transition-colors"
                            required />
                        </div>
                        {valorPago && parseFloat(valorPago) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Saldo restante: <span className="font-bold text-orange-600">{formatCurrency(Math.max(0, saldoPendiente - parseFloat(valorPago)))}</span>
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Datos del pago */}
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Datos del Pago
                    </h3>
                    <div className="space-y-3">

                      {/* Fecha */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Fecha del Pago *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm transition-colors"
                            required />
                        </div>
                      </div>

                      {/* Método de pago — grid de botones */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Método de Pago *</label>
                        <div className="grid grid-cols-4 gap-2">
                          {METODOS_PAGO.map(({ value, label, icon: Icon }) => {
                            const sel = metodoPago === value;
                            return (
                              <button key={value} type="button" onClick={() => setMetodoPago(value)}
                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all ${sel ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                <Icon className={`w-4 h-4 ${sel ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className={`text-xs font-bold text-center leading-tight ${sel ? 'text-green-700' : 'text-gray-500'}`}>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comprobante */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Número de Comprobante / ID Transacción *</label>
                        <input type="text" value={numeroComprobante} onChange={(e) => setNumeroComprobante(e.target.value)}
                          placeholder="Ej: TRF-2025-001234"
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm tracking-wide transition-colors"
                          required />
                      </div>
                    </div>
                  </div>

                  {/* Soporte del pago */}
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      Soporte del Pago *
                    </h3>
                    {archivoSoporte ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-green-200">
                        <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                          <FileCheck className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{archivoSoporte.name}</p>
                          <p className="text-xs text-gray-500">{(archivoSoporte.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button type="button" onClick={() => setArchivoSoporte(null)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="file-upload-pago"
                        className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-all bg-white group">
                        <input type="file" id="file-upload-pago" onChange={handleSelectArchivo} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700 group-hover:text-blue-700 transition-colors">Adjuntar comprobante</p>
                          <p className="text-xs text-gray-400">PDF, JPG, PNG — máx. 10MB</p>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Observaciones <span className="text-gray-400 font-normal">(Opcional)</span>
                    </label>
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Observaciones adicionales sobre el pago..."
                      rows={2}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-sm transition-colors" />
                  </div>

                  {/* Info */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      El pago quedará registrado en el expediente y el saldo se actualizará automáticamente.
                    </p>
                  </div>
                </form>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t bg-gray-50 px-5 py-3.5 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} disabled={isSubmitting}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-sm hover:bg-white transition-all disabled:opacity-50">
                Cancelar
              </button>
              {saldoPendiente > 0 && canRegistrarPago && (
                <button type="submit" form="pago-form" disabled={isSubmitting}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Procesando...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" />{tipoPago === 'TOTAL' ? 'Registrar Pago Total' : 'Registrar Pago'}</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
          </div>
        </>
      )}

      {/* Sub-modal: Confirmar eliminación */}
      {confirmDeleteId && (
        <motion.div
          key="confirm-delete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[106] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setConfirmDeleteId(null)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 text-center mb-2">¿Eliminar este pago?</h3>
              <p className="text-sm text-gray-500 text-center">El saldo pendiente se recalculará automáticamente. Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePago}
                disabled={!!deletingPagoId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingPagoId ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Sub-modal: Detalle de Pago */}
      {selectedPago && (
        <motion.div
          key="detalle-pago"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedPago(null)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                Detalle del Pago
              </h3>
              <button onClick={() => setSelectedPago(null)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center pb-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Pagado</p>
                <p className="text-3xl font-black text-blue-900 mt-1">{formatCurrency(Number(selectedPago.valor))}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                  Comp: {selectedPago.observaciones?.match(/Comprobante: ([^.]+)/)?.[1] || 'N/A'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-xs font-bold text-gray-500 mb-1">Fecha</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date(selectedPago.fechaPago).toLocaleDateString('es-CO')}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-xs font-bold text-gray-500 mb-1">Método</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedPago.origen}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs font-bold text-gray-500 mb-1">Observaciones</p>
                <p className="text-sm text-gray-700 italic leading-relaxed">{selectedPago.observaciones || 'Sin observaciones'}</p>
              </div>
              {selectedPago.soporteUrl ? (
                <button onClick={() => handleDownloadSoporte(selectedPago)} disabled={downloadingSoporte}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-semibold text-sm hover:bg-blue-100 transition-colors disabled:opacity-50">
                  {downloadingSoporte ? <><RefreshCw className="w-4 h-4 animate-spin" />Descargando...</> : <><Download className="w-4 h-4" />Descargar Soporte</>}
                </button>
              ) : (
                <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />Sin soporte adjunto
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
