import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  FileText,
  Info,
  Landmark,
  Paperclip,
  Send,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoRespaldo } from '../../types';

interface Props {
  procesoId: string;
  valorEstimado?: number | null;
  onCambio?: () => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Cada paso del ciclo con su color; el estado se lee de un vistazo. */
const PASOS = [
  { estado: 'SOLICITADO', etiqueta: 'Solicitado', ayuda: 'El área radicó la solicitud' },
  { estado: 'VERIFICADO', etiqueta: 'Verificado', ayuda: 'La Financiera confirmó que hay saldo' },
  { estado: 'EXPEDIDO', etiqueta: 'Expedido', ayuda: 'La partida quedó apartada' },
] as const;

function aNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Ciclo del CDP — etapa 4 (EFDS-1148).
 *
 * Muestra en qué punto va el respaldo presupuestal y qué falta para que el
 * proceso pueda abrirse. Las acciones de la Dirección Financiera se ofrecen
 * siempre: si el rol no alcanza, el backend responde 403 y se dice.
 */
export function PanelCdp({ procesoId, valorEstimado, onCambio }: Props) {
  const [respaldo, setRespaldo] = useState<EstadoRespaldo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  const [rubro, setRubro] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const inputArchivo = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      setRespaldo(await contratacionService.respaldoCdp(procesoId));
    } catch (err: any) {
      toast.error('No se pudo cargar el CDP', { id: 'cdp-carga', description: err.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [procesoId]);

  /** Toda acción del ciclo recarga y avisa; el error del backend se muestra. */
  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setTrabajando(true);
    try {
      await accion();
      toast.success(exito);
      await cargar();
      onCambio?.();
    } catch (err: any) {
      toast.error('No se pudo completar la acción', { description: err.message });
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando el CDP…</p>;
  }
  if (!respaldo) {
    return <p className="text-xs text-red-600 m-0 px-4 py-3">No se pudo cargar el respaldo</p>;
  }

  // Modalidad exenta: se dice y no se ofrece nada más. Un formulario vacío
  // sugeriría que falta algo por hacer.
  if (!respaldo.aplica) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 flex items-start gap-2.5">
          <Check className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" strokeWidth={3} />
          <div>
            <p className="text-[12.5px] font-bold text-emerald-800 m-0">
              Esta modalidad no requiere CDP
            </p>
            <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
              La entidad no compromete gasto, así que no hay disponibilidad presupuestal que
              certificar. El proceso puede abrirse sin este requisito.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cdp = respaldo.cdp;
  const estado = cdp?.estado ?? null;
  const indiceActual = PASOS.findIndex((p) => p.estado === estado);
  const rechazado = estado === 'RECHAZADO';

  return (
    <div className="p-4 space-y-4">
      {/* Ciclo: dónde va y qué sigue */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PASOS.map((paso, i) => {
            const cumplido = indiceActual >= i && !rechazado;
            return (
              <React.Fragment key={paso.estado}>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                    cumplido ? 'bg-[#E0EDFF] text-[#003DA5]' : 'bg-slate-100 text-slate-400'
                  }`}
                  title={paso.ayuda}
                >
                  {cumplido && <Check className="w-3 h-3" strokeWidth={3} />}
                  {paso.etiqueta}
                </div>
                {i < PASOS.length - 1 && <span className="text-slate-300 text-[11px]">›</span>}
              </React.Fragment>
            );
          })}
          {rechazado && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700">
              <Undo2 className="w-3 h-3" />
              Rechazado
            </span>
          )}
        </div>

        {!respaldo.puedeAbrirse && (
          <p className="text-[11.5px] text-amber-800 m-0 mt-2.5 leading-relaxed">
            {respaldo.motivo}. Sin el CDP expedido el proceso no puede abrirse.
          </p>
        )}
      </div>

      {/* Datos del CDP ya registrado */}
      {cdp && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Dato etiqueta="Número" valor={cdp.numero ?? 'sin asignar'} />
            <Dato
              etiqueta="Valor"
              valor={cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'}
            />
            <Dato etiqueta="Rubro" valor={cdp.rubro ?? '—'} />
            <Dato etiqueta="Expedición" valor={cdp.fechaExpedicion ?? '—'} />
          </div>

          {cdp.observaciones && (
            <p className="text-[11.5px] text-slate-700 m-0 pt-1.5 border-t border-gray-200 leading-relaxed">
              {cdp.observaciones}
            </p>
          )}

          {/* El CDP no alcanza el estimado: se avisa, no se impide. */}
          {cdp.valor !== null &&
            valorEstimado !== null &&
            valorEstimado !== undefined &&
            cdp.valor < valorEstimado && (
              <p className="text-[11px] font-bold text-amber-700 m-0 pt-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                El CDP es inferior al valor estimado del proceso (
                {formatoPesos.format(valorEstimado)})
              </p>
            )}
        </div>
      )}

      {/* De dónde viene el dato. Mientras no exista el enlace con KLIC, el
          "expedido" es lo que declara la Financiera, no un hecho verificado.
          Quien consulta el expediente debe saberlo. */}
      {respaldo.expedido && (
        <p className="text-[10.5px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Registrado por la Dirección Financiera. Pendiente de validación automática con KLIC.
        </p>
      )}

      {/* Acciones según el punto del ciclo */}
      {!cdp && (
        <div className="space-y-2.5">
          <p className="text-[11.5px] font-bold text-gray-600 m-0">Radicar la solicitud</p>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="Rubro presupuestal"
              aria-label="Rubro presupuestal"
              className={campo}
            />
            <input
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              inputMode="numeric"
              placeholder="Valor a respaldar"
              aria-label="Valor a respaldar"
              className={`${campo} tabular-nums`}
            />
          </div>
          <button
            type="button"
            disabled={trabajando || !rubro.trim() || aNumero(valorTexto) === null}
            onClick={() =>
              ejecutar(
                () =>
                  contratacionService.solicitarCdp(procesoId, {
                    rubro: rubro.trim(),
                    valor: aNumero(valorTexto)!,
                  }),
                'Solicitud de CDP radicada',
              )
            }
            className={boton}
          >
            <Send className="w-3.5 h-3.5" />
            Radicar solicitud
          </button>
        </div>
      )}

      {estado === 'SOLICITADO' && (
        <button
          type="button"
          disabled={trabajando}
          onClick={() =>
            ejecutar(() => contratacionService.verificarCdp(procesoId), 'Disponibilidad verificada')
          }
          className={boton}
        >
          <Landmark className="w-3.5 h-3.5" />
          Verificar disponibilidad
        </button>
      )}

      {estado === 'VERIFICADO' && (
        <div className="space-y-2.5">
          <p className="text-[11.5px] font-bold text-gray-600 m-0">Expedir el CDP</p>
          <div className="grid grid-cols-3 gap-2.5">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Número"
              aria-label="Número del CDP"
              className={campo}
            />
            <input
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              inputMode="numeric"
              placeholder="Valor"
              aria-label="Valor certificado"
              className={`${campo} tabular-nums`}
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha de expedición"
              className={campo}
            />
          </div>
          <button
            type="button"
            disabled={trabajando || !numero.trim() || aNumero(valorTexto) === null}
            onClick={() =>
              ejecutar(
                () =>
                  contratacionService.expedirCdp(procesoId, {
                    numero: numero.trim(),
                    valor: aNumero(valorTexto)!,
                    fechaExpedicion: fecha,
                  }),
                'CDP expedido',
              )
            }
            className={boton}
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Registrar expedición
          </button>
        </div>
      )}

      {/* El soporte solo tras la expedición: prueba lo que el registro afirma */}
      {estado === 'EXPEDIDO' && (
        <div>
          <input
            ref={inputArchivo}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) =>
              e.target.files?.[0] &&
              ejecutar(
                () => contratacionService.adjuntarCdp(procesoId, e.target.files![0]),
                'Soporte del CDP adjuntado',
              )
            }
          />
          {respaldo.soporteAdjunto ? (
            <p className="text-[11.5px] text-emerald-700 font-bold m-0 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Soporte adjunto al expediente
            </p>
          ) : (
            <button
              type="button"
              disabled={trabajando}
              onClick={() => inputArchivo.current?.click()}
              className={botonSecundario}
            >
              <Paperclip className="w-3.5 h-3.5" />
              Adjuntar el CDP al expediente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 m-0">{etiqueta}</p>
      <p className="text-[12.5px] text-slate-800 m-0 tabular-nums truncate">{valor}</p>
    </div>
  );
}

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

const boton =
  'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all';

const botonSecundario =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all';
