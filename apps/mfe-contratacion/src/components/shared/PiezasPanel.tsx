import React from 'react';
import { AlertTriangle, Check, Lock } from 'lucide-react';

/**
 * Piezas comunes de los paneles de actividad.
 *
 * Cada actividad del riel abre su propio panel —el CDP en la etapa 4, la
 * publicación del pliego en la 5— y todas necesitan las mismas cinco cosas:
 * decir qué se hace, avisar del resultado, explicar qué falta y quién puede
 * hacerlo. Estaban duplicadas al final de cada panel; aquí se escriben una vez.
 *
 * Salieron tal cual de PanelCdp, sin tocar una clase: extraerlas no debe
 * cambiar cómo se ve la etapa 4.
 */

export const Marco = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 space-y-3">{children}</div>
);

export const Titulo = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12.5px] font-bold text-slate-800 m-0">{children}</p>
);

export const Ayuda = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">{children}</p>
);

/** Qué falta antes de poder trabajar esta actividad, y en cuál se hace. */
export const Pendiente = ({ falta, texto }: { falta: string; texto: string }) => (
  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3">
    <p className="text-[12.5px] font-bold text-slate-700 m-0">Pendiente del paso {falta}</p>
    <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{texto}</p>
  </div>
);

export const Siguiente = ({ texto }: { texto: string }) => (
  <p className="text-[11px] text-slate-500 m-0 leading-relaxed">{texto}</p>
);

/** El rol no alcanza: se dice quién puede, en vez de dejar un botón que da 403. */
export const SinPermiso = ({ quien }: { quien: string }) => (
  <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-start gap-2.5">
    <Lock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-[12.5px] font-bold text-slate-700 m-0">Este paso lo realiza {quien}</p>
      <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
        Puedes consultarlo, pero no ejecutarlo con tu rol.
      </p>
    </div>
  </div>
);

const TONOS = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  aviso: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
} as const;

export const Aviso = ({
  tono,
  titulo,
  children,
}: {
  tono: keyof typeof TONOS;
  titulo: string;
  children: React.ReactNode;
}) => (
  <div className={`rounded-lg border px-3.5 py-3 flex items-start gap-2.5 ${TONOS[tono]}`}>
    {tono === 'ok' ? (
      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={3} />
    ) : (
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
    )}
    <div className="min-w-0">
      <p className="text-[12.5px] font-bold m-0">{titulo}</p>
      <p className="text-[11.5px] m-0 mt-0.5 leading-relaxed">{children}</p>
    </div>
  </div>
);

export const Boton = ({
  children,
  icono,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icono: React.ReactNode }) => (
  <button
    type="button"
    {...props}
    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
  >
    {icono}
    {children}
  </button>
);

/** Botón secundario: acciones que corrigen o devuelven, no las que avanzan. */
export const BotonSecundario = ({
  children,
  icono,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icono: React.ReactNode }) => (
  <button
    type="button"
    {...props}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
  >
    {icono}
    {children}
  </button>
);

export const campo =
  'w-full px-2.5 py-1.5 text-[12.5px] rounded-md border border-gray-300 bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20';
