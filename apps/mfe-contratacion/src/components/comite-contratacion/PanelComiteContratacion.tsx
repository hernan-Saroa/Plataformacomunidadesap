import React, { useEffect, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DecisionComite, EstadoComiteContratacion, EvidenciaFirmaOtp } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  Marco,
  SelectorArchivo,
  Titulo,
  campo,
} from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL = '3.7';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const ROTULO: Record<DecisionComite, string> = {
  APROBADO: 'Aprobado',
  APROBADO_CON_CONDICIONES: 'Aprobado con condiciones',
  OBSERVADO: 'Observado',
  RECHAZADO: 'Rechazado',
};

/**
 * Cómo se llama cada actividad que el comité puede reabrir (EFDS-2068).
 *
 * Cuáles ofrecer lo dice el backend en `reabribles` —solo las que este proceso
 * tiene cerradas—; aquí solo está el nombre con el que se leen. La 3.3 y la 3.4
 * no aparecen porque no tienen pantalla propia —son el ciclo de revisión de la
 * 3.1—, y reabrir la 3.1 ya las vuelve a abrir.
 */
const NOMBRE_ACTIVIDAD: Record<string, string> = {
  '3.1': '3.1 · Estudio previo y análisis del sector',
  '3.5': '3.5 · Modalidad de contratación',
  '3.6': '3.6 · Causal de contratación',
};

/**
 * Actividad 3.7 · Comité de contratación (la 3.6 de la matriz, RF-DOC-05).
 *
 * No es el comité **evaluador** de la 6.2: aquel evalúa las ofertas recibidas;
 * este revisa los documentos del proceso antes de que salga al mercado.
 *
 * La matriz la describe como tres decisiones —«Va o No / observa o no / aprueba
 * o no»— y hasta ahora era el panel genérico de constancia: una fecha, una nota
 * y el acta. El expediente no podía decir si el comité aprobó, con qué
 * condiciones, o si había devuelto los documentos; y como el registro cerraba
 * la actividad pasara lo que pasara, un proceso observado avanzaba como si lo
 * hubieran avalado.
 */
