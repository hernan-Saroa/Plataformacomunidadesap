import React, { useEffect, useState } from 'react';
import { Activity, Eye, FilePlus2, Paperclip, User } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DatosSeguimiento, EstadoSeguimiento, TipoSeguimiento } from '../../types';
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
  tipo: 'INFORME' as TipoSeguimiento,
  descripcion: '',
  fechaSoporte: hoyEnBogota(),
  periodoDesde: '',
  periodoHasta: '',
};

const NOMBRE_TIPO: Record<TipoSeguimiento, string> = {
  INFORME: 'Informe de supervisión',
  ACTA: 'Acta',
  SOPORTE: 'Otro soporte',
};

/**
 * Actividad 9.2 · Seguimiento de la ejecución (EFDS-1168).
 *
 * Los dos criterios de la historia en un panel: los soportes que el supervisor
 * carga al expediente, y el estado del contrato con sus responsables.
 */
export function PanelSeguimiento({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoSeguimiento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [cargandoSoporte, setCargandoSoporte] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [archivo, setArchivo] = useState<File | null>(null);

  const leer = () =>
    contratacionService
      .seguimiento(procesoId)
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
    setCargandoSoporte(false);
  };

  const cargar = async () => {
    if (!archivo) return;

    const cuerpo: DatosSeguimiento = {
      tipo: datos.tipo,
      descripcion: datos.descripcion.trim(),
      fechaSoporte: datos.fechaSoporte,
      ...(datos.periodoDesde ? { periodoDesde: datos.periodoDesde } : {}),
      ...(datos.periodoHasta ? { periodoHasta: datos.periodoHasta } : {}),
    };

    setGuardando(true);
    try {
      setEstado(await contratacionService.cargarSeguimiento(procesoId, cuerpo, archivo));
      limpiar();
      toast.success('Soporte cargado al expediente del contrato');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando el seguimiento…</p>
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

  const completo = archivo && datos.descripcion.trim().length >= 5 && datos.fechaSoporte;

  return (
    <Marco>
      <Titulo>Seguimiento de la ejecución</Titulo>
      <Ayuda>
        El supervisor carga los informes, actas y soportes que acreditan la ejecución. Quedan en
        el expediente del proceso con el periodo que cubren.
      </Ayuda>

      {/* Qué falta y en qué paso se resuelve, en vez de un botón apagado. */}
      {!estado.enEjecucion ? (
        <Pendiente
          falta="9.1"
          texto={`El seguimiento empieza con la ejecución: ${
            estado.motivoNoPuede ?? 'el contrato todavía no ha arrancado'
          }.`}
        />
      ) : null}

      {/* Segundo criterio: el estado actual del contrato y sus responsables. */}
      {estado.contrato && estado.enEjecucion ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <Activity className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-900" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-emerald-900 m-0">
                En ejecución
                {estado.contrato.ejecucionDesde
                  ? ` desde el ${fechaLarga(estado.contrato.ejecucionDesde)}`
                  : ''}
              </p>
              <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
                {estado.contrato.numero} · {estado.contrato.objeto}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {estado.responsables ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Responsables</p>

          <div className="flex items-start gap-2.5">
            <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
              Ejecuta {estado.responsables.contratista.nombre}
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <Eye className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
              {estado.responsables.supervisor ? (
                <>
                  Vigila {estado.responsables.supervisor.nombre}
                  {estado.responsables.supervisor.cargo
                    ? ` · ${estado.responsables.supervisor.cargo}`
                    : ''}
                  , desde el {fechaLarga(estado.responsables.supervisor.desde)}
                </>
              ) : (
                'El contrato no tiene supervisor designado'
              )}
            </p>
          </div>
        </div>
      ) : null}

      {/* Desde cuándo no se reporta: es lo que un seguimiento tiene que decir. */}
      {estado.resumen && estado.resumen.total > 0 ? (
        <Aviso tono="ok" titulo={`${estado.resumen.total} soportes en el expediente`}>
          {estado.resumen.informes} informes y {estado.resumen.actas} actas
          {estado.resumen.ultimoSoporte
            ? `. El último es del ${fechaLarga(estado.resumen.ultimoSoporte)}`
            : ''}
          .
        </Aviso>
      ) : null}

      {estado.soportes.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2.5">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Soportes cargados</p>

          {estado.soportes.map((s) => (
            <div key={s.id} className="pb-2.5 border-b border-gray-100 last:border-b-0 last:pb-0">
              <p className="text-[11.5px] font-bold text-slate-700 m-0">
                {NOMBRE_TIPO[s.tipo]} · {fechaLarga(s.fechaSoporte)}
              </p>
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed break-words">
                {s.descripcion}
              </p>
              {s.periodoDesde && s.periodoHasta ? (
                <p className="text-[10.5px] text-slate-500 m-0 mt-0.5">
                  Cubre del {fechaLarga(s.periodoDesde)} al {fechaLarga(s.periodoHasta)}
                </p>
              ) : null}
              {s.documento?.url ? (
                <a
                  href={contratacionService.urlDescarga(s.documento.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-[#003DA5] hover:underline"
                >
                  <Paperclip className="w-3 h-3" />
                  {s.documento.nombre}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {estado.puedeCargar && !cargandoSoporte ? (
        <Boton
          icono={<FilePlus2 className="w-3.5 h-3.5" />}
          onClick={() => setCargandoSoporte(true)}
        >
          Cargar un soporte
        </Boton>
      ) : null}

      {estado.puedeCargar && cargandoSoporte ? (
        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-3">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Nuevo soporte</p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="seg-tipo" className="block text-xs font-bold text-gray-600 mb-1.5">
                Qué es <span className="text-red-600">*</span>
              </label>
              <select
                id="seg-tipo"
                value={datos.tipo}
                onChange={(e) =>
                  setDatos((p) => ({ ...p, tipo: e.target.value as TipoSeguimiento }))
                }
                className={campo}
              >
                <option value="INFORME">Informe de supervisión</option>
                <option value="ACTA">Acta</option>
                <option value="SOPORTE">Otro soporte</option>
              </select>
            </div>
            <div>
              <label htmlFor="seg-fecha" className="block text-xs font-bold text-gray-600 mb-1.5">
                Fecha del soporte <span className="text-red-600">*</span>
              </label>
              <input
                id="seg-fecha"
                type="date"
                value={datos.fechaSoporte}
                max={hoyEnBogota()}
                onChange={(e) => setDatos((p) => ({ ...p, fechaSoporte: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <div>
            <label htmlFor="seg-desc" className="block text-xs font-bold text-gray-600 mb-1.5">
              Qué acredita <span className="text-red-600">*</span>
            </label>
            <textarea
              id="seg-desc"
              rows={2}
              value={datos.descripcion}
              onChange={(e) => setDatos((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Un archivo sin explicación obliga a abrirlo para saber qué es"
              className={campo}
            />
          </div>

          {/* El periodo es opcional: un acta de suspensión no cubre un mes,
              ocurre un día. */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="seg-desde" className="block text-xs font-bold text-gray-600 mb-1.5">
                Cubre desde
              </label>
              <input
                id="seg-desde"
                type="date"
                value={datos.periodoDesde}
                onChange={(e) => setDatos((p) => ({ ...p, periodoDesde: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="seg-hasta" className="block text-xs font-bold text-gray-600 mb-1.5">
                Hasta
              </label>
              <input
                id="seg-hasta"
                type="date"
                value={datos.periodoHasta}
                min={datos.periodoDesde || undefined}
                onChange={(e) => setDatos((p) => ({ ...p, periodoHasta: e.target.value }))}
                className={campo}
              />
            </div>
          </div>

          <SelectorArchivo
            id="seg-archivo"
            etiqueta="Soporte"
            ayuda="El informe, acta o documento que acredita lo ejecutado"
            archivo={archivo}
            onElegir={setArchivo}
          />

          <div className="flex items-center gap-2 pt-1">
            <Boton
              icono={<FilePlus2 className="w-3.5 h-3.5" />}
              disabled={!completo || guardando}
              onClick={cargar}
            >
              {guardando ? 'Cargando…' : 'Cargar al expediente'}
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
