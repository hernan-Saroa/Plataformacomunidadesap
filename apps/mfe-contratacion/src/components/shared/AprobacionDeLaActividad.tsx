import React, { useState } from 'react';
import { Check, ClipboardCheck, Send, Undo2 } from 'lucide-react';

import { usarAprobacion } from './usarAprobacion';

interface Props {
  procesoId: string;
  numeral: string;
  onCambio?: () => void;
}

const boton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const primario = `${boton} bg-[#003DA5] text-white hover:bg-[#00307f]`;
const secundario = `${boton} border border-slate-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5]`;
const campo =
  'w-full rounded-md border border-slate-300 px-2.5 py-2 text-[12px] text-slate-800 outline-none focus:border-[#003DA5]';

/**
 * El trámite de aprobación de una actividad, encima del panel que la trabaja.
 *
 * Va aquí y no dentro de cada panel por la misma razón por la que
 * `DocumentosActividad` vive en `DetalleProceso`: son treinta y ocho paneles,
 * ninguno conoce su propio numeral y el trámite es idéntico en todos. Montarlo
 * una vez evita repetirlo —y evita que se olvide en los que vengan después.
 *
 * No sustituye el botón con el que cada panel cierra su actividad: el del CDP
 * expide, el de garantías aprueba pólizas, y cada uno tiene su propia lógica.
 * Se suma como una capa de revisión sobre lo que el panel ya hace, que es
 * exactamente lo que el área pidió: que una actividad pueda necesitar visto
 * bueno sin que eso cambie cómo se ejecuta.
 *
 * Si el área no configuró aprobación para la actividad, no se pinta nada.
 */
export function AprobacionDeLaActividad({ procesoId, numeral, onCambio }: Props) {
  const a = usarAprobacion(procesoId, numeral, onCambio);
  const [motivo, setMotivo] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);

  // Mientras carga tampoco: un bloque que aparece tarde desplaza el panel
  // justo cuando el gestor ya empezó a leerlo.
  if (a.cargando || !a.requiereAprobacion) return null;

  const encabezado = (titulo: string, detalle?: React.ReactNode) => (
    <div className="flex items-start gap-2.5">
      <ClipboardCheck className="w-4 h-4 text-[#003DA5] mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">{titulo}</p>
        {detalle ? (
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{detalle}</p>
        ) : null}
      </div>
    </div>
  );

  const marco = (tono: 'neutro' | 'espera' | 'ok' | 'aviso', hijos: React.ReactNode) => {
    const fondo = {
      neutro: 'border-gray-200 bg-slate-50',
      espera: 'border-blue-200 bg-blue-50',
      ok: 'border-emerald-200 bg-emerald-50',
      aviso: 'border-amber-200 bg-amber-50',
    }[tono];
    return (
      <div className={`rounded-xl border ${fondo} px-4 py-3.5 space-y-2.5 mb-3`}>{hijos}</div>
    );
  };

  const quien = a.quienAprueba.length
    ? `${a.quienAprueba.length === 1 ? 'La aprobará' : 'La aprobará alguno de'} ${a.quienAprueba.join(' o ')}.`
    : 'Aún no se ha designado quién la aprueba.';

  if (a.estado === 'APROBADO') {
    return marco(
      'ok',
      encabezado(
        'Actividad aprobada',
        a.decididaPor ? `La aprobó ${a.decididaPor}.` : undefined,
      ),
    );
  }

  if (a.estado === 'EN_REVISION') {
    return marco(
      'espera',
      <>
        {encabezado(
          'En revisión · pendiente de aprobación',
          a.quienAprueba.length ? `Espera a ${a.quienAprueba.join(' o ')}.` : undefined,
        )}

        {/* Quien la envió puede retirarla mientras nadie la ha resuelto: sin
            esto tendría que pedirle al aprobador que se la devuelva para
            corregir un error que él mismo ya vio. */}
        {a.esMia ? (
          <button type="button" className={secundario} onClick={a.retirar} disabled={a.guardando}>
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            Retirar de aprobación
          </button>
        ) : null}

        {a.puedoAprobar ? (
          <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2.5">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">Tu decisión</p>

            {devolviendo ? (
              <>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Qué debe corregirse"
                  aria-label="Observaciones de la devolución"
                  className={campo}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secundario}
                    onClick={() => a.devolver(motivo)}
                    disabled={a.guardando || !motivo.trim()}
                  >
                    <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Devolver
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevolviendo(false)}
                    className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700 px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primario}
                  onClick={a.aprobar}
                  disabled={a.guardando}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                  Aprobar
                </button>
                <button
                  type="button"
                  className={secundario}
                  onClick={() => setDevolviendo(true)}
                  disabled={a.guardando}
                >
                  <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Devolver con observaciones
                </button>
              </div>
            )}
          </div>
        ) : null}
      </>,
    );
  }

  // BORRADOR y DEVUELTO comparten pantalla: en ambos el gestor trabaja la
  // actividad abajo y la envía desde aquí. Lo único que cambia es que en la
  // devuelta hay que decirle qué corregir.
  return marco(
    a.estado === 'DEVUELTO' ? 'aviso' : 'neutro',
    <>
      {a.estado === 'DEVUELTO' && a.observaciones
        ? encabezado(
            `Devuelta${a.decididaPor ? ` por ${a.decididaPor}` : ''}`,
            a.observaciones,
          )
        : encabezado('Esta actividad requiere aprobación', quien)}

      <button type="button" className={primario} onClick={a.enviar} disabled={a.guardando}>
        <Send className="w-3.5 h-3.5" aria-hidden="true" />
        {a.estado === 'DEVUELTO' ? 'Corregir y volver a enviar' : 'Enviar a aprobación'}
      </button>

      {a.estado === 'DEVUELTO' && a.quienAprueba.length ? (
        <p className="text-[11px] text-slate-500 m-0">{quien}</p>
      ) : null}
    </>,
  );
}
