import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { campo } from '../shared/PiezasPanel';

/** Un aprobador ya elegido, sea un rol o una persona. */
interface Aprobador {
  clase: 'rol' | 'persona';
  id: string;
  nombre: string;
}

interface Props {
  numeral: string;
}

/**
 * Si la actividad requiere aprobación y quién la da (EFDS-1183).
 *
 * Quien configura esto es el jefe de Contratación, no un administrador de
 * sistemas: por eso elige nombres —«Director de Contratación», «Ana Lucía
 * Osorio»— y no códigos de permiso. La regla que se guarda sí los lleva, pero
 * eso es asunto del backend.
 *
 * El buscador separa roles y personas en dos pestañas. La primera versión los
 * mezclaba en una lista —parecía más simple, porque quien configura piensa en
 * «que lo apruebe la Dirección»— pero en pantalla no se distinguían: «Super
 * Administrador» y «Super User» aparecían seguidos sin nada que dijera cuál era
 * cuál.
 */
export function AprobacionActividad({ numeral }: Props) {
  const [requiere, setRequiere] = useState(false);
  const [aprobadores, setAprobadores] = useState<Aprobador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState('');
  const [roles, setRoles] = useState<{ code: string; name: string }[]>([]);
  const [personas, setPersonas] = useState<{ id: string; nombre: string; cargo?: string }[]>([]);

  /**
   * Roles o personas, en pestañas y no en una lista mezclada.
   *
   * Mezclarlos parecía más simple —quien configura piensa en «que lo apruebe la
   * Dirección»— pero en pantalla no se distinguían: «Super Administrador» y
   * «Super User» aparecían seguidos sin que nada dijera cuál era el rol y cuál
   * la persona. Elegir primero acota la búsqueda y deja claro qué se elige.
   */
  const [donde, setDonde] = useState<'roles' | 'personas'>('roles');

  const leer = () => {
    setCargando(true);
    contratacionService
      .aprobacionDeActividad(numeral)
      .then((r) => {
        setRequiere(r.requiereAprobacion);
        setAprobadores(r.aprobadores ?? []);
        setError(null);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setCargando(false));
  };

  useEffect(leer, [numeral]);

  // Los roles se piden una vez al abrir el buscador y no al montar: la mayoría
  // de las veces se entra a esta pestaña solo a mirar.
  const abrirBuscador = () => {
    setBuscando(true);
    if (!roles.length) {
      contratacionService.rolesAprobadores().then(setRoles).catch(() => setRoles([]));
    }
  };

  const yaElegidos = useMemo(() => new Set(aprobadores.map((a) => a.id)), [aprobadores]);

  const coincidencias = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return roles
      .filter((r) => !yaElegidos.has(r.code))
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
      .slice(0, 6);
  }, [roles, texto, yaElegidos]);

  /*
   * Las personas se buscan en el servidor y los roles en memoria porque no son
   * comparables: los roles del módulo son quince y caben enteros, las personas
   * son miles. Se espera a que se escriban dos letras para no pedir la lista
   * completa en cuanto se abre el buscador.
   */
  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setPersonas([]);
      return;
    }

    const t = setTimeout(() => {
      contratacionService
        .personas(q)
        .then((lista: any[]) =>
          setPersonas(
            lista
              .map((p) => ({
                id: p.id ?? p.idPerson ?? p.id_person,
                nombre: p.nombre ?? p.nombreCompleto ?? p.full_name ?? '',
                cargo: p.cargo ?? p.email ?? undefined,
              }))
              .filter((p) => p.id && p.nombre && !yaElegidos.has(p.id))
              .slice(0, 6),
          ),
        )
        .catch(() => setPersonas([]));
    }, 250);

    return () => clearTimeout(t);
  }, [texto, yaElegidos]);

  const guardar = async (nuevoRequiere: boolean, nuevos: Aprobador[]) => {
    setGuardando(true);
    try {
      await contratacionService.guardarAprobacionDeActividad(numeral, {
        requiereAprobacion: nuevoRequiere,
        roles: nuevos.filter((a) => a.clase === 'rol').map((a) => a.id),
        personas: nuevos.filter((a) => a.clase === 'persona').map((a) => a.id),
      });
      setRequiere(nuevoRequiere);
      setAprobadores(nuevos);
      toast.success(
        nuevoRequiere ? 'La actividad requiere aprobación' : 'La actividad ya no requiere aprobación',
      );
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
      leer();
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-[11.5px] text-slate-400 m-0">Cargando la configuración…</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600 m-0">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[12.5px] font-bold text-slate-800 m-0">Aprobación</p>
        <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
          Si esta actividad necesita el visto bueno de alguien antes de darse por terminada.
          Los procesos ya aprobados no cambian: lo que se configure aquí rige de ahora en
          adelante.
        </p>
      </div>

      <div className="space-y-2">
        <Opcion
          marcada={!requiere}
          disabled={guardando}
          onClick={() => guardar(false, [])}
          titulo="No requiere aprobación"
          ayuda="El gestor la cierra cuando termina."
        />
        <Opcion
          marcada={requiere}
          disabled={guardando}
          onClick={() => requiere || guardar(true, aprobadores)}
          titulo="Requiere aprobación de:"
          ayuda={
            aprobadores.length > 1 ? 'Basta con que uno de ellos apruebe.' : undefined
          }
        />
      </div>

      {requiere && (
        <div className="ml-6 space-y-2">
          {aprobadores.map((a) => (
            <div
              key={`${a.clase}-${a.id}`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
              <span className="text-[12px] text-slate-800 flex-1 min-w-0 truncate">{a.nombre}</span>
              <span className="text-[10px] text-slate-400">
                {a.clase === 'rol' ? 'Rol' : 'Persona'}
              </span>
              <button
                type="button"
                disabled={guardando}
                onClick={() => guardar(true, aprobadores.filter((x) => x.id !== a.id))}
                aria-label={`Quitar ${a.nombre}`}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Sin aprobadores la regla no exige nada: decirlo evita que alguien
              marque la casilla y crea que ya quedó protegida. */}
          {aprobadores.length === 0 && (
            <p className="text-[11.5px] text-amber-700 m-0">
              Falta indicar quién aprueba: mientras no haya nadie, la actividad se cierra sin
              revisión.
            </p>
          )}

          {buscando ? (
            <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
              {/* Elegir primero entre rol y persona: mezclados en una sola lista,
                  «Super Administrador» y «Super User» aparecían juntos y no
                  había forma de saber cuál era cuál. */}
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                {(
                  [
                    ['roles', 'Roles'],
                    ['personas', 'Personas'],
                  ] as const
                ).map(([id, etiqueta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDonde(id)}
                    aria-pressed={donde === id}
                    className={`flex-1 px-3 py-1.5 rounded-md text-[11.5px] font-bold transition-colors ${
                      donde === id
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>

              <label className="relative block">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  autoFocus
                  type="search"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={
                    donde === 'roles' ? 'Buscar un rol' : 'Buscar una persona por su nombre'
                  }
                  aria-label={donde === 'roles' ? 'Buscar un rol' : 'Buscar una persona'}
                  className={`${campo} pl-8`}
                />
              </label>

              {donde === 'roles' ? (
                coincidencias.length > 0 ? (
                  coincidencias.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => {
                        guardar(true, [
                          ...aprobadores,
                          { clase: 'rol', id: r.code, nombre: r.name },
                        ]);
                        setBuscando(false);
                        setTexto('');
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      {r.name}
                    </button>
                  ))
                ) : (
                  <p className="text-[11.5px] text-slate-400 m-0 px-1 py-2">
                    Ningún rol coincide con «{texto}».
                  </p>
                )
              ) : personas.length > 0 ? (
                personas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      guardar(true, [
                        ...aprobadores,
                        { clase: 'persona', id: p.id, nombre: p.nombre },
                      ]);
                      setBuscando(false);
                      setTexto('');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50"
                  >
                    <span className="block text-[12px] text-slate-700">{p.nombre}</span>
                    {p.cargo && (
                      <span className="block text-[10.5px] text-slate-400">{p.cargo}</span>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-[11.5px] text-slate-400 m-0 px-1 py-2">
                  {texto.trim().length < 2
                    ? 'Escribe al menos dos letras del nombre.'
                    : `Ninguna persona coincide con «${texto}».`}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setBuscando(false);
                  setTexto('');
                }}
                className="text-[11.5px] font-bold text-slate-500 hover:text-slate-700 px-2 pt-1"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={guardando}
              onClick={abrirBuscador}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md
                border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar quién aprueba
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Una de las dos opciones excluyentes, con su explicación debajo. */
const Opcion = ({
  marcada,
  disabled,
  onClick,
  titulo,
  ayuda,
}: {
  marcada: boolean;
  disabled?: boolean;
  onClick: () => void;
  titulo: string;
  ayuda?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={marcada}
    className={`w-full text-left flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors
      disabled:opacity-50 ${
        marcada
          ? 'border-[#003DA5]/30 bg-[#003DA5]/[0.04]'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        marcada ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'
      }`}
    >
      {marcada && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
    </span>
    <span className="min-w-0">
      <span className="block text-[12.5px] font-bold text-slate-800">{titulo}</span>
      {ayuda && <span className="block text-[11px] text-slate-500 mt-0.5">{ayuda}</span>}
    </span>
  </button>
);
