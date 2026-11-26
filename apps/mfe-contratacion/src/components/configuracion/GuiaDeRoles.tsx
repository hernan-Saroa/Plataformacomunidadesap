import React, { useMemo, useState } from 'react';
import { Info, Search, UserRound } from 'lucide-react';

import { RolConAlcance } from '../../types';
import { PERFILES } from './perfiles';

const NOMBRE_ACCION: Record<string, string> = { ver: 'Ver', editar: 'Editar', aprobar: 'Aprobar', decidir: 'Decidir' };

interface Props {
  roles: RolConAlcance[];
  /** Abre la matriz de permisos con ese rol elegido. */
  onVerPermisos: (rol: RolConAlcance) => void;
}

/**
 * Roles y personas: qué hace cada rol predeterminado y quién lo tiene hoy.
 *
 * Es de solo lectura. Las funciones son la guía que acordó la Dirección; lo
 * que de verdad puede hacer cada rol lo dice la matriz, y a quién se le da un
 * rol se decide en la administración de usuarios de la plataforma.
 */
export function GuiaDeRoles({ roles, onVerPermisos }: Props) {
  const [busqueda, setBusqueda] = useState('');

  const predeterminados = PERFILES.map((p) => ({ perfil: p, rol: roles.find((r) => r.codigo === p.rol) ?? null }));
  const otros = roles.filter((r) => !PERFILES.some((p) => p.rol === r.codigo));

  const texto = busqueda.trim().toLowerCase();
  const coincide = useMemo(
    () => (nombres: string[], rol: RolConAlcance | null) =>
      !texto ||
      nombres.some((n) => n.toLowerCase().includes(texto)) ||
      (rol?.personas ?? []).some(
        (p) => p.nombre.toLowerCase().includes(texto) || (p.correo ?? '').toLowerCase().includes(texto),
      ),
    [texto],
  );

  const tarjetas = predeterminados.filter(({ perfil, rol }) =>
    coincide([perfil.nombre, perfil.rol, rol?.nombre ?? ''], rol),
  );
  const otrosVisibles = otros.filter((r) => coincide([r.nombre, r.codigo], r));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
        <p className="m-0 text-xs text-gray-600 leading-relaxed">
          Los <strong className="font-bold text-gray-700">roles predeterminados</strong> del módulo, qué hace
          cada uno y quién lo tiene hoy. Las funciones son una guía: lo que de verdad puede hacer un rol lo
          dice la matriz de permisos. Los roles se asignan a las personas en la administración de usuarios
          de la plataforma.
        </p>
        <label className="relative flex items-center max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5" aria-hidden />
          <span className="sr-only">Buscar un rol o una persona</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar un rol o una persona"
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-xs focus:border-[#003DA5] focus:outline-none"
          />
        </label>
      </div>

      <div className="guia-roles">
        {tarjetas.map(({ perfil, rol }) => (
          <article key={perfil.rol} className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-sm font-bold text-slate-800">{perfil.nombre}</h3>
              <span className="text-xs font-mono text-gray-400">{perfil.rol}</span>
            </header>

            <ul className="m-0 pl-4 space-y-0.5 list-disc text-xs text-slate-600 leading-relaxed">
              {perfil.funciones.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            {rol ? (
              <>
                <Personas rol={rol} />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-gray-400">
                    {rol.acciones.length
                      ? `Permisos: ${rol.acciones.map((a) => NOMBRE_ACCION[a]).join(' · ')}`
                      : 'Sin permisos en Contratación'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onVerPermisos(rol)}
                    className="text-xs font-semibold text-[#003DA5] hover:underline"
                  >
                    Ver sus permisos por etapa
                  </button>
                </div>
              </>
            ) : (
              <p className="m-0 flex items-start gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden />
                Este rol no existe o está inactivo en esta instalación.
              </p>
            )}
          </article>
        ))}
      </div>

      {otrosVisibles.length > 0 && (
        <section className="space-y-2">
          <h3 className="m-0 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            Otros roles con acceso al módulo
          </h3>
          <div className="guia-roles">
            {otrosVisibles.map((rol) => (
              <article key={rol.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="m-0 text-sm font-bold text-slate-800">{rol.nombre}</h4>
                  <span className="text-xs font-mono text-gray-400">{rol.codigo}</span>
                </header>
                {rol.descripcion && (
                  <p className="m-0 text-xs text-slate-600 leading-relaxed">{rol.descripcion}</p>
                )}
                <Personas rol={rol} />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onVerPermisos(rol)}
                    className="text-xs font-semibold text-[#003DA5] hover:underline"
                  >
                    Ver sus permisos por etapa
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tarjetas.length === 0 && otrosVisibles.length === 0 && (
        <p className="m-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
          Ningún rol ni persona coincide con la búsqueda.
        </p>
      )}
    </div>
  );
}

/** Quién tiene el rol hoy. */
export function Personas({ rol }: { rol: RolConAlcance }) {
  const personas = rol.personas ?? [];
  if (!personas.length) {
    return (
      <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
        Nadie tiene este rol todavía.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-gray-500">
        {personas.length === 1 ? 'Lo tiene 1 persona' : `Lo tienen ${personas.length} personas`}
      </p>
      <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
        {personas.map((p) => (
          <li
            key={p.id}
            title={p.correo ?? undefined}
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-slate-700"
          >
            <UserRound className="w-3 h-3 text-gray-400" aria-hidden />
            {p.nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}
