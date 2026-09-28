import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Info,
  LoaderCircle,
  MapPin,
  RotateCcw,
  ShieldAlert,
  User,
  X,
  XCircle,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import { formatearMoneda } from '../utils/viaticosUtils';
import { ViaticoModal } from './ViaticoModal';

interface CancelarComisionModalProps {
  solicitud: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancelarComisionModal: React.FC<CancelarComisionModalProps> = ({
  solicitud,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [responsableCancelacion, setResponsableCancelacion] = useState('');
  const [recursosComprometidos, setRecursosComprometidos] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accionExitosa, setAccionExitosa] = useState(false);

  const currentUser = authService.getCurrentUserSync();

  // Estados que comprometen presupuesto o tiquetes
  const estadosComprometidos = [
    'SOLICITADA_SIIF',
    'AUTORIZADA',
    'RESOLUCION_EMITIDA',
    'TIQUETES_COMPRADOS',
    'EN_COMISION',
    'PENDIENTE_LEGALIZACION',
  ];

  const estadoActual = (
    solicitud?.estado ||
    solicitud?.estadoSolicitud ||
    ''
  ).toUpperCase();

  const recursosComprometidosAuto = Boolean(
    solicitud?.siifExportado || estadosComprometidos.includes(estadoActual),
  );

  useEffect(() => {
    if (isOpen && solicitud) {
      setMotivoCancelacion('');
      setError(null);
      setAccionExitosa(false);
      setRecursosComprometidos(recursosComprometidosAuto);

      const nombreUsuario =
        currentUser?.firstName && currentUser?.lastName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser?.username || '';
      const rolUsuario = currentUser?.role ? ` (${currentUser.role})` : '';
      setResponsableCancelacion(
        nombreUsuario ? `${nombreUsuario}${rolUsuario}` : 'Dependencia solicitante',
      );
    }
  }, [isOpen, solicitud, recursosComprometidosAuto]);

  if (!isOpen || !solicitud) return null;

  const codigo =
    solicitud.codigo || solicitud.consecutivoUnico || solicitud.id || 'N/A';
  const nombreComisionado =
    solicitud.nombreComisionado ||
    (solicitud.comisionado
      ? `${solicitud.comisionado.primerNombre || ''} ${solicitud.comisionado.primerApellido || ''}`.trim() ||
        solicitud.comisionado.nombreCompleto
      : 'Comisionado');
  const cedula =
    solicitud.cedulaComisionado ||
    solicitud.comisionado?.numeroDocumento ||
    '—';
  const ciudadDestino = solicitud.ciudadDestino || solicitud.destinoCiudad || '—';
  const departamentoDestino =
    solicitud.departamentoDestino || solicitud.destinoDepartamento || '';
  const montoTotal =
    solicitud.montoTotalEstimado ??
    solicitud.montoTotal ??
    (Number(solicitud.montoViaticos || 0) +
      Number(solicitud.montoGastosViaje || 0) +
      Number(solicitud.costoEstimadoTiquete || 0));

  const yaLegalizada = estadoActual === 'LEGALIZADO';
  const yaCancelada = estadoActual === 'CANCELADA';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivoCancelacion.trim().length < 5) {
      setError('El motivo de cancelación es obligatorio (mínimo 5 caracteres).');
      return;
    }

    setProcesando(true);
    setError(null);

    try {
      await viaticosService.cancelarComision(solicitud.id, {
        motivoCancelacion: motivoCancelacion.trim(),
        responsableCancelacion: responsableCancelacion.trim(),
        recursosComprometidos,
      });

      setAccionExitosa(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[CancelarComisionModal] Error cancelando comisión:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No fue posible cancelar la comisión.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setProcesando(false);
    }
  };

