import React, { useState } from 'react';
import { ArrowRight, Ban, Check, Scale, Undo2 } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { AccionEscalon, EvidenciaFirmaOtp } from '../../types';
import { Modal } from '../shared/Modal';
import { useFirma } from '../shared/useFirma';
import { ElegirSoportes } from '../shared/ElegirSoportes';
import { adjuntarSoportes } from '../shared/usarAprobacion';

type Accion = 'aprobar' | 'devolver' | 'negar';

interface Props {
  procesoId: string;
  /** Ya se decidió: quien monta la pieza relee lo que haga falta. */
  onDecidido: () => void | Promise<void>;
  /**
   * `franja` es la fila de botones al pie del formulario, como siempre;
   * `tarjeta` es la columna de la pantalla de revisión, con los botones
   * apilados y el aviso de a quién pasa.
   */
  variante?: 'franja' | 'tarjeta';
  /** A dónde sigue el proceso si se aprueba, dicho en una línea. */
  pasaA?: string | null;
  /**
   * La modalidad que se ratifica al aprobar (migración 094): ya no hay una
   * actividad aparte para eso, así que se dice al confirmar.
   */
  modalidad?: string | null;
  /**
   * Lo que el escalón que espera permite (migración 101). Sin cadena llegan
   * las tres, que es lo que el abogado ha podido siempre.
   */
  acciones?: AccionEscalon[];
  /**
   * El escalón que sigue, si aprobar aquí no es la aprobación definitiva: no
   * ratifica la modalidad ni cierra la 3.4, solo pasa el estudio.
   */
  siguiente?: string | null;
}

/**
 * La decisión sobre el estudio previo: aprobar, devolver o negar (la 3.4).
 *
 * Vivía dentro del formulario de la 3.1, y por eso el abogado aprobaba desde
 * la misma pantalla donde el área había redactado —la queja que abrió la
 * reestructuración—. Aparte, la misma pieza sirve a la pantalla de revisión y,
 * donde todavía no se llega por ella, al pie del formulario.
 *
 * Devolver admite archivos con las correcciones marcadas (migraciones 091 y
 * 093), como el módulo disciplinario: un párrafo resume mal veinte páginas
 * corregidas a mano. Aprobar y negar también, en cualquier escalón: lo que
 * se adjunta es la traza de por qué se decidió así (113).
 */
