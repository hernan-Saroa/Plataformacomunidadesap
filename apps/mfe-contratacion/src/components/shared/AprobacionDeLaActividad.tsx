import React, { useState } from 'react';
import { Check, ClipboardCheck, Undo2, X } from 'lucide-react';

import { usarAprobacion } from './usarAprobacion';
import { HistorialRevisiones } from './HistorialRevisiones';

interface Props {
  procesoId: string;
  numeral: string;
  onCambio?: () => void;
  /**
   * `aviso` va encima del panel y dice en qué estado está; `decision` va
   * debajo de los documentos, con los botones.
   *
   * Se parte en dos porque quien aprueba tiene que ver lo que le cargaron
   * antes de decidir, y con todo arriba decidiría a ciegas. Sin esta prop la
   * pieza pinta ambas cosas juntas, como antes.
   */
  parte?: 'aviso' | 'decision';
  /**
   * Formatos requeridos que la actividad aún no ha cargado.
   *
   * Aprobar queda bloqueado mientras quede alguno: el bloque de documentos ya
   * avisa «Falta 1 de 1» justo encima, y dejar el botón activo debajo de ese
   * aviso era pedirle a quien aprueba que diera el visto bueno sin soporte.
   * Devolver sí sigue disponible, porque devolver por falta de soporte es
   * exactamente el caso legítimo.
   */
  faltanDocumentos?: number;
  /**
   * Cierra la tarjeta de decisión y la deja como burbuja.
   *
   * Quien no va a resolver ahora —el gestor que solo viene a cargar un
   * documento— puede quitarla de en medio sin perderla de vista: la burbuja
   * sigue diciendo que hay algo pendiente.
   */
  onEsconder?: () => void;
  /** Avisa de si hay decisión que tomar, para pintar la burbuja. */
  onHayDecision?: (hay: boolean) => void;
  /**
   * Si la actividad tiene aprobadores configurados, hacia el contenedor.
   *
   * Lo necesita el panel de trabajo para nombrar su boton: donde alguien
   * revisa, registrar envia a aprobacion y decirlo antes de pulsar evita que
   * el gestor crea que ya cerro la actividad.
   */
  onRequiereAprobacion?: (requiere: boolean) => void;
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
 * `DocumentosDeLaActividad` vive en `DetalleProceso`: son treinta y ocho paneles,
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
export function AprobacionDeLaActividad({
  procesoId,
  numeral,
  onCambio,
  parte,
  faltanDocumentos = 0,
  onEsconder,
  onHayDecision,
  onRequiereAprobacion,
}: Props) {
  const a = usarAprobacion(procesoId, numeral, onCambio);
  const [motivo, setMotivo] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);

  /**
   * Si hay algo que decidir aquí, hacia quien monta el bloque.
   *
   * Lo necesita el contenedor para saber si abre la columna y si pinta la
   * burbuja: sin el aviso reservaría sitio para una decisión que quizá no
   * existe, o dejaría una burbuja flotando sin nada detrás.
   */
  const hayDecision =
    parte === 'decision' && !a.cargando && a.requiereAprobacion &&
    a.estado === 'EN_REVISION' && a.puedoAprobar;

  React.useEffect(() => {
    onHayDecision?.(hayDecision);
  }, [hayDecision, onHayDecision]);

