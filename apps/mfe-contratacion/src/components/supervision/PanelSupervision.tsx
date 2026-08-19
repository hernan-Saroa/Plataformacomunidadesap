import React, { useEffect, useState } from 'react';
import { BellRing, Check, Eye, Paperclip, Undo2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosSupervisor, EstadoSupervision, Persona } from '../../types';
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
import { fechaLarga, hoyEnBogota } from '../shared/fechas';
import { SelectorPersona } from '../estudio-previo/SelectorPersona';

interface Props {
  procesoId: string;
  onCambio?: () => void;
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
  const [estado, setEstado] = useState<EstadoSupervision | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [designando, setDesignando] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [datos, setDatos] = useState(VACIO);
  const [acto, setActo] = useState<File | null>(null);

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
    setPersona(null);
    setDatos(VACIO);
    setActo(null);
    setDesignando(false);
  };

  const designar = async () => {
    if (!persona || !acto) return;

    const cuerpo: DatosSupervisor = {
      personaId: persona.id,
      nombre: persona.nombre,
      fechaDesignacion: datos.fechaDesignacion,
      ...(datos.cargo.trim() ? { cargo: datos.cargo.trim() } : {}),
      ...(persona.email ? { email: persona.email } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.designarSupervisor(procesoId, cuerpo, acto));
      limpiar();
      toast.success('Supervisor designado; queda avisarle de su designación');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const relevar = async () => {
    const motivo = window.prompt('¿Por qué se releva al supervisor?')?.trim();
    if (!motivo) return;

    setGuardando(true);
    try {
      setEstado(await contratacionService.relevarSupervisor(procesoId, motivo));
      toast.success('Supervisor relevado; el contrato queda sin quien lo vigile');
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

  const completo = persona && acto && datos.fechaDesignacion;

  return (
    <Marco>
      <Titulo>Supervisión del contrato</Titulo>
      <Ayuda>
        El Ordenador del Gasto designa por acto administrativo a quien vigilará la ejecución. Al
        supervisor hay que comunicarle su designación.
      </Ayuda>

      {/* Por qué no se puede todavía, en vez de un botón apagado sin explicar. */}
      {!estado.legalizado ? (
        <Pendiente
          falta="8.4"
          texto={`El supervisor se designa sobre un contrato legalizado: ${
            estado.motivoNoLegalizado ?? 'todavía no lo está'
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

          {/* La matriz pide en 8.2 que se le alerte. Mientras el sistema no
              envíe correos, el aviso lo hace una persona y aquí se registra:
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
                    El sistema todavía no envía la notificación
                    {estado.supervisor.email ? `; escríbele a ${estado.supervisor.email}` : ''}. Deja
                    constancia cuando se lo hayas comunicado.
                  </p>
                </div>
              </div>
              <BotonSecundario
                icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
                disabled={guardando}
                onClick={avisar}
              >
                Ya se le comunicó
              </BotonSecundario>
            </div>
          ) : (
            <Aviso tono="ok" titulo="El supervisor ya fue notificado">
              Se le comunicó su designación
              {estado.supervisor.alertaEnviadaAt
                ? ` el ${fechaLarga(estado.supervisor.alertaEnviadaAt)}`
                : ''}
              .
            </Aviso>
          )}

          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={relevar}
          >
            Relevar al supervisor
          </BotonSecundario>
        </>
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
                {s.relevadoAt ? ` al ${fechaLarga(s.relevadoAt)}` : ''}
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
            <SelectorPersona
              id="sup-persona"
              value={persona?.nombre ?? ''}
              onChange={(nombre) => {
                if (!nombre) setPersona(null);
              }}
              onSeleccionar={(elegida) => setPersona(elegida)}
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
                Fecha del acto <span className="text-red-600">*</span>
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
            etiqueta="Acto de designación"
            ayuda="El acto administrativo firmado por el ordenador del gasto."
            archivo={acto}
            onElegir={setActo}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              icono={<UserCheck className="w-3.5 h-3.5" />}
              disabled={guardando || !completo}
              onClick={designar}
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
    </Marco>
  );
}
