import React, { useEffect, useState } from 'react';
import { Check, History, Inbox, Scale, Undo2, UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CuentaCandidata, EstadoParticipacion } from '../../types';
import { Aviso, Ayuda, Boton, BotonSecundario, Marco, Titulo, campo } from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  /** Para que el riel y el listado se enteren de que cambió de manos. */
  onCambio?: () => void;
}

/**
 * A quién se le puede dar el papel de abogado.
 *
 * Un `select` y no el buscador de personas del estudio previo: aquél consulta
 * el directorio entero —miles de filas— y devuelve el `id_person`, mientras que
 * aquí hay que elegir una *cuenta* con permiso para aprobar, que son unas
 * pocas. Nombrar a una persona sin cuenta dejaría el proceso a cargo de alguien
 * que no puede abrirlo.
 */
function SelectorAbogado({
  id,
  valor,
  onElegir,
  excluir,
  disabled,
}: {
  id: string;
  valor: string;
  onElegir: (usuarioId: string) => void;
  excluir?: string | null;
  disabled?: boolean;
}) {
  const [abogados, setAbogados] = useState<CuentaCandidata[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contratacionService
      .abogados()
      .then(setAbogados)
      .catch((err: any) => setError(err.message));
  }, []);

  const opciones = abogados.filter((a) => a.usuarioId !== excluir);

  if (error) {
    return (
      <p role="alert" className="text-[11.5px] font-bold text-red-600 m-0">
        No se pudo cargar la lista de abogados: {error}
      </p>
    );
  }

  return (
    <>
      <select
        id={id}
        value={valor}
        disabled={disabled}
        onChange={(e) => onElegir(e.target.value)}
        className={campo}
      >
        <option value="">Elige quién lo revisa…</option>
        {opciones.map((a) => (
          <option key={a.usuarioId} value={a.usuarioId}>
            {a.nombre} · {a.usuarioNombre}
          </option>
        ))}
      </select>

      {abogados.length > 0 && opciones.length === 0 && (
        // Un desplegable vacío sin explicación deja sin saber si la consulta
        // falló o si de verdad no hay nadie más a quien pasárselo.
        <p className="text-[11.5px] text-slate-500 m-0 mt-1.5">
          No hay otra cuenta con permiso para revisar procesos.
        </p>
      )}
    </>
  );
}

/**
 * Actividad 3.3 · Radicación en la Dirección de Contratación (EFDS-1183).
 *
 * Hasta ahora esta actividad era el panel genérico de constancia —fecha,
 * documento y observaciones— y no hacía nada de lo que su nombre dice. Radicar
 * es recibir el proceso y ponerle responsable.
 *
 * Dos actos con reglas distintas: **tomar** no lo autoriza nadie, la bandeja es
 * compartida y quien llega primero se queda con el proceso; **repartir** el
 * abogado lo hace quien lo tomó, y de ahí sale quién resuelve la 3.4.
 */
