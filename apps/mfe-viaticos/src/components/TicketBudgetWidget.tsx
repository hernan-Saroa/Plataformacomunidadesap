import { AlertCircle, CheckCircle2, ShieldAlert, Plane, Wallet } from 'lucide-react';
import { NivelAlertaTiquete, TicketValidationResult } from '../types/viaticos';

interface Props {
  /** Resultado de la última validación contra el backend. Si es null, no se renderiza. */
  validacion: TicketValidationResult | null;
  cargando?: boolean;
  /** Valor estimado del tiquete en COP (formato display). */
  montoEstimadoDisplay: string;
}

/**
 * Indicador visual de semáforo para el saldo presupuestal de tiquetes.
 *
 * Reglas (RF-LIQ-003 / RF-LIQ-004):
 *   - Verde   : disponible > 30% del cupo inicial.
 *   - Amarillo: disponible > 0% y <= 30%.
 *   - Rojo    : disponible <= 0 o insuficiente para el costo estimado.
 *
 * Muestra también el monto reservado con la holgura de mercado y los flags
 * `force_land_transport` / `requires_*_exception` para que el modal padre
 * habilite los inputs de soporte PDF.
 */
export default function TicketBudgetWidget({ validacion, cargando, montoEstimadoDisplay }: Props) {
  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-500 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5" />
        Validando ruta restringida y saldo presupuestal…
      </div>
    );
  }

  if (!validacion) {
    return null;
  }

  const config = SEMAFORO_CONFIG[validacion.nivel_alerta];

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${config.wrapperClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <div className={`p-2 ${config.iconBg} text-white rounded-xl shrink-0`}>
          {config.icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Semáforo de presupuesto de tiquetes
          </p>
          <p className={`text-sm font-black ${config.titleClass}`}>
            {config.label} · {formatearCOP(validacion.saldo_actual_dependencia)} disponibles
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed">
        {validacion.mensaje_alerta}
      </p>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-white/70 rounded-lg p-2 border border-slate-200">
          <p className="text-slate-400 font-bold">Valor estimado</p>
          <p className="font-black text-slate-800">{montoEstimadoDisplay}</p>
        </div>
        <div className="bg-white/70 rounded-lg p-2 border border-slate-200">
          <p className="text-slate-400 font-bold">Reserva con holgura ({validacion.holgura_aplicada_porcentaje}%)</p>
          <p className="font-black text-slate-800">
            {formatearCOP(validacion.monto_reserva_con_holgura)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {validacion.force_land_transport && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            <Plane className="w-3 h-3" /> Transporte aéreo bloqueado
          </span>
        )}
        {validacion.requires_route_exception && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3 h-3" /> Requiere excepción de ruta
          </span>
        )}
        {validacion.requires_budget_exception && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Wallet className="w-3 h-3" /> Requiere excepción presupuestal
          </span>
        )}
        {!validacion.requires_route_exception &&
          !validacion.requires_budget_exception &&
          !validacion.force_land_transport && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Sin excepciones requeridas
            </span>
          )}
      </div>

      {validacion.message && (
        <p className="text-[11px] text-slate-600 bg-white/70 border border-slate-200 rounded-lg px-3 py-2">
          {validacion.message}
        </p>
      )}
    </div>
  );
}

function formatearCOP(valor: number): string {
  if (!Number.isFinite(valor)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

const SEMAFORO_CONFIG: Record<
  NivelAlertaTiquete,
  {
    label: string;
    wrapperClass: string;
    iconBg: string;
    titleClass: string;
    icon: React.ReactNode;
  }
> = {
  VERDE: {
    label: 'Saldo suficiente',
    wrapperClass: 'border-emerald-200 bg-emerald-50/70',
    iconBg: 'bg-emerald-500',
    titleClass: 'text-emerald-700',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  AMARILLO: {
    label: 'Saldo crítico',
    wrapperClass: 'border-amber-200 bg-amber-50/70',
    iconBg: 'bg-amber-500',
    titleClass: 'text-amber-700',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  ROJO: {
    label: 'Saldo agotado',
    wrapperClass: 'border-red-200 bg-red-50/70',
    iconBg: 'bg-red-600',
    titleClass: 'text-red-700',
    icon: <ShieldAlert className="w-4 h-4" />,
  },
};