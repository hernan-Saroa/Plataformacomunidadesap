import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Megaphone,
  MessageSquare,
  Plus,
  Undo2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  EstadoSubsanaciones,
  EstadoTraslado,
  InformeEvaluacion,
  Subsanacion,
  TipoSubsanacion,
} from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
  BotonSecundario,
  campo,
  Marco,
  Pendiente,
  Titulo,
} from '../shared/PiezasPanel';
import { fechaLarga, hoyEnBogota, momentoConHora } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const pesos = (valor: number | null) =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(valor);

const ETIQUETA_TIPO: Record<TipoSubsanacion, string> = {
  SUBSANACION: 'Subsanación',
  OBSERVACION: 'Observación',
};

/**
 * Actividades 6.4 a 6.6 · Traslado del informe y subsanaciones (EFDS-1158).
 *
 * Un solo panel para las tres actividades porque son un solo trámite visto por
 * el usuario: se publica el informe, corre un término, entran escritos y se
 * responden. Partirlo en tres pantallas obligaría a saltar entre ellas para
 * entender si el plazo sigue abierto.
 *
 * Lo que la pantalla insiste en decir es de dónde sale cada cosa: el resultado
 * que se traslada es una **fotografía** del que registró el comité, y si el
 * comité rectifica después, este informe no cambia. Es la pieza que el oferente
 * recibió.
 */
