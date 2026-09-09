import React, { useEffect, useState } from 'react';
import { CalendarCheck, Eye, Paperclip, PlayCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosActaInicio, EstadoActaInicio } from '../../types';
import {
  Aviso,
  Ayuda,
  Boton,
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
  fechaInicio: hoyEnBogota(),
  temasTratados: '',
  asistentes: '',
  actaPactada: true,
};

/**
 * Actividad 9.1 · Reunión y acta de inicio (EFDS-1167).
 *
 * Lo que arranca la ejecución es la reunión, no el papel: la matriz describe el
 * acta como «firmada por ambas partes, si fue pactada en el contrato». Por eso
 * el acta se pide solo cuando el contrato la pactó, y la casilla es lo primero
 * que se decide en el formulario.
 */
export function PanelActaInicio({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoActaInicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [registrando, setRegistrando] = useState(false);
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
    setRegistrando(false);
  };

  const suscribir = async () => {
    const cuerpo: DatosActaInicio = {
      fechaInicio: datos.fechaInicio,
      temasTratados: datos.temasTratados.trim(),
      actaPactada: datos.actaPactada,
      ...(datos.asistentes.trim() ? { asistentes: datos.asistentes.trim() } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.suscribirActaInicio(procesoId, cuerpo, acta));
      limpiar();
      toast.success('Reunión de inicio registrada; el contrato queda en ejecución');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la reunión de inicio…</p>
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

  // Con acta pactada el documento es obligatorio; sin pactar, basta la reunión.
  const completo =
    datos.fechaInicio &&
    datos.temasTratados.trim().length >= 10 &&
    (!datos.actaPactada || !!acta);

  return (
    <Marco>
      <Titulo>Reunión de inicio</Titulo>
      <Ayuda>
        Las partes socializan alcance, cronograma y entregables. Con la reunión registrada el
        contrato queda en ejecución y empieza a correr su plazo.
      </Ayuda>

      {/* Qué falta y en qué paso se resuelve, en vez de un botón apagado. */}
      {!estado.acta && estado.motivoNoPuede ? (
        <Pendiente
          falta={estado.legalizado ? '8.2' : '8.5'}
          texto={`La ejecución empieza sobre un contrato legalizado y con supervisor: ${estado.motivoNoPuede}.`}
        />
      ) : null}

      {estado.supervisor ? (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-2.5 flex items-start gap-2.5">
          <Eye className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            Supervisa {estado.supervisor.nombre}
            {estado.supervisor.cargo ? ` · ${estado.supervisor.cargo}` : ''}
          </p>
        </div>
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
                <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed">
                  {estado.acta.actaPactada
                    ? 'Con acta firmada por ambas partes'
                    : 'El contrato no pactó acta de inicio'}
                  {estado.acta.registradoPor ? ` · registró ${estado.acta.registradoPor}` : ''}
                  {estado.acta.createdAt ? ` el ${momento(estado.acta.createdAt)}` : ''}
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

          <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">Lo que se socializó</p>
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed whitespace-pre-line">
              {estado.acta.temasTratados}
            </p>
            {estado.acta.asistentes ? (
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <Users className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11.5px] text-slate-500 m-0 leading-relaxed">
                  {estado.acta.asistentes}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {estado.puedeIniciar && !registrando ? (
        <Boton
          icono={<CalendarCheck className="w-3.5 h-3.5" />}
          onClick={() => setRegistrando(true)}
        >
          Registrar reunión de inicio
        </Boton>
      ) : null}

      {estado.puedeIniciar && registrando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Reunión celebrada</p>

          <div>
            <label htmlFor="acta-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha de la reunión <span className="text-red-600">*</span>
            </label>
            <input
              id="acta-fecha"
              type="date"
              value={datos.fechaInicio}
              max={hoyEnBogota()}
              onChange={(e) => setDatos((p) => ({ ...p, fechaInicio: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="acta-temas" className="block text-xs font-bold text-gray-600 mb-1.5">
              Qué se socializó <span className="text-red-600">*</span>
            </label>
            <textarea
              id="acta-temas"
              rows={4}
              value={datos.temasTratados}
              onChange={(e) => setDatos((p) => ({ ...p, temasTratados: e.target.value }))}
              placeholder="Alcance, cronograma y entregables acordados con el contratista"
              className={campo}
            />
          </div>

          <div>
            <label
              htmlFor="acta-asistentes"
              className="block text-xs font-bold text-gray-600 mb-1.5"
            >
              Asistentes
            </label>
            <input
              id="acta-asistentes"
              type="text"
              value={datos.asistentes}
              onChange={(e) => setDatos((p) => ({ ...p, asistentes: e.target.value }))}
              placeholder="Por la entidad y por el contratista"
              className={campo}
            />
          </div>

          {/* Se decide antes de pedir el archivo: de esta casilla depende que el
              acta sea exigible, y preguntarla después dejaría al usuario
              buscando un documento que quizá no existe. */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={datos.actaPactada}
              onChange={(e) => {
                const pactada = e.target.checked;
                setDatos((p) => ({ ...p, actaPactada: pactada }));
                if (!pactada) setActa(null);
              }}
              className="mt-0.5 w-3.5 h-3.5 accent-[#003DA5]"
            />
            <span className="text-[11.5px] text-slate-600 leading-relaxed">
              El contrato pactó acta de inicio firmada por ambas partes
            </span>
          </label>

          {datos.actaPactada ? (
            <SelectorArchivo
              id="acta-archivo"
              etiqueta="Acta firmada"
              ayuda="La suscrita por la entidad y el contratista"
              archivo={acta}
              onElegir={setActa}
            />
          ) : (
            <Aviso tono="aviso" titulo="Sin acta de inicio">
              La reunión queda registrada como soporte del arranque. Marca la casilla si el
              contrato sí la pactó.
            </Aviso>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Boton
              icono={<CalendarCheck className="w-3.5 h-3.5" />}
              disabled={!completo || guardando}
              onClick={suscribir}
            >
              {guardando ? 'Registrando…' : 'Registrar e iniciar ejecución'}
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
    </Marco>
  );
}
