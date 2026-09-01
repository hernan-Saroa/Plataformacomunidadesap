import React, { useState } from 'react';
import { CalendarClock, Check, FileCheck2, Gavel, Paperclip, Scale } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  AudienciaSancionatoria,
  CasoIncumplimiento,
  EstadoIncumplimiento,
  ResolucionSancionatoria,
  SentidoResolucion,
} from '../../types';
import { Aviso, Boton, BotonSecundario, campo, SelectorArchivo } from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momentoConHora } from '../shared/fechas';

interface Props {
  procesoId: string;
  caso: CasoIncumplimiento;
  onEstado: (estado: EstadoIncumplimiento) => void;
  onCambio?: () => void;
}

/** Cómo se nombra en pantalla lo que la resolución resuelve. */
const NOMBRE_SENTIDO: Record<SentidoResolucion, string> = {
  DECLARA_INCUMPLIMIENTO: 'Declara el incumplimiento',
  DECLARA_CADUCIDAD: 'Declara la caducidad del contrato',
  ARCHIVA: 'Archiva el caso',
};

const NOMBRE_ESTADO_AUDIENCIA: Record<AudienciaSancionatoria['estado'], string> = {
  CITADA: 'citada',
  CELEBRADA: 'celebrada',
  SUSPENDIDA: 'suspendida',
  CANCELADA: 'cancelada',
};

const VACIO_RESOLUCION = { numero: '', fechaExpedicion: hoyEnBogota() };
const VACIO_CITACION = { citadaPara: '', objeto: '' };
const VACIO_AUDIENCIA = { celebradaEl: hoyEnBogota(), resumen: '' };
const VACIO_NOTIFICACION = { notificadaEl: hoyEnBogota(), firmeEl: '' };

const pesos = (valor: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);

/**
 * Trámite sancionatorio del caso — RF-INC-02 (EFDS-1181).
 *
 * Va debajo del reporte y no en otra pantalla porque es el mismo caso visto
 * por el área jurídica: quien lo instruye necesita leer el hecho que se
 * reportó, y separarlos lo obligaría a saltar de una vista a otra para actuar
 * sobre lo que acaba de leer.
 *
 * **Lo que se puede hacer lo dice el servidor**, no esta pantalla: cada acción
 * llega con su `puede…` y con el motivo de lo que todavía no. Deducirlo aquí
 * terminaría ofreciendo un botón que el servidor rechaza, y en un
 * procedimiento sancionatorio eso es anunciarle a la entidad una decisión que
 * no puede tomar.
 */
