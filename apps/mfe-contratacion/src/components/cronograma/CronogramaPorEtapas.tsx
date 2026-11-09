import React, { useEffect, useState } from 'react';
import { CalendarRange, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CronogramaPorEtapas as Cronograma, EtapaCronograma } from '../../types';
import { Boton, campo } from '../shared/PiezasPanel';
import { Permitido } from '../shared/Permitido';
import { fechaLarga } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

type Borrador = Record<number, { fechaInicio: string; fechaFin: string }>;

/** El mismo semáforo de los plazos del módulo; cumplida y sin fecha, en gris. */
const TONO = {
  VENCIDO: 'border-red-200 bg-red-50 text-red-900',
  POR_VENCER: 'border-amber-200 bg-amber-50 text-amber-900',
  VIGENTE: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  CUMPLIDA: 'border-gray-200 bg-slate-50 text-slate-500',
  SIN_FECHA: 'border-gray-200 bg-white text-slate-500',
} as const;

/** Cómo va la etapa, en una frase. */
function comoVa(e: EtapaCronograma): string {
  if (e.estado === 'CUMPLIDA') return 'Cumplida';
  if (e.estado === 'SIN_FECHA' || e.diasRestantes === null) return 'Sin programar';
  if (e.diasRestantes < 0) {
    const n = Math.abs(e.diasRestantes);
    return `Vencida hace ${n} ${n === 1 ? 'día' : 'días'}`;
  }
  if (e.diasRestantes === 0) return 'Vence hoy';
  return `Faltan ${e.diasRestantes} ${e.diasRestantes === 1 ? 'día' : 'días'}`;
}

/**
 * Cronograma del proceso por etapas macro — actividad 5.2 (migración 135).
 *
 * No es obligatorio: la 5.2 se cumple con el soporte del cronograma, y esto ni
 * la cierra ni la bloquea. Lo que añade es una fecha de fin por etapa contra la
 * que la plataforma alerta, en la vista de alertas y en el aviso diario.
 *
 * Cumplida no se marca: se deriva del avance del proceso (aprobó algo de una
 * etapa posterior, o terminó). Una marca a mano sería una alerta que sigue
 * sonando porque alguien olvidó quitarla.
 */
