import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Eye, Info } from 'lucide-react';

import { useSituacionDelProceso } from '../../hooks/useSituacionDelProceso';
import { AprobacionDeLaActividad } from '../shared/AprobacionDeLaActividad';
import { ListaDeDocumentos } from '../shared/ListaDeDocumentos';
import { SoloLectura } from '../shared/SoloLectura';
import { LugarDeDecision } from '../shared/LugarDeDecision';
import { EncabezadoActividad } from '../shared/PiezasPanel';
import { PanelDeLaActividad } from '../proceso/PanelDeLaActividad';
import { NUMERALES_CON_DECISION_EN_EL_PANEL } from '../proceso/actividadesConPanel';
import { DecisionEstudioPrevio } from '../estudio-previo/DecisionEstudioPrevio';
import { destinoDeLaSituacion } from '../proceso/situacionDelProceso';
import { LecturaEstudioPrevio } from './LecturaEstudioPrevio';

interface Props {
  procesoId: string;
  numeral: string;
  /** A dónde se vuelve: la bandeja «Por revisar» o el proceso. */
  volverA: string;
  onVolver: () => void;
  /** Abre el proceso completo en esa actividad, para ver el contexto. */
  onVerProceso: (numeral: string) => void;
}

/** Por qué quien mira no puede decidir la 3.4, dicho como lo diría una persona. */
function porQueNoDecide(motivo: string | null | undefined, abogado?: string | null): string {
  if (motivo === 'SIN_ABOGADO') return 'Nadie ha repartido este proceso: se asigna abogado en la 3.3.';
  if (motivo === 'NO_ES_TUYO') return `Lo revisa ${abogado ?? 'otro abogado'}.`;
  return 'Tu rol no resuelve la revisión del estudio previo.';
}

/**
 * La revisión de una actividad, en su propia pantalla.
 *
 * Es el cambio de fondo de la reestructuración: quien aprueba ya no vuelve al
 * formulario de quien redactó. Entra desde su bandeja, lee lo enviado —el
 * estudio previo como documento, o el panel de la actividad sin poder
 * tocarlo— y decide en una columna fija al lado. Al decidir se le dice a
 * dónde pasa el proceso, como el módulo disciplinario al aprobar un auto.
 *
 * Las reglas no cambian: la decisión la toman las mismas piezas y los mismos
 * endpoints de siempre.
 */