export function TramiteSancionatorio({ procesoId, caso, onEstado, onCambio }: Props) {
  const { tramite } = caso;

  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [resolucion, setResolucion] = useState(VACIO_RESOLUCION);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [citacion, setCitacion] = useState(VACIO_CITACION);
  const [audiencia, setAudiencia] = useState(VACIO_AUDIENCIA);
  const [sentido, setSentido] = useState<SentidoResolucion>('DECLARA_INCUMPLIMIENTO');
  const [valorSancion, setValorSancion] = useState('');
  const [notificacion, setNotificacion] = useState(VACIO_NOTIFICACION);
  const [motivo, setMotivo] = useState('');

  const cerrar = () => {
    setAbierto(null);
    setResolucion(VACIO_RESOLUCION);
    setArchivo(null);
    setCitacion(VACIO_CITACION);
    setAudiencia(VACIO_AUDIENCIA);
    setValorSancion('');
    setNotificacion(VACIO_NOTIFICACION);
    setMotivo('');
  };

  const ejecutar = async (accion: () => Promise<EstadoIncumplimiento>, exito: string) => {
    setGuardando(true);
    try {
      onEstado(await accion());
      cerrar();
      toast.success(exito);
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const resolucionCompleta = resolucion.numero.trim().length > 0 && !!resolucion.fechaExpedicion;

  // La caducidad se ofrece solo si el contrato la admite: interrumpe una
  // ejecución, así que exige que haya ejecución que interrumpir.
  const puedeCaducar = !tramite.motivoNoCaducar;

  const decisiones = (
    [
      ['DECLARA_INCUMPLIMIENTO', tramite.puedeSancionar],
      ['DECLARA_CADUCIDAD', tramite.puedeSancionar && puedeCaducar],
      ['ARCHIVA', tramite.puedeArchivar],
    ] as Array<[SentidoResolucion, boolean]>
  )
    .filter(([, disponible]) => disponible)
    .map(([valor]) => valor);

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 m-0">
        Trámite sancionatorio
      </p>

      {/* ------------------------------------------------- lo ya actuado --- */}

      {tramite.resoluciones.map((r) => (
        <Resolucion
          key={r.id}
          resolucion={r}
          abierto={abierto}
          guardando={guardando}
          onAbrir={setAbierto}
          onCerrar={cerrar}
          notificacion={notificacion}
          onNotificacion={setNotificacion}
          motivo={motivo}
          onMotivo={setMotivo}
          onNotificar={() =>
            ejecutar(
              () =>
                contratacionService.notificarResolucion(procesoId, caso.id, r.id, {
                  notificadaEl: notificacion.notificadaEl,
                  firmeEl: notificacion.firmeEl || undefined,
                }),
              'Notificación registrada',
            )
          }
          onRevocar={() =>
            ejecutar(
              () => contratacionService.revocarResolucion(procesoId, caso.id, r.id, motivo.trim()),
              r.tipo === 'DECISION'
                ? 'Resolución revocada: el caso vuelve al trámite'
                : 'Apertura revocada: el caso vuelve a ser solo el reporte',
            )
          }
        />
      ))}

      {tramite.audiencias.map((a) => (
        <Audiencia
          key={a.id}
          audiencia={a}
          abierto={abierto}
          guardando={guardando}
          onAbrir={setAbierto}
          onCerrar={cerrar}
          datos={audiencia}
          onDatos={setAudiencia}
          archivo={archivo}
          onArchivo={setArchivo}
          motivo={motivo}
          onMotivo={setMotivo}
          onCelebrar={() =>
            ejecutar(
              () =>
                contratacionService.celebrarAudienciaSancionatoria(
                  procesoId,
                  caso.id,
                  a.id,
                  { celebradaEl: audiencia.celebradaEl, resumen: audiencia.resumen.trim() },
                  archivo as File,
                ),
              'Audiencia registrada: el contratista fue oído',
            )
          }
          onCerrarSinCelebrar={(desenlace) =>
            ejecutar(
              () =>
                contratacionService.cerrarAudienciaSinCelebrar(
                  procesoId,
                  caso.id,
                  a.id,
                  desenlace,
                  motivo.trim(),
                ),
              desenlace === 'suspender'
                ? 'Audiencia suspendida: se cita otra cuando corresponda'
                : 'Audiencia cancelada',
            )
          }
        />
      ))}

      {/* --------------------------------------------------- qué sigue --- */}

      <div className="flex flex-wrap items-center gap-2">
        {tramite.puedeAbrir && abierto !== 'abrir' ? (
          <BotonSecundario
            icono={<Scale className="w-3.5 h-3.5" />}
            onClick={() => setAbierto('abrir')}
          >
            Abrir el trámite
          </BotonSecundario>
        ) : null}

        {tramite.puedeCitar && abierto !== 'citar' ? (
          <BotonSecundario
            icono={<CalendarClock className="w-3.5 h-3.5" />}
            onClick={() => setAbierto('citar')}
          >
            Citar a audiencia
          </BotonSecundario>
        ) : null}

        {decisiones.length > 0 && abierto !== 'decidir' ? (
          <BotonSecundario
            icono={<Gavel className="w-3.5 h-3.5" />}
            onClick={() => {
              setSentido(decisiones[0]);
              setAbierto('decidir');
            }}
          >
            Decidir el caso
          </BotonSecundario>
        ) : null}
      </div>

      {/* Qué falta para lo que todavía no se puede, en vez de un botón apagado. */}
      {caso.estado === 'EN_TRAMITE' && !tramite.puedeSancionar ? (
        <p className="text-[10.5px] text-slate-500 m-0">
          Para declarar el incumplimiento o la caducidad: {tramite.motivoNoSancionar}.
        </p>
      ) : null}

      {caso.estado === 'EN_TRAMITE' && tramite.puedeSancionar && !puedeCaducar ? (
        <p className="text-[10.5px] text-slate-500 m-0">
          La caducidad no se ofrece: {tramite.motivoNoCaducar}.
        </p>
      ) : null}

      {caso.estado === 'EN_TRAMITE' && !tramite.puedeCitar && tramite.motivoNoCitar ? (
        <p className="text-[10.5px] text-slate-500 m-0">
          Para citar otra audiencia: {tramite.motivoNoCitar}.
        </p>
      ) : null}

      {/* ------------------------------------------------- formularios --- */}

      {abierto === 'abrir' ? (
        <Formulario
          titulo="Resolución de apertura"
          ayuda="Es lo que convierte el reporte en un procedimiento: hasta aquí hay un hecho observado, y desde aquí una entidad que decidió examinarlo."
          guardando={guardando}
          completo={resolucionCompleta && !!archivo}
          etiquetaAccion="Abrir el trámite"
          onCancelar={cerrar}
          onAceptar={() =>
            ejecutar(
              () =>
                contratacionService.abrirTramite(
                  procesoId,
                  caso.id,
                  { numero: resolucion.numero.trim(), fechaExpedicion: resolucion.fechaExpedicion },
                  archivo as File,
                ),
              'Trámite abierto: el caso pasa a instruirse',
            )
          }
        >
          <CamposResolucion datos={resolucion} onDatos={setResolucion} prefijo="apertura" />

          <SelectorArchivo
            id="apertura-archivo"
            etiqueta="Resolución"
            ayuda="Una resolución es el documento: sin él el expediente afirmaría que la entidad resolvió algo que no puede mostrar."
            archivo={archivo}
            onElegir={setArchivo}
          />
        </Formulario>
      ) : null}

      {abierto === 'citar' ? (
        <Formulario
          titulo="Citación a audiencia"
          ayuda="Es lo único de este módulo que mira hacia adelante: se cita para una fecha y una hora que todavía no llegan."
          guardando={guardando}
          completo={!!citacion.citadaPara && !!archivo}
          etiquetaAccion="Citar la audiencia"
          onCancelar={cerrar}
          onAceptar={() =>
            ejecutar(
              () =>
                contratacionService.citarAudienciaSancionatoria(
                  procesoId,
                  caso.id,
                  { citadaPara: citacion.citadaPara, objeto: citacion.objeto.trim() || undefined },
                  archivo as File,
                ),
              'Audiencia citada',
            )
          }
        >
          <div>
            <label htmlFor="citacion-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha y hora de la audiencia <span className="text-red-600">*</span>
            </label>
            <input
              id="citacion-fecha"
              type="datetime-local"
              value={citacion.citadaPara}
              onChange={(e) => setCitacion((p) => ({ ...p, citadaPara: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="citacion-objeto"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Para qué se cita
            </label>
            <textarea
              id="citacion-objeto"
              rows={2}
              value={citacion.objeto}
              onChange={(e) => setCitacion((p) => ({ ...p, objeto: e.target.value }))}
              placeholder="Opcional, cuando convenga precisarlo"
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="citacion-archivo"
            etiqueta="Acto que cita"
            ayuda="A una audiencia se convoca por escrito: sin el documento no habría cómo probar que se llamó al contratista a defenderse."
            archivo={archivo}
            onElegir={setArchivo}
          />
        </Formulario>
      ) : null}

      {abierto === 'decidir' ? (
        <Formulario
          titulo="Resolución que decide"
          ayuda="La caducidad termina el contrato; declarar el incumplimiento puede imponer multa o cláusula penal y la ejecución sigue."
          guardando={guardando}
          completo={resolucionCompleta && !!archivo}
          etiquetaAccion="Expedir la resolución"
          onCancelar={cerrar}
          onAceptar={() =>
            ejecutar(
              () =>
                contratacionService.decidirCaso(
                  procesoId,
                  caso.id,
                  {
                    numero: resolucion.numero.trim(),
                    fechaExpedicion: resolucion.fechaExpedicion,
                    sentido,
                    valorSancion:
                      sentido === 'ARCHIVA' || !valorSancion ? undefined : Number(valorSancion),
                  },
                  archivo as File,
                ),
              `Caso resuelto: ${NOMBRE_SENTIDO[sentido].toLowerCase()}`,
            )
          }
        >
          <div>
            <label
              htmlFor="decision-sentido"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Qué resuelve <span className="text-red-600">*</span>
            </label>
            <select
              id="decision-sentido"
              value={sentido}
              onChange={(e) => setSentido(e.target.value as SentidoResolucion)}
              className={campo}
            >
              {decisiones.map((valor) => (
                <option key={valor} value={valor}>
                  {NOMBRE_SENTIDO[valor]}
                </option>
              ))}
            </select>
          </div>

          {sentido === 'DECLARA_CADUCIDAD' ? (
            <Aviso tono="aviso" titulo="La caducidad termina el contrato">
              Queda como causal contractual y la ejecución se interrumpe. Si la resolución se
              revoca, el contrato vuelve al estado en que estaba.
            </Aviso>
          ) : null}

          {sentido !== 'ARCHIVA' ? (
            <div>
              <label
                htmlFor="decision-valor"
                className="block text-xs font-bold text-gray-600 mb-1.5"
              >
                Multa o cláusula penal
              </label>
              <input
                id="decision-valor"
                type="number"
                min={0}
                value={valorSancion}
                onChange={(e) => setValorSancion(e.target.value)}
                className={campo}
              />
              <p className="text-[10.5px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
                Opcional: un incumplimiento puede declararse sin sanción en dinero.
              </p>
            </div>
          ) : null}

          <CamposResolucion datos={resolucion} onDatos={setResolucion} prefijo="decision" />

          <SelectorArchivo
            id="decision-archivo"
            etiqueta="Resolución"
            ayuda="El acto administrativo que resuelve el caso."
            archivo={archivo}
            onElegir={setArchivo}
          />
        </Formulario>
      ) : null}
    </div>
  );
}

/** El número y la fecha, que son iguales en las dos resoluciones. */
function CamposResolucion({
  datos,
  onDatos,
  prefijo,
}: {
  datos: { numero: string; fechaExpedicion: string };
  onDatos: React.Dispatch<React.SetStateAction<{ numero: string; fechaExpedicion: string }>>;
  prefijo: string;
}) {
  return (
    <>
      <div>
        <label
          htmlFor={`${prefijo}-numero`}
          className="block text-xs font-bold text-gray-600 mb-1.5"
        >
          Número de la resolución <span className="text-red-600">*</span>
        </label>
        <input
          id={`${prefijo}-numero`}
          type="text"
          value={datos.numero}
          onChange={(e) => onDatos((p) => ({ ...p, numero: e.target.value }))}
          className={campo}
        />
      </div>

      <div>
        <label htmlFor={`${prefijo}-fecha`} className="block text-xs font-bold text-gray-600 mb-1.5">
          Fecha de expedición <span className="text-red-600">*</span>
        </label>
        <input
          id={`${prefijo}-fecha`}
          type="date"
          value={datos.fechaExpedicion}
          // La resolución ya se expidió: aquí se transcribe, no se anticipa.
          max={hoyEnBogota()}
          onChange={(e) => onDatos((p) => ({ ...p, fechaExpedicion: e.target.value }))}
          className={campo}
        />
      </div>
    </>
  );
}

/** El marco común de los tres formularios con documento. */
function Formulario({
  titulo,
  ayuda,
  children,
  completo,
  guardando,
  etiquetaAccion,
  onAceptar,
  onCancelar,
}: {
  titulo: string;
  ayuda: string;
  children: React.ReactNode;
  completo: boolean;
  guardando: boolean;
  etiquetaAccion: string;
  onAceptar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
      <div>
        <p className="text-[12.5px] font-bold text-slate-800 m-0">{titulo}</p>
        <p className="text-[10.5px] text-slate-500 m-0 mt-0.5 leading-relaxed">{ayuda}</p>
      </div>

      {children}

      <Acciones
        etiqueta={etiquetaAccion}
        completo={completo}
        guardando={guardando}
        onAceptar={onAceptar}
        onCancelar={onCancelar}
      />
    </div>
  );
}

/** Un acto administrativo del trámite, con lo que se puede hacer sobre él. */
function Resolucion({
  resolucion,
  abierto,
  guardando,
  onAbrir,
  onCerrar,
  notificacion,
  onNotificacion,
  motivo,
  onMotivo,
  onNotificar,
  onRevocar,
}: {
  resolucion: ResolucionSancionatoria;
  abierto: string | null;
  guardando: boolean;
  onAbrir: (clave: string) => void;
  onCerrar: () => void;
  notificacion: { notificadaEl: string; firmeEl: string };
  onNotificacion: React.Dispatch<React.SetStateAction<{ notificadaEl: string; firmeEl: string }>>;
  motivo: string;
  onMotivo: (motivo: string) => void;
  onNotificar: () => void;
  onRevocar: () => void;
}) {
  const revocada = !!resolucion.revocadaAt;

  return (
    <div className={`pl-3 border-l-2 border-gray-200 ${revocada ? 'opacity-60' : ''}`}>
      <p className="text-[11.5px] font-bold text-slate-700 m-0 flex items-start gap-1.5">
        <FileCheck2 className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
        {resolucion.tipo === 'APERTURA' ? 'Apertura' : 'Decisión'} · Resolución {resolucion.numero}{' '}
        del {fechaLarga(resolucion.fechaExpedicion)}
      </p>

      {resolucion.sentido ? (
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">
          {NOMBRE_SENTIDO[resolucion.sentido]}
          {resolucion.valorSancion ? ` · ${pesos(resolucion.valorSancion)}` : ''}
        </p>
      ) : null}

      <p className="text-[10.5px] text-slate-500 m-0 mt-0.5">
        {resolucion.notificadaEl
          ? `Notificada el ${fechaLarga(resolucion.notificadaEl)}`
          : 'Sin notificar'}
        {resolucion.firmeEl ? ` · en firme el ${fechaLarga(resolucion.firmeEl)}` : ''}
        {resolucion.expedidaPor ? ` · expedida por ${resolucion.expedidaPor}` : ''}
      </p>

      {revocada ? (
        <p className="text-[10.5px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
          Revocada{resolucion.revocadaPor ? ` por ${resolucion.revocadaPor}` : ''}:{' '}
          {resolucion.motivoRevocacion}
        </p>
      ) : null}

      {resolucion.documento?.url ? (
        <a
          href={contratacionService.urlDescarga(resolucion.documento.url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-1 text-[11.5px] font-bold text-[#003DA5] hover:underline"
        >
          <Paperclip className="w-3 h-3" />
          {resolucion.documento.nombre}
        </a>
      ) : null}

      {!revocada && !abierto?.endsWith(resolucion.id) ? (
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <button
            type="button"
            onClick={() => onAbrir(`notificar:${resolucion.id}`)}
            className="text-[10.5px] font-bold text-[#003DA5] hover:underline"
          >
            {resolucion.notificadaEl ? 'Corregir la notificación' : 'Registrar la notificación'}
          </button>
          <button
            type="button"
            onClick={() => onAbrir(`revocar:${resolucion.id}`)}
            className="text-[10.5px] font-bold text-slate-500 hover:text-slate-700"
          >
            Revocar
          </button>
        </div>
      ) : null}

      {abierto === `notificar:${resolucion.id}` ? (
        <div className="mt-2 space-y-2.5">
          <div>
            <label
              htmlFor={`notif-fecha-${resolucion.id}`}
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Fecha de la notificación <span className="text-red-600">*</span>
            </label>
            <input
              id={`notif-fecha-${resolucion.id}`}
              type="date"
              value={notificacion.notificadaEl}
              max={hoyEnBogota()}
              onChange={(e) => onNotificacion((p) => ({ ...p, notificadaEl: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor={`notif-firme-${resolucion.id}`}
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              En firme desde
            </label>
            <input
              id={`notif-firme-${resolucion.id}`}
              type="date"
              value={notificacion.firmeEl}
              max={hoyEnBogota()}
              onChange={(e) => onNotificacion((p) => ({ ...p, firmeEl: e.target.value }))}
              className={campo}
            />
            {/* Aquí no se cuentan términos: ninguna fuente del proyecto dice
                cuántos días corren entre notificar y quedar en firme, y la
                historia lo deja anotado como dependencia por validar. */}
            <p className="text-[10.5px] text-gray-500 mt-1.5 mb-0 leading-relaxed">
              Se deja en blanco mientras la resolución no esté en firme.
            </p>
          </div>

          <Acciones
            etiqueta="Registrar"
            completo={!!notificacion.notificadaEl}
            guardando={guardando}
            onAceptar={onNotificar}
            onCancelar={onCerrar}
          />
        </div>
      ) : null}

      {abierto === `revocar:${resolucion.id}` ? (
        <div className="mt-2 space-y-2.5">
          <Aviso tono="aviso" titulo="Revocar deshace lo que la resolución hizo">
            {resolucion.tipo === 'DECISION'
              ? 'El caso vuelve al trámite y, si declaraba la caducidad, el contrato vuelve a donde estaba.'
              : 'Sin acto que lo abra no hay procedimiento: el caso vuelve a ser solo el reporte.'}{' '}
            La resolución no se borra: queda en el expediente con su motivo.
          </Aviso>

          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => onMotivo(e.target.value)}
            placeholder="Por qué se revoca"
            className={campo}
          />

          <Acciones
            etiqueta="Revocar"
            completo={motivo.trim().length >= 10}
            guardando={guardando}
            onAceptar={onRevocar}
            onCancelar={onCerrar}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Una audiencia del trámite, con lo que queda por registrar de ella. */
function Audiencia({
  audiencia,
  abierto,
  guardando,
  onAbrir,
  onCerrar,
  datos,
  onDatos,
  archivo,
  onArchivo,
  motivo,
  onMotivo,
  onCelebrar,
  onCerrarSinCelebrar,
}: {
  audiencia: AudienciaSancionatoria;
  abierto: string | null;
  guardando: boolean;
  onAbrir: (clave: string) => void;
  onCerrar: () => void;
  datos: { celebradaEl: string; resumen: string };
  onDatos: React.Dispatch<React.SetStateAction<{ celebradaEl: string; resumen: string }>>;
  archivo: File | null;
  onArchivo: (archivo: File | null) => void;
  motivo: string;
  onMotivo: (motivo: string) => void;
  onCelebrar: () => void;
  onCerrarSinCelebrar: (desenlace: 'suspender' | 'cancelar') => void;
}) {
  const sinCelebrar = abierto === `suspender:${audiencia.id}` || abierto === `cancelar:${audiencia.id}`;

  return (
    <div className="pl-3 border-l-2 border-gray-200">
      <p className="text-[11.5px] font-bold text-slate-700 m-0 flex items-start gap-1.5">
        <CalendarClock className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
        Audiencia {NOMBRE_ESTADO_AUDIENCIA[audiencia.estado]} para el{' '}
        {momentoConHora(audiencia.citadaPara)}
      </p>

      {audiencia.objeto ? (
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
          {audiencia.objeto}
        </p>
      ) : null}

      {audiencia.estado === 'CELEBRADA' ? (
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
          Celebrada el {audiencia.celebradaEl ? fechaLarga(audiencia.celebradaEl) : '—'}:{' '}
          {audiencia.resumen}
        </p>
      ) : null}

      {audiencia.motivo ? (
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
          {audiencia.motivo}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mt-1">
        {audiencia.citacion?.url ? (
          <a
            href={contratacionService.urlDescarga(audiencia.citacion.url)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
          >
            <Paperclip className="w-3 h-3" />
            Citación
          </a>
        ) : null}

        {audiencia.acta?.url ? (
          <a
            href={contratacionService.urlDescarga(audiencia.acta.url)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
          >
            <Paperclip className="w-3 h-3" />
            Acta
          </a>
        ) : null}
      </div>

      {audiencia.estado === 'CITADA' && !abierto?.endsWith(audiencia.id) ? (
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <button
            type="button"
            onClick={() => onAbrir(`celebrar:${audiencia.id}`)}
            className="text-[10.5px] font-bold text-[#003DA5] hover:underline"
          >
            Registrar lo que pasó
          </button>
          <button
            type="button"
            onClick={() => onAbrir(`suspender:${audiencia.id}`)}
            className="text-[10.5px] font-bold text-slate-500 hover:text-slate-700"
          >
            Suspenderla
          </button>
          <button
            type="button"
            onClick={() => onAbrir(`cancelar:${audiencia.id}`)}
            className="text-[10.5px] font-bold text-slate-500 hover:text-slate-700"
          >
            Cancelarla
          </button>
        </div>
      ) : null}

      {abierto === `celebrar:${audiencia.id}` ? (
        <div className="mt-2 space-y-2.5">
          <div>
            <label
              htmlFor={`aud-fecha-${audiencia.id}`}
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Fecha en que se celebró <span className="text-red-600">*</span>
            </label>
            <input
              id={`aud-fecha-${audiencia.id}`}
              type="date"
              value={datos.celebradaEl}
              max={hoyEnBogota()}
              onChange={(e) => onDatos((p) => ({ ...p, celebradaEl: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor={`aud-resumen-${audiencia.id}`}
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Qué pasó en la audiencia <span className="text-red-600">*</span>
            </label>
            <textarea
              id={`aud-resumen-${audiencia.id}`}
              rows={3}
              value={datos.resumen}
              onChange={(e) => onDatos((p) => ({ ...p, resumen: e.target.value }))}
              placeholder="Es lo que la decisión posterior tiene que poder citar"
              className={campo}
            />
          </div>

          <SelectorArchivo
            id={`aud-acta-${audiencia.id}`}
            etiqueta="Acta"
            ayuda="Es la prueba de que el contratista fue oído: sin ella la decisión se apoyaría en una audiencia que el expediente no puede mostrar."
            archivo={archivo}
            onElegir={onArchivo}
          />

          <Acciones
            etiqueta="Registrar la audiencia"
            completo={!!datos.celebradaEl && datos.resumen.trim().length >= 10 && !!archivo}
            guardando={guardando}
            onAceptar={onCelebrar}
            onCancelar={onCerrar}
          />
        </div>
      ) : null}

      {sinCelebrar ? (
        <div className="mt-2 space-y-2.5">
          {/* Una audiencia que no se celebró y no dice por qué es lo primero
              que pregunta un ente de control: de ella depende que el
              contratista hubiera podido defenderse. */}
          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => onMotivo(e.target.value)}
            placeholder="Por qué no se celebró"
            className={campo}
          />

          <Acciones
            etiqueta={abierto?.startsWith('suspender') ? 'Suspenderla' : 'Cancelarla'}
            completo={motivo.trim().length >= 10}
            guardando={guardando}
            onAceptar={() =>
              onCerrarSinCelebrar(abierto?.startsWith('suspender') ? 'suspender' : 'cancelar')
            }
            onCancelar={onCerrar}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Los dos botones que cierran cualquiera de los formularios. */
function Acciones({
  etiqueta,
  completo,
  guardando,
  onAceptar,
  onCancelar,
}: {
  etiqueta: string;
  completo: boolean;
  guardando: boolean;
  onAceptar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Boton
        icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
        disabled={!completo || guardando}
        onClick={onAceptar}
      >
        {guardando ? 'Guardando…' : etiqueta}
      </Boton>
      <button
        type="button"
        onClick={onCancelar}
        className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
      >
        Cancelar
      </button>
    </div>
  );
}