export function PanelRadicacion({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoParticipacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [repartiendo, setRepartiendo] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [elegido, setElegido] = useState('');
  const [motivo, setMotivo] = useState('');
  const [historialAbierto, setHistorialAbierto] = useState(false);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .participacion(procesoId)
      .then((r) => {
        setEstado(r);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, [procesoId]);

  const limpiar = () => {
    setElegido('');
    setMotivo('');
    setRepartiendo(false);
    setQuitando(false);
  };

  const hacer = async (accion: () => Promise<EstadoParticipacion>, exito: string) => {
    setGuardando(true);
    try {
      setEstado(await accion());
      limpiar();
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la radicación…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la radicación">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const { contratacion, abogado, puedeTomar, puedeRepartir, sinAbogado, historial } = estado;
  const motivoValido = motivo.trim().length >= 10;

  return (
    <Marco>
      <Titulo>Radicación en la Dirección</Titulo>
      {/* La ayuda dice qué hacer ahora, no cómo funciona por dentro. La primera
          versión hablaba de «la bandeja» y de «repartir el abogado» —palabras
          nuestras, no del área— y de «la 3.4», que a quien mira la pantalla no
          le dice nada. */}
      <Ayuda>
        {contratacion
          ? 'El área ya entregó este proceso y la Dirección lo recibió. Elige el abogado que revisará el estudio previo.'
          : 'El área solicitante entregó este proceso y todavía no lo lleva nadie. Cualquiera de la Dirección puede hacerse cargo; el primero que lo haga se lo queda.'}
      </Ayuda>

      {/* ------------------------------------------------ quién lo recibió -- */}
      {contratacion ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <Inbox className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-emerald-900 m-0 break-words">
                {contratacion.nombre}
                {contratacion.esMio ? ' · estás a cargo' : ''}
              </p>
              <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
Se hizo cargo el {momento(contratacion.asignadoAt)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <Aviso tono="aviso" titulo="Todavía no lo lleva nadie">
          {puedeTomar
            ? 'Hazte cargo para poder trabajarlo y elegir quién lo revisa.'
            : 'Está esperando a que alguien de la Dirección de Contratación se haga cargo.'}
        </Aviso>
      )}

      {puedeTomar && (
        <Boton
          icono={<Inbox className="w-3.5 h-3.5" />}
          disabled={guardando}
          onClick={() =>
            hacer(
              () => contratacionService.tomarProceso(procesoId),
              'Ya estás a cargo. Ahora elige quién lo revisa.',
            )
          }
        >
          Hacerme cargo
        </Boton>
      )}

      {/* ------------------------------------------------------ el abogado -- */}
      {contratacion && (
        <>
          {abogado ? (
            <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <Scale className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-slate-800 m-0 break-words">
                    {abogado.nombre}
                    {abogado.esMio ? ' · te toca revisarlo a ti' : ''}
                  </p>
                  <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                    Revisa el estudio previo · desde el {momento(abogado.asignadoAt)}
                    {abogado.asignadoPor ? ` por ${abogado.asignadoPor}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Un proceso recibido y sin abogado no avanza: la 3.4 no la puede
            // resolver nadie hasta que se reparta.
            <Aviso tono="aviso" titulo="Falta elegir el abogado">
              {sinAbogado
                ? 'Se quitó al anterior y no se ha puesto otro. El estudio previo no se puede aprobar ni devolver mientras tanto.'
                : 'Hasta que no elijas quién lo revisa, el estudio previo no se puede aprobar ni devolver.'}
            </Aviso>
          )}

          {puedeRepartir && !repartiendo && !quitando && (
            <div className="flex items-center gap-2 flex-wrap">
              <Boton icono={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setRepartiendo(true)}>
                {abogado ? 'Cambiar de abogado' : 'Elegir abogado'}
              </Boton>
              {abogado && (
                <BotonSecundario
                  icono={<UserMinus className="w-3.5 h-3.5" />}
                  disabled={guardando}
                  onClick={() => setQuitando(true)}
                >
                  Dejarlo sin abogado
                </BotonSecundario>
              )}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------- repartir -- */}
      {repartiendo && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3">
          <label htmlFor="rad-abogado" className="block text-xs font-bold text-gray-600">
            {abogado ? 'Nuevo abogado' : 'Abogado que revisará el estudio previo'}{' '}
            <span className="text-red-600">*</span>
          </label>
          <SelectorAbogado
            id="rad-abogado"
            valor={elegido}
            onElegir={setElegido}
            excluir={abogado?.usuarioId ?? null}
            disabled={guardando}
          />

          {abogado && (
            <div>
              <label htmlFor="rad-motivo" className="block text-xs font-bold text-gray-600 mb-1.5">
                Por qué cambia de manos <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rad-motivo"
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Traslado, reparto de carga, vacaciones…"
                className={campo}
              />
              {motivo.trim() && !motivoValido && (
                <p className="text-[11px] text-amber-700 m-0 mt-1">
                  El motivo debe explicar el cambio, no una palabra suelta.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Boton
              icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
              disabled={!elegido || guardando || (!!abogado && !motivoValido)}
              onClick={() =>
                hacer(
                  () =>
                    abogado
                      ? contratacionService.reasignarAbogado(procesoId, elegido, motivo.trim())
                      : contratacionService.asignarAbogado(procesoId, elegido),
                  abogado ? 'El proceso cambió de abogado' : 'Listo: ya tiene quien lo revise',
                )
              }
            >
              {abogado ? 'Reasignar' : 'Asignar'}
            </Boton>
            <button
              type="button"
              disabled={guardando}
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ quitar -- */}
      {quitando && abogado && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            Quitar a {abogado.nombre} sin poner otro
          </p>
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
El estudio previo no se podrá aprobar ni devolver hasta que elijas a otro, y el
            proceso saldrá en las alertas. Lo normal es cambiarlo por otro en el mismo acto.
          </p>
          <div>
            <label htmlFor="rad-quitar" className="block text-xs font-bold text-gray-600 mb-1.5">
              Por qué se queda sin abogado <span className="text-red-600">*</span>
            </label>
            <textarea
              id="rad-quitar"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Salió de la entidad, el reparto estaba mal…"
              className={campo}
            />
          </div>
          <div className="flex items-center gap-2">
            <BotonSecundario
              icono={<UserMinus className="w-3.5 h-3.5" />}
              disabled={!motivoValido || guardando}
              onClick={() =>
                hacer(
                  () => contratacionService.quitarAbogado(procesoId, motivo.trim()),
                  'El proceso quedó sin abogado y pendiente de reasignar',
                )
              }
            >
              Quitar
            </BotonSecundario>
            <button
              type="button"
              disabled={guardando}
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- historial -- */}
      {historial.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setHistorialAbierto((v) => !v)}
            aria-expanded={historialAbierto}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500 hover:text-[#003DA5]"
          >
            <History className="w-3.5 h-3.5" />
            {historialAbierto ? 'Ocultar' : 'Ver'} quiénes lo llevaron antes ({historial.length})
          </button>

          {historialAbierto && (
            <ul className="mt-2 m-0 p-0 list-none space-y-2">
              {historial.map((h, i) => (
                <li
                  key={`${h.papel}-${h.relevadoAt ?? i}`}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <p className="text-[12px] font-bold text-slate-700 m-0 break-words">
                    {h.nombre}
                    <span className="font-normal text-slate-400">
                      {' · '}
                      {h.papel === 'ABOGADO' ? 'abogado' : 'contratación'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                    Del {momento(h.asignadoAt)}
                    {h.relevadoAt ? ` al ${momento(h.relevadoAt)}` : ''}
                    {h.relevadoPor ? ` · relevado por ${h.relevadoPor}` : ''}
                  </p>
                  {h.motivoRelevo && (
                    <p className="text-[11px] text-slate-600 m-0 mt-1 leading-relaxed break-words">
                      «{h.motivoRelevo}»
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* La 3.3 dejaba constancia con fecha y documento, y no hacía nada de lo
          que su nombre dice. Se avisa una vez, para quien conocía la anterior. */}
      {!contratacion && !puedeTomar && (
        <p className="text-[11px] text-slate-400 m-0">
          Esta actividad ya no se cumple registrando una fecha: se cumple cuando alguien de la
          Dirección se hace cargo del proceso.
        </p>
      )}
    </Marco>
  );
}
