import React, { useEffect, useState } from 'react';
import { Coins, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { SmmlvAnual } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { EditorSmmlv } from './EditorSmmlv';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Salario mínimo por año.
 *
 * Es lo que quedó de la antigua pantalla de Umbrales: la modalidad y el valor
 * llegan con la línea del PAA, así que los rangos por modalidad no decidían ya
 * nada. El salario sí: con él se llevan a pesos la cuantía del Comité, el tope
 * MiPyme y el margen de adición, que la norma fija en SMMLV.
 */
export function VistaSalarioMinimo() {
  const [salarios, setSalarios] = useState<SmmlvAnual[]>([]);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await contratacionService.salariosMinimos();
      setSalarios(datos.salarios);
      setPuedeEditar(datos.puedeEditar);
    } catch (err: any) {
      toast.error('No se pudo cargar el salario mínimo', {
        id: 'smmlv-carga',
        description: err.message,
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const anioActual = new Date().getFullYear();
  const vigente = salarios.find((s) => s.anio === anioActual) ?? null;

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Salario mínimo"
        subtitle="SMMLV con el que se llevan a pesos los topes que la norma fija en salarios"
        icon={<Coins className="w-5 h-5" />}
        color="#7C3AED"
      />

      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Coins className="w-4 h-4 text-[#003DA5] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-600 m-0">Salario mínimo {anioActual}</p>
          <p className="text-sm font-black text-slate-900 m-0 tabular-nums">
            {cargando ? '…' : vigente ? formatoPesos.format(vigente.valor) : 'Sin registrar'}
            {vigente && !vigente.confirmado && (
              <span className="ml-2 text-[10px] font-bold text-amber-700 align-middle">
                sin confirmar
              </span>
            )}
          </p>
        </div>
        {!cargando && !vigente && (
          <p className="text-[11px] text-red-600 font-bold m-0">
            Sin él, los topes en SMMLV de este año no se pueden convertir a pesos
          </p>
        )}
        {puedeEditar && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Registrar
          </button>
        )}
      </div>

      {cargando ? (
        <SkeletonTable rows={3} />
      ) : salarios.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-slate-50">
                <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Año
                </th>
                <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Salario mensual
                </th>
                <th className="px-4 py-2.5 text-[10.5px] font-black uppercase tracking-wide text-slate-500">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {salarios.map((s) => (
                <tr key={s.anio} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 text-[12.5px] font-bold text-slate-800 tabular-nums">
                    {s.anio}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-slate-700 tabular-nums">
                    {formatoPesos.format(s.valor)}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] font-bold">
                    {s.confirmado ? (
                      <span className="text-emerald-700">Confirmado</span>
                    ) : (
                      <span className="text-amber-700">Sin confirmar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-[11px] text-gray-500 m-0 leading-relaxed">
        Lo usan la cuantía para ir al Comité de Contratación, el tope de la limitación MiPyme y el
        margen de adición de las modificaciones. La modalidad y el valor del proceso no dependen de
        él: llegan con la línea del PAA.
        {!puedeEditar && ' Solo quien administra la configuración del módulo puede registrarlo.'}
      </p>

      <Modal
        isOpen={editando}
        onClose={() => setEditando(false)}
        title="Salario mínimo"
        description="El del año que se registre se usa para todo tope en SMMLV de ese año"
        icon={<Coins className="w-5 h-5 text-white" />}
        color="#003DA5"
        size="small"
      >
        <EditorSmmlv
          salarios={salarios}
          onListo={async () => {
            setEditando(false);
            await cargar();
          }}
        />
      </Modal>
    </div>
  );
}
