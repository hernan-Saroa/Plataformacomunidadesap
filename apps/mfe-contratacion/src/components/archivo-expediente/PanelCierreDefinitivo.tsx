import React, { useEffect, useState } from 'react';
import { CalendarClock, Lock, Paperclip, ShieldCheck, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  AmparoVerificado,
  DatosCierreDefinitivo,
  EstadoCierreDefinitivo,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const VACIO = { fechaCierre: hoyEnBogota(), observaciones: '' };

/**
 * Cierre definitivo del contrato (EFDS-1175, RF-LIQ-05).
 *
 * No tiene numeral —la matriz da cuatro actividades a la etapa 10 y las cuatro
 * están tomadas—, así que no puede tener casilla propia en el riel y vive
 * anidado dentro del panel de la 10.4, como el de la declaratoria desierta
 * dentro del de la adjudicación.
 *
 * Lo que el gestor necesita ver no es un botón deshabilitado sino **qué amparo
 * falta por vencer y cuándo**: es lo que explica la espera, y puede ser de años.
 */
export function PanelCierreDefinitivo({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoCierreDefinitivo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [cerrando, setCerrando] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [soporte, setSoporte] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .cierreDefinitivo(procesoId)
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
    const cuerpo: DatosCierreDefinitivo = {
      fechaCierre: datos.fechaCierre,
      ...(datos.observaciones.trim() ? { observaciones: datos.observaciones.trim() } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.cerrarDefinitivamente(procesoId, cuerpo, soporte));
      setDatos(VACIO);
      setSoporte(null);
      setCerrando(false);
      toast.success('Contrato cerrado definitivamente');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const revertir = async () => {
    const motivo = window.prompt('¿Por qué se revierte el cierre definitivo?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.revertirCierreDefinitivo(procesoId, motivo));
      toast.success('Cierre definitivo revertido');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-[11.5px] text-slate-400 m-0">Cargando el cierre definitivo…</p>;
  }

  if (error || !estado) {
    return (
      <Aviso tono="error" titulo="No se pudo cargar el cierre definitivo">
        {error ?? 'Inténtalo de nuevo en un momento.'}
      </Aviso>
    );
  }

  // Sin contrato liquidado esto no aplica todavía: el panel de la 10.4 ya
  // explica qué falta, y repetirlo aquí sería ruido.
  if (!estado.contrato || !estado.tieneLiquidacion) return null;

  return (
    <>
      <Titulo>Cierre definitivo del contrato</Titulo>
      <Ayuda>
        Cuando vencen los amparos de estabilidad y calidad ya no queda nada que reclamar y el
        contrato se cierra en firme. Es lo último del proceso, y puede llegar años después de la
        liquidación.
      </Ayuda>

      {/* El estado del contrato a la vista: es lo que RF-SIS-01 pide dejar
          trazable, y aquí es justo lo que cambia. */}
      <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-slate-500 m-0">Estado del contrato</span>
        <span
          className={`text-[12.5px] font-black m-0 ${
            estado.contrato.estado === 'CERRADO' ? 'text-emerald-700' : 'text-slate-800'
          }`}
        >
          {estado.contrato.estado}
        </span>
      </div>

      {estado.cierre ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  Cerrado en firme el {fechaLarga(estado.cierre.fechaCierre)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  {estado.cierre.ultimoVencimiento
                    ? `El último amparo venció el ${fechaLarga(estado.cierre.ultimoVencimiento)}`
                    : 'El contrato no quedó amparado más allá de la ejecución'}
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

          {estado.cierre.amparosVerificados.length > 0 ? (
            <Amparos
              titulo="Amparos verificados"
              amparos={estado.cierre.amparosVerificados}
              congelado
            />
          ) : null}

          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={revertir}
          >
            Revertir el cierre definitivo
          </BotonSecundario>
        </>
      ) : null}

      {/* Antes de cerrar: qué se está esperando y hasta cuándo. */}
      {!estado.cierre && estado.amparos ? (
        estado.amparos.sinAmparos ? (
          <Aviso tono="ok" titulo="El contrato no tiene amparos de estabilidad ni calidad">
            No quedó amparado más allá de la ejecución, así que no hay ningún vencimiento que
            esperar para cerrarlo en firme.
          </Aviso>
        ) : (
          <Amparos titulo="Amparos de estabilidad y calidad" amparos={estado.amparos.verificados} />
        )
      ) : null}

      {!estado.cierre && !estado.puedeCerrar && estado.motivoNoPuede ? (
        <Pendiente falta="10.2" texto={`Todavía no se puede cerrar: ${estado.motivoNoPuede}.`} />
      ) : null}

      {/* Se avisa, no se bloquea: la estabilidad vence años después del recibo,
          y encadenar el cierre a un trámite pendiente impediría registrar un
          hecho que ya ocurrió. */}
      {!estado.cierre && estado.advertencias.length > 0 ? (
        <Aviso tono="aviso" titulo="Conviene resolver esto antes de cerrar">
          {estado.advertencias.join('; ')}.
        </Aviso>
      ) : null}

      {estado.historial.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Cierres revertidos</p>
          {estado.historial.map((c, indice) => (
            <div key={`${c.fechaCierre}-${indice}`} className="border-l-2 border-slate-200 pl-2.5">
              <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
                Cerrado el {fechaLarga(c.fechaCierre)}
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

      {estado.puedeCerrar && !cerrando ? (
        <Boton icono={<Lock className="w-3.5 h-3.5" />} onClick={() => setCerrando(true)}>
          Cerrar definitivamente
        </Boton>
      ) : null}

      {estado.puedeCerrar && cerrando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Cierre definitivo</p>

          <div>
            <label htmlFor="cd-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha del cierre <span className="text-red-600">*</span>
            </label>
            <input
              id="cd-fecha"
              type="date"
              value={datos.fechaCierre}
              onChange={(e) => setDatos((p) => ({ ...p, fechaCierre: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="cd-obs" className="block text-xs font-bold text-gray-600 mb-1.5">
              Observaciones
            </label>
            <textarea
              id="cd-obs"
              rows={2}
              value={datos.observaciones}
              onChange={(e) => setDatos((p) => ({ ...p, observaciones: e.target.value }))}
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="cd-soporte"
            etiqueta="Soporte (opcional)"
            ayuda="La certificación de la aseguradora, si la hay."
            archivo={soporte}
            onElegir={setSoporte}
          />

          <p className="text-[11.5px] text-slate-600 m-0">
            El contrato quedará en <b>CERRADO</b> y los amparos que se miraron quedan congelados
            con el cierre.
          </p>

          <div className="flex flex-wrap gap-2">
            <Boton icono={<Lock className="w-3.5 h-3.5" />} disabled={guardando} onClick={cerrar}>
              Cerrar definitivamente
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
    </>
  );
}

/**
 * Los amparos que condicionan el cierre.
 *
 * Van ordenados por vencimiento —el servidor ya los devuelve así— para que se
 * lean como una espera: el de abajo es el que marca la fecha.
 */
function Amparos({
  titulo,
  amparos,
  congelado = false,
}: {
  titulo: string;
  amparos: AmparoVerificado[];
  congelado?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
      <p className="text-[12.5px] font-bold text-slate-800 m-0">
        {titulo}
        {congelado ? (
          <span className="ml-1.5 text-[10.5px] font-bold text-slate-400">
            · congelados al cerrar
          </span>
        ) : null}
      </p>

      {amparos.map((a) => (
        <div key={`${a.numeroPoliza}-${a.tipo}`} className="flex items-start gap-2">
          {a.vencido ? (
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" />
          ) : (
            <CalendarClock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
              {a.nombre}
              <span className="text-slate-400 font-normal"> · póliza {a.numeroPoliza}</span>
            </p>
            <p
              className={`text-[11px] m-0 mt-0.5 leading-relaxed tabular-nums ${
                a.vencido ? 'text-slate-500' : 'text-amber-700'
              }`}
            >
              {a.vencido
                ? `Venció el ${fechaLarga(a.vigenciaHasta)}`
                : `Ampara hasta el ${fechaLarga(a.vigenciaHasta)}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
