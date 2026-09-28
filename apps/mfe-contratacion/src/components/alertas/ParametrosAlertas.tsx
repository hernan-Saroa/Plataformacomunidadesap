import React, { useEffect, useState } from 'react';
import { BellRing, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { ParametroAlerta } from '../../types';
import { Modal } from '../shared/Modal';

/** Cómo se llama cada plazo y cómo se lee su valor. */
const PLAZO: Record<string, { nombre: string; valor: (n: number) => string }> = {
  anticipacion_amparo: { nombre: 'Pólizas', valor: (n) => `${n} ${n === 1 ? 'día' : 'días'} antes` },
  anticipacion_cdp: { nombre: 'CDP', valor: (n) => `${n} ${n === 1 ? 'día' : 'días'} antes` },
  anticipacion_rp: { nombre: 'Registro presupuestal', valor: (n) => `${n} ${n === 1 ? 'día' : 'días'} antes` },
  anticipacion_liquidacion: { nombre: 'Liquidación', valor: (n) => `${n} ${n === 1 ? 'día' : 'días'} antes` },
  tolerancia_sin_abogado: { nombre: 'Proceso sin abogado', valor: (n) => `${n} ${n === 1 ? 'día' : 'días'} de espera` },
  hora_aviso: { nombre: 'Aviso diario', valor: (n) => `${n}:00, hora de Bogotá` },
};

const nombreDe = (p: ParametroAlerta) => PLAZO[p.clave]?.nombre ?? p.clave;
const valorDe = (p: ParametroAlerta) => PLAZO[p.clave]?.valor(p.valor) ?? String(p.valor);

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

interface Props {
  /** Si quien mira puede cambiarlos: la Dirección de Contratación. */
  puedeEditar: boolean;
}

/**
 * Los plazos de las alertas (EFDS-1183), en la pestaña de configuración de Alertas.
 *
 * Una tabla y un «Cambiar» por fila, igual que la pantalla de Plazos de
 * publicidad: son la misma clase de dato —un número de días que gobierna a
 * todos los procesos— y verse distinto obligaría a aprender dos pantallas para
 * lo mismo.
 */
export function ParametrosAlertas({ puedeEditar }: Props) {
  const [parametros, setParametros] = useState<ParametroAlerta[] | null>(null);
  const [editando, setEditando] = useState<ParametroAlerta | null>(null);

  const cargar = async () => {
    try {
      setParametros(await contratacionService.parametrosAlerta());
    } catch (err: any) {
      toast.error('No se pudieron cargar los plazos de las alertas', {
        id: 'plazos-alertas-carga',
        description: err.message,
      });
      setParametros([]);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0">
          Plazos de las alertas
        </p>
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
          Con cuánta anticipación aparece cada vencimiento en la lista de alertas, y a qué hora
          sale el aviso diario.
        </p>
      </div>

      {parametros === null ? (
        <SkeletonTable rows={3} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50">
                <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Alerta
                </th>
                <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Plazo
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {parametros.map((p) => (
                <tr key={p.clave} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 text-[12.5px] font-bold text-slate-800">{nombreDe(p)}</td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-700 tabular-nums">{valorDe(p)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => setEditando(p)}
                        aria-label={`Cambiar ${nombreDe(p)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 text-slate-600 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Cambiar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? nombreDe(editando) : ''}
        description="Rige desde la próxima consulta de alertas"
        icon={<BellRing className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="medium"
      >
        {editando && (
          <EditorParametro
            parametro={editando}
            onListo={(lista) => {
              setParametros(lista);
              setEditando(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EditorParametro({
  parametro,
  onListo,
}: {
  parametro: ParametroAlerta;
  onListo: (lista: ParametroAlerta[]) => void;
}) {
  const [texto, setTexto] = useState(String(parametro.valor));
  const [guardando, setGuardando] = useState(false);

  const numero = Number(texto);
  const valido =
    texto !== '' && Number.isInteger(numero) && numero >= parametro.minimo && numero <= parametro.maximo;

  const guardar = async () => {
    setGuardando(true);
    try {
      const lista = await contratacionService.guardarParametrosAlerta({ [parametro.clave]: numero });
      toast.success(`${nombreDe(parametro)} actualizado`);
      onListo(lista);
    } catch (err: any) {
      toast.error('No se pudo guardar el plazo', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs font-bold text-slate-600 mb-1">
          {parametro.clave === 'hora_aviso' ? 'Hora' : 'Días'}
        </span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          aria-label={nombreDe(parametro)}
          className={`${campo} tabular-nums`}
        />
        <span className="block text-[11px] text-slate-500 mt-1 leading-relaxed">
          {parametro.descripcion}. Entre {parametro.minimo} y {parametro.maximo}.
        </span>
      </label>

      <button
        type="button"
        disabled={guardando || !valido}
        onClick={guardar}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        Guardar plazo
      </button>
    </div>
  );
}
