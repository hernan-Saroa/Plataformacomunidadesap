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
            De ella depende la lista de documentos. Se ratifica al aprobar el estudio
            previo; si no corresponde, se devuelve diciendo cuál.
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
    </section>
  );
}
