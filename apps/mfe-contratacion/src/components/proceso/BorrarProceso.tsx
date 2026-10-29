import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { useDialogo } from '../shared/useDialogo';

interface Props {
  procesoId: string;
  radicado: string;
  /** Ya no hay proceso que mostrar: se vuelve al listado. */
  onBorrado: () => void;
}

/**
 * Borrar el proceso con todo lo suyo (migración 108).
 *
 * Solo lo ve el superadministrador —lo dice el servicio con `puedeBorrar`—.
 * Pide el radicado escrito y no solo un clic: no se puede deshacer, y la
 * trazabilidad se va con el proceso, así que el motivo es lo único que queda.
 */
export function BorrarProceso({ procesoId, radicado, onBorrado }: Props) {
  const dialogo = useDialogo();
  const [borrando, setBorrando] = useState(false);

  const borrar = async () => {
    const r = await dialogo.pedirDatos({
      titulo: `Borrar ${radicado}`,
      descripcion:
        'Se borran el proceso, sus actividades, el expediente con sus documentos y la ' +
        'trazabilidad, y su línea del PAA queda libre. No se puede deshacer. Para terminar un ' +
        'proceso que sí existió están cancelar, negar o declarar desierto.',
      campos: [
        {
          nombre: 'radicado',
          etiqueta: 'Escribe el radicado para confirmar',
          multilinea: false,
          placeholder: radicado,
        },
        { nombre: 'motivo', etiqueta: 'Por qué se borra' },
      ],
      confirmar: 'Borrar el proceso',
      tono: 'peligro',
    });
    if (!r) return;

    setBorrando(true);
    try {
      await contratacionService.borrarProceso(procesoId, r.radicado, r.motivo);
      toast.success(`Proceso ${radicado} borrado`);
      onBorrado();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBorrando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={borrar}
        disabled={borrando}
        title="Borrar el proceso"
        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200
          text-[11.5px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        {borrando ? 'Borrando…' : 'Borrar'}
      </button>
      {dialogo.elemento}
    </>
  );
}
