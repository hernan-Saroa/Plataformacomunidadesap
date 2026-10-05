import React, { useEffect, useMemo, useState } from 'react';
import {
  Save,
  Send,
  Lock,
  FileText,
  RotateCcw,
  CircleCheck,
  MessageSquare,
  Ban,
  ClipboardCheck,
} from 'lucide-react';

import { useEstudioPrevio } from '../../hooks/useEstudioPrevio';
import { contratacionService } from '../../services/contratacionService';
import { CampoFormulario, RevisionEstudioPrevio } from '../../types';
import { CampoDinamico } from './CampoDinamico';
import { AlertaCamposFaltantes } from './AlertaCamposFaltantes';
import { VerSoportes } from '../shared/VerSoporte';
import { ListaDeDocumentos } from '../shared/ListaDeDocumentos';
import { RadicadoGestionDocumental } from './RadicadoGestionDocumental';
import { usarAprobacion } from '../shared/usarAprobacion';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
  /**
   * Lleva a la pantalla de revisión (reestructuración del flujo).
   *
   * Con ella, a quien le toca decidir se le ofrece ir a revisar en vez de
   * decidir aquí, sobre el formulario de quien redactó. Sin ella —donde
   * todavía no se llega por la revisión— la decisión se sigue tomando al pie.
   */
  onRevisar?: () => void;
}

/**
 * Contenido de la actividad 3.1 dentro de su desplegable.
 *
 * Todo ocurre aquí — campos, documentos y decisión de revisión — para que el
 * revisor no cambie de contexto: ve el contenido, sus soportes y decide sin
 * salir de la lista de actividades.
 */
/** La actividad que este panel resuelve. */
const NUMERAL = '3.1';

/** El área solicitante y su jefe: el segundo se elige entre la gente del primero. */
const CAMPO_AREA = 'area_solicitante';
const CAMPO_JEFE = 'responsable_area';