export function DecisionEstudioPrevio({
  procesoId,
  onDecidido,
  variante = 'franja',
  pasaA,
  modalidad,
  acciones = ['APROBAR', 'DEVOLVER', 'NEGAR'],
  siguiente = null,
}: Props) {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [soportes, setSoportes] = useState<File[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Quien envía y quien aprueba firman por separado (EFDS-2070). */
  const firmaAprobacion = useFirma('3.4', 'Aprobar el estudio previo');

  const abrir = (a: Accion) => {
    setAccion(a);
    setObservaciones('');
    setSoportes([]);
    setError(null);
  };

  const decidir = async (firma?: EvidenciaFirmaOtp) => {
    if (!accion) return;
    setProcesando(true);
    setError(null);
    try {
      if (accion === 'aprobar') {
        await contratacionService.aprobar(procesoId, observaciones.trim() || undefined, firma);
        // Lo que sustenta la aprobación del escalón queda en su decisión (113).
        await adjuntarSoportes(procesoId, '3.1', soportes, 'Se aprobó');
      } else if (accion === 'negar') {
        await contratacionService.negar(procesoId, observaciones.trim());
        await adjuntarSoportes(procesoId, '3.1', soportes, 'Se negó');
      } else {
        await contratacionService.devolver(procesoId, observaciones.trim());
        await adjuntarSoportes(procesoId, '3.1', soportes);
      }
      setAccion(null);
      setObservaciones('');
      setSoportes([]);
      await onDecidido();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const botonNegar = (
    <button
      type="button"
      onClick={() => abrir('negar')}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold
        rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50 transition-all ${
          variante === 'tarjeta' ? 'w-full' : ''
        }`}
    >
      <Ban className="w-3.5 h-3.5" />
      Negar
    </button>
  );
  const botonDevolver = (
    <button
      type="button"
      onClick={() => abrir('devolver')}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold
        rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-all ${
          variante === 'tarjeta' ? 'w-full' : ''
        }`}
    >
      <Undo2 className="w-3.5 h-3.5" />
      Devolver
    </button>
  );
  const botonAprobar = (
    <button
      type="button"
      onClick={() => abrir('aprobar')}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold
        rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm
        active:scale-95 transition-all ${variante === 'tarjeta' ? 'w-full' : ''}`}
    >
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
      {siguiente ? 'Aprobar y pasar al siguiente' : 'Aprobar'}
    </button>
  );
  const puede = (a: AccionEscalon) => acciones.includes(a);

  return (
    <>
      {variante === 'tarjeta' ? (
        <div className="flex flex-col gap-1.5">
          {puede('APROBAR') ? botonAprobar : null}
          {puede('DEVOLVER') ? botonDevolver : null}
          {puede('NEGAR') ? botonNegar : null}
        </div>
      ) : (
        <>
          {puede('NEGAR') ? botonNegar : null}
          {puede('DEVOLVER') ? botonDevolver : null}
          {puede('APROBAR') ? botonAprobar : null}
        </>
      )}

      <Modal
        isOpen={accion !== null}
        onClose={() => setAccion(null)}
        title={
          accion === 'aprobar'
            ? 'Aprobar estudio previo'
            : accion === 'negar'
              ? 'Negar el proceso'
              : 'Devolver para corrección'
        }
        description={
          accion === 'aprobar'
            ? siguiente
              ? `Pasa al siguiente escalón: ${siguiente}. La aprobación definitiva es la del último.`
              : 'El proceso podrá continuar a las etapas siguientes'
            : accion === 'negar'
              ? // Se dice lo que de verdad va a pasar, y que no tiene vuelta:
                // es la única decisión de la pantalla que no se puede deshacer.
                'La contratación no procede. El proceso termina aquí y no admite reenvío.'
              : 'Vuelve al área para que lo corrija; al reenviarlo, la revisión empieza otra vez desde el primer escalón'
        }
        icon={
          accion === 'aprobar' ? (
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          ) : accion === 'negar' ? (
            <Ban className="w-5 h-5 text-white" />
          ) : (
            <Undo2 className="w-5 h-5 text-white" />
          )
        }
        color={accion === 'aprobar' ? '#059669' : accion === 'negar' ? '#B91C1C' : '#D97706'}
        size="medium"
        footer={
          <>
            <button
              type="button"
              // La firma es de la aprobación definitiva: una intermedia no la pide.
              onClick={() => (accion === 'aprobar' && !siguiente ? firmaAprobacion.conFirma(decidir) : decidir())}
              disabled={procesando || (accion !== 'aprobar' && !observaciones.trim())}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-lg text-white shadow-sm
                active:scale-95 disabled:opacity-50 transition-all ${
                  accion === 'aprobar'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : accion === 'negar'
                      ? 'bg-red-700 hover:bg-red-800'
                      : 'bg-amber-600 hover:bg-amber-700'
                }`}
            >
              {procesando
                ? 'Procesando…'
                : accion === 'aprobar'
                  ? 'Confirmar'
                  : accion === 'negar'
                    ? 'Negar el proceso'
                    : 'Devolver'}
            </button>
            <button
              type="button"
              onClick={() => setAccion(null)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancelar
            </button>
          </>
        }
      >
        {/* A quién pasa, antes de confirmar: el disciplinario lo pide al
            aprobar —elige el radicador— y aquí la regla ya lo sabe. */}
        {accion === 'aprobar' && pasaA && !siguiente ? (
          <p className="text-[12px] text-slate-600 m-0 mb-3 flex items-start gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-700" />
            <span>
              Pasa a: <strong className="text-slate-900">{pasaA}</strong>
            </span>
          </p>
        ) : null}

        {accion === 'aprobar' && modalidad && !siguiente ? (
          <p className="text-[12px] text-slate-600 m-0 mb-3 flex items-start gap-1.5">
            <Scale className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-700" />
            <span>
              Ratificas la modalidad: <strong className="text-slate-900">{modalidad}</strong>
            </span>
          </p>
        ) : null}

        <label htmlFor="obs" className="block text-xs font-bold text-gray-600 mb-1.5">
          {accion === 'negar' ? 'Motivo de la negativa' : 'Observaciones'}
          {accion !== 'aprobar' && <span className="text-red-600"> *</span>}
        </label>
        <textarea
          id="obs"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder={
            accion === 'aprobar'
              ? 'Opcional: comentarios sobre la aprobación'
              : accion === 'negar'
                ? 'Explica por qué la contratación no procede'
                : 'Indica qué debe corregirse. Si la modalidad no corresponde, di cuál sí'
          }
          className="w-full min-h-[110px] px-3 py-2 text-sm rounded-lg border border-gray-300
            focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        />
        {accion === 'aprobar' && (
          <div className="mt-3">
            <ElegirSoportes
              archivos={soportes}
              onCambio={setSoportes}
              etiqueta="Documentos que sustentan la aprobación (opcional)"
            />
            <p className="text-[11px] text-gray-500 mt-1.5 mb-0">
              Lo que escribas y adjuntes queda en el historial de la revisión, con tu nombre.
            </p>
          </div>
        )}
        {accion === 'devolver' && (
          <>
            <p className="text-[11px] text-gray-500 mt-2 mb-0">
              Sin observaciones el área no sabría qué corregir, por eso son obligatorias.
            </p>
            <div className="mt-3">
              <ElegirSoportes
                archivos={soportes}
                onCambio={setSoportes}
                etiqueta="Documentos con las correcciones (opcional)"
              />
            </div>
          </>
        )}
        {accion === 'negar' && (
          <p className="text-[11px] text-red-700 mt-2 mb-0">
            A quien le niegan un proceso hay que decirle por qué: no va a tener ocasión de
            preguntarlo corrigiendo. La 3.1 queda cerrada y el proceso no se reabre.
          </p>
        )}
        {accion === 'negar' && (
          <div className="mt-3">
            <ElegirSoportes
              archivos={soportes}
              onCambio={setSoportes}
              etiqueta="Documentos que fundan la negativa (opcional)"
            />
          </div>
        )}
        {error && (
          <p role="alert" className="text-[11.5px] font-bold text-red-600 m-0 mt-2">
            {error}
          </p>
        )}
      </Modal>

      {firmaAprobacion.modal}
    </>
  );
}
