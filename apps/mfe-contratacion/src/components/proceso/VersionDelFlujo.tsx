import React, { useEffect, useState } from 'react';
import { RefreshCw, Workflow } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { FlujoDelProceso } from '../../types';
import { useDialogo } from '../shared/useDialogo';

/**
 * Con qué versión del flujo corre el proceso (migración 111).
 *
 * Cada proceso termina con la versión con la que nació: cambiar quién hace o
 * quién revisa a mitad de camino lo dejaría con medio flujo viejo y medio
 * nuevo. Si hay una versión más nueva, quien lo lleva puede pasarlo a ella con
 * un motivo.
 */
export function VersionDelFlujo({ procesoId, onCambio }: { procesoId: string; onCambio?: () => void }) {
  const [estado, setEstado] = useState<FlujoDelProceso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const dialogo = useDialogo();

  useEffect(() => {
    contratacionService
      .flujoDelProceso(procesoId)
      .then(setEstado)
      .catch(() => setEstado(null));
  }, [procesoId]);

  if (!estado || estado.version === null) return null;

  const actualizar = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: `Pasar el proceso a la versión ${estado.activa} del flujo`,
      descripcion:
        'Cambia quién hace y quién revisa lo que le falta. Lo que ya está en revisión sigue con su cadena hasta que se vuelva a enviar.',
      confirmar: 'Pasar a la versión nueva',
    });
    if (!motivo) return;
    setOcupado(true);
    try {
      setEstado(await contratacionService.actualizarFlujoDelProceso(procesoId, motivo));
      toast.success(`El proceso corre ahora con la versión ${estado.activa}`);
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo actualizar');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 flex items-start gap-2.5">
      <Workflow className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-bold text-slate-500">Flujo de trabajo</p>
        <p className="m-0 text-sm text-slate-900">
          Versión {estado.version}
          {estado.desactualizado ? <span className="text-amber-700"> · la activa es la {estado.activa}</span> : null}
        </p>
      </div>
      {estado.desactualizado && estado.puedeActualizar ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={actualizar}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      ) : null}
      {dialogo.elemento}
    </div>
  );
}