export function ContenidoEstudioPrevio({ procesoId, onCambio, onRevisar }: Props) {
  const {
    datos,
    valores,
    errores,
    faltantes,
    cargando,
    guardando,
    enviando,
    mensaje,
    cambiar,
    guardar,
    enviar,
    irACampo,
    cargar,
    documentoFaltante,
    documentosDeLaLista,
  } = useEstudioPrevio(procesoId);

  const [revisiones, setRevisiones] = useState<RevisionEstudioPrevio[]>([]);
  const [seccion, setSeccion] = useState<'campos' | 'documentos' | 'historial'>('campos');
  /**
   * Cuántos obligatorios de la lista faltan, estudio previo firmado incluido.
   *
   * Lo cuenta la lista y lo sube hasta aquí para que la pestaña lo avise: si
   * el número viviera solo dentro de ella, el área se enteraría de que le
   * falta el paquete al intentar enviar, que es tarde.
   */
  const [faltanDeLaLista, setFaltanDeLaLista] = useState(0);
  /** Para que la lista se relea cuando el formulario guarda o se decide. */
  const [tokenLista, setTokenLista] = useState(0);

  // Si alguien revisa esta actividad, para no llamar «aprobado» a lo que se
  // cerró sin que nadie decidiera.
  const revision = usarAprobacion(procesoId, NUMERAL);

  /*
   * Quien envía y quien aprueba firman por separado (EFDS-2070): la 3.1 es de
   * quien radica, la 3.4 de quien decide, y cada acción pide su propio token
   * solo si esa actividad quedó configurada para exigirlo.
   */
  const firmaEnvio = useFirma('3.1', 'Enviar el estudio previo a revisión');

  const cargarAnexos = () =>
    contratacionService
      .revisiones(procesoId)
      .then(setRevisiones)
      .catch(() => undefined);

  /**
   * Cuántos documentos de la lista faltan, antes de que nadie abra la pestaña.
   *
   * Si el número viviera solo dentro de la lista, el aviso no aparecería hasta
   * que alguien entrara a mirarla, y el área se enteraría de que le falta el
   * paquete al intentar enviar.
   */
  const contarLoQueFaltaDeLaLista = () =>
    contratacionService
      .documentosDeActividad(procesoId, NUMERAL)
      .then((l) => setFaltanDeLaLista(l.faltantes.length))
      .catch(() => undefined);

  useEffect(() => {
    cargarAnexos();
    contarLoQueFaltaDeLaLista();
  }, [procesoId]);

  /*
   * Al bloquearse el envío por un documento, se abre la pestaña de la lista:
   * el mensaje solo no basta si el usuario está viendo el formulario. Desde
   * EFDS-2066 el estudio previo firmado y el paquete son una sola lista.
   */
  useEffect(() => {
    if (documentoFaltante || documentosDeLaLista.length > 0) setSeccion('documentos');
  }, [documentoFaltante, documentosDeLaLista.length]);

  /** Campos agrupados por sección, en el orden de la configuración. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, CampoFormulario[]>();
    for (const campo of [...(datos?.definicionCampos ?? [])].sort((a, b) => a.orden - b.orden)) {
      const clave = campo.grupo ?? 'General';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(campo);
    }
    return Array.from(mapa.entries());
  }, [datos?.definicionCampos]);

  /**
   * El área solicitante que acota a quién se puede nombrar jefe del área.
   * `undefined` si la configuración no pide el área: entonces no hay con qué
   * filtrar y el selector ofrece a todos, como antes.
   */
  const pideArea = datos?.definicionCampos?.some((c) => c.codigo === CAMPO_AREA) ?? false;
  const areaElegida = pideArea ? String(valores[CAMPO_AREA] ?? '') : undefined;

  /** Cambiar el área deja sin jefe: el de antes pertenece a otra dependencia. */
  const cambiarCampo = (codigo: string, valor: any) => {
    cambiar(codigo, valor);
    if (codigo === CAMPO_AREA && valor !== valores[CAMPO_AREA] && valores[CAMPO_JEFE]) {
      cambiar(CAMPO_JEFE, '');
    }
  };

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (!datos) {
    return (
      <p className="text-xs text-red-600 m-0 px-4 py-3">
        {mensaje?.texto ?? 'No se pudo cargar el estudio previo'}
      </p>
    );
  }

  const enRevision = datos.estado === 'EN_REVISION';
  const aprobado = datos.estado === 'APROBADO';
  const negado = datos.estado === 'NEGADO';
  const bloqueado = enRevision || aprobado || negado;
  const ultimaDevolucion = revisiones.find((r) => r.decision === 'DEVUELTO');
  const laNegativa = revisiones.find((r) => r.decision === 'NEGADO');

  /**
   * Quién resuelve la 3.4, según el backend (EFDS-1183).
   *
   * Se cae del lado de no ofrecer la decisión cuando el dato no viene: un
   * servidor viejo que aún no lo manda no debe hacer que la pantalla prometa
   * algo que va a terminar en 403. Al revés que `tienePermiso`, donde la duda
   * es sobre la sesión y esconder dejaría el módulo en blanco; aquí la duda es
   * sobre un proceso concreto y el coste de equivocarse es un botón muerto.
   */
  const quienResuelve = datos.revision ?? null;
  const puedoDecidir = quienResuelve?.puedeDecidir === true;

  /** Por qué no le toca a quien mira, dicho como lo diría una persona. */
  const porQueNoDecido =
    quienResuelve?.motivo === 'SIN_ABOGADO'
      ? 'Nadie ha repartido este proceso todavía: se asigna abogado en la actividad 3.3.'
      : quienResuelve?.motivo === 'NO_ES_TUYO'
        ? `Lo revisa ${quienResuelve.abogado?.nombre ?? 'otro abogado'}.`
        : null;

  /**
   * Tras cargar o sustituir un documento de la lista.
   *
   * Se relee el formulario, no solo los anexos: conserva la versión que leyó
   * al abrirse, y guardar después con una versión vieja provocaría un
   * conflicto contra un cambio del propio usuario. La lista ya se releyó sola.
   */
  const trasCambiarDocumentos = async () => {
    await cargar();
    onCambio?.();
  };

  /** Por qué la lista no se puede tocar, dicho para quien la mira. */
  const motivoBloqueo = negado
    ? 'El proceso fue negado, así que no hay documentos por radicar'
    : aprobado
      ? 'El estudio previo ya fue aprobado y sus documentos no se pueden cambiar'
      : enRevision
        ? 'El estudio previo está en revisión. Si te lo devuelven, podrás cambiar los documentos'
        : null;

  return (
    // El padding va aquí y no en quien lo monta: el contenedor de la actividad
    // es una tarjeta a ras de borde, y sin esto los campos quedan pegados.
    <div className="space-y-4 p-4">
      <AlertaCamposFaltantes faltantes={faltantes} onIrACampo={irACampo} />

      {/* El motivo de la negativa, que es lo único que le queda al área: no
          puede corregir ni preguntar reenviando. */}
      {negado && laNegativa && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 flex items-start gap-2.5">
          <Ban className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-red-800 m-0">
              La contratación no procede
            </p>
            <p className="text-[12px] text-red-900 m-0 mt-0.5 leading-relaxed">
              {laNegativa.observaciones}
            </p>
            <p className="text-[11px] text-red-700 m-0 mt-1">
              Negado por {laNegativa.revisadoPor}
            </p>
          </div>
        </div>
      )}

      {/* Observaciones de la última devolución */}
      {datos.estado === 'BORRADOR' && ultimaDevolucion && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 flex items-start gap-2.5">
          <RotateCcw className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-amber-800 m-0">Devuelto para corrección</p>
            <p className="text-[12px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              {ultimaDevolucion.observaciones}
            </p>
            <p className="text-[10.5px] text-amber-700 m-0 mt-1 tabular-nums">
              {ultimaDevolucion.revisadoPor} ·{' '}
              {new Date(ultimaDevolucion.createdAt).toLocaleDateString('es-CO')}
            </p>
            <VerSoportes soportes={ultimaDevolucion.soportes} />
          </div>
        </div>
      )}

      {/* Pestañas: separan el diligenciamiento de sus soportes y su historial,
          que es lo que el revisor consulta sin querer editar nada. */}
      <div className="flex gap-1 border-b border-gray-200 -mb-px">
        {(
          [
            { id: 'campos' as const, label: 'Formulario', icono: FileText },
            {
              id: 'documentos' as const,
              label: 'Documentos',
              icono: ClipboardCheck,
              n: faltanDeLaLista,
              alerta: faltanDeLaLista > 0,
            },
            { id: 'historial' as const, label: 'Historial', icono: MessageSquare, n: revisiones.length },
          ]
        ).map((t) => {
          const Icono = t.icono;
          const activa = seccion === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSeccion(t.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] whitespace-nowrap
                transition-colors ${
                  activa
                    ? 'border-[#003DA5] text-[#003DA5] font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-700 font-bold'
                }`}
              style={{ borderBottomWidth: 2 }}
            >
              <Icono className="w-3 h-3" />
              {t.label}
              {t.n !== undefined && t.n > 0 && (
                <span
                  className={`text-[9.5px] font-bold px-1.5 rounded-full tabular-nums ${
                    /* En ámbar cuando el número es lo que falta y no lo que
                       hay: el mismo gris que el resto lo leería como progreso. */
                    'alerta' in t && t.alerta
                      ? 'bg-amber-100 text-amber-800'
                      : activa
                        ? 'bg-[#E0EDFF] text-[#003DA5]'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Campos por sección, dos columnas */}
      {seccion === 'campos' &&
        grupos.map(([grupo, campos]) => (
          <section key={grupo} aria-labelledby={`sec-${grupo}`}>
            <h4
              id={`sec-${grupo}`}
              className="text-[11.5px] font-black uppercase tracking-wide text-[#003DA5] m-0 mb-2.5
                pb-1.5 leading-relaxed border-b border-gray-200"
            >
              {grupo}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {campos.map((campo) => (
                <CampoDinamico
                  key={campo.codigo}
                  campo={campo}
                  valor={valores[campo.codigo]}
                  error={errores[campo.codigo]}
                  disabled={bloqueado}
                  dependencia={areaElegida}
                  onChange={(v) => cambiarCampo(campo.codigo, v)}
                />
              ))}
            </div>
          </section>
        ))}

      {/* Una sola lista (EFDS-2066): el estudio previo firmado —la fila de su
          formato, que el catálogo filtra por la modalidad del proceso— y lo
          que lo acompaña para radicar en la Dirección de Contratación. Qué
          lleva la lista lo decide Configuración, no esta pantalla. */}
      {seccion === 'documentos' && (
        <div className="space-y-3">
          <ListaDeDocumentos
            procesoId={procesoId}
            numeral={NUMERAL}
            recargarToken={tokenLista}
            titulo="Documentos para radicar"
            ayuda={
              <>
                Carga los documentos que la lista de chequeo de esta modalidad pide para radicar. Para
                enviar el proceso a la Dirección de Contratación, todos los obligatorios deben estar
                cargados.
              </>
            }
            bloqueo={motivoBloqueo}
            onFaltantes={setFaltanDeLaLista}
            onCambio={trasCambiarDocumentos}
          />

          <RadicadoGestionDocumental procesoId={procesoId} bloqueado={bloqueado} />
        </div>
      )}

      {/* Historial de revisión */}
      {seccion === 'historial' && (
        <section aria-label="Historial de revisión">
          {revisiones.length === 0 && (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
              <p className="text-[12px] font-bold text-gray-500 m-0">Sin revisiones</p>
              <p className="text-[11px] text-gray-400 m-0 mt-1">
                Aquí quedarán las aprobaciones y devoluciones del estudio previo.
              </p>
            </div>
          )}
          <ul className="m-0 p-0 list-none space-y-1.5">
            {revisiones.map((r) => {
              const ok = r.decision === 'APROBADO';
              return (
                <li key={r.id} className="flex items-start gap-2.5 px-1 py-1">
                  {ok ? (
                    <CircleCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[12px] font-bold m-0 ${
                        ok ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {ok ? 'Aprobado' : 'Devuelto'}
                      <span className="text-gray-400 font-semibold"> · versión {r.versionRevisada}</span>
                    </p>
                    {r.observaciones && (
                      <p className="text-[11.5px] text-gray-600 m-0 mt-0.5 leading-snug">
                        {r.observaciones}
                      </p>
                    )}
                    <VerSoportes soportes={r.soportes} />
                    <p className="text-[10px] text-gray-400 m-0 mt-0.5 tabular-nums">
                      {r.revisadoPor} · {new Date(r.createdAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-200">
        {aprobado ? (
          /* «Aprobado» solo donde alguien aprobó. Sin revisor configurado la
             actividad se cierra al enviarla, y decir que fue aprobada nombra
             una decisión que nadie tomó: la revisión del estudio previo la
             hace la 3.4, no esta actividad. */
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-700">
            <Lock className="w-3.5 h-3.5" />
            {revision.requiereAprobacion
              ? 'Aprobado · registrado en el expediente'
              : 'Terminado · registrado en el expediente'}
          </span>
        ) : negado ? (
          // Negar cierra el proceso: no hay corrección que esperar ni nada más
          // que ofrecer aquí.
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-red-700">
            <Ban className="w-3.5 h-3.5" />
            Negado · el proceso terminó
          </span>
        ) : enRevision ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-700">
              <Lock className="w-3.5 h-3.5" />
              {puedoDecidir ? 'Te toca resolverlo' : 'Pendiente de revisión'}
            </span>

            {/* A quien no le toca se le dice por qué, en vez de dejarle una
                franja vacía donde otros ven tres botones. */}
            {!puedoDecidir && porQueNoDecido && (
              <span className="text-[11.5px] text-slate-500">{porQueNoDecido}</span>
            )}

            <span className="flex-1" />

            {/* `puedoDecidir` ya incluye el permiso —`motivoParaNoDecidir`
                devuelve SIN_PERMISO cuando falta— y además exige ser el abogado
                al que se le repartió el proceso. Comprobar aquí el permiso
                suelto sería una condición más débil sobre lo mismo. */}
            {/* La decisión ya no se toma sobre el formulario de quien
                redactó: solo en la revisión, que enseña el estudio para
                leerlo y la decisión al lado. */}
            {puedoDecidir && onRevisar && (
              <button
                type="button"
                onClick={onRevisar}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold
                  rounded-md text-white bg-[#003DA5] shadow-sm active:scale-95 transition-all"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Abrir la revisión
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || enviando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold
                rounded-md bg-white text-slate-700 border border-slate-300
                hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>

            <span className="flex-1" />

            {mensaje && (
              <span
                className={`text-[11px] font-bold ${
                  mensaje.tipo === 'ok' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {mensaje.texto}
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                firmaEnvio.conFirma(async (firma) => {
                  await enviar(firma);
                  await cargarAnexos();
                  setTokenLista((t) => t + 1);
                  onCambio?.();
                })
              }
              disabled={guardando || enviando}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold
                rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm
                active:scale-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {enviando ? 'Enviando…' : 'Enviar a revisión'}
            </button>
          </>
        )}
      </div>


      {firmaEnvio.modal}
    </div>
  );
}
