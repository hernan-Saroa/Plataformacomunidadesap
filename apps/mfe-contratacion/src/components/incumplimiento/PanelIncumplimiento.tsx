import React, { useEffect, useState } from 'react';
import { AlertOctagon, Paperclip, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosIncumplimiento, EstadoCasoIncumplimiento, EstadoIncumplimiento } from '../../types';
import { TramiteSancionatorio } from './TramiteSancionatorio';
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
import { fechaLarga, hoyEnBogota } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const VACIO = {
  motivo: '',
  fechaHecho: hoyEnBogota(),
};

/** En qué punto va el caso, dicho para quien lo lee y no en clave. */
const NOMBRE_ESTADO: Record<EstadoCasoIncumplimiento, string> = {
  REPORTADO: 'Reportado, a la espera del área jurídica',
  EN_TRAMITE: 'En trámite sancionatorio',
  DECIDIDO: 'Decidido',
  ARCHIVADO: 'Archivado',
};

/**
 * Presunto incumplimiento del contrato (EFDS-1180 y EFDS-1181).
 *
 * El supervisor constata el hecho y con el reporte queda abierto el caso
 * (RF-INC-01); debajo de cada caso va el trámite del área jurídica —las
 * resoluciones, las audiencias y la caducidad— que pide RF-INC-02.
 *
 * Se dice «presunto» hasta que hay resolución a propósito: el supervisor
 * reporta lo que observa, y quien declara el incumplimiento es el área
 * jurídica al cabo de su trámite. Llamarlo de otro modo haría que la pantalla
 * afirmara algo que todavía no se ha resuelto.
 */
export function PanelIncumplimiento({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoIncumplimiento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [reportando, setReportando] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [archivo, setArchivo] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .incumplimiento(procesoId)
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
    setArchivo(null);
    setReportando(false);
  };

  const reportar = async () => {
    const cuerpo: DatosIncumplimiento = {
      motivo: datos.motivo.trim(),
      fechaHecho: datos.fechaHecho,
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.reportarIncumplimiento(procesoId, cuerpo, archivo));
      limpiar();
      toast.success('Presunto incumplimiento reportado: el caso queda abierto');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando los casos…</p>
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

  // El motivo es lo que el área jurídica lee para decidir si abre trámite, así
  // que se exige lo mismo que el servidor y no una palabra suelta.
  const completo = datos.motivo.trim().length >= 10 && datos.fechaHecho;

  // Los resueltos siguen en pantalla —el expediente los conserva— pero ya no
  // están esperando nada, así que no cuentan como casos abiertos.
  const sinResolver = estado.casos.filter(
    (caso) => caso.estado === 'REPORTADO' || caso.estado === 'EN_TRAMITE',
  );

  return (
    <Marco>
      <Titulo>Presunto incumplimiento</Titulo>
      <Ayuda>
        El supervisor reporta el presunto incumplimiento del contrato y con ello queda abierto el
        caso. Quien lo declara es el área jurídica, al cabo de su trámite.
      </Ayuda>

      {/* Qué falta y en qué paso se resuelve, en vez de un botón apagado. */}
      {!estado.enEjecucion ? (
        <Pendiente
          falta="9.1"
          texto={`Sin ejecución no ha corrido plazo que incumplir: ${
            estado.motivoNoPuede ?? 'el contrato todavía no ha arrancado'
          }.`}
        />
      ) : null}

      {sinResolver.length > 0 ? (
        <Aviso
          tono="aviso"
          titulo={
            sinResolver.length === 1
              ? 'Un caso abierto sobre el contrato'
              : `${sinResolver.length} casos abiertos sobre el contrato`
          }
        >
          {sinResolver.every((caso) => caso.estado === 'REPORTADO')
            ? 'Están a la espera de que el área jurídica abra el trámite sancionatorio.'
            : 'El área jurídica los está tramitando.'}
        </Aviso>
      ) : null}

      {estado.casos.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2.5">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Casos reportados</p>

          {estado.casos.map((caso) => (
            <div
              key={caso.id}
              className="pb-2.5 border-b border-gray-100 last:border-b-0 last:pb-0"
            >
              <p className="text-[11.5px] font-bold text-slate-700 m-0 flex items-start gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                Hecho del {fechaLarga(caso.fechaHecho)}
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                {caso.motivo}
              </p>
              <p className="text-[10.5px] text-slate-500 m-0 mt-0.5">
                {NOMBRE_ESTADO[caso.estado]}
                {caso.reportadoPor ? ` · reportado por ${caso.reportadoPor}` : ''}
              </p>
              {caso.soporte?.url ? (
                <a
                  href={contratacionService.urlDescarga(caso.soporte.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                >
                  <Paperclip className="w-3 h-3" />
                  {caso.soporte.nombre}
                </a>
              ) : null}

              <TramiteSancionatorio
                procesoId={procesoId}
                caso={caso}
                onEstado={setEstado}
                onCambio={onCambio}
              />
            </div>
          ))}
        </div>
      ) : null}

      {estado.puedeReportar && !reportando ? (
        <Boton icono={<ShieldAlert className="w-3.5 h-3.5" />} onClick={() => setReportando(true)}>
          Reportar un presunto incumplimiento
        </Boton>
      ) : null}

      {estado.puedeReportar && reportando ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nuevo reporte</p>

          <div>
            <label htmlFor="inc-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
              Fecha del hecho <span className="text-red-600">*</span>
            </label>
            <input
              id="inc-fecha"
              type="date"
              value={datos.fechaHecho}
              // Se reporta lo ya ocurrido, no lo que se teme.
              max={hoyEnBogota()}
              onChange={(e) => setDatos((p) => ({ ...p, fechaHecho: e.target.value }))}
              className={campo}
            />
          </div>

          <div>
            <label htmlFor="inc-motivo" className="block text-xs font-bold text-gray-600 mb-1.5">
              Qué se observó <span className="text-red-600">*</span>
            </label>
            <textarea
              id="inc-motivo"
              rows={3}
              value={datos.motivo}
              onChange={(e) => setDatos((p) => ({ ...p, motivo: e.target.value }))}
              placeholder="Es lo que el área jurídica lee para decidir si abre trámite"
              className={campo}
            />
          </div>

          {/* El soporte es opcional: un incumplimiento se constata a veces sin
              documento a la mano —una obra que no avanza—, y exigir uno dejaría
              al supervisor sin poder reportar lo que está viendo. */}
          <SelectorArchivo
            id="inc-archivo"
            etiqueta="Soporte"
            ayuda="Si tienes con qué acreditarlo. Puedes reportar sin adjuntar nada."
            obligatorio={false}
            archivo={archivo}
            onElegir={setArchivo}
          />

          <div className="flex items-center gap-2 pt-1">
            <Boton
              icono={<ShieldAlert className="w-3.5 h-3.5" />}
              disabled={!completo || guardando}
              onClick={reportar}
            >
              {guardando ? 'Reportando…' : 'Reportar el caso'}
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
