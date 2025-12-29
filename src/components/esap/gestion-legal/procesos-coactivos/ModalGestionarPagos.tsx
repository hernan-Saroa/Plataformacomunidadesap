/**
 * ModalGestionarPagos - Modal para registrar pagos y gestionar acuerdos de pago
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { X, CreditCard, Calendar, DollarSign, Upload, CheckCircle, AlertCircle, FileText, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from '../design-system/ModalHeaderClean';

interface ModalGestionarPagosProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: {
    id: string;
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
  const [tipoPago, setTipoPago] = useState<'TOTAL' | 'PARCIAL' | 'ACUERDO'>('PARCIAL');
  const [valorPago, setValorPago] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'CONSIGNACION'>('TRANSFERENCIA');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para acuerdo de pago
  const [numCuotas, setNumCuotas] = useState(6);
  const [fechaInicioCuotas, setFechaInicioCuotas] = useState(new Date().toISOString().split('T')[0]);
  const [periodicidad, setPeriodicidad] = useState<'MENSUAL' | 'QUINCENAL'>('MENSUAL');

  const saldoPendiente = proceso.valorTotal - proceso.valorPagado;

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

  const calcularCuotas = () => {
    const valorTotal = tipoPago === 'TOTAL' ? saldoPendiente : parseFloat(valorPago || '0');
    const valorCuota = valorTotal / numCuotas;
    return {
      valorCuota,
      total: valorTotal,
      cuotas: numCuotas
    };
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
    
    if (tipoPago !== 'ACUERDO') {
      if (!valorPago || parseFloat(valorPago) <= 0) {
        toast.error('Ingrese un valor válido');
        return;
      }
      if (parseFloat(valorPago) > saldoPendiente) {
        toast.error('El valor no puede ser mayor al saldo pendiente');
        return;
      }
    }

    if (!numeroComprobante.trim()) {
      toast.error('Ingrese el número de comprobante');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const pago = {
        tipo: tipoPago,
        valor: tipoPago === 'ACUERDO' ? calcularCuotas().total : parseFloat(valorPago),
        fecha: new Date(fechaPago),
        metodo: metodoPago,
        comprobante: numeroComprobante,
        observaciones,
        archivo: archivoSoporte?.name,
        ...(tipoPago === 'ACUERDO' && {
          acuerdo: {
            numCuotas,
            valorCuota: calcularCuotas().valorCuota,
            periodicidad,
            fechaInicio: new Date(fechaInicioCuotas)
          }
        })
      };

      toast.success(
        tipoPago === 'ACUERDO' 
          ? `✅ Acuerdo de pago registrado: ${numCuotas} cuotas de ${formatCurrency(calcularCuotas().valorCuota)}`
          : `✅ Pago registrado exitosamente: ${formatCurrency(parseFloat(valorPago))}`
      );

      onRegistrarPago?.(pago);
      onClose();
    } catch (error) {
      toast.error('Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cuotasInfo = tipoPago === 'ACUERDO' ? calcularCuotas() : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[102]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-[103] max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <ModalHeaderClean
              titulo="Gestionar Pagos"
              subtitulo={`${proceso.id} • ${proceso.deudor}`}
              icono={CreditCard}
              colorIcono="green"
              onClose={onClose}
            />

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Información de la Deuda */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-bold mb-1">Valor Total</p>
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(proceso.valorTotal)}
                  </p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <p className="text-xs text-orange-600 font-bold mb-1">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-orange-900">
                    {formatCurrency(saldoPendiente)}
                  </p>
                </div>
              </div>

              {/* Tipo de Pago */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Tipo de Pago *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoPago('TOTAL')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tipoPago === 'TOTAL'
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">💰</div>
                      <p className="text-sm font-bold text-gray-900">Pago Total</p>
                      <p className="text-xs text-gray-600 mt-1">Cancelar toda la deuda</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago('PARCIAL')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tipoPago === 'PARCIAL'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">💳</div>
                      <p className="text-sm font-bold text-gray-900">Pago Parcial</p>
                      <p className="text-xs text-gray-600 mt-1">Abono a la deuda</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPago('ACUERDO')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      tipoPago === 'ACUERDO'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">📋</div>
                      <p className="text-sm font-bold text-gray-900">Acuerdo de Pago</p>
                      <p className="text-xs text-gray-600 mt-1">Pago en cuotas</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Valor del Pago (Solo para PARCIAL y TOTAL) */}
              {(tipoPago === 'TOTAL' || tipoPago === 'PARCIAL') && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Valor del Pago * {tipoPago === 'TOTAL' && '(Saldo Total)'}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={tipoPago === 'TOTAL' ? saldoPendiente : valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      disabled={tipoPago === 'TOTAL'}
                      placeholder="Ingrese el valor del pago"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition-all disabled:bg-gray-100"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Configuración de Acuerdo de Pago */}
              {tipoPago === 'ACUERDO' && (
                <div className="space-y-4 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Configuración del Acuerdo de Pago
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Número de Cuotas *
                      </label>
                      <input
                        type="number"
                        value={numCuotas}
                        onChange={(e) => setNumCuotas(parseInt(e.target.value) || 1)}
                        min="2"
                        max="24"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Periodicidad *
                      </label>
                      <select
                        value={periodicidad}
                        onChange={(e) => setPeriodicidad(e.target.value as any)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                      >
                        <option value="MENSUAL">Mensual</option>
                        <option value="QUINCENAL">Quincenal</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Fecha Inicio de Cuotas *
                      </label>
                      <input
                        type="date"
                        value={fechaInicioCuotas}
                        onChange={(e) => setFechaInicioCuotas(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Cálculo de Cuotas */}
                  {cuotasInfo && (
                    <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Total a Pagar</p>
                          <p className="text-lg font-bold text-purple-600 mt-1">
                            {formatCurrency(cuotasInfo.total)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Número de Cuotas</p>
                          <p className="text-lg font-bold text-purple-600 mt-1">
                            {cuotasInfo.cuotas}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-bold">Valor por Cuota</p>
                          <p className="text-lg font-bold text-purple-600 mt-1">
                            {formatCurrency(cuotasInfo.valorCuota)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Información del Pago */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Fecha del Pago *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Método de Pago *
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none"
                  >
                    {metodosPago.map(metodo => (
                      <option key={metodo.value} value={metodo.value}>
                        {metodo.icon} {metodo.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Número de Comprobante */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Número de Comprobante/Transacción *
                </label>
                <input
                  type="text"
                  value={numeroComprobante}
                  onChange={(e) => setNumeroComprobante(e.target.value)}
                  placeholder="Ej: TRF-2025-001234"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none font-mono"
                  required
                />
              </div>

              {/* Archivo Soporte */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Soporte del Pago (Opcional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                  <input
                    type="file"
                    onChange={handleSelectArchivo}
                    className="hidden"
                    id="file-upload-pago"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="file-upload-pago"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">
                      {archivoSoporte ? archivoSoporte.name : 'Seleccionar archivo'}
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, JPG, PNG (máx. 10MB)
                    </p>
                  </label>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Observaciones (Opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones adicionales sobre el pago..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none resize-none"
                />
              </div>

              {/* Alerta informativa */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900">Importante</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {tipoPago === 'ACUERDO'
                      ? 'El acuerdo de pago quedará registrado y se generarán automáticamente las cuotas correspondientes. Se notificará al deudor.'
                      : 'El pago quedará registrado en el expediente y se actualizará el saldo del proceso coactivo automáticamente.'
                    }
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {tipoPago === 'ACUERDO' ? 'Crear Acuerdo de Pago' : 'Registrar Pago'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}