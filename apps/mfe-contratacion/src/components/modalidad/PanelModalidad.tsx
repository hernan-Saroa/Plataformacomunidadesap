import React, { useEffect, useState } from 'react';
import { Check, Scale, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { EstadoModalidadProceso, Modalidad } from '../../types';
import { Aviso, Ayuda, Boton, BotonSecundario, Marco, Titulo, campo } from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Actividad 3.5 · Definir la modalidad de contratación (EFDS-1183).
 *
 * La modalidad se elige al crear el proceso, porque de ella depende qué
 * actividades recorre. Esta actividad no la vuelve a elegir: la **ratifica**.
 * El abogado que recibió el proceso mira la que el área puso, contra el objeto
 * y la cuantía, y la aprueba o la devuelve para que la corrijan.
 *
 * Hasta ahora era el panel genérico de constancia, así que la modalidad se daba
 * por definida subiendo un papel, sin que nadie hubiera mirado si era la que
 * correspondía.
 */
export function PanelModalidad({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoModalidadProceso | null>(null);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [corrigiendo, setCorrigiendo] = useState(false);
  const [elegida, setElegida] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    setCargando(true);
    contratacionService
      .modalidadDelProceso(procesoId)
      .then((r) => {
        setEstado(r);
        setElegida(r.modalidad ?? '');
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

    contratacionService.modalidades().then(setModalidades).catch(() => undefined);
  }, [procesoId]);

  const hacer = async (accion: () => Promise<EstadoModalidadProceso>, exito: string) => {
    setGuardando(true);
    try {
      const r = await accion();
      setEstado(r);
      setElegida(r.modalidad ?? '');
      setCorrigiendo(false);
      setDevolviendo(false);
      setObservaciones('');
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
        <p className="text-[11.5px] text-slate-400 m-0">Cargando la modalidad…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo cargar la modalidad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  const ratificada = estado.estado === 'APROBADO';
  const enRevision = estado.estado === 'EN_REVISION';
  const devuelta = estado.estado === 'DEVUELTO';
  const ultimaDevolucion = estado.revisiones.find((r) => r.decision === 'DEVUELTO');
  const motivoValido = observaciones.trim().length >= 10;

  return (
    <Marco>
      <Titulo>Modalidad de contratación</Titulo>
      <Ayuda>
        La modalidad se eligió al crear el proceso y de ella depende qué actividades recorre. Aquí
        el abogado la ratifica, o la devuelve para que el área la corrija.
      </Ayuda>

      {/* ----------------------------------------------- la que está puesta -- */}
      <div
        className={`rounded-lg border px-3.5 py-3 ${
          ratificada ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-slate-50'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Scale
            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              ratificada ? 'text-emerald-900' : 'text-slate-600'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-[13px] font-bold m-0 break-words ${
                ratificada ? 'text-emerald-900' : 'text-slate-800'
              }`}
            >
              {estado.modalidadNombre ?? 'Sin modalidad'}
            </p>
            {/* La cuantía junto a la modalidad, que es contra lo que se
                comprueba: de ella depende cuál corresponde. */}
            {typeof estado.valorEstimado === 'number' && (
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 tabular-nums">
                Valor estimado {formatoPesos.format(estado.valorEstimado)}
              </p>
            )}
            <p className="text-[11px] text-slate-500 m-0 mt-1">
              {ratificada
                ? 'Ratificada por el abogado'
                : enRevision
                  ? 'Esperando la revisión del abogado'
                  : devuelta
                    ? 'Devuelta para corregir'
                    : 'Sin revisar todavía'}
            </p>
          </div>
        </div>
      </div>

      {/* Lo que el abogado dijo al devolverla: es lo único que le permite al
          área corregir en vez de volver a adivinar. */}
      {devuelta && ultimaDevolucion && (
        <Aviso tono="aviso" titulo="El abogado la devolvió">
          «{ultimaDevolucion.observaciones}»
          {ultimaDevolucion.revisadoPor ? ` — ${ultimaDevolucion.revisadoPor}` : ''}
        </Aviso>
      )}

      {/* -------------------------------------------------------- el área -- */}
      {estado.puedeCorregir && !corrigiendo && (
        <Boton icono={<Check className="w-3.5 h-3.5" />} onClick={() => setCorrigiendo(true)}>
          {devuelta ? 'Corregir la modalidad' : 'Enviar a revisión'}
        </Boton>
      )}

      {corrigiendo && (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3">
          <label htmlFor="mod-elegida" className="block text-xs font-bold text-gray-600">
            Modalidad que corresponde <span className="text-red-600">*</span>
          </label>
          <select
            id="mod-elegida"
            value={elegida}
            disabled={guardando}
            onChange={(e) => setElegida(e.target.value)}
            className={campo}
          >
            <option value="">Elige la modalidad…</option>
            {modalidades.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 m-0">
            Al enviarla queda a la espera del abogado. Si la cuantía obliga a otra modalidad, el
            servidor la rechaza aquí igual que al crear el proceso.
          </p>

          <div className="flex items-center gap-2">
            <Boton
              icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
              disabled={!elegida || guardando}
              onClick={() =>
                hacer(
                  () => contratacionService.proponerModalidad(procesoId, elegida),
                  'Enviada: el abogado la revisará',
                )
              }
            >
              Enviar a revisión
            </Boton>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setCorrigiendo(false)}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- el abogado -- */}
      {enRevision && estado.puedeDecidir && !devolviendo && (
        <div className="flex items-center gap-2 flex-wrap">
          <Boton
            icono={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
            disabled={guardando}
            onClick={() =>
              hacer(
                () => contratacionService.decidirModalidad(procesoId, 'APROBADO'),
                'Modalidad ratificada',
              )
            }
          >
            Ratificar
          </Boton>
          <BotonSecundario
            icono={<Undo2 className="w-3.5 h-3.5" />}
            disabled={guardando}
            onClick={() => setDevolviendo(true)}
          >
            Devolver para corregir
          </BotonSecundario>
        </div>
      )}

      {/* A quien no le toca decidir se le dice por qué, en vez de dejarle una
          franja vacía donde otros ven dos botones. */}
      {enRevision && !estado.puedeDecidir && (
        <p className="text-[11.5px] text-slate-500 m-0">
          {estado.motivoNoDecide === 'SIN_ABOGADO'
            ? 'Nadie ha repartido este proceso todavía: se asigna abogado en la actividad 3.3.'
            : estado.motivoNoDecide === 'NO_ES_TUYO'
              ? `La revisa ${estado.abogado?.nombre ?? 'otro abogado'}.`
              : 'La ratifica el abogado al que se le asignó el proceso.'}
        </p>
      )}

      {devolviendo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3.5 py-3 space-y-3">
          <label htmlFor="mod-motivo" className="block text-xs font-bold text-gray-600">
            Qué modalidad corresponde y por qué <span className="text-red-600">*</span>
          </label>
          <textarea
            id="mod-motivo"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Por la cuantía corresponde licitación pública, no selección abreviada…"
            className={campo}
          />
          <p className="text-[11px] text-amber-700 m-0">
            Sin decirlo, el área repetiría la misma elección y el ciclo no acabaría.
          </p>

          <div className="flex items-center gap-2">
            <BotonSecundario
              icono={<Undo2 className="w-3.5 h-3.5" />}
              disabled={!motivoValido || guardando}
              onClick={() =>
                hacer(
                  () =>
                    contratacionService.decidirModalidad(
                      procesoId,
                      'DEVUELTO',
                      observaciones.trim(),
                    ),
                  'Devuelta al área para que la corrija',
                )
              }
            >
              Devolver
            </BotonSecundario>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setDevolviendo(false)}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* El ciclo completo, que es lo que explica por qué una modalidad se
          cambió dos veces antes de quedar ratificada. */}
      {estado.revisiones.length > 0 && (
        <ul className="m-0 p-0 list-none space-y-2">
          {estado.revisiones.map((r, i) => (
            <li
              key={`${r.createdAt}-${i}`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <p className="text-[12px] font-bold text-slate-700 m-0">
                {r.decision === 'APROBADO' ? 'Ratificada' : 'Devuelta'}
                <span className="font-normal text-slate-400">
                  {' · '}
                  {r.revisadoPor} · {momento(r.createdAt)}
                </span>
              </p>
              {r.observaciones && (
                <p className="text-[11px] text-slate-600 m-0 mt-1 leading-relaxed break-words">
                  «{r.observaciones}»
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Marco>
  );
}
