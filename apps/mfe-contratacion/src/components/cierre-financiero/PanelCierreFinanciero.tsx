import React, { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, Landmark, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CuadrePresupuestal,
  DatosCierreFinanciero,
  EstadoCierreFinanciero,
} from '../../types';
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
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = (valor: number | null | undefined) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

const VACIO = {
  referenciaPagoFinal: '',
  fechaPagoFinal: hoyEnBogota(),
  observaciones: '',
};

/**
 * Actividad 10.3 · Cierre financiero (EFDS-1173).
 *
 * Lo que el Estructurador Financiero ve antes de firmar es el cuadre: cuánto
 * respaldó el RP, cuánto salió de verdad y cuánto vuelve al presupuesto. Esa
 * última cifra es la que se reintegra, así que la pantalla la destaca en vez de
 * dejarla como una fila más de una tabla.
 */
export function PanelCierreFinanciero({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoCierreFinanciero | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [cerrando, setCerrando] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .cierreFinanciero(procesoId)
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

  const cerrar = async () => {
    const cuerpo: DatosCierreFinanciero = {
      referenciaPagoFinal: datos.referenciaPagoFinal.trim(),
      fechaPagoFinal: datos.fechaPagoFinal,
      ...(datos.observaciones.trim() ? { observaciones: datos.observaciones.trim() } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.cerrarFinancieramente(procesoId, cuerpo, soporte));
      setDatos(VACIO);
      setSoporte(null);
      setCerrando(false);
      toast.success('Contrato cerrado financieramente');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const revertir = async () => {
    const motivo = window.prompt('¿Por qué se revierte el cierre financiero?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.revertirCierreFinanciero(procesoId, motivo));
      toast.success('Cierre revertido');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el cierre financiero…</p>
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

  return (
    <Marco>
      <Titulo>Cierre financiero</Titulo>
      <Ayuda>
        La Dirección Financiera registra el pago final y libera el saldo del registro presupuestal
        que no se llegó a comprometer, para que vuelva al presupuesto de la entidad.
      </Ayuda>

      {/* Qué falta, y cuál de las dos cosas. */}
      {!estado.cierre && !estado.puedeCerrar && estado.motivoNoPuede ? (
        <Pendiente
          falta={estado.tieneLiquidacion ? '8.3' : '10.2'}
          texto={`Todavía no se puede cerrar: ${estado.motivoNoPuede}.`}
        />
      ) : null}

      {/* El sobrepago es un hallazgo, no un detalle: va destacado. */}
      {estado.cuadre?.advertencia ? (
        <Aviso tono="aviso" titulo="Hubo pagos sin respaldo presupuestal">
          {estado.cuadre.advertencia}
        </Aviso>
      ) : null}

      {estado.cierre ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Landmark className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  Cerrado el {fechaLarga(estado.cierre.fechaPagoFinal)} · liberados{' '}
                  {pesos(estado.cierre.valorLiberado)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  Pago final {estado.cierre.referenciaPagoFinal}
                  {estado.cierre.cerradoPor ? ` · por ${estado.cierre.cerradoPor}` : ''}
                </p>
                {estado.cierre.soporte?.url ? (
                  <a
                    href={contratacionService.urlDescarga(estado.cierre.soporte.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {estado.cierre.soporte.nombre}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {estado.cierre.observaciones ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line break-words">
                {estado.cierre.observaciones}
              </p>
            </div>
          ) : null}

          <Cuadre
            titulo="Cuadre del cierre"
            valorRp={estado.cierre.valorRp}
            valorPagado={estado.cierre.valorPagado}
            valorLiberado={estado.cierre.valorLiberado}
            congelado
          />

          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={revertir}
          >
            Revertir el cierre
          </BotonSecundario>
        </>
      ) : null}

      {estado.historial.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Cierres revertidos</p>
          {estado.historial.map((c, indice) => (
            <div
              key={`${c.referenciaPagoFinal}-${indice}`}
              className="border-l-2 border-slate-200 pl-2.5"
            >
              <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
                {c.referenciaPagoFinal} · liberaba {pesos(c.valorLiberado)}
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                Revertido {c.revertidoAt ? `el ${momento(c.revertidoAt)}` : ''}
                {c.revertidoPor ? ` por ${c.revertidoPor}` : ''}
                {c.motivoReversion ? ` · ${c.motivoReversion}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Antes de firmar: contra qué se firma. */}
      {!estado.cierre && estado.cuadre ? (
        <Cuadre
          titulo="Cuadre presupuestal"
          valorRp={estado.cuadre.valorRp}
          valorPagado={estado.cuadre.valorPagado}
          valorLiberado={estado.cuadre.valorLiberado}
          numeroRp={estado.rp?.numero ?? null}
        />
      ) : null}

      {estado.puedeCerrar && !cerrando ? (
        <Boton icono={<Landmark className="w-3.5 h-3.5" />} onClick={() => setCerrando(true)}>
          Registrar el pago final
        </Boton>
      ) : null}

      {estado.puedeCerrar && cerrando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Pago final y liberación</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="cf-ref" className="block text-xs font-bold text-gray-600 mb-1.5">
                Referencia del pago <span className="text-red-600">*</span>
              </label>
              <input
                id="cf-ref"
                type="text"
                value={datos.referenciaPagoFinal}
                onChange={(e) =>
                  setDatos((p) => ({ ...p, referenciaPagoFinal: e.target.value }))
                }
                placeholder="OP-2026-0001"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="cf-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha del pago <span className="text-red-600">*</span>
              </label>
              <input
                id="cf-fecha"
                type="date"
                value={datos.fechaPagoFinal}
                onChange={(e) => setDatos((p) => ({ ...p, fechaPagoFinal: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="cf-obs" className="block text-xs font-bold text-gray-600 mb-1.5">
              Observaciones
            </label>
            <textarea
              id="cf-obs"
              rows={2}
              value={datos.observaciones}
              onChange={(e) => setDatos((p) => ({ ...p, observaciones: e.target.value }))}
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="cf-soporte"
            etiqueta="Soporte (opcional)"
            ayuda="El documento con el que se tramitó la liberación."
            archivo={soporte}
            onElegir={setSoporte}
          />

          {/* Lo que se va a liberar, otra vez, junto al botón: es la cifra que
              sale del presupuesto y conviene verla antes de pulsar. */}
          {estado.cuadre ? (
            <p className="text-[11.5px] text-slate-600 m-0 tabular-nums">
              Se liberarán <b>{pesos(estado.cuadre.valorLiberado)}</b> al presupuesto.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<Landmark className="w-3.5 h-3.5" />}
              disabled={guardando || !datos.referenciaPagoFinal.trim()}
              onClick={cerrar}
            >
              Cerrar financieramente
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => {
                setDatos(VACIO);
                setSoporte(null);
                setCerrando(false);
              }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </Marco>
  );
}

/**
 * El cuadre contra el RP.
 *
 * Lo liberado va destacado y no como una fila más: es la cifra que vuelve al
 * presupuesto, y es la que el Estructurador tiene que reconocer de un vistazo.
 */
function Cuadre({
  titulo,
  valorRp,
  valorPagado,
  valorLiberado,
  numeroRp = null,
  congelado = false,
}: {
  titulo: string;
  valorRp: number;
  valorPagado: number;
  valorLiberado: number;
  numeroRp?: string | null;
  congelado?: boolean;
}) {
  const sobrepago = valorPagado > valorRp;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-slate-800 m-0 mb-2">
        {titulo}
        {numeroRp ? <span className="text-slate-400 font-normal"> · RP {numeroRp}</span> : null}
        {congelado ? (
          <span className="ml-1.5 text-[10.5px] font-bold text-slate-400">
            · congelado al cerrar
          </span>
        ) : null}
      </p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 m-0">
        <dt className="text-[11.5px] text-slate-500 m-0">Registro presupuestal</dt>
        <dd className="text-[11.5px] font-bold text-slate-800 m-0 text-right tabular-nums">
          {pesos(valorRp)}
        </dd>
        <dt className="text-[11.5px] text-slate-500 m-0">Pagado</dt>
        <dd
          className={`text-[11.5px] font-bold m-0 text-right tabular-nums ${
            sobrepago ? 'text-amber-700' : 'text-slate-800'
          }`}
        >
          {pesos(valorPagado)}
        </dd>
      </dl>

      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-bold text-slate-700 inline-flex items-center gap-1.5">
          {sobrepago ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          )}
          Se libera al presupuesto
        </span>
        <span className="text-[13px] font-black text-slate-900 tabular-nums">
          {pesos(valorLiberado)}
        </span>
      </div>
    </div>
  );
}