export function RevisionDeActividad({ procesoId, numeral, volverA, onVolver, onVerProceso }: Props) {
  const [token, setToken] = useState(0);
  const releer = () => setToken((t) => t + 1);
  const { cargando, error, estudio, catalogo, situacion, pasaA } = useSituacionDelProceso(procesoId, token);
  const [faltanFormatos, setFaltanFormatos] = useState(0);
  const [hayDecision, setHayDecision] = useState(false);

  if (cargando && !estudio) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-sm text-slate-500 m-0">Cargando la revisión…</p>
      </div>
    );
  }
  if (!estudio) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <p className="text-sm text-red-600 m-0 mb-3">{error ?? 'No se pudo cargar el proceso'}</p>
        <button type="button" onClick={onVolver} className="text-sm font-bold text-[#003DA5]">
          Volver a {volverA}
        </button>
      </div>
    );
  }

  const esEstudio = numeral === '3.1';
  const actividad = catalogo.find((a) => a.numeral === numeral);
  const nombre = esEstudio ? 'Estudio previo' : (actividad?.nombre ?? `Actividad ${numeral}`);
  const destino = pasaA(numeral);
  const modalidad = estudio.proceso.modalidadNombre ?? estudio.proceso.modalidad;

  /**
   * Se decide con los botones del propio panel. El panel sigue en solo
   * lectura: `LugarDeDecision` enciende únicamente los de decidir.
   */
  const decideEnElPanel = NUMERALES_CON_DECISION_EN_EL_PANEL.includes(numeral);

  /** La 3.1 ya no espera decisión: se resolvió aquí o en otra parte. */
  const estudioResuelto = esEstudio && estudio.estado !== 'EN_REVISION';

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Cabecera: de qué proceso es y qué se revisa. */}
      <div
        className="bg-white border border-gray-200 rounded-xl p-4"
        style={{ borderBottom: '3px solid #059669' }}
      >
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 hover:text-[#003DA5] mb-2.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {volverA}
        </button>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 m-0">
              Revisión · {numeral} {nombre}
            </p>
            <h2 className="text-[15px] font-bold text-slate-900 m-0 mt-0.5 leading-snug">
              {estudio.proceso.objeto}
            </h2>
            <p className="text-[12px] text-slate-500 m-0 mt-1 tabular-nums">
              {estudio.proceso.radicado}
              {modalidad ? ` · ${modalidad}` : ''}
              {estudio.proceso.expediente ? ` · Expediente ${estudio.proceso.expediente}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onVerProceso(numeral)}
            className="self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg
              bg-white border border-gray-200 text-slate-700 hover:border-[#003DA5]/30 hover:text-[#003DA5]"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            Ver el proceso completo
          </button>
        </div>
      </div>

      <div className="revision-actividad">
        {/* Lo que se revisa. */}
        <div className="min-w-0">
          {esEstudio ? (
            <LecturaEstudioPrevio estudio={estudio} procesoId={procesoId} />
          ) : (
            <LugarDeDecision enLaRevision>
            <SoloLectura motivo="Estás revisando lo que se envió">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <EncabezadoActividad numeral={numeral} nombre={nombre} />
                <p className="px-4 py-2.5 m-0 bg-slate-50 border-b border-gray-100 text-[12px] text-slate-600 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                  {decideEnElPanel
                    ? 'Así quedó la actividad. Lo que espera tu decisión tiene sus botones aquí mismo; lo demás es para leer.'
                    : 'Así quedó la actividad al enviarla. Si hay que cambiar algo, devuélvela con tus observaciones.'}
                </p>
                <PanelDeLaActividad
                  numeral={numeral}
                  nombre={nombre}
                  procesoId={procesoId}
                  valorEstimado={estudio.proceso.valorEstimado}
                  onCambio={releer}
                  onCambioEstudio={releer}
                  recargarToken={token}
                />
              </div>
              <div className="mt-3">
                <ListaDeDocumentos
                  procesoId={procesoId}
                  numeral={numeral}
                  recargarToken={token}
                  onFaltantes={setFaltanFormatos}
                  bloqueo="Estás revisando: los documentos los carga quien trabaja la actividad"
                />
              </div>
            </SoloLectura>
            </LugarDeDecision>
          )}
        </div>

        {/* La decisión, fija al lado. */}
        <aside className="revision-decision space-y-3" aria-label="Decisión">
          {esEstudio ? (
            estudioResuelto ? (
              <Resuelta
                texto={
                  estudio.estado === 'APROBADO'
                    ? 'Estudio previo aprobado'
                    : estudio.estado === 'NEGADO'
                      ? 'Proceso negado'
                      : 'Devuelto al área para corrección'
                }
                ahora={situacion ? destinoDeLaSituacion(situacion) : null}
                volverA={volverA}
                onVolver={onVolver}
              />
            ) : (
              <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                  <p className="text-sm font-bold text-emerald-800 m-0">Tu decisión</p>
                  <p className="text-[12px] text-emerald-800 m-0 mt-0.5">Sobre el estudio previo</p>
                </div>
                <div className="p-4 space-y-3">
                  {estudio.revision?.puedeDecidir ? (
                    <>
                      <p className="text-[12px] text-slate-500 m-0">
                        Lee el estudio y sus documentos antes de resolver. Aprobarlo ratifica la
                        modalidad. Devolver pide observaciones y admite un archivo con las
                        correcciones.
                      </p>
                      {destino ? (
                        <p className="text-[12px] text-slate-600 m-0 flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                          <span>
                            Si lo apruebas, pasa a: <strong className="text-slate-900">{destino}</strong>
                          </span>
                        </p>
                      ) : null}
                      <DecisionEstudioPrevio
                        procesoId={procesoId}
                        variante="tarjeta"
                        pasaA={destino}
                        modalidad={estudio.proceso.modalidadNombre}
                        onDecidido={releer}
                      />
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-600 m-0">
                      {porQueNoDecide(estudio.revision?.motivo, estudio.revision?.abogado?.nombre)}
                    </p>
                  )}
                </div>
              </div>
            )
          ) : decideEnElPanel ? (
            // Sin esto la columna decía «Ahora: …» como si ya estuviera
            // resuelta, mientras la decisión esperaba en el panel.
            <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2.5">
              <p className="text-sm font-bold text-emerald-800 m-0">Tu decisión</p>
              <p className="text-[12px] text-slate-600 m-0">
                Se toma en el panel de la actividad, en cada elemento que la espera.
              </p>
              {situacion ? (
                <p className="text-[12px] text-slate-600 m-0">
                  Ahora: <strong className="text-slate-900">{destinoDeLaSituacion(situacion)}</strong>
                </p>
              ) : null}
              <button
                type="button"
                onClick={onVolver}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg border border-gray-300 text-slate-700 hover:bg-slate-50"
              >
                Volver a {volverA}
              </button>
            </div>
          ) : (
            <>
              <AprobacionDeLaActividad
                procesoId={procesoId}
                numeral={numeral}
                parte="decision"
                onCambio={releer}
                recargarToken={token}
                faltanDocumentos={faltanFormatos}
                onHayDecision={setHayDecision}
                pasaA={destino}
              />
              {/* Sin decisión pendiente —ya resuelta, o no le toca a quien
                  mira— se dice en qué quedó y a dónde siguió el proceso. */}
              {!hayDecision ? (
                <>
                  <AprobacionDeLaActividad
                    procesoId={procesoId}
                    numeral={numeral}
                    parte="aviso"
                    recargarToken={token}
                  />
                  {situacion ? (
                    <Resuelta
                      texto={null}
                      ahora={destinoDeLaSituacion(situacion)}
                      volverA={volverA}
                      onVolver={onVolver}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Lo que queda después de decidir: en qué quedó y a dónde siguió el proceso. */
function Resuelta({
  texto,
  ahora,
  volverA,
  onVolver,
}: {
  texto: string | null;
  ahora: string | null;
  volverA: string;
  onVolver: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5">
      {texto ? (
        <p className="text-sm font-bold text-slate-900 m-0 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          {texto}
        </p>
      ) : null}
      {ahora ? (
        <p className="text-[12px] text-slate-600 m-0">
          Ahora: <strong className="text-slate-900">{ahora}</strong>
        </p>
      ) : null}
      <button
        type="button"
        onClick={onVolver}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg bg-[#003DA5] text-white hover:opacity-90"
      >
        Volver a {volverA}
      </button>
    </div>
  );
}
