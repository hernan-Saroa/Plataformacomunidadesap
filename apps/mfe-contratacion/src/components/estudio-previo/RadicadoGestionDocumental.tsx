import React, { useEffect, useState } from 'react';
import { Hash, Save } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';

interface Props {
  procesoId: string;
  /** El estudio previo está en revisión, aprobado o negado: solo se lee. */
  bloqueado: boolean;
}

/**
 * El consecutivo de Active Document con el que el área remitió el paquete
 * de la radicación (3.1).
 *
 * Va debajo de la lista de documentos y no encima: primero se arma lo que se
 * remite, después se anota con qué número se remitió. Es lo único del acto de
 * radicar que no es un documento, y por eso no está en la lista.
 */
export function RadicadoGestionDocumental({ procesoId, bloqueado }: Props) {
  const [guardado, setGuardado] = useState<string | null>(null);
  const [radicado, setRadicado] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    contratacionService
      .radicado(procesoId)
      .then((r) => {
        setGuardado(r.radicadoGestionDocumental);
        setRadicado(r.radicadoGestionDocumental ?? '');
      })
      .catch(() => undefined);
  }, [procesoId]);

  const anotar = async () => {
    setOcupado(true);
    try {
      const r = await contratacionService.anotarRadicado(procesoId, radicado.trim());
      setGuardado(r.radicadoGestionDocumental);
      toast.success('Número de radicado guardado');
    } catch (err: any) {
      toast.error(err.message ?? 'No pudimos guardar el radicado. Inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <Hash className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-slate-800 m-0">Radicado de Active Document</p>
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
            Es el número que asigna Active Document cuando remites los documentos. Si los enviaste
            por correo o por carpeta compartida, déjalo vacío.
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        {bloqueado ? (
          <p className="text-[11.5px] text-slate-700 m-0 tabular-nums">
            {guardado ?? 'Se remitió sin número de radicado.'}
          </p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={radicado}
              onChange={(e) => setRadicado(e.target.value)}
              placeholder="Ej.: 2026-EE-004512"
              aria-label="Radicado de Active Document"
              className="flex-1 min-w-[10rem] rounded-md border border-gray-300 px-2.5 py-1.5
                text-[12px] tabular-nums focus:outline-none focus:border-[#003DA5]"
            />
            <button
              type="button"
              disabled={ocupado || radicado.trim() === (guardado ?? '')}
              onClick={anotar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md
                bg-[#003DA5] text-white hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
