import React, { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
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
 * La modalidad de contratación, dentro del estudio previo (migración 094).
 *
 * Antes era la 3.5, y llegaba tarde: la lista de documentos de la 3.1 depende
 * de la modalidad, pero solo se podía corregir con el estudio previo ya
 * enviado. Ahora el área la cambia mientras arma la 3.1 y la lista cambia con
 * ella. No se ratifica aparte: aprobar el estudio previo es ratificarla.
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

  const abrir = () => {
    setElegida(proceso.modalidad ?? '');
    setCambiando(true);
  };

  const cambiar = async () => {
    const nombre = modalidades.find((m) => m.codigo === elegida)?.nombre ?? elegida;
    const seguro = await dialogo.confirmar({
      titulo: `Cambiar a ${nombre}`,
      descripcion:
        'La lista de documentos pasa a ser la de esta modalidad, y también cambia qué actividades ' +
        'recorre el proceso. Lo que ya cargaste y la lista nueva no pide no se borra: queda aparte.',
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
          {typeof proceso.valorEstimado === 'number' && (
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 tabular-nums">
              Valor estimado {formatoPesos.format(proceso.valorEstimado)}
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
            {modalidades.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 m-0">
            Si la cuantía obliga a otra modalidad, el servidor la rechaza igual que al crear el
            proceso.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!elegida || elegida === proceso.modalidad || guardando}
              onClick={cambiar}
              className="px-3 py-1.5 rounded-lg bg-[#003DA5] text-white text-[11.5px] font-bold
                hover:bg-[#002D7A] disabled:opacity-50 transition-colors"
            >
              {guardando ? 'Cambiando…' : 'Cambiar la modalidad'}
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