export function PanelComiteContratacion({ procesoId, onCambio }: Props) {
  const firma = useFirma(NUMERAL, 'Registrar la sesión del comité de contratación');
  const [estado, setEstado] = useState<EstadoComiteContratacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [fecha, setFecha] = useState('');
  const [decision, setDecision] = useState<DecisionComite>('APROBADO');
  const [texto, setTexto] = useState('');
  /** Qué hay que validar, cuando el comité aprueba pero reabre algo. */
  const [validacion, setValidacion] = useState('');
  const [numerales, setNumerales] = useState<string[]>([]);
  const [acta, setActa] = useState<File | null>(null);

  const cargar = () => {
    setCargando(true);
    contratacionService
      .comiteContratacion(procesoId)
      .then((r) => {
        setEstado(r);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [procesoId]);

  const hacer = async (accion: () => Promise<EstadoComiteContratacion>, exito: string) => {
    setGuardando(true);
    try {
      const r = await accion();
      setEstado(r);
      setRegistrando(false);
      setTexto('');
      setValidacion('');
      setNumerales([]);
      setActa(null);
      toast.success(exito);
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el comité…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar el comité">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Comité de contratación</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no pasa por comité">
          La matriz lo excluye en selección abreviada de menor cuantía, mínima cuantía y enajenación
          de bienes por subasta.
        </Aviso>
      </Marco>
    );
  }

  const ultima = estado.sesiones[0] ?? null;
  const observado = ultima?.decision === 'OBSERVADO';
  const rechazado = ultima?.decision === 'RECHAZADO';
  const cerrado = estado.estado === 'APROBADO';
  const negado = estado.estado === 'NEGADO';
  const constancia = estado.estado === 'NO_APLICA';
  // El texto que pide cada desenlace. Aprobar sin más no pide ninguno, y por
  // eso el campo desaparece en vez de quedarse vacío y opcional.
  const pideTexto = decision !== 'APROBADO';
  const aprueba = decision === 'APROBADO' || decision === 'APROBADO_CON_CONDICIONES';
  /**
   * Reabrir actividades anteriores ya cerradas (EFDS-2068).
   *
   * Obligatorio al observar —una devolución sin nada editable donde aplicarla
   * no sirve de nada— y opcional al aprobar, que es el comité avalando el
   * proceso pero pidiendo que le validen un punto. Al rechazar no se ofrece:
   * el proceso queda negado y no hay nada que corregir dentro de él.
   */
  const puedeReabrir = decision !== 'RECHAZADO' && estado.reabribles.length > 0;
  const exigeNumerales = decision === 'OBSERVADO';
  const marcados = puedeReabrir ? numerales : [];
  // Una aprobación que reabre algo tiene que decir qué validar: si no, esa
  // actividad le llega a su responsable devuelta y sin motivo.
  const pideValidacion = aprueba && marcados.length > 0;
  const completo =
    !!fecha &&
    !!acta &&
    (!pideTexto || texto.trim().length >= 10) &&
    (!pideValidacion || validacion.trim().length >= 10) &&
    (!exigeNumerales || marcados.length > 0);

  const alternar = (numeral: string) =>
    setNumerales((previos) =>
      previos.includes(numeral)
        ? previos.filter((n) => n !== numeral)
        : [...previos, numeral],
    );

  return (
    <Marco>
      <Titulo>Comité de contratación</Titulo>
      <Ayuda>
        El comité revisa los documentos del proceso y puede aprobarlos, aprobarlos con condiciones,
        devolverlos con observaciones de fondo o rechazarlos. Sesiona en la Dirección de
        Contratación: aquí se transcribe lo que decidió y se guarda el acta.
      </Ayuda>

      {/* ------------------------------------------------ si va o no va ---- */}
      {/* La condición de cuantía, con la cifra contra la que se comparó: un
          «no pasa por comité» sin decir contra qué es una decisión que nadie
          puede revisar después. */}
      {estado.umbral && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            {estado.va ? 'Pasa por comité' : 'No pasa por comité'}
          </p>
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 tabular-nums">
            Valor estimado{' '}
            {typeof estado.valorEstimado === 'number'
              ? formatoPesos.format(estado.valorEstimado)
              : 'sin registrar'}
            {estado.umbral.enPesos !== null
              ? ` · umbral ${estado.umbral.valor} ${estado.umbral.unidad} (${formatoPesos.format(
                  estado.umbral.enPesos,
                )})`
              : ` · umbral ${estado.umbral.valor} ${estado.umbral.unidad}, sin salario del año para convertirlo`}
          </p>
          {estado.umbral.fundamento && (
            <p className="text-[11px] text-slate-500 m-0 mt-1">{estado.umbral.fundamento}</p>
          )}
          {!estado.umbral.confirmado && (
            <p className="text-[11px] text-slate-500 m-0 mt-1">
              Cifra pendiente de confirmación por la Dirección de Contratación.
            </p>
          )}
        </div>
      )}

      {constancia && (
        <Aviso tono="ok" titulo="Consta que no pasó por comité">
          La cuantía del proceso no alcanza el umbral de su modalidad.
        </Aviso>
      )}

      {/* --------------------------------------------- la última decisión -- */}
      {ultima && (
        <div
          className={`rounded-lg border px-3.5 py-3 ${
            rechazado
              ? 'border-red-200 bg-red-50'
              : observado
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Users
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                rechazado ? 'text-red-900' : observado ? 'text-amber-900' : 'text-emerald-900'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[13px] font-bold m-0 ${
                  rechazado ? 'text-red-900' : observado ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                {ROTULO[ultima.decision]}
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">
                Sesión del {momento(ultima.fecha)}
                {ultima.registradoPor ? ` · transcrita por ${ultima.registradoPor}` : ''}
              </p>
              {/* Las condiciones y las observaciones se muestran enteras y no
                  recortadas: son lo que hay que cumplir o corregir. */}
              {ultima.condiciones && (
                <p className="text-[11.5px] text-slate-700 m-0 mt-1 break-words">
                  Condiciones: «{ultima.condiciones}»
                </p>
              )}
              {ultima.observaciones && (
                <p className="text-[11.5px] text-slate-700 m-0 mt-1 break-words">
                  «{ultima.observaciones}»
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {observado && (
        <Aviso tono="aviso" titulo="El comité devolvió los documentos">
          Hay que atender las observaciones de fondo y volver a llevarlo a comité. Al registrar la
          nueva sesión, esta queda en el expediente junto a la anterior.
        </Aviso>
      )}

      {rechazado && (
        <Aviso tono="error" titulo="El comité rechazó el proceso">
          El proceso queda negado y no sale al mercado: lo que terminó no es la etapa, es la
          contratación. Lo que el comité objetó queda en el expediente junto con el acta.
        </Aviso>
      )}

      {/* ------------------------------------------------- el abogado ------ */}
      {estado.puedeRegistrar && !registrando && (
        <Boton icono={<Users className="w-3.5 h-3.5" />} onClick={() => setRegistrando(true)}>
          {ultima ? 'Registrar otra sesión' : 'Registrar lo que decidió el comité'}
        </Boton>
      )}

      {estado.puedeDejarConstancia && !registrando && (
        <div className="space-y-2">
          <BotonSecundario
            icono={<Check className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={() =>
              hacer(
                () => contratacionService.comiteNoVa(procesoId),
                'Consta que el proceso no pasó por comité',
              )
            }
          >
            Dejar constancia de que no pasó por comité
          </BotonSecundario>
          <p className="text-[11px] text-slate-500 m-0">
            La actividad queda como no aplicable y la etapa puede seguir.
          </p>
        </div>
      )}

      {registrando && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3">
          <label htmlFor="comite-fecha" className="block text-xs font-bold text-gray-600">
            Fecha de la sesión <span className="text-red-600">*</span>
          </label>
          <input
            id="comite-fecha"
            type="date"
            value={fecha}
            disabled={guardando}
            onChange={(e) => setFecha(e.target.value)}
            className={campo}
          />

          <label htmlFor="comite-decision" className="block text-xs font-bold text-gray-600">
            Qué decidió <span className="text-red-600">*</span>
          </label>
          <select
            id="comite-decision"
            value={decision}
            disabled={guardando}
            onChange={(e) => setDecision(e.target.value as DecisionComite)}
            className={campo}
          >
            <option value="APROBADO">Aprobado</option>
            <option value="APROBADO_CON_CONDICIONES">Aprobado con condiciones</option>
            <option value="OBSERVADO">Observado: devuelve los documentos</option>
            <option value="RECHAZADO">Rechazado: el proceso no sale al mercado</option>
          </select>
          {decision === 'RECHAZADO' && (
            <Aviso tono="aviso" titulo="El rechazo termina el proceso">
              La actividad queda negada y el proceso también: no admite corregir y volver a comité.
              Si lo que procede es devolver para corregir, el desenlace es «Observado».
            </Aviso>
          )}

          {pideTexto && (
            <>
              <label htmlFor="comite-texto" className="block text-xs font-bold text-gray-600">
                {decision === 'APROBADO_CON_CONDICIONES'
                  ? 'A qué queda condicionada la aprobación'
                  : decision === 'RECHAZADO'
                    ? 'Por qué se rechaza el proceso'
                    : 'Observaciones de fondo'}{' '}
                <span className="text-red-600">*</span>
              </label>
              <textarea
                id="comite-texto"
                rows={3}
                value={texto}
                disabled={guardando}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={
                  decision === 'APROBADO_CON_CONDICIONES'
                    ? 'Queda condicionada a que se ajuste el análisis del sector antes de publicar…'
                    : decision === 'RECHAZADO'
                      ? 'La necesidad ya está cubierta por el contrato marco vigente y no procede abrir el proceso…'
                      : 'El estudio previo no sustenta la exigencia de experiencia específica…'
                }
                className={campo}
              />
              <p className="text-[11px] text-slate-500 m-0">
                {decision === 'APROBADO_CON_CONDICIONES'
                  ? 'Sin condiciones escritas es una aprobación a secas, y el expediente no puede decir a qué quedó sujeto el proceso.'
                  : decision === 'RECHAZADO'
                    ? 'A quien le rechazan un proceso no le queda ocasión de preguntar por qué corrigiendo: esto es todo lo que va a tener.'
                    : 'Sin ellas el proceso queda devuelto sin saber qué corregir.'}
              </p>
            </>
          )}

          {/* ------------------------------------ reabrir lo ya cerrado ---- */}
          {puedeReabrir && (
            <fieldset className="border-0 p-0 m-0">
              <legend className="block text-xs font-bold text-gray-600 p-0">
                {exigeNumerales ? (
                  <>
                    A qué actividades vuelve el proceso <span className="text-red-600">*</span>
                  </>
                ) : (
                  'Reabrir para validación (opcional)'
                )}
              </legend>
              <div className="mt-1.5 space-y-1.5">
                {estado.reabribles.map((numeral) => (
                  <label
                    key={numeral}
                    className="flex items-center gap-2 text-[11.5px] text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={numerales.includes(numeral)}
                      disabled={guardando}
                      onChange={() => alternar(numeral)}
                      className="w-3.5 h-3.5"
                    />
                    {NOMBRE_ACTIVIDAD[numeral] ?? numeral}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 m-0 mt-1.5">
                {exigeNumerales
                  ? 'Cada una se reabre para que quien la trabajó la corrija y la vuelva a enviar. Sin esto, las observaciones no tendrían dónde aplicarse: las actividades ya estaban aprobadas.'
                  : 'El proceso sigue su curso, pero las actividades que marques vuelven a manos de quien las trabajó para que las validen.'}
              </p>
            </fieldset>
          )}

          {/* Una aprobación que reabre algo tiene que decir qué validar: la
              actividad le llega a su responsable devuelta, y sin esto no sabría
              por qué. */}
          {pideValidacion && (
            <>
              <label htmlFor="comite-validacion" className="block text-xs font-bold text-gray-600">
                Qué hay que validar <span className="text-red-600">*</span>
              </label>
              <textarea
                id="comite-validacion"
                rows={2}
                value={validacion}
                disabled={guardando}
                onChange={(e) => setValidacion(e.target.value)}
                placeholder="Confirmar que el valor estimado del análisis del sector sigue vigente…"
                className={campo}
              />
            </>
          )}

          <SelectorArchivo
            id="comite-acta"
            etiqueta="Acta de la sesión"
            archivo={acta}
            onElegir={setActa}
            ayuda="Es lo único que prueba que el comité sesionó: sin ella, lo registrado es la palabra de quien lo escribe."
          />

          <div className="flex items-center gap-2">
            <Boton
              icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
              disabled={!completo || guardando}
              onClick={() =>
                firma.conFirma((firmaOtp) =>
                  hacer(
                    () =>
                      contratacionService.registrarSesionComite(
                        procesoId,
                        {
                          fecha,
                          decision,
                          ...(decision === 'APROBADO_CON_CONDICIONES'
                            ? { condiciones: texto.trim() }
                            : {}),
                          // Observar y rechazar guardan lo que el comité
                          // objetó; una aprobación que reabre algo guarda ahí
                          // mismo qué hay que validar.
                          ...(decision === 'OBSERVADO' || decision === 'RECHAZADO'
                            ? { observaciones: texto.trim() }
                            : pideValidacion
                              ? { observaciones: validacion.trim() }
                              : {}),
                          ...(marcados.length ? { numeralesReabrir: marcados } : {}),
                          firma: firmaOtp,
                        },
                        acta as File,
                      ),
                    decision === 'OBSERVADO'
                      ? 'Registrado: el comité devolvió los documentos'
                      : decision === 'RECHAZADO'
                        ? 'Registrado: el comité rechazó el proceso'
                        : 'Registrado lo que decidió el comité',
                  ),
                )
              }
            >
              Registrar la sesión
            </Boton>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setRegistrando(false)}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* A quien no le toca, o ya no hay nada que hacer, se le dice por qué. */}
      {!estado.puedeRegistrar && !estado.puedeDejarConstancia && !constancia && (
        <p className="text-[11.5px] text-slate-500 m-0">
          {negado
            ? 'El comité rechazó el proceso: la contratación terminó ahí.'
            : cerrado
            ? 'El comité ya se pronunció y la actividad quedó cerrada.'
            : estado.motivoNoDecide === 'SIN_ABOGADO'
              ? 'Nadie ha repartido este proceso todavía: se asigna abogado en la actividad 3.3.'
              : estado.motivoNoDecide === 'NO_ES_TUYO'
                ? `Lo transcribe ${estado.abogado?.nombre ?? 'el abogado del proceso'}.`
                : 'Lo transcribe el abogado al que se le asignó el proceso.'}
        </p>
      )}

      {/* El historial completo, que es lo que explica por qué un proceso pasó
          dos veces por comité. */}
      {estado.sesiones.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-gray-600 m-0">Sesiones anteriores</p>
          {estado.sesiones.slice(1).map((s) => (
            <p key={s.id} className="text-[11.5px] text-slate-600 m-0">
              {momento(s.fecha)} · {ROTULO[s.decision]}
              {s.observaciones ? ` — «${s.observaciones}»` : ''}
            </p>
          ))}
        </div>
      )}
      {firma.modal}
    </Marco>
  );
}