export function CronogramaPorEtapas({ procesoId, onCambio }: Props) {
  const [cronograma, setCronograma] = useState<Cronograma | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrador, setBorrador] = useState<Borrador>({});

  useEffect(() => {
    contratacionService
      .cronograma(procesoId)
      .then((datos) => {
        setCronograma(datos);
        setError(null);
      })
      .catch((err: any) => setError(err.message));
  }, [procesoId]);

  const empezar = () => {
    if (!cronograma) return;
    setBorrador(
      Object.fromEntries(
        cronograma.etapas.map((e) => [
          e.etapa,
          { fechaInicio: e.fechaInicio ?? '', fechaFin: e.fechaFin ?? '' },
        ]),
      ),
    );
    setEditando(true);
  };

  const cambiar = (etapa: number, campoFecha: 'fechaInicio' | 'fechaFin', valor: string) =>
    setBorrador((b) => ({ ...b, [etapa]: { ...b[etapa], [campoFecha]: valor } }));

  /** Lo que el servidor rechazaría, dicho antes de enviarlo. */
  const problema = Object.entries(borrador)
    .map(([etapa, f]) =>
      f.fechaInicio && !f.fechaFin
        ? `Etapa ${etapa}: falta la fecha de fin, que es contra la que se alerta`
        : f.fechaInicio && f.fechaFin && f.fechaInicio > f.fechaFin
          ? `Etapa ${etapa}: el inicio va después del fin`
          : null,
    )
    .find(Boolean);

  const guardar = async () => {
    if (!cronograma || problema) return;
    setGuardando(true);
    try {
      setCronograma(
        await contratacionService.guardarCronograma(
          procesoId,
          cronograma.etapas.map((e) => ({
            etapa: e.etapa,
            fechaInicio: borrador[e.etapa]?.fechaInicio || null,
            fechaFin: borrador[e.etapa]?.fechaFin || null,
            nota: e.nota,
          })),
        ),
      );
      setEditando(false);
      toast.success('Cronograma por etapas guardado');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-900">
        No se pudo cargar el cronograma por etapas: {error}
      </div>
    );
  }
  if (!cronograma) return null;

  const programadas = cronograma.etapas.filter((e) => e.fechaFin).length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-3">
      <div className="flex items-start gap-2.5">
        <CalendarRange className="w-4 h-4 mt-0.5 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 m-0">
            Cronograma por etapas <span className="font-normal text-slate-500">· opcional</span>
          </p>
          <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
            Hasta cuándo debería estar cumplida cada etapa. No es obligatorio para registrar la 5.2;
            las etapas con fecha alertan {cronograma.anticipacion}{' '}
            {cronograma.anticipacion === 1 ? 'día' : 'días'} antes de su fin y cuando se vencen
            sin cumplirse.
          </p>
        </div>
      </div>

      {!editando && programadas === 0 ? (
        <p className="text-xs text-slate-500 m-0">Ninguna etapa tiene fechas todavía.</p>
      ) : (
        <ul className="space-y-1.5 m-0 p-0 list-none">
          {cronograma.etapas.map((e) => (
            <li
              key={e.etapa}
              className={`rounded-lg border px-3 py-2 ${editando ? TONO.SIN_FECHA : TONO[e.estado]}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="text-xs font-bold m-0 flex-1" style={{ minWidth: 180 }}>
                  Etapa {e.etapa} · {e.nombre}
                </p>

                {editando ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-slate-500 flex items-center gap-1.5">
                      Inicio
                      <input
                        type="date"
                        aria-label={`Inicio de la etapa ${e.etapa}`}
                        value={borrador[e.etapa]?.fechaInicio ?? ''}
                        onChange={(ev) => cambiar(e.etapa, 'fechaInicio', ev.target.value)}
                        className={campo}
                        style={{ width: 150 }}
                      />
                    </label>
                    <label className="text-xs text-slate-500 flex items-center gap-1.5">
                      Fin
                      <input
                        type="date"
                        aria-label={`Fin de la etapa ${e.etapa}`}
                        value={borrador[e.etapa]?.fechaFin ?? ''}
                        onChange={(ev) => cambiar(e.etapa, 'fechaFin', ev.target.value)}
                        className={campo}
                        style={{ width: 150 }}
                      />
                    </label>
                  </div>
                ) : e.fechaFin ? (
                  <p className="text-xs m-0">
                    {e.fechaInicio ? `${fechaLarga(e.fechaInicio)} – ` : 'Hasta el '}
                    {fechaLarga(e.fechaFin)} · <span className="font-bold">{comoVa(e)}</span>
                  </p>
                ) : (
                  <p className="text-xs m-0">{comoVa(e)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando ? (
        <div className="space-y-2">
          {problema ? <p className="text-xs text-red-700 m-0">{problema}</p> : null}
          <p className="text-xs text-slate-500 m-0">
            Deja el fin vacío en las etapas que no quieras programar: no alertan.
          </p>
          <div className="flex items-center gap-2">
            <Boton icono={<Check className="w-3.5 h-3.5" />} disabled={guardando || !!problema} onClick={guardar}>
              {guardando ? 'Guardando…' : 'Guardar el cronograma'}
            </Boton>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-xs font-bold text-slate-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <Permitido accion="editar" punto="5.2">
          <Boton icono={<Pencil className="w-3.5 h-3.5" />} onClick={empezar}>
            {programadas === 0 ? 'Programar las etapas' : 'Editar el cronograma'}
          </Boton>
        </Permitido>
      )}
    </section>
  );
}