  React.useEffect(() => {
    if (a.cargando) return;
    onRequiereAprobacion?.(a.requiereAprobacion);
  }, [a.cargando, a.requiereAprobacion, onRequiereAprobacion]);

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
    if (parte === 'decision') return null;
    return marco(
      'ok',
      <>
        {encabezado(
          'Actividad aprobada',
          a.decididaPor ? `La aprobó ${a.decididaPor}.` : undefined,
        )}

        {/* Aprobada no quiere decir que fuera a la primera: el recorrido
            explica por qué tardó lo que tardó. */}
        <HistorialRevisiones revisiones={a.revisiones} />
      </>,
    );
  }

  if (a.estado === 'EN_REVISION') {
    // El aviso va encima del panel y la decisión al final de los documentos:
    // quien aprueba tiene que ver lo que le cargaron antes de resolver.
    if (parte === 'decision') {
      if (!a.puedoAprobar) return null;

      // Marco propio, y no el de los documentos: aprobar o devolver es el acto
      // que cierra la actividad, no un anexo más del expediente. Dentro de la
      // caja de adjuntos, bajo «Adjuntar otro documento», se leía como uno.
      return (
        <div className="rounded-xl border border-[#003DA5]/25 bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#EFF5FF] border-b border-[#003DA5]/15">
            <ClipboardCheck
              className="w-4 h-4 text-[#003DA5] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-[#00307f] m-0">Tu decisión</p>
              <p className="text-[11px] text-[#1E40AF]/80 m-0 mt-0.5">
                Sobre la actividad {numeral}
              </p>
            </div>

            {/* Esconderla es reversible y la burbuja la devuelve: el gestor que
                solo viene a cargar un documento no necesita el bloque encima. */}
            {onEsconder ? (
              <button
                type="button"
                onClick={onEsconder}
                aria-label="Esconder la decisión"
                title="Esconder"
                className="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded-md text-[#003DA5]/60 hover:text-[#003DA5] hover:bg-[#003DA5]/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="px-4 py-3.5 space-y-2.5">
            <p
              className={`text-[11px] m-0 leading-relaxed ${
                faltanDocumentos > 0 ? 'text-amber-700 font-bold' : 'text-slate-500'
              }`}
            >
              {faltanDocumentos > 0
                ? `${
                    faltanDocumentos === 1
                      ? 'Falta un formato por cargar'
                      : `Faltan ${faltanDocumentos} formatos por cargar`
                  }. Puedes devolverla para que lo carguen.`
                : 'Revisa los documentos antes de resolver.'}
            </p>

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
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    className={`${secundario} justify-center w-full`}
                    onClick={() => a.devolver(motivo)}
                    disabled={a.guardando || !motivo.trim()}
                  >
                    <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Devolver
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevolviendo(false)}
                    className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700 py-1"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              /* Apilados y a todo el ancho: en una columna de 17rem, dos
                 botones en fila se parten a media palabra. */
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  className={`${primario} justify-center w-full`}
                  onClick={a.aprobar}
                  disabled={a.guardando || faltanDocumentos > 0}
                  title={
                    faltanDocumentos > 0
                      ? 'No se puede aprobar mientras falten formatos por cargar'
                      : undefined
                  }
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                  Aprobar
                </button>
                <button
                  type="button"
                  className={`${secundario} justify-center w-full`}
                  onClick={() => setDevolviendo(true)}
                  disabled={a.guardando}
                >
                  <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Devolver con observaciones
                </button>
              </div>
            )}

            {/* Las vueltas anteriores, plegadas: quien va a decidir necesita
                saber si ya pidió esto mismo antes y no se lo corrigieron. */}
            <HistorialRevisiones revisiones={a.revisiones} />
          </div>
        </div>
      );
    }

    return marco(
      'espera',
      <>
        {encabezado(
          'En revisión · pendiente de aprobación',
          a.puedoAprobar
            ? // Ya no se dice dónde está la decisión: la tarjeta la acompaña
              // a la vista, y si la esconde, la burbuja se la devuelve.
              'Te toca resolverla.'
            : a.quienAprueba.length
              ? `Espera a ${a.quienAprueba.join(' o ')}.`
              : undefined,
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
      </>,
    );
  }

  // En los demás estados solo hay aviso: no hay nada que decidir abajo.
  if (parte === 'decision') return null;

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

      {/* Las vueltas anteriores, para el gestor que corrige: si ya se la
          devolvieron por lo mismo dos veces, conviene que lo vea antes de
          volver a enviarla. */}
      <HistorialRevisiones revisiones={a.revisiones} />

      {/* Sin boton: la actividad se envia al registrarla, abajo. Tener aqui un
          envio aparte permitia mandar a revision una actividad vacia —este
          bloque no sabe si el trabajo esta hecho, y el de abajo si—, y dejaba
          dos formas de cerrar la misma actividad que se ignoraban entre si. */}
      <p className="text-[11.5px] text-slate-600 m-0">
        {a.estado === 'DEVUELTO'
          ? 'Corrige lo señalado abajo y vuelve a registrar la actividad: con eso se envía de nuevo.'
          : 'Se envía sola al registrar la actividad, abajo.'}
      </p>

      {a.estado === 'DEVUELTO' && a.quienAprueba.length ? (
        <p className="text-[11px] text-slate-500 m-0">{quien}</p>
      ) : null}
    </>,
  );
}
