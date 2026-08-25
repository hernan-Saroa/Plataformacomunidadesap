import React, { useEffect, useState } from 'react';
import { CalendarCheck, Paperclip, PlayCircle, Undo2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosActaInicio, EstadoActaInicio } from '../../types';
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
import { fechaLarga, hoyEnBogota, momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const VACIO = {
  fechaReunion: hoyEnBogota(),
  fechaInicio: hoyEnBogota(),
  asistentes: '',
  compromisos: '',
};

/**
 * Actividad 9.1 · Reunión y acta de inicio (EFDS-1167).
 *
 * Donde el contrato deja de tramitarse y empieza a cumplirse. La pantalla
 * insiste en separar dos fechas que es fácil confundir: cuándo se reunieron y
 * desde cuándo corre el plazo. No siempre son la misma, y la segunda es la que
 * cuenta para los pagos y los entregables.
 */
export function PanelActaInicio({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoActaInicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [suscribiendo, setSuscribiendo] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [acta, setActa] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .actaInicio(procesoId)
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
    setDatos(VACIO);
    setActa(null);
    setSuscribiendo(false);
  };

  const suscribir = async () => {
    if (!acta) return;

    const cuerpo: DatosActaInicio = {
      fechaReunion: datos.fechaReunion,
      fechaInicio: datos.fechaInicio,
      ...(datos.asistentes.trim() ? { asistentes: datos.asistentes.trim() } : {}),
      ...(datos.compromisos.trim() ? { compromisos: datos.compromisos.trim() } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.suscribirActaInicio(procesoId, cuerpo, acta));
      limpiar();
      toast.success('Acta suscrita; el contrato queda en ejecución');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const anular = async () => {
    const motivo = window.prompt('¿Por qué se anula el acta de inicio?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.anularActaInicio(procesoId, motivo));
      toast.success('Acta anulada; el contrato vuelve a legalizado');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el inicio de la ejecución…</p>
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

  const completo = acta && datos.fechaReunion && datos.fechaInicio;

  return (
    <Marco>
      <Titulo>Reunión y acta de inicio</Titulo>
      <Ayuda>
        Las partes se reúnen, socializan alcance, cronograma y entregables, y suscriben el acta que
        da comienzo formal a la ejecución del contrato.
      </Ayuda>

      {/* Qué falta, en vez de un botón apagado sin explicar. Son dos requisitos
          distintos —la legalización y el supervisor— y conviene decir cuál. */}
      {!estado.admiteActa ? (
        <Pendiente
          falta="8.4"
          texto={`El acta se suscribe sobre un contrato legalizado: ${
            estado.motivoNoAdmite ?? 'todavía no lo está'
          }.`}
        />
      ) : null}

      {estado.admiteActa && !estado.supervisor ? (
        <Pendiente
          falta="8.2"
          texto="Falta designar el supervisor del contrato: es quien responde por la ejecución que empieza."
        />
      ) : null}

      {estado.acta ? (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <PlayCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                  En ejecución desde el {fechaLarga(estado.acta.fechaInicio)}
                </p>
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                  Reunión del {fechaLarga(estado.acta.fechaReunion)}
                  {estado.acta.suscritaPor ? ` · suscrita por ${estado.acta.suscritaPor}` : ''}
                  {estado.acta.fechaTerminacionEstimada
                    ? ` · termina el ${fechaLarga(estado.acta.fechaTerminacionEstimada)}`
                    : ''}
                </p>
                {estado.acta.documento?.url ? (
                  <a
                    href={contratacionService.urlDescarga(estado.acta.documento.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {estado.acta.documento.nombre}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {estado.acta.asistentes || estado.acta.compromisos ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
              {estado.acta.asistentes ? (
                <div>
                  <p className="text-[12.5px] font-bold text-slate-800 m-0">Asistentes</p>
                  <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed whitespace-pre-line break-words">
                    {estado.acta.asistentes}
                  </p>
                </div>
              ) : null}
              {estado.acta.compromisos ? (
                <div>
                  <p className="text-[12.5px] font-bold text-slate-800 m-0">
                    Alcance y compromisos
                  </p>
                  <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed whitespace-pre-line break-words">
                    {estado.acta.compromisos}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={anular}
          >
            Anular el acta
          </BotonSecundario>
        </>
      ) : null}

      {/* Las anuladas se conservan: son las que explican que un contrato tenga
          dos fechas de inicio distintas. */}
      {estado.historial.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Actas anuladas</p>
          {estado.historial.map((a, indice) => (
            <div key={`${a.fechaInicio}-${indice}`} className="border-l-2 border-slate-200 pl-2.5">
              <p className="text-[11.5px] font-bold text-slate-700 m-0">
                Inicio del {fechaLarga(a.fechaInicio)}
              </p>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5 leading-relaxed break-words">
                Anulada {a.anuladaAt ? `el ${momento(a.anuladaAt)}` : ''}
                {a.anuladaPor ? ` por ${a.anuladaPor}` : ''}
                {a.motivoAnulacion ? ` · ${a.motivoAnulacion}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {estado.puedeSuscribir && !suscribiendo ? (
        <Boton icono={<PlayCircle className="w-3.5 h-3.5" />} onClick={() => setSuscribiendo(true)}>
          Suscribir el acta de inicio
        </Boton>
      ) : null}

      {estado.puedeSuscribir && suscribiendo ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Acta de inicio</p>

          {estado.supervisor ? (
            <div className="flex items-start gap-2 text-[11.5px] text-slate-600">
              <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
              <span className="break-words">
                Supervisa {estado.supervisor.nombre}
                {estado.supervisor.cargo ? ` · ${estado.supervisor.cargo}` : ''}
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="acta-reunion" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha de la reunión <span className="text-red-600">*</span>
              </label>
              <input
                id="acta-reunion"
                type="date"
                value={datos.fechaReunion}
                max={hoyEnBogota()}
                onChange={(e) => setDatos((p) => ({ ...p, fechaReunion: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="acta-inicio" className="block text-xs font-bold text-gray-600 mb-1.5">
                Inicio de la ejecución <span className="text-red-600">*</span>
              </label>
              <input
                id="acta-inicio"
                type="date"
                value={datos.fechaInicio}
                min={datos.fechaReunion}
                onChange={(e) => setDatos((p) => ({ ...p, fechaInicio: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          {/* Se dice antes de que se equivoquen: la reunión ya pasó, el inicio
              puede pactarse hacia adelante. */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500">
            <CalendarCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
            <span>
              Desde la fecha de inicio corre el plazo del contrato. Puede ser posterior a la reunión
              si así se pactó en el acta.
            </span>
          </div>

          <div>
            <label
              htmlFor="acta-asistentes"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Asistentes
            </label>
            <textarea
              id="acta-asistentes"
              rows={2}
              value={datos.asistentes}
              onChange={(e) => setDatos((p) => ({ ...p, asistentes: e.target.value }))}
              placeholder="Quiénes participaron por la entidad y por el contratista"
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="acta-compromisos"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Alcance y compromisos
            </label>
            <textarea
              id="acta-compromisos"
              rows={3}
              value={datos.compromisos}
              onChange={(e) => setDatos((p) => ({ ...p, compromisos: e.target.value }))}
              placeholder="Alcance, cronograma y entregables socializados en la reunión"
              className={campo}
            />
          </div>

          <SelectorArchivo
            id="acta-archivo"
            etiqueta="Acta firmada"
            ayuda="El acta suscrita por las dos partes."
            archivo={acta}
            onElegir={setActa}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<PlayCircle className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={suscribir}
            >
              Suscribir
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
    </Marco>
  );
}
