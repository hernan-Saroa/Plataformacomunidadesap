import React, { useEffect, useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CorreoInstitucional } from '../../types';

const NOMBRE: Record<string, string> = {
  CONTRATACION_GENERAL: 'Correo general de Contratación',
};

const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';

const correoValido = (c: string) => !c.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

interface Props {
  puedeEditar: boolean;
}

/**
 * Los buzones de la entidad que reciben copia de los correos del módulo (138).
 *
 * Por ahora uno: el correo general de Contratación, que recibe copia de la
 * notificación al supervisor junto con el abogado revisor (sesión de QA del
 * 04/11). Vacío, la copia simplemente no sale.
 */
export function CorreosInstitucionales({ puedeEditar }: Props) {
  const [correos, setCorreos] = useState<CorreoInstitucional[] | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    contratacionService
      .correosInstitucionales()
      .then((lista) => {
        setCorreos(lista);
        setBorrador(Object.fromEntries(lista.map((c) => [c.clave, c.correo ?? ''])));
      })
      .catch(() => setCorreos([]));
  }, []);

  if (!correos?.length) return null;

  const guardar = async (clave: string) => {
    setGuardando(clave);
    try {
      const lista = await contratacionService.guardarCorreosInstitucionales({
        [clave]: borrador[clave]?.trim() || null,
      });
      setCorreos(lista);
      toast.success(`${NOMBRE[clave] ?? clave} actualizado`);
    } catch (err: any) {
      toast.error('No se pudo guardar el correo', { description: err.message });
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="space-y-2 mt-5">
      <div>
        <p className="text-[10.5px] font-black uppercase tracking-wide text-slate-500 m-0">
          Buzones de la entidad
        </p>
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
          Reciben copia de los correos que salen del módulo, como la notificación al supervisor del
          contrato.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {correos.map((c) => {
          const valor = borrador[c.clave] ?? '';
          const cambio = valor.trim().toLowerCase() !== (c.correo ?? '');
          return (
            <div key={c.clave}>
              <label htmlFor={`correo-${c.clave}`} className="block text-xs font-bold text-slate-700 mb-1">
                <Mail className="inline w-3.5 h-3.5 mr-1 text-slate-500" />
                {NOMBRE[c.clave] ?? c.clave}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={`correo-${c.clave}`}
                  type="email"
                  value={valor}
                  disabled={!puedeEditar}
                  onChange={(e) => setBorrador((b) => ({ ...b, [c.clave]: e.target.value }))}
                  placeholder="contratacion@esap.edu.co"
                  className={`${campo} max-w-sm`}
                />
                {puedeEditar ? (
                  <button
                    type="button"
                    disabled={!cambio || !correoValido(valor) || guardando === c.clave}
                    onClick={() => guardar(c.clave)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    Guardar
                  </button>
                ) : null}
              </div>
              {!correoValido(valor) ? (
                <p className="text-[11px] text-red-600 m-0 mt-1">Ese correo no es válido.</p>
              ) : (
                <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">{c.descripcion}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