export function PanelTraslado({ procesoId, onCambio }: Props) {
  const [traslado, setTraslado] = useState<EstadoTraslado | null>(null);
  const [escritos, setEscritos] = useState<EstadoSubsanaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Generación y traslado del informe
  const [observacion, setObservacion] = useState('');
  const [documentoInforme, setDocumentoInforme] = useState<File | null>(null);
  const [medioPublicacion, setMedioPublicacion] = useState('');
  const [evidencia, setEvidencia] = useState<File | null>(null);

  // Registro de un escrito
  const [registrando, setRegistrando] = useState(false);
  const [oferente, setOferente] = useState('');
  const [tipo, setTipo] = useState<TipoSubsanacion>('SUBSANACION');
  const [presentadoPor, setPresentadoPor] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [fechaPresentacion, setFechaPresentacion] = useState(hoyEnBogota());
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);

  // Respuesta a un escrito
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [aceptada, setAceptada] = useState(true);
  const [documentoRespuesta, setDocumentoRespuesta] = useState<File | null>(null);

  const leer = () =>
    Promise.all([
      contratacionService.traslado(procesoId),
      contratacionService.subsanaciones(procesoId),
    ])
      .then(([t, s]) => {
        setTraslado(t);
        setEscritos(s);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const generar = async () => {
    setGuardando(true);
    try {
      setTraslado(
        await contratacionService.generarInformeTraslado(procesoId, observacion, documentoInforme),
      );
      setDocumentoInforme(null);
      toast.success('Informe preliminar generado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const trasladar = async () => {
    if (!evidencia || medioPublicacion.trim().length < 10) return;

    setGuardando(true);
    try {
      setTraslado(
        await contratacionService.trasladarInforme(procesoId, medioPublicacion.trim(), evidencia),
      );
      setMedioPublicacion('');
      setEvidencia(null);
      await leer();
      toast.success('Informe trasladado: el término empezó a correr');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async () => {
    const motivo = window.prompt('¿Por qué se anula el informe?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setTraslado(await contratacionService.anularInformeTraslado(procesoId, motivo));
      await leer();
      toast.success('Informe anulado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const limpiarEscrito = () => {
    setOferente('');
    setPresentadoPor('');
    setIdentificacion('');
    setFechaPresentacion(hoyEnBogota());
    setAsunto('');
    setContenido('');
    setSoporte(null);
    setRegistrando(false);
  };

  const registrar = async () => {
    if (!oferente || !soporte || !presentadoPor.trim() || !asunto.trim() || !contenido.trim()) {
      return;
    }

    setGuardando(true);
    try {
      setEscritos(
        await contratacionService.registrarSubsanacion(
          procesoId,
          {
            oferenteId: oferente,
            tipo,
            presentadoPor: presentadoPor.trim(),
            identificacion: identificacion.trim() || undefined,
            fechaPresentacion,
            asunto: asunto.trim(),
            contenido: contenido.trim(),
          },
          soporte,
        ),
      );
      limpiarEscrito();
      toast.success(`${ETIQUETA_TIPO[tipo]} registrada`);
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const responder = async (subsanacionId: string) => {
    if (respuesta.trim().length < 10) return;

    setGuardando(true);
    try {
      setEscritos(
        await contratacionService.responderSubsanacion(
          procesoId,
          subsanacionId,
          { aceptada, respuesta: respuesta.trim() },
          documentoRespuesta,
        ),
      );
      setRespondiendo(null);
      setRespuesta('');
      setAceptada(true);
      setDocumentoRespuesta(null);
      toast.success('Respuesta registrada');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = async () => {
    const nota = window.prompt('Nota de cierre del traslado (opcional)') ?? '';

    setGuardando(true);
    try {
      setEscritos(await contratacionService.cerrarTraslado(procesoId, nota));
      await leer();
      toast.success('Traslado cerrado');
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
        <Titulo>Traslado del informe de evaluación</Titulo>
        <p className="text-[12.5px] text-slate-500 m-0">Cargando…</p>
      </Marco>
    );
  }

  if (error || !traslado || !escritos) {
    return (
      <Marco>
        <Titulo>Traslado del informe de evaluación</Titulo>
        <Aviso tono="error" titulo="No se pudo cargar el traslado">
          {error ?? 'Intenta de nuevo.'}
        </Aviso>
      </Marco>
    );
  }

  if (!traslado.aplica) {
    return (
      <Marco>
        <Titulo>Traslado del informe de evaluación</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no traslada informe de evaluación">
          {traslado.motivoNoAplica ??
            'La modalidad del proceso no adelanta traslado del informe de evaluación.'}
        </Aviso>
      </Marco>
    );
  }

  const informe = traslado.informe;
  const ofertas = informe?.resultado.ofertas ?? [];

  return (
    <Marco>
      <Titulo>Traslado del informe de evaluación</Titulo>
      <Ayuda>
        Evaluadas las ofertas, la entidad publica el informe preliminar, lo traslada a los oferentes
        y abre el término para que subsanen y observen. Es el debido proceso previo a la
        adjudicación: sin traslado, el oferente se entera de que quedó fuera cuando ya no puede
        hacer nada.
      </Ayuda>

      {!traslado.hayResultado && (
        <Pendiente
          falta="6.3"
          texto="El comité todavía no ha registrado el resultado de la evaluación: no hay informe que trasladar."
        />
      )}

      {traslado.plazo == null ? (
        <Aviso tono="aviso" titulo="Esta modalidad no tiene plazo de traslado parametrizado">
          Sin término no se puede trasladar. Está pendiente de confirmarse con la Dirección de
          Contratación (EFDS-1467).
        </Aviso>
      ) : (
        !traslado.plazo.confirmado && (
          <Aviso tono="aviso" titulo={`Término de ${traslado.plazo.diasHabiles} días hábiles`}>
            El plazo es un supuesto del equipo y todavía no lo ha confirmado la Dirección de
            Contratación. Ningún documento fuente lo cifra (EFDS-1467).
          </Aviso>
        )
      )}

      {/* ---------------------------------------------------- el informe --- */}

      {informe && <ResumenInforme informe={informe} />}

      {traslado.puedeGenerar && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">
            {informe ? 'Actualizar el informe preliminar' : 'Generar el informe preliminar'}
          </p>
          <p className="text-[11.5px] text-slate-500 m-0">
            Se congela el resultado que el comité registró. Si el comité rectifica antes de
            trasladar, vuelve a generarlo para tomar la fotografía otra vez.
          </p>

          <textarea
            className={`${campo} min-h-[64px]`}
            placeholder="Observación de la entidad sobre el informe (opcional)"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />

          <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
            <UploadCloud size={15} className="text-slate-400" />
            <span>{documentoInforme?.name ?? 'Adjuntar el informe preliminar (PDF, Word, Excel)'}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setDocumentoInforme(e.target.files?.[0] ?? null)}
            />
          </label>

          <Boton
            icono={<FileText className="w-3.5 h-3.5" />}
            onClick={generar}
            disabled={guardando || (!informe && !documentoInforme)}
          >
            {informe ? 'Actualizar informe' : 'Generar informe'}
          </Boton>
        </div>
      )}

      {traslado.puedeTrasladar && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Publicar y trasladar</p>
          <p className="text-[11.5px] text-slate-500 m-0">
            No hay integración con SECOP II: la publicación la hace el gestor por allá y aquí se
            registra con su soporte. Trasladar abre el término y ya no se puede rehacer el informe
            sin anularlo.
          </p>

          <input
            className={campo}
            placeholder="Dónde se publicó y cómo se notificó"
            value={medioPublicacion}
            onChange={(e) => setMedioPublicacion(e.target.value)}
          />

          <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
            <UploadCloud size={15} className="text-slate-400" />
            <span>{evidencia?.name ?? 'Adjuntar el soporte de la publicación'}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setEvidencia(e.target.files?.[0] ?? null)}
            />
          </label>

          <Boton
            icono={<Megaphone className="w-3.5 h-3.5" />}
            onClick={trasladar}
            disabled={guardando || !evidencia || medioPublicacion.trim().length < 10}
          >
            Trasladar el informe
          </Boton>
        </div>
      )}

      {informe && informe.estado !== 'CERRADO' && (
        <BotonSecundario icono={<Undo2 className="w-3.5 h-3.5" />} onClick={anular} disabled={guardando}>
          Anular el informe
        </BotonSecundario>
      )}

      {/* ------------------------------------- subsanaciones y respuestas --- */}

      {escritos.trasladado && (
        <div className="space-y-2.5">
          <p className="text-[12.5px] font-bold text-slate-800 m-0 pt-1">
            Subsanaciones y observaciones
          </p>
          <p className="text-[11.5px] text-slate-500 m-0">
            Llegan por SECOP II y las transcribe el gestor con su soporte. Lo que entre después del
            vencimiento se registra igual, marcado como extemporáneo: extemporáneo no es rechazado,
            y quien decide si se acepta es la entidad.
          </p>

          {escritos.requiereRectificacion && (
            <Aviso tono="aviso" titulo="Hay una subsanación aceptada">
              Aceptar una subsanación puede cambiar la habilitación. Si es el caso, el comité tiene
              que rectificar su resultado en la actividad 6.3; la plataforma no lo hace sola porque
              no evalúa.
            </Aviso>
          )}

          {escritos.subsanaciones.length === 0 ? (
            <p className="text-[12px] text-slate-500 m-0">
              Todavía no se ha presentado nada contra este informe.
            </p>
          ) : (
            <ul className="list-none p-0 m-0 space-y-2">
              {escritos.subsanaciones.map((escrito) => (
                <li key={escrito.id} className="border border-gray-200 rounded-lg p-3">
                  <FilaEscrito escrito={escrito} />

                  {escrito.respondidaAt ? (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[11.5px] font-bold m-0 text-slate-700">
                        {escrito.aceptada ? 'Aceptada' : 'No aceptada'} · {escrito.respondidaPor}
                      </p>
                      <p className="text-[12px] text-slate-600 m-0 mt-0.5 whitespace-pre-wrap">
                        {escrito.respuesta}
                      </p>
                      {escrito.respuestaDocumento && (
                        <a
                          className="text-[11.5px] text-blue-700 inline-flex items-center gap-1 mt-1"
                          href={contratacionService.urlDescarga(
                            escrito.respuestaDocumento.archivoUrl,
                          )}
                        >
                          <Download size={12} /> {escrito.respuestaDocumento.nombre}
                        </a>
                      )}
                    </div>
                  ) : null}

                  {escritos.puedeRegistrar &&
                    (respondiendo === escrito.id ? (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                        <select
                          className={campo}
                          value={aceptada ? 'si' : 'no'}
                          onChange={(e) => setAceptada(e.target.value === 'si')}
                        >
                          <option value="si">Se acepta</option>
                          <option value="no">No se acepta</option>
                        </select>
                        <textarea
                          className={`${campo} min-h-[64px]`}
                          placeholder="La respuesta que se le notifica al oferente"
                          value={respuesta}
                          onChange={(e) => setRespuesta(e.target.value)}
                        />
                        <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                          <UploadCloud size={15} className="text-slate-400" />
                          <span>
                            {documentoRespuesta?.name ??
                              'Adjuntar el documento de la dimensión (opcional)'}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => setDocumentoRespuesta(e.target.files?.[0] ?? null)}
                          />
                        </label>
                        <div className="flex gap-2">
                          <Boton
                            icono={<MessageSquare className="w-3.5 h-3.5" />}
                            onClick={() => responder(escrito.id)}
                            disabled={guardando || respuesta.trim().length < 10}
                          >
                            Guardar respuesta
                          </Boton>
                          <BotonSecundario icono={<X className="w-3.5 h-3.5" />} onClick={() => setRespondiendo(null)}>
                            Cancelar
                          </BotonSecundario>
                        </div>
                      </div>
                    ) : (
                      <BotonSecundario
                        icono={<MessageSquare className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setRespondiendo(escrito.id);
                          setRespuesta(escrito.respuesta ?? '');
                          setAceptada(escrito.aceptada ?? true);
                        }}
                      >
                        {escrito.respondidaAt ? 'Corregir la respuesta' : 'Responder'}
                      </BotonSecundario>
                    ))}
                </li>
              ))}
            </ul>
          )}

          {escritos.puedeRegistrar &&
            (registrando ? (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
                <select
                  className={campo}
                  value={oferente}
                  onChange={(e) => setOferente(e.target.value)}
                >
                  <option value="">¿A qué oferta se refiere?</option>
                  {ofertas.map((o) => (
                    <option key={o.oferenteId} value={o.oferenteId}>
                      {o.numero}. {o.nombre}
                    </option>
                  ))}
                </select>

                <select
                  className={campo}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoSubsanacion)}
                >
                  <option value="SUBSANACION">
                    Subsanación — aporta lo que faltaba
                  </option>
                  <option value="OBSERVACION">
                    Observación — cuestiona la evaluación
                  </option>
                </select>

                <input
                  className={campo}
                  placeholder="Quién lo presenta, tal como firma"
                  value={presentadoPor}
                  onChange={(e) => setPresentadoPor(e.target.value)}
                />
                <input
                  className={campo}
                  placeholder="NIT o cédula (opcional)"
                  value={identificacion}
                  onChange={(e) => setIdentificacion(e.target.value)}
                />
                <label className="block">
                  <span className="text-[11.5px] text-slate-500">
                    Fecha en que lo presentó el oferente
                  </span>
                  <input
                    type="date"
                    className={campo}
                    value={fechaPresentacion}
                    onChange={(e) => setFechaPresentacion(e.target.value)}
                  />
                </label>
                <input
                  className={campo}
                  placeholder="Asunto"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                />
                <textarea
                  className={`${campo} min-h-[80px]`}
                  placeholder="Lo que dice el oferente"
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                />
                <label className="flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer">
                  <UploadCloud size={15} className="text-slate-400" />
                  <span>{soporte?.name ?? 'Adjuntar el escrito del oferente'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                  />
                </label>

                {/* Se avisa antes de guardar, no después: registrarlo sigue
                    siendo lo correcto, pero el gestor tiene que saberlo. */}
                {escritos.venceEl && fechaPresentacion > escritos.venceEl && (
                  <Aviso tono="aviso" titulo="Se registrará como extemporáneo">
                    El término venció el {fechaLarga(escritos.venceEl)}. Se deja constancia de que
                    llegó fuera de plazo; aceptarlo o no lo decide la entidad.
                  </Aviso>
                )}

                <div className="flex gap-2">
                  <Boton
                    icono={<Plus className="w-3.5 h-3.5" />}
                    onClick={registrar}
                    disabled={
                      guardando ||
                      !oferente ||
                      !soporte ||
                      !presentadoPor.trim() ||
                      !asunto.trim() ||
                      !contenido.trim()
                    }
                  >
                    Registrar
                  </Boton>
                  <BotonSecundario icono={<X className="w-3.5 h-3.5" />} onClick={limpiarEscrito}>
                    Cancelar
                  </BotonSecundario>
                </div>
              </div>
            ) : (
              <BotonSecundario icono={<Plus className="w-3.5 h-3.5" />} onClick={() => setRegistrando(true)}>
                Registrar una subsanación u observación
              </BotonSecundario>
            ))}

          {/* ------------------------------------------------- el cierre --- */}

          {escritos.puedeCerrar ? (
            <Boton icono={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={cerrar} disabled={guardando}>
              Cerrar el traslado
            </Boton>
          ) : !escritos.terminoVencido ? (
            <p className="text-[11.5px] text-slate-500 m-0">
              El término sigue corriendo{escritos.venceEl ? ` hasta el ${fechaLarga(escritos.venceEl)}` : ''}
              : cerrarlo antes le quitaría al oferente el plazo que se le notificó.
            </p>
          ) : (
            <p className="text-[11.5px] text-slate-500 m-0">
              Quedan {escritos.pendientesDeRespuesta} escritos sin responder. El informe definitivo
              se sustenta en esas respuestas.
            </p>
          )}
        </div>
      )}

      {/* Los anulados explican por qué hubo que trasladar dos veces. */}
      {traslado.anulados.length > 0 && (
        <div className="pt-1">
          <p className="text-[11.5px] font-bold text-slate-600 m-0">Informes anulados</p>
          <ul className="list-none p-0 m-0 mt-1 space-y-1">
            {traslado.anulados.map((anulado) => (
              <li key={anulado.id} className="text-[11.5px] text-slate-500">
                Informe {anulado.numero} · {anulado.motivoAnulacion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Marco>
  );
}

/** El informe en juego, con la fotografía que se congeló. */
function ResumenInforme({ informe }: { informe: InformeEvaluacion }) {
  const { resultado } = informe;

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          Informe {informe.numero}
          <span className="ml-2 inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-md border bg-slate-50 text-slate-700 border-slate-200">
            {informe.estado}
          </span>
        </p>
        {informe.informe && (
          <a
            className="text-[11.5px] text-blue-700 inline-flex items-center gap-1"
            href={contratacionService.urlDescarga(informe.informe.archivoUrl)}
          >
            <Download size={12} /> {informe.informe.nombre}
          </a>
        )}
      </div>

      <p className="text-[12px] text-slate-600 m-0">
        Ganadora: <strong>{resultado.ganadora.nombre}</strong>
        {resultado.puntajeObtenido != null && (
          <>
            {' '}
            · {resultado.puntajeObtenido} de {resultado.puntajeMaximo}
          </>
        )}
        {resultado.valorEvaluado != null && <> · {pesos(resultado.valorEvaluado)}</>}
      </p>
      <p className="text-[11.5px] text-slate-500 m-0">
        {informe.ofertasRecibidas} ofertas recibidas. Es una copia del resultado que registró el
        comité; si lo rectifica después, este informe no cambia.
      </p>

      {informe.observacionEntidad && (
        <p className="text-[12px] text-slate-600 m-0 whitespace-pre-wrap">
          {informe.observacionEntidad}
        </p>
      )}

      {informe.trasladadoAt && (
        <p className="text-[11.5px] text-slate-500 m-0">
          Trasladado el {momentoConHora(informe.trasladadoAt)} por {informe.trasladadoPor}
          {informe.venceEl && <> · el término vence el {fechaLarga(informe.venceEl)}</>}
          {informe.diasRestantes != null && informe.estado === 'TRASLADADO' && (
            <> ({informe.diasRestantes} días hábiles)</>
          )}
        </p>
      )}

      {informe.cerradoAt && (
        <p className="text-[11.5px] text-slate-500 m-0">
          Traslado cerrado el {momentoConHora(informe.cerradoAt)} por {informe.cerradoPor}.
        </p>
      )}
    </div>
  );
}

/** Un escrito presentado, con lo que decide si llegó a tiempo. */
function FilaEscrito({ escrito }: { escrito: Subsanacion }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12.5px] font-bold text-slate-800">{escrito.asunto}</span>
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-md border bg-slate-50 text-slate-700 border-slate-200">
          {ETIQUETA_TIPO[escrito.tipo]}
        </span>
        {escrito.extemporanea && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold rounded-md border bg-amber-50 text-amber-800 border-amber-200">
            <AlertTriangle size={11} /> Extemporánea
          </span>
        )}
      </div>
      <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
        {escrito.oferta ? `${escrito.oferta.numero}. ${escrito.oferta.nombre}` : 'Oferta retirada'} ·{' '}
        {escrito.presentadoPor} · presentada el {fechaLarga(escrito.fechaPresentacion)}
      </p>
      <p className="text-[12px] text-slate-600 m-0 mt-1 whitespace-pre-wrap">{escrito.contenido}</p>
      {escrito.soporte && (
        <a
          className="text-[11.5px] text-blue-700 inline-flex items-center gap-1 mt-1"
          href={contratacionService.urlDescarga(escrito.soporte.archivoUrl)}
        >
          <Download size={12} /> {escrito.soporte.nombre}
        </a>
      )}
    </>
  );
}
