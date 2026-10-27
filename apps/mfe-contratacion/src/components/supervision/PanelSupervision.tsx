import React, { useEffect, useState } from 'react';
import { BellRing, Check, Eye, Mail, Paperclip, Send, Undo2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  CandidatoAPuesto,
  DatosReasignacion,
  DatosSupervisor,
  EstadoSupervision,
  EvidenciaFirmaOtp,
  ResultadoCorreoSupervisor,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  SelectorArchivo,
  Titulo,
} from '../shared/PiezasPanel';
import { ElegirSoportes } from '../shared/ElegirSoportes';
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';
import { useFirma } from '../shared/useFirma';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const NUMERAL_SUPERVISOR = '8.2';
const NUMERAL_REASIGNACION = '9.3';

/** Lo que admite el correo al supervisor: el acto es ofimático; los documentos, también imágenes. */
const FORMATOS_CORREO = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';

/**
 * Lo que se le dice a quien designa sobre el correo (124): si salió, a quién,
 * y lo que no cupo; si no, por qué y qué hacer.
 */
function avisarDelCorreo(correo: ResultadoCorreoSupervisor | undefined, hecho: string) {
  if (!correo) {
    toast.success(hecho);
    return;
  }
  if (correo.enviado) {
    toast.success(`${hecho}; se le envió el correo a ${correo.para}`);
    if (correo.quedanFuera.length) {
      toast.warning(
        `No cupieron en el correo (25 MB): ${correo.quedanFuera.join(', ')}. Quedan en el expediente.`,
      );
    }
    return;
  }
  toast.warning(`${hecho}, pero el correo no salió: ${correo.motivo}. Reenvíalo o avísale por fuera.`);
}

const VACIO = {
  cargo: '',
  fechaDesignacion: hoyEnBogota(),
};

/**
 * Actividad 8.2 · Designación del supervisor (EFDS-1165).
 *
 * Mismo patrón que la designación del comité evaluador: el acto administrativo
 * y la persona viajan juntos, porque una designación a medias no existe —es el
 * nombre y el acto que lo nombra, o no hay supervisor—.
 */
