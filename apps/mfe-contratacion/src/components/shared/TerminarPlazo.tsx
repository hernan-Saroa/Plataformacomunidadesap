import React, { useState } from 'react';
import { FastForward } from 'lucide-react';
import { toast } from 'sonner';

import { BotonSecundario } from './PiezasPanel';

interface Props<T> {
  /**
   * Si hay que ofrecerlo.
   *
   * Lo decide el backend —no el cliente— comprobando el permiso
   * `contratacion.plazo.terminar` y que el término siga corriendo: una pantalla
   * que lo dedujera ofrecería un botón que la API rechaza.
   */
  visible: boolean;
  /** Qué término se termina, dicho como lo llama el panel donde está. */
  termino: string;
  terminar: () => Promise<T>;
  onTerminado: (estado: T) => void;
  /** Un efecto lateral propio de este término, si lo tiene. */
  nota?: string;
  disabled?: boolean;
}

/**
 * «Terminar el plazo ahora», la llave de pruebas de los términos que bloquean.
 *
 * El término de publicidad del pliego y el de subsanaciones duran días hábiles
 * reales, así que recorrer un proceso completo en una sesión de QA exigía
 * esperarlos: en la práctica no se probaba nada de lo que viene después.
 *
 * No finge el vencimiento: el backend mueve la fecha a ayer y lo anota en la
 * trazabilidad. De ahí en adelante todo —el cierre, la extemporaneidad de lo
 * que llegue tarde, el conteo de días— se comporta exactamente como en
 * producción, que es justo lo que hay que poder probar. Y el expediente puede
 * decir después que a ese término lo acortó alguien.
 *
 * Aparte del bloque de la actividad y con el aviso a la vista, para que nadie
 * lo confunda con una acción del trámite.
 */
export function TerminarPlazo<T>({
  visible,
  termino,
  terminar,
  onTerminado,
  nota,
  disabled,
}: Props<T>) {
  const [terminando, setTerminando] = useState(false);

  if (!visible) return null;

  const hacer = async () => {
    setTerminando(true);
    try {
      onTerminado(await terminar());
      toast.success(`${termino} queda vencido`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTerminando(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3.5 py-3 space-y-2">
      <p className="text-[11.5px] font-bold text-amber-900 m-0">Solo para pruebas</p>
      <p className="text-[11px] text-slate-600 m-0">
        Da por vencido {termino.toLowerCase()} sin esperar los días hábiles. Queda registrado en la
        trazabilidad con la fecha que tenía, y el proceso sigue como si el término se hubiera
        cumplido.
      </p>
      {nota && <p className="text-[11px] text-slate-600 m-0">{nota}</p>}
      <BotonSecundario
        icono={<FastForward className="w-3.5 h-3.5" />}
        disabled={terminando || disabled}
        onClick={hacer}
      >
        {terminando ? 'Terminando…' : 'Terminar el plazo ahora'}
      </BotonSecundario>
    </div>
  );
}
