import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, Landmark, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoParticipacion, EstadoRespaldo } from '../../types';
import { momento } from '../shared/fechas';
import {
  Aviso,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Ayuda,
  Pendiente,
  Siguiente,
  SinPermiso,
  Titulo,
} from '../shared/PiezasPanel';

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
  /**
   * Quién lleva la solicitud, que no vive en el estado del respaldo.
   *
   * Se pide aparte y no se añade al payload del CDP a propósito: para
   * resolverlo allí, el servicio del CDP tendría que preguntarle al de
   * participación, y ese ya le pregunta a él desde que tomar el proceso puede
   * radicar la solicitud. Serían dos servicios dependiendo el uno del otro.
   */
  const [participacion, setParticipacion] = useState<EstadoParticipacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  const [valorTexto, setValorTexto] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState('');
  /**
   * El rubro contra el que la Financiera verifica, y con el que expide.
   *
   * Uno solo para las dos actividades: es el mismo dato, y llevar dos estados
   * dejaría que la 4.3 mostrara algo distinto de lo que la 4.2 certificó.
   */
  const [rubro, setRubro] = useState('');
  const inputArchivo = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      // Las dos a la vez: quién la lleva se lee junto al estado del CDP, y en
      // serie el panel parpadearía dos veces al abrirse.
      const [estado, quienes] = await Promise.all([
        contratacionService.respaldoCdp(procesoId),
        contratacionService.participacion(procesoId),
      ]);
      setRespaldo(estado);
      setParticipacion(quienes);
      // Sin pisar lo que se esté escribiendo: `cargar` se vuelve a llamar
      // después de cada acción, y un setState plano borraría el rubro a medio
      // teclear si la recarga llega antes de enviarlo.
      setRubro((actual) => actual || estado.cdp?.rubro || '');
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
  const financiera = participacion?.financiera ?? null;
  const puedeTomarla = participacion?.puedeTomarFinanciera === true;

  // ------------------------------------------------------------ 4.1 ------
  /*
   * Dejó de ser un formulario.
   *
   * El estudio previo aprobado ya es la solicitud formal, así que al cerrarse
   * la etapa 3 la solicitud se radica sola y aquí no hay nada que diligenciar:
   * lo que queda es ver qué se pidió y quién de la Financiera se hace cargo.
   */
  if (numeral === '4.1') {
    if (!cdp) {
      return (
        <Marco>
          <Pendiente
            falta="la etapa 3"
            texto="La solicitud de CDP se radica sola en cuanto se cierre la última actividad de la etapa 3 que aplique a esta modalidad."
          />
        </Marco>
      );
    }

    return (
      <Marco>
        <Aviso tono="ok" titulo="Solicitud radicada">
          {/* El rubro solo se nombra si lo hay: el automático nace sin él
              —lo pone la Financiera al expedir— y un «Rubro —» se lee como un
              dato que falta por diligenciar, que es justo lo que ya no es. */}
          {cdp.solicitadoPor ? `Radicada por ${cdp.solicitadoPor}. ` : ''}
          Por {cdp.valor !== null ? formatoPesos.format(cdp.valor) : '—'}
          {cdp.rubro ? ` contra el rubro ${cdp.rubro}` : ''}.
        </Aviso>

        {/* ------------------------------------- quién la lleva en Financiera */}
        {financiera ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Landmark className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0 break-words">
                  {financiera.nombre}
                  {financiera.esMio ? ' · estás a cargo' : ''}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
                  Dirección Financiera · se hizo cargo el {momento(financiera.asignadoAt)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Aviso tono="aviso" titulo="Todavía no la lleva nadie">
            {puedeTomarla
              ? 'Hazte cargo para verificar la disponibilidad y expedir el CDP.'
              : 'Está esperando a que alguien de la Dirección Financiera se haga cargo.'}
          </Aviso>
        )}

        {puedeTomarla && (
          <Boton
            disabled={trabajando}
            onClick={() =>
              ejecutar(
                () => contratacionService.tomarSolicitudCdp(procesoId),
                'Ya estás a cargo de esta solicitud.',
              )
            }
            icono={<Landmark className="w-3.5 h-3.5" />}
          >
            Hacerme cargo
          </Boton>
        )}

        <Siguiente texto="Continúa en 4.2, donde la Dirección Financiera verifica la disponibilidad." />
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
            La Dirección Financiera confirmó que hay saldo en el rubro {cdp.rubro}.
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
          Indica el rubro que respalda el gasto y confirma que tiene saldo para cubrir{' '}
          {cdp.valor !== null ? formatoPesos.format(cdp.valor) : 'el valor solicitado'}. Si no lo
          hay, rechaza indicando el motivo.
        </Ayuda>
        {/* El rubro se escribe aquí porque la solicitud llega sin él: el
            estudio previo no lo captura y la radicación automática no tiene de
            dónde sacarlo. Un área que lo conociera pudo adelantarlo, y entonces
            llega escrito y solo hay que confirmarlo o corregirlo. */}
        <input
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
          placeholder="Rubro presupuestal (p. ej. A-02-02-02-008)"
          aria-label="Rubro presupuestal"
          className={campo}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Boton
            disabled={trabajando || !rubro.trim()}
            onClick={() =>
              ejecutar(
                () => contratacionService.verificarCdp(procesoId, rubro.trim()),
                'Disponibilidad verificada',
              )
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
          <BotonSecundario
            disabled={trabajando || !motivo.trim()}
            onClick={() =>
              ejecutar(
                () => contratacionService.rechazarCdp(procesoId, motivo.trim()),
                'Solicitud rechazada',
              )
            }
            icono={<Undo2 className="w-3.5 h-3.5" />}
          >
            Rechazar solicitud
          </BotonSecundario>
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
            {cdp.fechaExpedicion}
            {cdp.rubro ? `, contra el rubro ${cdp.rubro}` : ''}. La partida quedó apartada y el
            proceso ya puede abrirse.
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
        {/* El rubro llega verificado de la 4.2 y se puede corregir aquí: al
            buscar el saldo la Financiera pudo acabar imputando a otro. No se
            pide de cero —eso ya pasó— pero el certificado no sale sin él. */}
        <input
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
          placeholder="Rubro presupuestal"
          aria-label="Rubro presupuestal que afecta el certificado"
          className={campo}
        />
        <Boton
          disabled={trabajando || !numero.trim() || !rubro.trim() || aNumero(valorTexto) === null}
          onClick={() =>
            ejecutar(
              () =>
                contratacionService.expedirCdp(procesoId, {
                  numero: numero.trim(),
                  valor: aNumero(valorTexto)!,
                  fechaExpedicion: fecha,
                  rubro: rubro.trim(),
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
