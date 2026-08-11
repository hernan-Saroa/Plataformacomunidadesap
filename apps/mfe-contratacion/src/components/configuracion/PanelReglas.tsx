import React, { useMemo } from 'react';
import { Plus, Pencil, Trash2, Globe, Diamond } from 'lucide-react';

import { Modalidad, ReglaActividad } from '../../types';

const ETIQUETA_REGLA: Record<string, string> = {
  CAMPO_OBLIGATORIO: 'Campo obligatorio',
  DOCUMENTO_REQUERIDO: 'Documento requerido',
  RANGO_VALOR: 'Rango de valor',
  PLAZO_MINIMO: 'Plazo mínimo',
  BLOQUEA_AVANCE: 'Bloquea el avance',
  REGLA_DERIVADA: 'Depende de otro dato',
};

interface Props {
  reglas: ReglaActividad[];
  modalidades: Modalidad[];
  cargando?: boolean;
  onCrear: (alcance: 'global' | 'excepcion') => void;
  onEditar: (regla: ReglaActividad) => void;
  onDerogar: (regla: ReglaActividad) => void;
}

/**
 * Reglas de una actividad, separadas en lo común y lo excepcional.
 *
 * De veintidós reglas configuradas, dieciséis aplican a todas las modalidades.
 * Mezclarlas en una sola lista deja al administrador sin saber cuáles está
 * tocando: editar una creyendo que afecta a una modalidad la cambia en once.
 * Los dos bloques hacen esa diferencia visible antes de abrir nada.
 */
export function PanelReglas({
  reglas,
  modalidades,
  cargando,
  onCrear,
  onEditar,
  onDerogar,
}: Props) {
  const { globales, porModalidad } = useMemo(() => {
    const globales = reglas.filter((r) => !r.modalidad);
    const porModalidad = new Map<string, ReglaActividad[]>();
    for (const r of reglas) {
      if (!r.modalidad) continue;
      if (!porModalidad.has(r.modalidad)) porModalidad.set(r.modalidad, []);
      porModalidad.get(r.modalidad)!.push(r);
    }
    return { globales, porModalidad };
  }, [reglas]);

  const nombreDe = (codigo: string) =>
    modalidades.find((m) => m.codigo === codigo)?.nombre ?? codigo;

  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Bloque
        titulo="Aplica a todas las modalidades"
        icono={<Globe className="w-3.5 h-3.5" />}
        cuenta={globales.length}
        tono="neutro"
        accion={
          <BotonAgregar texto="Regla para todas" onClick={() => onCrear('global')} />
        }
      >
        {globales.length === 0 ? (
          <Vacio texto="Sin reglas comunes. Agrega una para que se exija en todas las modalidades." />
        ) : (
          <ul className="divide-y divide-gray-100 m-0 p-0 list-none">
            {globales.map((r) => (
              <Fila key={r.id} regla={r} onEditar={onEditar} onDerogar={onDerogar} />
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque
        titulo="Excepciones por modalidad"
        icono={<Diamond className="w-3.5 h-3.5" />}
        cuenta={[...porModalidad.values()].reduce((n, l) => n + l.length, 0)}
        tono="azul"
        accion={<BotonAgregar texto="Excepción" onClick={() => onCrear('excepcion')} />}
      >
        {porModalidad.size === 0 ? (
          <Vacio texto="Ninguna modalidad se desvía de las reglas comunes." />
        ) : (
          <div className="divide-y divide-gray-100">
            {[...porModalidad.entries()].map(([codigo, lista]) => (
              <div key={codigo} className="px-4 py-2.5">
                <p className="text-[11px] font-bold text-[#003DA5] uppercase tracking-wide m-0 mb-1">
                  {nombreDe(codigo)}
                </p>
                <ul className="m-0 p-0 list-none space-y-1">
                  {lista.map((r) => (
                    <Fila
                      key={r.id}
                      regla={r}
                      onEditar={onEditar}
                      onDerogar={onDerogar}
                      compacta
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Bloque>
    </div>
  );
}

function Bloque({
  titulo,
  icono,
  cuenta,
  tono,
  accion,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  cuenta: number;
  tono: 'neutro' | 'azul';
  accion: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <header
        className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 ${
          tono === 'azul' ? 'border-[#003DA5]/20 bg-[#E0EDFF]/50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <h3
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide m-0 ${
            tono === 'azul' ? 'text-[#003DA5]' : 'text-gray-700'
          }`}
        >
          {icono}
          {titulo}
          <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] tabular-nums">
            {cuenta}
          </span>
        </h3>
        {accion}
      </header>
      {children}
    </section>
  );
}

function BotonAgregar({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg bg-[#003DA5] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#00307f]"
    >
      <Plus className="w-3 h-3" />
      {texto}
    </button>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-500 px-4 py-6 text-center m-0">{texto}</p>;
}

function Fila({
  regla,
  onEditar,
  onDerogar,
  compacta,
}: {
  regla: ReglaActividad;
  onEditar: (r: ReglaActividad) => void;
  onDerogar: (r: ReglaActividad) => void;
  compacta?: boolean;
}) {
  const detalle = Object.entries(regla.config ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

  return (
    <li
      className={`flex items-start justify-between gap-3 ${
        compacta ? 'py-1' : 'px-4 py-2.5'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 uppercase tracking-wide">
            {ETIQUETA_REGLA[regla.tipo] ?? regla.tipo}
          </span>
          {(regla.condiciones?.length ?? 0) > 0 && (
            <span className="rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              Condicional
            </span>
          )}
        </div>
        {regla.descripcion ? (
          <p className="text-sm text-gray-700 mt-1 mb-0 leading-snug">{regla.descripcion}</p>
        ) : (
          regla.mensaje && (
            <p className="text-sm text-gray-700 mt-1 mb-0 leading-snug">{regla.mensaje}</p>
          )
        )}
        {detalle && (
          <p className="text-[11px] text-gray-500 mt-0.5 mb-0 font-mono">{detalle}</p>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEditar(regla)}
          title="Editar"
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDerogar(regla)}
          title="Derogar"
          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}
