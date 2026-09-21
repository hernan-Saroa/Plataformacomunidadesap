import React, { useEffect, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DecisionComite, EstadoComiteContratacion } from '../../types';
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

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const ROTULO: Record<DecisionComite, string> = {
  APROBADO: 'Aprobado',
  APROBADO_CON_CONDICIONES: 'Aprobado con condiciones',
  OBSERVADO: 'Observado',
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
  const [estado, setEstado] = useState<EstadoComiteContratacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [registrando, setRegistrando] = useState(false);
  const [fecha, setFecha] = useState('');
  const [decision, setDecision] = useState<DecisionComite>('APROBADO');
  const [texto, setTexto] = useState('');
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
  const cerrado = estado.estado === 'APROBADO';
  const constancia = estado.estado === 'NO_APLICA';
  // El texto que pide cada desenlace. Aprobar sin más no pide ninguno, y por
  // eso el campo desaparece en vez de quedarse vacío y opcional.
  const pideTexto = decision !== 'APROBADO';
  const completo = !!fecha && !!acta && (!pideTexto || texto.trim().length >= 10);

  return (
    <Marco>
      <Titulo>Comité de contratación</Titulo>
      <Ayuda>
        El comité revisa los documentos del proceso y puede aprobarlos, aprobarlos con condiciones o
        devolverlos con observaciones de fondo. Sesiona en la Dirección de Contratación: aquí se
        transcribe lo que decidió y se guarda el acta.
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
            observado ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Users
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                observado ? 'text-amber-900' : 'text-emerald-900'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-[13px] font-bold m-0 ${
                  observado ? 'text-amber-900' : 'text-emerald-900'
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
          </select>

          {pideTexto && (
            <>
              <label htmlFor="comite-texto" className="block text-xs font-bold text-gray-600">
                {decision === 'APROBADO_CON_CONDICIONES'
                  ? 'A qué queda condicionada la aprobación'
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
                    : 'El estudio previo no sustenta la exigencia de experiencia específica…'
                }
                className={campo}
              />
              <p className="text-[11px] text-slate-500 m-0">
                {decision === 'APROBADO_CON_CONDICIONES'
                  ? 'Sin condiciones escritas es una aprobación a secas, y el expediente no puede decir a qué quedó sujeto el proceso.'
                  : 'Sin ellas el proceso queda devuelto sin saber qué corregir.'}
              </p>
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
                        ...(decision === 'OBSERVADO' ? { observaciones: texto.trim() } : {}),
                      },
                      acta as File,
                    ),
                  decision === 'OBSERVADO'
                    ? 'Registrado: el comité devolvió los documentos'
                    : 'Registrado lo que decidió el comité',
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
          {cerrado
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
    </Marco>
  );
}