  const header = (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-red-100 rounded-xl">
        <XCircle className="w-6 h-6 text-red-700" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest bg-red-100 px-2 py-0.5 rounded-md text-red-700">
            Novedad
          </span>
          <span className="text-xs font-mono text-red-700">{codigo}</span>
        </div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          Cancelar Comisión con Trazabilidad
        </h2>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={procesando}
        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        {yaLegalizada || yaCancelada ? 'Cerrar' : 'Descartar'}
      </button>

      {!yaLegalizada && !yaCancelada && (
        <button
          type="submit"
          form="cancelar-comision-form"
          disabled={procesando || motivoCancelacion.trim().length < 5 || accionExitosa}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-all shadow-sm shadow-red-200"
        >
          {procesando ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin" />
              <span>Cancelando comisión...</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              <span>Confirmar Cancelación</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <ViaticoModal
      open={isOpen}
      onClose={onClose}
      title="Cancelar Comisión"
      description={`Código: ${codigo}`}
      eyebrow="Novedad"
      header={header}
      footer={footer}
      size="lg"
      hideCloseButton={procesando}
      bodyClassName="p-6 space-y-5 max-h-[calc(100vh-14rem)] overflow-y-auto"
    >
      <form id="cancelar-comision-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Notificación de éxito */}
        {accionExitosa && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            Comisión {codigo} cancelada exitosamente con trazabilidad registrada.
          </div>
        )}

        {/* Notificación de error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Tarjeta resumen de la comisión */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">{nombreComisionado}</p>
                <p className="text-[11px] text-slate-500">C.C. {cedula}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">
                  {ciudadDestino} {departamentoDestino ? `(${departamentoDestino})` : ''}
                </p>
                <p className="text-[11px] text-slate-500">Destino de la comisión</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">
                  {solicitud.fechaInicio || '—'} al {solicitud.fechaFin || '—'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {solicitud.diasComision ? `${solicitud.diasComision} días` : 'Fechas programadas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">
                  {formatearMoneda(montoTotal)}
                </p>
                <p className="text-[11px] text-slate-500">
                  Estado actual:{' '}
                  <span className="font-semibold text-slate-700">
                    {estadoActual}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advertencia si no aplica por estar legalizada o ya cancelada */}
        {yaLegalizada && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              Esta comisión ya ha sido legalizada en Etapa 8. La normativa ESAP no permite
              cancelar comisiones que hayan cumplido su ciclo de legalización y cierre contable.
            </div>
          </div>
        )}

        {yaCancelada && (
          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700 font-semibold">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              Esta comisión ya se encuentra cancelada con registro histórico registrado.
            </div>
          </div>
        )}

        {/* Detección y Marcación de Recursos Comprometidos (Criterio 3 - Conexión Etapa 8) */}
        {!yaLegalizada && !yaCancelada && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              recursosComprometidos
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <RotateCcw
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  recursosComprometidos ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wide">
                    {recursosComprometidos
                      ? 'Comisión con recursos comprometidos (Requiere reintegro / liberación)'
                      : 'Recursos presupuestales'}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      recursosComprometidos
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {recursosComprometidos
                      ? 'Pendiente Reintegro · Etapa 8'
                      : 'Sin afectación de giro'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed">
                  {recursosComprometidos ? (
                    <>
                      La comisión cuenta con avance presupuestal (exportación SIIF, tiquetes o
                      autorización). Al cancelarla, el sistema señalará automáticamente la
                      necesidad de <strong>reintegro de viáticos o liberación del RP</strong>{' '}
                      para su respectiva gestión en la <strong>Etapa 8</strong>.
                    </>
                  ) : (
                    <>
                      No se detectaron recursos girados ni tiquetes emitidos para esta comisión.
                      La cancelación liberará la solicitud sin generar saldo pendiente de reintegro.
                    </>
                  )}
                </p>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recursosComprometidos}
                    onChange={(e) => setRecursosComprometidos(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Marcar expresamente que existen recursos comprometidos que requieren reintegro
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Campos del formulario de cancelación */}
        {!yaLegalizada && !yaCancelada && (
          <>
            <div>
              <label
                htmlFor="responsable-cancelacion"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Responsable / Dependencia que solicita la cancelación
              </label>
              <input
                id="responsable-cancelacion"
                type="text"
                value={responsableCancelacion}
                onChange={(e) => setResponsableCancelacion(e.target.value)}
                maxLength={255}
                placeholder="Ej: Subdirección Académica / Grupo de Viáticos"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="motivo-cancelacion"
                  className="text-xs font-bold text-slate-700"
                >
                  Motivo detallado de la cancelación <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {motivoCancelacion.length}/2000 caracteres (mín. 5)
                </span>
              </div>
              <textarea
                id="motivo-cancelacion"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                rows={4}
                required
                minLength={5}
                maxLength={2000}
                placeholder="Escriba la justificación motivada y detallada de por qué se cancela la comisión..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow leading-relaxed"
              />
            </div>

            <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                La cancelación conserva todo el expediente y la bitácora inmutable de auditoría.
                La solicitud no podrá ser editada posteriormente.
              </span>
            </div>
          </>
        )}
      </form>
    </ViaticoModal>
  );
};

export default CancelarComisionModal;
