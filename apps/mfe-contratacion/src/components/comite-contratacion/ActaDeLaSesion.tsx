import React, { useState } from 'react';
import { FileClock, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { SesionComite } from '../../types';
import { Boton, SelectorArchivo } from '../shared/PiezasPanel';

interface Props {
  procesoId: string;
  sesion: SesionComite;
  /** Si quien mira la carga: quien hace la actividad de esa sesión. */
  puedeCargar: boolean;
  onCargada: () => void;
}

/**
 * El acta de una sesión del comité, cuando todavía no llegó (migración 113).
 *
 * El acta tarda hasta diez días y no frena el proceso: la sesión se registra
 * sin ella, y aquí se carga cuando llegue. Mientras falte, el abogado del
 * proceso la tiene en sus alertas. La usan la 3.7 y la 5.6.1.
 */
export function ActaDeLaSesion({ procesoId, sesion, puedeCargar, onCargada }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [acta, setActa] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (sesion.tieneActa) return null;

  const cargar = async () => {
    if (!acta) return;
    setGuardando(true);
    try {
      await contratacionService.cargarActaComite(procesoId, sesion.id, acta);
      toast.success('Acta cargada');
      setAbierto(false);
      setActa(null);
      onCargada();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 space-y-2">
      <p className="text-[11.5px] font-bold text-amber-900 m-0 flex items-center gap-1.5">
        <FileClock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        Falta el acta de esta sesión
      </p>
      <p className="text-[11px] text-amber-900 m-0">
        No frena el proceso, pero queda en las alertas de quien lleva el caso hasta que se cargue.
      </p>

      {puedeCargar && !abierto && (
        <Boton icono={<Upload className="w-3.5 h-3.5" />} onClick={() => setAbierto(true)}>
          Cargar el acta
        </Boton>
      )}

      {abierto && (
        <div className="space-y-2">
          <SelectorArchivo
            id={`acta-${sesion.id}`}
            etiqueta="Acta de la sesión"
            archivo={acta}
            onElegir={setActa}
          />
          <div className="flex items-center gap-2">
            <Boton
              icono={<Upload className="w-3.5 h-3.5" />}
              disabled={!acta || guardando}
              onClick={cargar}
            >
              Guardar el acta
            </Boton>
            <button
              type="button"
              disabled={guardando}
              onClick={() => {
                setAbierto(false);
                setActa(null);
              }}
              className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
