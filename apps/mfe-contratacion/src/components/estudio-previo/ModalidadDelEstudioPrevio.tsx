import React, { useEffect, useState } from 'react';
import { Lightbulb, Lock, Scale } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { useSugerenciaModalidad } from '../../hooks/useSugerenciaModalidad';
import { EstudioPrevio, Modalidad } from '../../types';
import { campo } from '../shared/PiezasPanel';
import { useDialogo } from '../shared/useDialogo';

interface Props {
  procesoId: string;
  proceso: EstudioPrevio['proceso'];
  /** El área que radicó, con la 3.1 en borrador o devuelta. */
  puedeCambiar: boolean;
  /** Con el proceso ya cambiado, para que la lista de documentos se relea. */
  onCambiada: (proceso: EstudioPrevio['proceso']) => void;
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * La modalidad de contratación dentro del estudio previo, junto al valor que
 * la determina.
 *
 * Antes la modalidad era la 3.5, y llegaba tarde: la lista de documentos de la
 * 3.1 depende de ella (migración 094). El valor ya no se corrige aquí: sale de
 * la línea del PAA y solo cambia con una versión nueva del PAA (migración 105).
 * Por eso la sugerencia y los umbrales se calculan sobre ese valor. La
 * modalidad no se ratifica aparte: aprobar el estudio previo es ratificarla, y
 * si no corresponde, el abogado lo devuelve.
 */
export function ModalidadDelEstudioPrevio({ procesoId, proceso, puedeCambiar, onCambiada }: Props) {
  const dialogo = useDialogo();
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [cambiando, setCambiando] = useState(false);
  const [elegida, setElegida] = useState(proceso.modalidad ?? '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!cambiando || modalidades.length > 0) return;
    contratacionService.modalidades().then(setModalidades).catch(() => undefined);
  }, [cambiando, modalidades.length]);

  const valorActual = typeof proceso.valorEstimado === 'number' ? proceso.valorEstimado : null;
  const { sugerencia, consultando } = useSugerenciaModalidad(cambiando ? valorActual : null);
  const bloqueadas = sugerencia?.modalidadesBloqueadas ?? [];

  // Si el valor del PAA obliga a licitación pública —una versión nueva pudo
  // subirlo—, se fija sola en vez de dejar elegir algo que el servidor va a
  // rechazar. Si la elegida sigue permitida, se respeta.
  useEffect(() => {
    if (!sugerencia?.forzosa || !sugerencia.modalidad) return;
    if (elegida === '' || bloqueadas.includes(elegida)) setElegida(sugerencia.modalidad);
  }, [sugerencia, elegida]);

  const cambiaModalidad = elegida !== '' && elegida !== proceso.modalidad;

  const abrir = () => {
    setElegida(proceso.modalidad ?? '');
    setCambiando(true);
  };

  const cambiar = async () => {
    if (!cambiaModalidad) return;
    const nombre = modalidades.find((m) => m.codigo === elegida)?.nombre ?? elegida;
    const seguro = await dialogo.confirmar({
      titulo: `Cambiar a ${nombre}`,
      descripcion:
        'La lista de documentos pasa a ser la de esta modalidad, y también cambia qué ' +
        'actividades recorre el proceso. Lo que ya cargaste y la lista nueva no pide no se ' +
        'borra: queda aparte.',
      confirmar: 'Cambiar la modalidad',
    });
    if (!seguro) return;

    setGuardando(true);
    try {
      const r = await contratacionService.cambiarModalidadDelEstudioPrevio(procesoId, elegida);
      setCambiando(false);
      toast.success(`Modalidad cambiada a ${r.proceso.modalidadNombre ?? nombre}`);
      onCambiada(r.proceso);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      aria-label="Modalidad de contratación"
      className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <Scale className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 m-0">
            Modalidad de contratación
          </p>
          <p className="text-[13px] font-bold text-slate-800 m-0 mt-0.5 break-words">
            {proceso.modalidadNombre ?? 'Sin modalidad'}
          </p>
          {/* La cuantía junto a la modalidad: de ella depende cuál corresponde. */}
          {valorActual !== null && (
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 tabular-nums">
              Valor estimado {formatoPesos.format(valorActual)} · según el PAA
            </p>
          )}
          <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
            De ella depende la lista de documentos. El abogado la ratifica al aprobar el estudio
            previo, o lo devuelve diciendo cuál corresponde.
          </p>
        </div>
        {puedeCambiar && !cambiando && (
          <button
            type="button"
            onClick={abrir}
            className="shrink-0 text-[11.5px] font-bold text-[#003DA5] hover:underline"
          >
            Cambiar
          </button>
        )}
      </div>

      {cambiando && (
        <div className="space-y-2">
          <label htmlFor="ep-modalidad" className="block text-xs font-bold text-gray-600">
            Modalidad que corresponde <span className="text-red-600">*</span>
          </label>
          <select
            id="ep-modalidad"
            value={elegida}
            disabled={guardando}
            onChange={(e) => setElegida(e.target.value)}
            className={campo}
          >
            <option value="">Elige la modalidad…</option>
            {modalidades.map((m) => {
              // Deshabilitada y no oculta: ver la opción vetada explica la regla.
              const vetada = bloqueadas.includes(m.codigo);
              return (
                <option key={m.codigo} value={m.codigo} disabled={vetada}>
                  {m.nombre}
                  {vetada ? ' — no aplica por la cuantía' : ''}
                </option>
              );
            })}
          </select>

          {consultando ? (
            <p className="text-[11px] text-gray-400 m-0">Calculando la modalidad…</p>
          ) : sugerencia?.forzosa && sugerencia.modalidad ? (
            <div
              role="status"
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-900 m-0 leading-relaxed">
                <span className="font-bold">{sugerencia.nombre} obligatoria.</span>{' '}
                {sugerencia.motivo}. Las modalidades de menor cuantía quedan deshabilitadas.
              </p>
            </div>
          ) : sugerencia?.modalidad && sugerencia.modalidad !== elegida ? (
            // Solo se dice cuando discrepa de la elegida: si coinciden, no hay
            // nada que advertir.
            <div
              role="status"
              className="rounded-lg border border-[#003DA5]/20 bg-[#E0EDFF] px-3 py-2 flex items-start gap-2"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#003DA5] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-700 m-0 leading-relaxed">
                Por la cuantía corresponde <span className="font-bold">{sugerencia.nombre}</span>.
                Es una sugerencia: puedes conservar otra si la causal lo justifica.
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!cambiaModalidad || guardando}
              onClick={cambiar}
              className="px-3 py-1.5 rounded-lg bg-[#003DA5] text-white text-[11.5px] font-bold
                hover:bg-[#002D7A] disabled:opacity-50 transition-colors"
            >
              {guardando ? 'Guardando…' : 'Guardar el cambio'}
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => setCambiando(false)}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {dialogo.elemento}
    </section>
  );
}