export function PanelSupervision({ procesoId, onCambio }: Props) {
  const firmaDesignacion = useFirma(NUMERAL_SUPERVISOR, 'Designar el supervisor');
  const firmaReasignacion = useFirma(NUMERAL_REASIGNACION, 'Reasignar la supervisión');
  const [estado, setEstado] = useState<EstadoSupervision | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [designando, setDesignando] = useState(false);
  const [reasignando, setReasignando] = useState(false);
  /** La cuenta elegida (121): ocupa el puesto que avala la 9.4. */
  const [elegido, setElegido] = useState('');
  const [datos, setDatos] = useState(VACIO);
  const [acto, setActo] = useState<File | null>(null);
  const [motivo, setMotivo] = useState('');
  /** Lo que acompaña al acto en el correo al supervisor (124). */
  const [adjuntos, setAdjuntos] = useState<File[]>([]);
  const [mensaje, setMensaje] = useState('');
  /** Volver a mandarle el correo, con documentos nuevos si hacen falta. */
  const [reenviando, setReenviando] = useState(false);
  /** El motivo del último correo que no salió, para decirlo junto al aviso pendiente. */
  const [correoFallido, setCorreoFallido] = useState<string | null>(null);

  const leer = () =>
    contratacionService
      .supervision(procesoId)
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

  const limpiar = () => {
    setElegido('');
    setDatos(VACIO);
    setActo(null);
    setMotivo('');
    setAdjuntos([]);
    setMensaje('');
    setDesignando(false);
    setReasignando(false);
    setReenviando(false);
  };

  /** Lo que devuelve designar, reasignar o reenviar: el estado y cómo le fue al correo. */
  const recibir = (respuesta: EstadoSupervision, hecho: string) => {
    setEstado(respuesta);
    setCorreoFallido(respuesta.correo && !respuesta.correo.enviado ? respuesta.correo.motivo : null);
    avisarDelCorreo(respuesta.correo, hecho);
  };

  const designar = async (firmaOtp?: EvidenciaFirmaOtp) => {
    if (!elegido || !acto) return;

    const cuerpo: DatosSupervisor = {
      usuarioId: elegido,
      fechaDesignacion: datos.fechaDesignacion,
      ...(datos.cargo.trim() ? { cargo: datos.cargo.trim() } : {}),
      ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}),
      firma: firmaOtp,
    };

    setGuardando(true);
    try {
      const respuesta = await contratacionService.designarSupervisor(procesoId, cuerpo, acto, adjuntos);
      limpiar();
      recibir(respuesta, 'Supervisor designado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Actividad 9.3 · Reasignación de la supervisión (EFDS-1169).
   *
   * Releva y designa en un solo acto: hacerlo en dos dejaría el contrato sin
   * quien lo vigile mientras tanto.
   */
  const reasignar = async (firmaOtp?: EvidenciaFirmaOtp) => {
    if (!elegido || !acto) return;

    const cuerpo: DatosReasignacion = {
      usuarioId: elegido,
      fechaDesignacion: datos.fechaDesignacion,
      motivo: motivo.trim(),
      ...(datos.cargo.trim() ? { cargo: datos.cargo.trim() } : {}),
      ...(mensaje.trim() ? { mensaje: mensaje.trim() } : {}),
      firma: firmaOtp,
    };

    setGuardando(true);
    try {
      const respuesta = await contratacionService.reasignarSupervisor(procesoId, cuerpo, acto, adjuntos);
      limpiar();
      recibir(respuesta, 'Supervisión reasignada');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const reenviar = async () => {
    setGuardando(true);
    try {
      const respuesta = await contratacionService.reenviarCorreoSupervisor(procesoId, mensaje, adjuntos);
      limpiar();
      recibir(respuesta, adjuntos.length ? 'Documentos agregados' : 'Correo reenviado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const avisar = async () => {
    setGuardando(true);
    try {
      setEstado(await contratacionService.avisarSupervisor(procesoId));
      setCorreoFallido(null);
      toast.success('Queda constancia de que se le comunicó');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la supervisión…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const completo = elegido && acto && datos.fechaDesignacion;

  return (
    <Marco>
      <Titulo>Supervisión del contrato</Titulo>
      <Ayuda>
        El Ordenador del Gasto designa por memorando a quien vigilará la ejecución, en todas las
        modalidades. Al supervisor le llega un correo con el memorando adjunto y los documentos que
        le agregues: ese correo es la comunicación formal de la designación.
      </Ayuda>

      {/* Por qué no se puede todavía, en vez de un botón apagado sin explicar. */}
      {!estado.admiteSupervisor ? (
        <Pendiente
          falta="8.1"
          texto={`El supervisor se designa sobre un contrato ya suscrito: ${
            estado.motivoNoAdmite ?? 'todavía no lo está'
          }.`}
        />
      ) : null}

      {estado.supervisor ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <Eye className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0 break-words">
                  {estado.supervisor.nombre}
                  {estado.supervisor.cargo ? ` · ${estado.supervisor.cargo}` : ''}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  Designado el {fechaLarga(estado.supervisor.fechaDesignacion)}
                  {estado.supervisor.designadoPor ? ` por ${estado.supervisor.designadoPor}` : ''}
                </p>
                {estado.supervisor.acto?.url ? (
                  <a
                    href={contratacionService.urlDescarga(estado.supervisor.acto.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {estado.supervisor.acto.nombre}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* La matriz pide en 8.2 que se le alerte. Lo hace el correo de la
              designación (124); si no salió, se dice por qué y se ofrece
              reenviarlo o dejar constancia de que se le avisó por fuera:
              darlo por hecho dejaría al supervisor sin enterarse. */}
          {estado.avisoPendiente ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <BellRing className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-900" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-amber-900 m-0">
                    Falta avisarle de su designación
                  </p>
                  <p className="text-[11.5px] text-amber-900 m-0 mt-0.5 leading-relaxed">
                    {correoFallido
                      ? `El correo no salió: ${correoFallido}.`
                      : 'No hay constancia de que le haya llegado el correo.'}{' '}
                    {estado.supervisor.email
                      ? `Reenvíaselo a ${estado.supervisor.email} o, si le avisaste por fuera, deja constancia.`
                      : 'Su cuenta no tiene correo: avísale por fuera y deja constancia.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {estado.supervisor.email && !reenviando ? (
                  <BotonSecundario
                    icono={<Send className="w-3.5 h-3.5" />}
                    disabled={guardando}
                    onClick={() => setReenviando(true)}
                  >
                    Reenviar el correo
                  </BotonSecundario>
                ) : null}
                <BotonSecundario
                  icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  disabled={guardando}
                  onClick={avisar}
                >
                  Ya se le comunicó por fuera
                </BotonSecundario>
              </div>
            </div>
          ) : (
            <Aviso tono="ok" titulo="El supervisor ya fue notificado">
              Se le comunicó su designación
              {estado.supervisor.alertaEnviadaAt
                ? ` el ${momento(estado.supervisor.alertaEnviadaAt)}`
                : ''}
              .
            </Aviso>
          )}

          {/* Lo que se le mandó con el acto, para poder comprobarlo. */}
          {estado.supervisor.anexos?.length ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-1.5">
              <p className="text-[12.5px] font-bold text-slate-800 m-0">Documentos que se le mandaron</p>
              {estado.supervisor.anexos.map((anexo, indice) =>
                anexo.url ? (
                  <a
                    key={`${anexo.nombre}-${indice}`}
                    href={contratacionService.urlDescarga(anexo.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline break-all"
                  >
                    <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                    {anexo.nombre}
                  </a>
                ) : (
                  <p key={`${anexo.nombre}-${indice}`} className="text-[11.5px] text-slate-600 m-0">
                    {anexo.nombre}
                  </p>
                ),
              )}
            </div>
          ) : null}

          {estado.supervisor.email && !estado.avisoPendiente && !reenviando && !reasignando ? (
            <BotonSecundario
              icono={<Mail className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => setReenviando(true)}
            >
              Mandarle más documentos
            </BotonSecundario>
          ) : null}

          {reenviando ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
              <p className="text-[12.5px] font-bold text-slate-800 m-0">
                Correo a {estado.supervisor.email}
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
                Lleva el memorando y todo lo que ya se le mandó; lo que agregues aquí se suma y queda en el
                expediente.
              </p>
              <CorreoAlSupervisor
                prefijo="reenvio"
                mensaje={mensaje}
                onMensaje={setMensaje}
                adjuntos={adjuntos}
                onAdjuntos={setAdjuntos}
              />
              <div className="flex flex-wrap gap-2">
                <Boton icono={<Send className="w-3.5 h-3.5" />} disabled={guardando} onClick={reenviar}>
                  {guardando ? 'Enviando…' : 'Enviar'}
                </Boton>
                <BotonSecundario
                  icono={<Undo2 className="w-3.5 h-3.5" />}
                  disabled={guardando}
                  onClick={limpiar}
                >
                  Cancelar
                </BotonSecundario>
              </div>
            </div>
          ) : null}

          {/* Reasignar y no relevar: el contrato no puede quedar sin quien lo
              vigile mientras se busca sustituto, así que el cambio es un solo
              acto (EFDS-1169, actividad 9.3). */}
          {!reasignando ? (
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={() => setReasignando(true)}
            >
              Reasignar la supervisión
            </BotonSecundario>
          ) : null}
        </>
      ) : null}

      {reasignando && estado.supervisor ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            Reasignar la supervisión
          </p>
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            {estado.supervisor.nombre} queda relevado y el nuevo supervisor toma su lugar en el
            mismo acto.
          </p>

          <div>
            <label htmlFor="rea-persona" className="block text-xs font-bold text-gray-600 mb-1.5">
              Nuevo supervisor <span className="text-red-600">*</span>
            </label>
            <SelectorSupervisor
              id="rea-persona"
              procesoId={procesoId}
              puesto={estado.puesto ?? null}
              excluir={estado.supervisor.usuarioId}
              value={elegido}
              onChange={setElegido}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="rea-cargo" className="block text-xs font-bold text-gray-600 mb-1.5">
                Cargo
              </label>
              <input
                id="rea-cargo"
                type="text"
                value={datos.cargo}
                onChange={(e) => setDatos((p) => ({ ...p, cargo: e.target.value }))}
                placeholder="Profesional especializado"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="rea-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha del memorando <span className="text-red-600">*</span>
              </label>
              <input
                id="rea-fecha"
                type="date"
                value={datos.fechaDesignacion}
                max={hoyEnBogota()}
                onChange={(e) => setDatos((p) => ({ ...p, fechaDesignacion: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="rea-motivo" className="block text-xs font-bold text-gray-600 mb-1.5">
              Por qué se cambia <span className="text-red-600">*</span>
            </label>
            <textarea
              id="rea-motivo"
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="El motivo queda en el expediente junto al supervisor relevado"
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="rea-acto"
            etiqueta="Memorando de reasignación"
            ayuda="El memorando del Ordenador del Gasto; viaja adjunto en el correo al nuevo supervisor."
            archivo={acto}
            onElegir={setActo}
          />

          <CorreoAlSupervisor
            prefijo="rea"
            mensaje={mensaje}
            onMensaje={setMensaje}
            adjuntos={adjuntos}
            onAdjuntos={setAdjuntos}
          />

          <div className="flex items-center gap-2 pt-1">
            <Boton
              icono={<UserCheck className="w-3.5 h-3.5" />}
              disabled={!elegido || !acto || motivo.trim().length < 10 || guardando}
              onClick={() => firmaReasignacion.conFirma(reasignar)}
            >
              {guardando ? 'Reasignando…' : 'Reasignar'}
            </Boton>
            <button
              type="button"
              onClick={limpiar}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {/* Quien vigiló antes se conserva: respondió por ese periodo. */}
      {estado.historial.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Supervisores anteriores</p>
          {estado.historial.map((s, indice) => (
            <div key={`${s.nombre}-${indice}`} className="border-l-2 border-slate-200 pl-2.5">
              <p className="text-[11.5px] font-bold text-slate-700 m-0 break-words">
                {s.nombre}
                {s.cargo ? ` · ${s.cargo}` : ''}
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                Del {fechaLarga(s.fechaDesignacion)}
                {s.relevadoAt ? ` al ${momento(s.relevadoAt)}` : ''}
                {s.motivoRelevo ? ` · ${s.motivoRelevo}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {estado.puedeDesignar && !designando ? (
        <Boton icono={<UserCheck className="w-3.5 h-3.5" />} onClick={() => setDesignando(true)}>
          Designar supervisor
        </Boton>
      ) : null}

      {estado.puedeDesignar && designando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nuevo supervisor</p>

          <div>
            <label htmlFor="sup-persona" className="block text-xs font-bold text-gray-600 mb-1.5">
              Quién supervisa <span className="text-red-600">*</span>
            </label>
            <SelectorSupervisor
              id="sup-persona"
              procesoId={procesoId}
              puesto={estado.puesto ?? null}
              value={elegido}
              onChange={setElegido}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="sup-cargo" className="block text-xs font-bold text-gray-600 mb-1.5">
                Cargo
              </label>
              <input
                id="sup-cargo"
                type="text"
                value={datos.cargo}
                onChange={(e) => setDatos((p) => ({ ...p, cargo: e.target.value }))}
                placeholder="Profesional especializado"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="sup-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha del memorando <span className="text-red-600">*</span>
              </label>
              <input
                id="sup-fecha"
                type="date"
                value={datos.fechaDesignacion}
                onChange={(e) => setDatos((p) => ({ ...p, fechaDesignacion: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <SelectorArchivo
            id="sup-acto"
            etiqueta="Memorando de designación"
            ayuda="Firmado por el ordenador del gasto; viaja adjunto en el correo al supervisor."
            archivo={acto}
            onElegir={setActo}
          />

          <CorreoAlSupervisor
            prefijo="sup"
            mensaje={mensaje}
            onMensaje={setMensaje}
            adjuntos={adjuntos}
            onAdjuntos={setAdjuntos}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<UserCheck className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={() => firmaDesignacion.conFirma(designar)}
            >
              Designar
            </Boton>
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={guardando}
              onClick={limpiar}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
      {firmaDesignacion.modal}
      {firmaReasignacion.modal}
    </Marco>
  );
}

/**
 * El correo que le llega al supervisor (124): el acto va siempre; aquí se le
 * escribe algo y se le agregan los documentos que necesita para empezar —el
 * contrato, el estudio previo, la propuesta—. Quedan en el expediente.
 */
function CorreoAlSupervisor({
  prefijo,
  mensaje,
  onMensaje,
  adjuntos,
  onAdjuntos,
}: {
  prefijo: string;
  mensaje: string;
  onMensaje: (mensaje: string) => void;
  adjuntos: File[];
  onAdjuntos: (adjuntos: File[]) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 m-0">
        <Mail className="w-3.5 h-3.5" />
        Correo al supervisor
      </p>
      <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
        Le llega con el acto adjunto. Puedes escribirle y mandarle otros documentos (hasta 25 MB entre
        todos; lo que no quepa queda en el expediente).
      </p>
      <label htmlFor={`${prefijo}-mensaje`} className="sr-only">
        Mensaje para el supervisor
      </label>
      <textarea
        id={`${prefijo}-mensaje`}
        rows={2}
        maxLength={2000}
        value={mensaje}
        onChange={(e) => onMensaje(e.target.value)}
        placeholder="Mensaje para el supervisor (opcional)"
        className={campo}
      />
      <ElegirSoportes
        archivos={adjuntos}
        onCambio={onAdjuntos}
        etiqueta="Adjuntar documentos al correo (opcional)"
        nombreAccesible="Documentos para el supervisor"
        formatos={FORMATOS_CORREO}
      />
    </div>
  );
}

/**
 * A quién se designa: las cuentas que pueden ocupar el puesto que avala la 9.4
 * (121), no cualquier persona del directorio.
 *
 * Con el directorio se guardaba la persona y la 9.4 la comparaba con la cuenta
 * que inicia sesión: nunca coincidían y el supervisor designado no podía
 * avalar. Elegir la cuenta es lo que hace que la designación sirva.
 */
function SelectorSupervisor({
  id,
  procesoId,
  puesto,
  excluir,
  value,
  onChange,
}: {
  id: string;
  procesoId: string;
  puesto: { id: string; nombre: string } | null;
  excluir?: string | null;
  value: string;
  onChange: (usuarioId: string) => void;
}) {
  const [candidatos, setCandidatos] = useState<CandidatoAPuesto[] | null>(null);

  useEffect(() => {
    contratacionService
      .candidatosASupervisor(procesoId)
      .then(setCandidatos)
      .catch(() => setCandidatos([]));
  }, [procesoId]);

  // Los menos cargados primero, como al repartir los puestos en la 3.3.
  const opciones = (candidatos ?? [])
    .filter((c) => c.usuarioId !== excluir)
    .sort((x, y) => x.procesosEnElPuesto - y.procesosEnElPuesto || x.nombre.localeCompare(y.nombre));

  return (
    <>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={campo}
        disabled={candidatos === null}
      >
        <option value="">{candidatos === null ? 'Cargando…' : 'Elige a quién…'}</option>
        {opciones.map((c) => (
          <option key={c.usuarioId} value={c.usuarioId}>
            {c.nombre}
            {puesto
              ? ` · ${c.procesosEnElPuesto === 1 ? '1 proceso' : `${c.procesosEnElPuesto} procesos`} como supervisor`
              : ''}
          </option>
        ))}
      </select>
      {candidatos !== null && opciones.length === 0 ? (
        <p className="text-[11.5px] text-slate-500 m-0 mt-1">
          {puesto
            ? `Ninguna cuenta tiene todos los permisos del puesto ${puesto.nombre}: dáselos a un rol en Permisos por etapa.`
            : 'Ninguna cuenta puede avalar las cuentas de cobro de la 9.4: dale ese permiso a un rol en Permisos por etapa.'}
        </p>
      ) : (
        <p className="text-[11px] text-slate-500 m-0 mt-1">
          {puesto
            ? `Ocupará el puesto ${puesto.nombre}: avala las cuentas de cobro de la 9.4.`
            : 'La 9.4 no nombra un puesto en el flujo: avala cualquiera con el permiso.'}
        </p>
      )}
    </>
  );
}
