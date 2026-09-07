import React, { useEffect, useState } from 'react';
import { Check, CircleDollarSign, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoRegistroPresupuestal } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITADO: 'Solicitado a la Dirección Financiera',
  VERIFICADO: 'Disponibilidad verificada',
  EXPEDIDO: 'Expedido',
  RECHAZADO: 'Rechazado',
  ANULADO: 'Anulado',
};

/**
 * Actividad 8.3 · Registro presupuestal (EFDS-1163).
 *
 * Mismo ciclo que el CDP porque es el mismo trámite en otro momento: el CDP
 * aparta la partida —«hay presupuesto para esto»— y el RP la compromete —«esta
 * plata es de este contrato»—. Por eso el CDP va antes de abrir el proceso y el
 * RP solo después de firmarlo.
 */
export function PanelRegistroPresupuestal({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoRegistroPresupuestal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [solicitando, setSolicitando] = useState(false);
  const [rubro, setRubro] = useState('');

  const [expidiendo, setExpidiendo] = useState(false);
  const [datos, setDatos] = useState({
    numero: '',
    valor: '',
    fechaExpedicion: hoyEnBogota(),
  });
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .registroPresupuestal(procesoId)
      .then((respuesta) => {
        setEstado(respuesta);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const solicitar = async () => {
    setGuardando(true);
    try {
      setEstado(
        await contratacionService.solicitarRp(procesoId, {
          ...(rubro.trim() ? { rubro: rubro.trim() } : {}),
        }),
      );
      setRubro('');
      setSolicitando(false);
      toast.success('Solicitud radicada ante la Dirección Financiera');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const verificar = async () => {
    setGuardando(true);
    try {
      setEstado(await contratacionService.verificarRp(procesoId));
      toast.success('Disponibilidad verificada; ya se puede expedir');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const expedir = async () => {
    setGuardando(true);
    try {
      setEstado(
        await contratacionService.expedirRp(
          procesoId,
          {
            numero: datos.numero.trim(),
            valor: Number(datos.valor),
            fechaExpedicion: datos.fechaExpedicion,
          },
          soporte,
        ),
      );
      setExpidiendo(false);
      setSoporte(null);
      toast.success('Registro presupuestal expedido; el gasto queda comprometido');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const rechazar = async () => {
    const motivo = window
      .prompt('¿Por qué no hay disponibilidad para comprometer?')
      ?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.rechazarRp(procesoId, motivo));
      toast.success('Solicitud rechazada; puede volver a radicarse corregida');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el registro presupuestal…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const rp = estado.rp;
  const completo = datos.numero.trim() && Number(datos.valor) > 0 && datos.fechaExpedicion;

  return (
    <Marco>
      <Titulo>Registro presupuestal</Titulo>
      <Ayuda>
        El RP compromete los recursos del contrato y sustituye al CDP en la etapa contractual: el
        CDP apartó la partida, el RP la ata a este contrato.
      </Ayuda>

      {!estado.suscrito ? (
        <Pendiente
          falta="8.1"
          texto={`El registro presupuestal compromete recursos con quien ya firmó: ${
            estado.motivoNoSuscrito ?? 'el contrato todavía no está suscrito'
          }.`}
        />
      ) : null}

      {rp ? (
        <>
          <div
            className={`rounded-lg border px-3.5 py-3 ${
              rp.estado === 'EXPEDIDO'
                ? 'border-emerald-200 bg-emerald-50'
                : rp.estado === 'RECHAZADO'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <CircleDollarSign
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  rp.estado === 'EXPEDIDO' ? 'text-emerald-900' : 'text-slate-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[12.5px] font-bold m-0 break-words ${
                    rp.estado === 'EXPEDIDO' ? 'text-emerald-900' : 'text-slate-800'
                  }`}
                >
                  {rp.numero ? `RP ${rp.numero}` : 'Solicitud sin número asignado'} ·{' '}
                  {ETIQUETA_ESTADO[rp.estado]}
                </p>
                <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                  {rp.valor !== null ? pesos.format(rp.valor) : 'Sin valor registrado'}
                  {rp.rubro ? ` · ${rp.rubro}` : ''}
                  {rp.fechaExpedicion ? ` · ${fechaLarga(rp.fechaExpedicion)}` : ''}
                </p>
                {rp.observaciones ? (
                  <p className="text-[11.5px] text-red-900 m-0 mt-1 leading-relaxed break-words">
                    {rp.observaciones}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Se advierte, no se bloquea: un contrato puede comprometerse por
              partes, y esa decisión es de la Dirección Financiera. */}
          {estado.advertencia ? (
            <Aviso tono="aviso" titulo="El monto no cubre el contrato">
              {estado.advertencia}
              {estado.contrato ? `. El contrato vale ${pesos.format(estado.contrato.valor)}.` : ''}
            </Aviso>
          ) : null}

          {rp.estado === 'SOLICITADO' ? (
            <div className="flex flex-wrap gap-2">
              <Boton
                icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                disabled={guardando}
                onClick={verificar}
              >
                Verificar la disponibilidad
              </Boton>
              <BotonSecundario
                icono={<Undo2 className="w-3.5 h-3.5" />}
                disabled={guardando}
                onClick={rechazar}
              >
                Rechazar con motivo
              </BotonSecundario>
            </div>
          ) : null}

          {rp.estado === 'VERIFICADO' && !expidiendo ? (
            <div className="flex flex-wrap gap-2">
              <Boton
                icono={<CircleDollarSign className="w-3.5 h-3.5" />}
                onClick={() => {
                  setDatos((p) => ({ ...p, valor: String(rp.valor ?? '') }));
                  setExpidiendo(true);
                }}
              >
                Expedir el registro
              </Boton>
              <BotonSecundario
                icono={<Undo2 className="w-3.5 h-3.5" />}
                disabled={guardando}
                onClick={rechazar}
              >
                Rechazar con motivo
              </BotonSecundario>
            </div>
          ) : null}

          {expidiendo ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <p className="text-[12.5px] font-bold text-slate-800 m-0">Expedir el registro</p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="rp-numero" className="block text-xs font-bold text-gray-600 mb-1.5">
                    Número del RP <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="rp-numero"
                    type="text"
                    value={datos.numero}
                    onChange={(e) => setDatos((p) => ({ ...p, numero: e.target.value }))}
                    placeholder="RP-2026-0142"
                    className={campo}
                  />
                </div>
                <div>
                  <label htmlFor="rp-valor" className="block text-xs font-bold text-gray-600 mb-1.5">
                    Valor comprometido <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="rp-valor"
                    type="number"
                    min={1}
                    value={datos.valor}
                    onChange={(e) => setDatos((p) => ({ ...p, valor: e.target.value }))}
                    className={campo}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rp-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                  Fecha de expedición <span className="text-red-600">*</span>
                </label>
                <input
                  id="rp-fecha"
                  type="date"
                  value={datos.fechaExpedicion}
                  onChange={(e) => setDatos((p) => ({ ...p, fechaExpedicion: e.target.value }))}
                  className={campo}
                />
              </div>

              <SelectorArchivo
                id="rp-soporte"
                etiqueta="Soporte del registro"
                ayuda="Opcional: el número y la fecha son lo que compromete el gasto."
                obligatorio={false}
                archivo={soporte}
                onElegir={setSoporte}
              />

              <div className="flex flex-wrap gap-2">
                <Boton
                  icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  disabled={guardando || !completo}
                  onClick={expedir}
                >
                  Expedir
                </Boton>
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  disabled={guardando}
                  onClick={() => setExpidiendo(false)}
                >
                  Cancelar
                </BotonSecundario>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {estado.puedeSolicitar && !solicitando ? (
        <Boton icono={<Send className="w-3.5 h-3.5" />} onClick={() => setSolicitando(true)}>
          Solicitar el registro
        </Boton>
      ) : null}

      {estado.puedeSolicitar && solicitando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Solicitud del registro</p>
          <Ayuda>
            Se radica ante la Dirección Financiera, que verifica la disponibilidad y lo expide.
            {estado.contrato
              ? ` Se comprometerá el valor del contrato: ${pesos.format(estado.contrato.valor)}.`
              : ''}
          </Ayuda>

          <div>
            <label htmlFor="rp-rubro" className="block text-xs font-bold text-gray-600 mb-1.5">
              Rubro presupuestal
            </label>
            <input
              id="rp-rubro"
              type="text"
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="A-02-02-02-008 · Servicios prestados a las empresas"
              className={campo}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Boton icono={<Send className="w-3.5 h-3.5" />} disabled={guardando} onClick={solicitar}>
              Radicar la solicitud
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => setSolicitando(false)}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}
