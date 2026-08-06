import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, FileText, Info, Landmark, Lock, Paperclip, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoRespaldo } from '../../types';

interface Props {
  /** Cuál de las cuatro actividades del ciclo se está viendo. */
  numeral: string;
  procesoId: string;
  valorEstimado?: number | null;
  onCambio?: () => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function aNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Una actividad del ciclo del CDP (etapa 4).
 *
 * Cada numeral muestra su propio paso y no el ciclo entero: el riel es
 * navegación, y si las cuatro llevaran al mismo contenido, seleccionar una u
 * otra daría igual y el usuario no sabría dónde está parado.
 */
export function PanelCdp({ numeral, procesoId, valorEstimado, onCambio }: Props) {
  const [respaldo, setRespaldo] = useState<EstadoRespaldo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  const [rubro, setRubro] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');
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
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (!respaldo) {
    return <p className="text-xs text-red-600 m-0 px-4 py-3">No se pudo cargar el respaldo</p>;
  }

  if (!respaldo.aplica) {
    return (
      <Marco>
        <Aviso tono="ok" titulo="Esta modalidad no requiere CDP">
          La entidad no compromete gasto, así que no hay disponibilidad presupuestal que
          certificar. El proceso puede abrirse sin este requisito.
        </Aviso>
      </Marco>
    );
  }

  const cdp = respaldo.cdp;
  const estado = cdp?.estado ?? null;

  // ------------------------------------------------------------ 4.1 ------
  if (numeral === '4.1') {
    if (cdp) {
      return (
        <Marco>
          <Aviso tono="ok" titulo="Solicitud radicada">
            {cdp.solicitadoPor ? `Radicada por ${cdp.solicitadoPor}. ` : ''}
            Rubro {cdp.rubro ?? '—'} por {cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'}.
          </Aviso>
          <Siguiente texto="Continúa en 4.2, donde la Dirección Financiera verifica la disponibilidad." />
        </Marco>
      );
    }
    if (!respaldo.puedeSolicitar) {
      return (
        <Marco>
          <SinPermiso quien="el área solicitante o la Dirección de Contratación" />
        </Marco>
      );
    }
    return (
      <Marco>
        <Titulo>Radicar la solicitud de CDP</Titulo>
        <Ayuda>
          El área solicitante pide el respaldo presupuestal indicando contra qué rubro y por cuánto.
        </Ayuda>
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
        <Boton
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
          icono={<Send className="w-3.5 h-3.5" />}
        >
          Radicar solicitud
        </Boton>
      </Marco>
    );
  }

  // ------------------------------------------------------------ 4.2 ------
  if (numeral === '4.2') {
    if (!cdp) return <Marco><Pendiente falta="4.1" texto="Aún no se ha radicado la solicitud de CDP." /></Marco>;
    if (estado === 'RECHAZADO') {
      return (
        <Marco>
          <Aviso tono="error" titulo="Solicitud rechazada">
            {cdp.observaciones}
          </Aviso>
        </Marco>
      );
    }
    if (estado !== 'SOLICITADO') {
      return (
        <Marco>
          <Aviso tono="ok" titulo="Disponibilidad verificada">
            La Dirección Financiera confirmó que hay saldo en el rubro {cdp.rubro ?? '—'}.
          </Aviso>
          <Siguiente texto="Continúa en 4.3, la expedición del certificado." />
        </Marco>
      );
    }
    if (!respaldo.puedeGestionar) {
      return <Marco><SinPermiso quien="la Dirección Financiera" /></Marco>;
    }
    return (
      <Marco>
        <Titulo>Verificar la disponibilidad presupuestal</Titulo>
        <Ayuda>
          Confirma que el rubro {cdp.rubro ?? '—'} tiene saldo para cubrir{' '}
          {cdp.valor !== null ? formatoPesos.format(cdp.valor) : 'el valor solicitado'}. Si no lo
          hay, rechaza indicando el motivo.
        </Ayuda>
        <div className="flex items-center gap-2 flex-wrap">
          <Boton
            disabled={trabajando}
            onClick={() =>
              ejecutar(() => contratacionService.verificarCdp(procesoId), 'Disponibilidad verificada')
            }
            icono={<Landmark className="w-3.5 h-3.5" />}
          >
            Confirmar disponibilidad
          </Boton>
        </div>
        <div className="pt-2 border-t border-gray-200 space-y-2">
          <Ayuda>¿No hay saldo? Indica el motivo para que el área sepa qué corregir.</Ayuda>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo del rechazo"
            aria-label="Motivo del rechazo"
            className={campo}
          />
          <button
            type="button"
            disabled={trabajando || !motivo.trim()}
            onClick={() =>
              ejecutar(
                () => contratacionService.rechazarCdp(procesoId, motivo.trim()),
                'Solicitud rechazada',
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Rechazar solicitud
          </button>
        </div>
      </Marco>
    );
  }

  // ------------------------------------------------------------ 4.3 ------
  if (numeral === '4.3') {
    if (!cdp || estado === 'SOLICITADO') {
      return <Marco><Pendiente falta="4.2" texto="Falta que la Dirección Financiera verifique la disponibilidad." /></Marco>;
    }
    if (estado === 'RECHAZADO') {
      return (
        <Marco>
          <Aviso tono="error" titulo="Solicitud rechazada">{cdp.observaciones}</Aviso>
        </Marco>
      );
    }
    if (estado === 'EXPEDIDO') {
      return (
        <Marco>
          <Aviso tono="ok" titulo={`CDP ${cdp.numero} expedido`}>
            Por {cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'} el{' '}
            {cdp.fechaExpedicion}. La partida quedó apartada y el proceso ya puede abrirse.
          </Aviso>
          {cdp.valor !== null &&
            valorEstimado !== null &&
            valorEstimado !== undefined &&
            cdp.valor < valorEstimado && (
              <p className="text-[11px] font-bold text-amber-700 m-0 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                Es inferior al valor estimado del proceso ({formatoPesos.format(valorEstimado)})
              </p>
            )}
          <Origen conSoporte={respaldo.soporteAdjunto} />
          {!respaldo.soporteAdjunto && (
            <Siguiente texto="Continúa en 4.4, adjuntando el soporte al expediente." />
          )}
        </Marco>
      );
    }
    if (!respaldo.puedeGestionar) {
      return <Marco><SinPermiso quien="la Dirección Financiera" /></Marco>;
    }
    return (
      <Marco>
        <Titulo>Expedir el CDP</Titulo>
        <Ayuda>
          Registra el certificado emitido. Desde este momento la partida queda apartada para el
          proceso y la apertura deja de estar bloqueada.
        </Ayuda>
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
        <Boton
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
          icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
        >
          Registrar expedición
        </Boton>
      </Marco>
    );
  }

  // ------------------------------------------------------------ 4.4 ------
  if (!cdp || estado !== 'EXPEDIDO') {
    return <Marco><Pendiente falta="4.3" texto="El soporte se adjunta una vez expedido el CDP." /></Marco>;
  }
  if (respaldo.soporteAdjunto) {
    return (
      <Marco>
        <Aviso tono="ok" titulo="Soporte adjunto al expediente">
          El CDP queda consultable desde las etapas siguientes.
        </Aviso>
      </Marco>
    );
  }
  return (
    <Marco>
      <Titulo>Adjuntar el CDP al expediente</Titulo>
      <Ayuda>
        Carga el certificado firmado para que quede consultable en las etapas siguientes. No frena
        la apertura del proceso: eso lo habilitó la expedición.
      </Ayuda>
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
      <button
        type="button"
        disabled={trabajando}
        onClick={() => inputArchivo.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all"
      >
        <Paperclip className="w-3.5 h-3.5" />
        Seleccionar archivo
      </button>
    </Marco>
  );
}

// ------------------------------------------------------------- piezas ----

const Marco = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 space-y-3">{children}</div>
);

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12.5px] font-bold text-slate-800 m-0">{children}</p>
);

const Ayuda = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">{children}</p>
);

/** Qué falta antes de poder trabajar esta actividad, y en cuál se hace. */
const Pendiente = ({ falta, texto }: { falta: string; texto: string }) => (
  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
    <p className="text-[12.5px] font-bold text-slate-700 m-0">Pendiente del paso {falta}</p>
    <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{texto}</p>
  </div>
);

const Siguiente = ({ texto }: { texto: string }) => (
  <p className="text-[11px] text-slate-500 m-0 leading-relaxed">{texto}</p>
);

/** El rol no alcanza: se dice quién puede, en vez de dejar un botón que da 403. */
const SinPermiso = ({ quien }: { quien: string }) => (
  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-start gap-2.5">
    <Lock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-[12.5px] font-bold text-slate-700 m-0">Este paso lo realiza {quien}</p>
      <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
        Puedes consultarlo, pero no ejecutarlo con tu rol.
      </p>
    </div>
  </div>
);

/**
 * De dónde sale el dato.
 *
 * No hay enlace con KLIC ni está previsto por ahora, así que el certificado se
 * registra a mano y el soporte cargado en el expediente es la única evidencia
 * de que existe. Quien consulta debe saberlo, y saber si esa evidencia está.
 */
const Origen = ({ conSoporte }: { conSoporte: boolean }) => (
  <p className="text-[10.5px] text-slate-500 m-0 flex items-start gap-1.5 leading-relaxed">
    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
    {conSoporte
      ? 'Registrado por la Dirección Financiera. El soporte adjunto en 4.4 es la evidencia del certificado.'
      : 'Registrado por la Dirección Financiera. Aún sin soporte adjunto: el certificado no tiene evidencia en el expediente.'}
  </p>
);

const TONOS = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
} as const;

const Aviso = ({
  tono,
  titulo,
  children,
}: {
  tono: keyof typeof TONOS;
  titulo: string;
  children: React.ReactNode;
}) => (
  <div className={`rounded-lg border px-3.5 py-3 flex items-start gap-2.5 ${TONOS[tono]}`}>
    {tono === 'ok' ? (
      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={3} />
    ) : (
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
    )}
    <div className="min-w-0">
      <p className="text-[12.5px] font-bold m-0">{titulo}</p>
      <p className="text-[11.5px] m-0 mt-0.5 leading-relaxed">{children}</p>
    </div>
  </div>
);

const Boton = ({
  children,
  icono,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icono: React.ReactNode }) => (
  <button
    type="button"
    {...props}
    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
  >
    {icono}
    {children}
  </button>
);

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';
